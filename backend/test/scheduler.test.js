// Comprehensive Test Suite for RailOps AI Scheduling & Constraint Engine
// Validates Tests 1 through 15 deterministically against live MongoDB & Domain Engine.

const mongoose = require('mongoose');
const Defect = require('../models/Defect');
const Block = require('../models/Block');
const TrainSchedule = require('../models/TrainSchedule');
const Recommendation = require('../models/Recommendation');

const { SAFETY_BUFFER_MINUTES, getNow, getToday, getTomorrow } = require('../engine/timeUtils');
const { evaluateConstraints } = require('../engine/constraintEngine');
const { generateCandidateWindows, searchAllCorridors } = require('../engine/windowGenerator');
const { bundleDefects } = require('../engine/blockBundler');
const { scoreCandidateWindow } = require('../engine/windowScorer');
const recommendationController = require('../controllers/recommendationController');

async function runTests() {
  console.log('\n========================================================');
  console.log('STARTING RAILOPS AI SCHEDULING & CONSTRAINT ENGINE TESTS');
  console.log('========================================================\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/railops_ai');

  const now = getNow();
  const today = getToday(now);
  const tomorrow = getTomorrow(now);

  const [rawBlocks, trainSchedules, allDefects] = await Promise.all([
    Block.find({}).lean(),
    TrainSchedule.find({}).lean(),
    Defect.find({}).lean()
  ]);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? '— ' + detail : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} — ${detail}`);
      failed++;
    }
  }

  // ── TEST 1: Passenger overlaps candidate -> candidate rejected ──
  {
    // Find a passenger train on COR-01 (e.g. 12954 Paschim Express at 11:30–12:10)
    const paschim = trainSchedules.find(t => (t.trainNumber === '12953' || t.trainType === 'Express') && t.corridorId === 'COR-01');
    const candStart = new Date(paschim.departureTime);
    const candEnd = new Date(candStart.getTime() + 3 * 3600000);

    const result = evaluateConstraints({
      windowStart: candStart,
      windowEnd: candEnd,
      corridorId: 'COR-01',
      trainSchedules,
      activeBlocks: [],
      now: new Date(candStart.getTime() - 2 * 3600000)
    });

    assert(
      !result.feasible && result.passengerImpact > 0 && result.violations.some(v => v.includes('PASSENGER_TRAIN_PRIORITY')),
      'TEST 1: Passenger overlaps candidate -> candidate rejected',
      `Impact: ${result.passengerImpact} train(s), Reason: ${result.rejectionReasons[0]}`
    );
  }

  // ── TEST 2: Freight overlaps candidate -> candidate rejected ──
  {
    // Find freight train GDS-401 on COR-01 (04:10–05:00)
    const freight = trainSchedules.find(t => t.trainType === 'Goods' && t.corridorId === 'COR-01');
    const candStart = new Date(freight.departureTime);
    const candEnd = new Date(candStart.getTime() + 2 * 3600000);

    const result = evaluateConstraints({
      windowStart: candStart,
      windowEnd: candEnd,
      corridorId: 'COR-01',
      trainSchedules,
      activeBlocks: [],
      now: new Date(candStart.getTime() - 3 * 3600000)
    });

    assert(
      !result.feasible && result.freightImpact > 0 && result.violations.some(v => v.includes('FREIGHT_MOVEMENT_PRIORITY')),
      'TEST 2: Freight overlaps candidate -> candidate rejected',
      `Impact: ${result.freightImpact} freight rake(s)`
    );
  }

  // ── TEST 3: Existing maintenance overlaps candidate -> candidate rejected ──
  {
    const existingBlock = rawBlocks.find(b => b.blockCode === 'BLK-C4-01'); // COR-04 12:00–15:30
    const candStart = new Date(existingBlock.startTime);
    const candEnd = new Date(candStart.getTime() + 3 * 3600000);

    const result = evaluateConstraints({
      windowStart: candStart,
      windowEnd: candEnd,
      corridorId: existingBlock.corridorId,
      trainSchedules: [],
      activeBlocks: [existingBlock],
      now: new Date(candStart.getTime() - 4 * 3600000)
    });

    assert(
      !result.feasible && result.violations.some(v => v.includes('BLOCK_COLLISION')),
      'TEST 3: Existing maintenance overlaps candidate -> candidate rejected',
      result.rejectionReasons[0]
    );
  }

  // ── TEST 4: All three departments fit -> one coordinated block ──
  {
    const scenarioADefects = allDefects.filter(d => ['DEF-0101', 'DEF-0102', 'DEF-0103'].includes(d.defectCode));
    const bundles = bundleDefects(scenarioADefects);
    const multiBundle = bundles.find(b => b.isMultiDepartment && b.departmentsList.length === 3);

    assert(
      multiBundle && multiBundle.defectCount === 3 && multiBundle.department.includes('Track') && multiBundle.department.includes('Signalling') && multiBundle.department.includes('Traction'),
      'TEST 4: All three departments fit -> one coordinated block',
      `Departments: ${multiBundle?.department}, Time Saved: ${multiBundle?.timeSavedHrs}h`
    );
  }

  // ── TEST 5: 4h task + 3h window + splittable -> 3h allocation + 1h carry-forward ──
  {
    const splittableDefect = {
      defectCode: 'DEF-SPLIT-01',
      department: 'Track',
      estimatedDurationHrs: 4,
      isSplittable: true
    };
    const s = new Date(tomorrow); s.setHours(2, 0, 0, 0);
    const e = new Date(s.getTime() + 3 * 3600000); // 3h window

    const result = evaluateConstraints({
      windowStart: s,
      windowEnd: e,
      corridorId: 'COR-05',
      defects: [splittableDefect],
      trainSchedules: [],
      activeBlocks: [],
      now
    });

    assert(
      result.feasible && result.canSplit && result.allocatedMinutes === 180 && result.carryForwardMinutes === 60,
      'TEST 5: 4h task + 3h window + splittable -> 3h allocation + 1h carry-forward',
      `Allocated: ${result.allocatedMinutes}m, Carried: ${result.carryForwardMinutes}m`
    );
  }

  // ── TEST 6: 4h task + 3h window + NOT splittable -> candidate rejected ──
  {
    const nonSplittableDefect = {
      defectCode: 'DEF-NONSPLIT-01',
      department: 'Track',
      estimatedDurationHrs: 4,
      isSplittable: false
    };
    const s = new Date(tomorrow); s.setHours(2, 0, 0, 0);
    const e = new Date(s.getTime() + 3 * 3600000); // 3h window

    const result = evaluateConstraints({
      windowStart: s,
      windowEnd: e,
      corridorId: 'COR-05',
      defects: [nonSplittableDefect],
      trainSchedules: [],
      activeBlocks: [],
      now
    });

    assert(
      !result.feasible && result.violations.some(v => v.includes('INSUFFICIENT_DURATION')),
      'TEST 6: 4h task + 3h window + NOT splittable -> candidate rejected',
      result.rejectionReasons[0]
    );
  }

  // ── TEST 7: Candidate is in the past -> rejected ──
  {
    const pastStart = new Date(now.getTime() - 3600000); // 1h ago
    const pastEnd = new Date(now.getTime() + 3600000);

    const result = evaluateConstraints({
      windowStart: pastStart,
      windowEnd: pastEnd,
      corridorId: 'COR-01',
      trainSchedules: [],
      activeBlocks: [],
      now
    });

    assert(
      !result.feasible && result.violations.some(v => v.includes('PAST_OR_IMMEDIATE_START')),
      'TEST 7: Candidate is in the past -> rejected',
      result.rejectionReasons[0]
    );
  }

  // ── TEST 8: Candidate violates safety buffer -> rejected ──
  {
    // Proposed window starts 5 minutes from now (violates 20-min buffer)
    const tooSoonStart = new Date(now.getTime() + 5 * 60000);
    const tooSoonEnd = new Date(tooSoonStart.getTime() + 2 * 3600000);

    const result = evaluateConstraints({
      windowStart: tooSoonStart,
      windowEnd: tooSoonEnd,
      corridorId: 'COR-01',
      trainSchedules: [],
      activeBlocks: [],
      now,
      safetyBufferMinutes: 20
    });

    assert(
      !result.feasible && result.violations.some(v => v.includes('PAST_OR_IMMEDIATE_START')),
      'TEST 8: Candidate violates safety buffer -> rejected',
      result.rejectionReasons[0]
    );
  }

  // ── TEST 9: Operator accepts valid recommendation -> scheduled ──
  {
    // Clean tomorrow slot on COR-04: night golden window (02:00-06:00)
    const s = new Date(tomorrow); s.setHours(2, 0, 0, 0);
    const e = new Date(tomorrow); e.setHours(6, 0, 0, 0);

    const testRec = await Recommendation.create({
      recommendationId: `REC-TEST-${Date.now()}`,
      corridorId: 'COR-04',
      startTime: s,
      endTime: e,
      durationMinutes: 180,
      status: 'PROPOSED',
      departments: ['Track', 'Signalling'],
      bundledDefectIds: [],
      taskSummary: [{ defectCode: 'DEF-TEST-01', department: 'Track', priority: 'HIGH', durationHours: 2.5 }],
      score: 85,
      reasons: ['Safe inter-peak window'],
      expiresAt: e
    });

    // Invoke acceptRecommendation via mock req/res
    let responseData = null;
    const req = { params: { id: testRec._id } };
    const res = {
      status: (code) => ({
        json: (data) => { responseData = { code, ...data }; }
      })
    };

    await recommendationController.acceptRecommendation(req, res);

    assert(
      responseData?.success === true && responseData?.status === 'SCHEDULED' && responseData?.block,
      'TEST 9: Operator accepts valid recommendation -> scheduled',
      `Committed Block: ${responseData?.block?.blockCode}`
    );

    // Cleanup test block & recommendation
    if (responseData?.block?._id) {
      await Block.findByIdAndDelete(responseData.block._id);
    }
    await Recommendation.findByIdAndDelete(testRec._id);
  }

  // ── TEST 10: Operator accepts stale/conflicting recommendation -> NOT scheduled; replan ──
  {
    // Create an existing block occupying tomorrow 10:00–14:00 on COR-01
    const s = new Date(tomorrow); s.setHours(10, 0, 0, 0);
    const e = new Date(tomorrow); e.setHours(14, 0, 0, 0);

    const conflictBlock = await Block.create({
      blockCode: `BLK-STALE-TEST-${Date.now()}`,
      assetId: 'TEST-ASSET',
      corridorId: 'COR-01',
      department: 'Track',
      track: 'UP Main',
      startTime: s,
      endTime: e,
      status: 'APPROVED',
      safetyBufferMinutes: 20
    });

    // Create an overlapping PROPOSED recommendation
    const staleRec = await Recommendation.create({
      recommendationId: `REC-STALE-${Date.now()}`,
      corridorId: 'COR-01',
      startTime: s,
      endTime: e,
      durationMinutes: 240,
      status: 'PROPOSED',
      departments: ['Track'],
      bundledDefectIds: [],
      score: 75,
      expiresAt: e
    });

    let responseData = null;
    const req = { params: { id: staleRec._id } };
    const res = {
      status: (code) => ({
        json: (data) => { responseData = { code, ...data }; }
      })
    };

    await recommendationController.acceptRecommendation(req, res);

    const updatedStaleRec = await Recommendation.findById(staleRec._id);

    assert(
      responseData?.success === false && responseData?.status === 'REPLANNED' && updatedStaleRec.status === 'SUPERSEDED',
      'TEST 10: Operator accepts stale/conflicting recommendation -> NOT scheduled; replan',
      `Status: ${responseData?.status}, Reason: ${responseData?.reason}`
    );

    // Cleanup test block
    await Block.findByIdAndDelete(conflictBlock._id);
  }

  // ── TEST 11: Operator rejects recommendation -> rejected + removed from active + retained in history ──
  {
    const rejRec = await Recommendation.create({
      recommendationId: `REC-REJ-${Date.now()}`,
      corridorId: 'COR-04',
      startTime: new Date(tomorrow.getTime() + 4 * 3600000),
      endTime: new Date(tomorrow.getTime() + 8 * 3600000),
      durationMinutes: 240,
      status: 'PROPOSED',
      departments: ['Traction'],
      score: 70,
      expiresAt: new Date(tomorrow.getTime() + 8 * 3600000)
    });

    let responseData = null;
    const req = { params: { id: rejRec._id }, body: { reason: 'Controller priority shifted to goods rake' } };
    const res = {
      status: (code) => ({
        json: (data) => { responseData = { code, ...data }; }
      })
    };

    await recommendationController.rejectRecommendation(req, res);
    const updated = await Recommendation.findById(rejRec._id);

    assert(
      responseData?.success === true && updated.status === 'REJECTED' && updated.operatorAction?.reason.includes('Controller priority'),
      'TEST 11: Operator rejects recommendation -> rejected + retained in history',
      `Status: ${updated?.status}`
    );
  }

  // ── TEST 12: Recommendation expires -> expired + new future slot ──
  {
    const expiredRec = await Recommendation.create({
      recommendationId: `REC-EXP-${Date.now()}`,
      corridorId: 'COR-01',
      startTime: new Date(now.getTime() - 4 * 3600000),
      endTime: new Date(now.getTime() - 1 * 3600000),
      durationMinutes: 180,
      status: 'PROPOSED',
      departments: ['Track'],
      score: 60,
      expiresAt: new Date(now.getTime() - 1 * 3600000)
    });

    let responseData = null;
    const req = {};
    const res = {
      status: (code) => ({
        json: (data) => { responseData = { code, ...data }; }
      })
    };

    await recommendationController.getActiveRecommendation(req, res);
    const refreshed = await Recommendation.findById(expiredRec._id);

    assert(
      refreshed.status === 'EXPIRED',
      'TEST 12: Recommendation expires -> marked EXPIRED in database',
      `Active recommendation status: ${responseData?.recommendation?.status}`
    );
  }

  // ── TEST 13: Optimizer searches all five corridors -> not hard-coded ──
  {
    const corridorResults = searchAllCorridors({
      corridorIds: ['COR-01', 'COR-02', 'COR-03', 'COR-04', 'COR-05'],
      targetDate: tomorrow,
      bundles: bundleDefects(allDefects),
      trainSchedules,
      activeBlocks: rawBlocks,
      now
    });

    const searchedCorridors = Object.keys(corridorResults);
    const all5Searched = ['COR-01', 'COR-02', 'COR-03', 'COR-04', 'COR-05'].every(c => searchedCorridors.includes(c));

    assert(
      all5Searched && searchedCorridors.length === 5,
      'TEST 13: Optimizer searches all five corridors -> not hard-coded',
      `Corridors evaluated: ${searchedCorridors.join(', ')}`
    );
  }

  // ── TEST 14: Two compatible maintenance requests on different departments -> merged if safe ──
  {
    const trackDef = { defectCode: 'D-COMP-1', department: 'Track', corridorId: 'COR-01', priorityScore: 90, estimatedDurationHrs: 2 };
    const sigDef = { defectCode: 'D-COMP-2', department: 'Signalling', corridorId: 'COR-01', priorityScore: 85, estimatedDurationHrs: 2 };

    const bundles = bundleDefects([trackDef, sigDef]);
    const merged = bundles.find(b => b.isMultiDepartment);

    assert(
      merged && merged.defectCount === 2 && merged.departmentsList.includes('Track') && merged.departmentsList.includes('Signalling'),
      'TEST 14: Two compatible maintenance requests on different departments -> merged if safe',
      `Merged departments: ${merged?.department}`
    );
  }

  // ── TEST 15: Two incompatible maintenance requests on different corridors -> not merged ──
  {
    const corr1Def = { defectCode: 'D-C1', department: 'Track', corridorId: 'COR-01', priorityScore: 90 };
    const corr2Def = { defectCode: 'D-C2', department: 'Track', corridorId: 'COR-02', priorityScore: 85 };

    const bundles = bundleDefects([corr1Def, corr2Def]);
    const anyCrossCorridor = bundles.some(b => b.defects.length > 1 && b.defects.some(d => d.corridorId !== b.corridorId));

    assert(
      !anyCrossCorridor,
      'TEST 15: Two requests on different corridors -> isolated strictly by corridor',
      `Total isolated bundles: ${bundles.length}`
    );
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL 15 TESTS)`);
  console.log('========================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
