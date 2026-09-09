// Recommendation Controller for RailOps AI
// Handles full recommendation lifecycle: PROPOSED -> ACCEPTED / REJECTED / EXPIRED / SUPERSEDED
// Implements mandatory validateBeforeCommit() revalidation before any block allocation is committed.

const Recommendation = require('../models/Recommendation');
const Block = require('../models/Block');
const Defect = require('../models/Defect');
const TrainSchedule = require('../models/TrainSchedule');
const FreightForecast = require('../models/FreightForecast');
const BlockWindow = require('../models/BlockWindow');

const { SAFETY_BUFFER_MINUTES, getNow, getToday, getTomorrow, isFutureWindow, formatTime } = require('../engine/timeUtils');
const { evaluatePriority } = require('../engine/priorityScorer');
const { bundleDefects } = require('../engine/blockBundler');
const { generateCandidateWindows } = require('../engine/windowGenerator');
const { scoreCandidateWindow } = require('../engine/windowScorer');
const { evaluateConstraints } = require('../engine/constraintEngine');

const CORRIDOR_IDS = ['COR-01', 'COR-02', 'COR-03', 'COR-04', 'COR-05'];

/**
 * Searches across all five corridors and returns all evaluated candidate windows ranked by score
 */
async function generateAllCorridorCandidates(now = getNow()) {
  const [defects, rawBlocks, trainSchedules, freightForecasts, blockWindows, rejectedRecs] = await Promise.all([
    Defect.find({ status: { $in: ['PENDING', 'BUNDLED'] } }).sort({ createdAt: 1 }).lean(),
    Block.find({ status: { $in: ['PROPOSED', 'APPROVED', 'ACTIVE'] } }).lean(),
    TrainSchedule.find({}).lean(),
    FreightForecast.find({}).lean(),
    BlockWindow.find({}).lean(),
    Recommendation.find({ status: 'REJECTED' }).lean()
  ]);

  const rejectedKeys = new Set(
    rejectedRecs.map(r => `${r.corridorId}_${new Date(r.startTime).getTime()}_${new Date(r.endTime).getTime()}`)
  );

  // 1. Score defects
  const scoredDefects = defects.map(d => {
    const ev = evaluatePriority(d);
    return { ...d, priorityScore: ev.totalScore, _score: ev.totalScore };
  });

  // 2. Intelligent Multi-Department Bundling across corridors
  const bundles = bundleDefects(scoredDefects);

  const allEvaluatedCandidates = [];
  const rejectedSummary = [];

  // Evaluate for Today first, and also evaluate Tomorrow if needed
  const targetDates = [getToday(now), getTomorrow(now)];

  for (const tDate of targetDates) {
    for (const corridorId of CORRIDOR_IDS) {
      // Find matching bundle or default bundle for this corridor
      const bundle = bundles.find(b => b.corridorId === corridorId) || {
        corridorId,
        totalDurationHrs: 4,
        department: 'Track',
        defects: []
      };

      const candidates = generateCandidateWindows({
        corridorId,
        targetDate: tDate,
        requiredDurationHrs: bundle.totalDurationHrs || 4,
        defects: bundle.defects,
        trainSchedules,
        activeBlocks: rawBlocks,
        blockWindows,
        now,
        safetyBufferMinutes: SAFETY_BUFFER_MINUTES
      });

      candidates.forEach(candidate => {
        const candKey = `${corridorId}_${new Date(candidate.windowStart).getTime()}_${new Date(candidate.windowEnd).getTime()}`;
        if (rejectedKeys.has(candKey)) {
          rejectedSummary.push({
            corridorId,
            timeLabel: candidate.timeLabel,
            reason: 'Window previously rejected by operator'
          });
          return;
        }

        const constraintResult = evaluateConstraints({
          windowStart: candidate.windowStart,
          windowEnd: candidate.windowEnd,
          corridorId,
          defects: bundle.defects,
          activeBlocks: rawBlocks,
          trainSchedules,
          freightForecasts,
          blockWindows,
          now,
          safetyBufferMinutes: SAFETY_BUFFER_MINUTES
        });

        const scored = scoreCandidateWindow(candidate, constraintResult, bundle);
        scored.bundle = bundle;
        scored.targetDate = tDate;

        if (scored.feasible) {
          allEvaluatedCandidates.push(scored);
        } else {
          rejectedSummary.push({
            corridorId,
            timeLabel: scored.timeLabel,
            reason: scored.violations[0] || 'Constraint violation'
          });
        }
      });
    }

    // If we found feasible candidates for today, prefer them
    if (allEvaluatedCandidates.length > 0) break;
  }

  // Rank feasible candidates by compositeScore DESC
  allEvaluatedCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    feasibleCandidates: allEvaluatedCandidates,
    rejectedSummary,
    bundles,
    rawBlocks,
    trainSchedules,
    freightForecasts,
    blockWindows
  };
}

/**
 * GET /api/recommendations/active
 * Returns the currently active PROPOSED recommendation or generates one across all 5 corridors
 */
exports.getActiveRecommendation = async (req, res) => {
  try {
    const now = getNow();

    // Check for existing PROPOSED recommendation
    let activeRec = await Recommendation.findOne({ status: 'PROPOSED' }).sort({ createdAt: -1 });

    if (activeRec) {
      // Check if it has expired
      const isPastEarliest = !isFutureWindow(activeRec.startTime, now, SAFETY_BUFFER_MINUTES);
      const isPastEnd = new Date(activeRec.endTime).getTime() <= now.getTime();

      if (isPastEarliest || isPastEnd) {
        activeRec.status = 'EXPIRED';
        await activeRec.save();
        activeRec = null; // trigger new generation
      }
    }

    if (activeRec) {
      return res.status(200).json({ success: true, recommendation: activeRec });
    }

    // Generate new recommendation across all 5 corridors
    const { feasibleCandidates, rejectedSummary, bundles } = await generateAllCorridorCandidates(now);

    if (feasibleCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        recommendation: null,
        message: 'No feasible future maintenance window currently found across all 5 corridors.'
      });
    }

    const bestCandidate = feasibleCandidates[0];
    const bundle = bestCandidate.bundle;
    const recId = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}${String(Math.floor(Math.random() * 900) + 100)}`;

    const newRecommendation = new Recommendation({
      recommendationId: recId,
      corridorId: bestCandidate.corridorId,
      startTime: bestCandidate.windowStart,
      endTime: bestCandidate.windowEnd,
      durationMinutes: bestCandidate.durationMins,
      status: 'PROPOSED',
      departments: bundle.departmentsList || [bundle.department],
      bundledDefectIds: (bundle.defects || []).map(d => d._id).filter(Boolean),
      taskSummary: (bundle.defects || []).map(d => ({
        defectCode: d.defectCode,
        assetId: d.assetId,
        department: d.department,
        priority: d.priority,
        faultDescription: d.faultDescription,
        durationHours: d.estimatedDurationHrs,
        isSplittable: Boolean(d.isSplittable),
        workZone: d.workZone || 'Zone-A'
      })),
      isPartial: Boolean(bestCandidate.metrics?.isPartial),
      carriedForwardMinutes: bestCandidate.metrics?.carriedForwardMinutes || 0,
      score: bestCandidate.compositeScore,
      reasons: bestCandidate.reasons,
      rejectedCandidates: rejectedSummary.slice(0, 6),
      constraintsSatisfied: bestCandidate.constraintsSatisfied,
      constraintsRejected: bestCandidate.constraintsRejected,
      expiresAt: bestCandidate.windowEnd
    });

    await newRecommendation.save();

    res.status(200).json({
      success: true,
      recommendation: newRecommendation
    });
  } catch (err) {
    console.error('Error fetching active recommendation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/recommendations/:id/accept
 * CRITICAL OPERATION: Runs fresh validateBeforeCommit() before committing.
 * If valid -> Commits block (APPROVED) & sets status SCHEDULED.
 * If invalid -> Marks SUPERSEDED, auto-replans across all 5 corridors, returns new proposal.
 */
exports.acceptRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const now = getNow();

    const recommendation = await Recommendation.findById(id);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }

    if (recommendation.status !== 'PROPOSED') {
      return res.status(400).json({
        success: false,
        error: `Cannot accept recommendation with status ${recommendation.status}`
      });
    }

    // ── FRESH CONSTRAINT REVALIDATION (validateBeforeCommit) ──
    const [rawBlocks, trainSchedules, freightForecasts, blockWindows, freshDefects] = await Promise.all([
      Block.find({ status: { $in: ['PROPOSED', 'APPROVED', 'ACTIVE'] } }).lean(),
      TrainSchedule.find({}).lean(),
      FreightForecast.find({}).lean(),
      BlockWindow.find({}).lean(),
      Defect.find({ _id: { $in: recommendation.bundledDefectIds } }).lean()
    ]);

    const validationResult = evaluateConstraints({
      windowStart: recommendation.startTime,
      windowEnd: recommendation.endTime,
      corridorId: recommendation.corridorId,
      defects: freshDefects.length > 0 ? freshDefects : recommendation.taskSummary,
      activeBlocks: rawBlocks,
      trainSchedules,
      freightForecasts,
      blockWindows,
      now,
      safetyBufferMinutes: SAFETY_BUFFER_MINUTES
    });

    if (!validationResult.feasible) {
      // Recommendation is stale / invalid! DO NOT COMMIT!
      recommendation.status = 'SUPERSEDED';
      await recommendation.save();

      // Trigger automatic re-planning across all 5 corridors
      const { feasibleCandidates, rejectedSummary, bundles } = await generateAllCorridorCandidates(now);
      let newRec = null;

      if (feasibleCandidates.length > 0) {
        const nextBest = feasibleCandidates[0];
        const nBundle = nextBest.bundle;
        const nRecId = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}${String(Math.floor(Math.random() * 900) + 100)}`;

        newRec = new Recommendation({
          recommendationId: nRecId,
          corridorId: nextBest.corridorId,
          startTime: nextBest.windowStart,
          endTime: nextBest.windowEnd,
          durationMinutes: nextBest.durationMins,
          status: 'PROPOSED',
          departments: nBundle.departmentsList || [nBundle.department],
          bundledDefectIds: (nBundle.defects || []).map(d => d._id).filter(Boolean),
          taskSummary: (nBundle.defects || []).map(d => ({
            defectCode: d.defectCode,
            assetId: d.assetId,
            department: d.department,
            priority: d.priority,
            faultDescription: d.faultDescription,
            durationHours: d.estimatedDurationHrs,
            isSplittable: Boolean(d.isSplittable),
            workZone: d.workZone || 'Zone-A'
          })),
          isPartial: Boolean(nextBest.metrics?.isPartial),
          carriedForwardMinutes: nextBest.metrics?.carriedForwardMinutes || 0,
          score: nextBest.compositeScore,
          reasons: nextBest.reasons,
          rejectedCandidates: rejectedSummary.slice(0, 6),
          constraintsSatisfied: nextBest.constraintsSatisfied,
          constraintsRejected: nextBest.constraintsRejected,
          expiresAt: nextBest.windowEnd
        });
        await newRec.save();
      }

      return res.status(200).json({
        success: false,
        status: 'REPLANNED',
        reason: validationResult.rejectionReasons[0] || 'Proposed window is no longer available.',
        previousRecommendationId: recommendation._id,
        newRecommendation: newRec,
        message: `Original window is no longer safe (${validationResult.rejectionReasons[0] || 'Schedule collision'}). AI has automatically recalculated the next best safe window.`
      });
    }

    // ── COMMIT TRANSACTION ──
    const blockCode = `BLK-COORD-${String(Math.floor(Math.random() * 900) + 100)}`;
    const primaryAssetId = recommendation.taskSummary?.[0]?.assetId || `${recommendation.corridorId}-ASSET-01`;

    const newBlock = new Block({
      blockCode,
      assetId: primaryAssetId,
      corridorId: recommendation.corridorId,
      department: recommendation.departments.join(' + '),
      track: 'UP Main',
      startTime: recommendation.startTime,
      endTime: recommendation.endTime,
      status: 'APPROVED',
      bundledDefects: recommendation.bundledDefectIds,
      conflictFlags: [],
      trainImpact: 0,
      safetyBufferMinutes: SAFETY_BUFFER_MINUTES,
      source: 'AI_OPTIMIZED',
      linkedRecommendationId: recommendation._id
    });

    await newBlock.save();

    // Handle partial execution / splittable tasks carry forward
    if (recommendation.isPartial && recommendation.carriedForwardMinutes > 0) {
      for (const dId of recommendation.bundledDefectIds) {
        const originalDefect = await Defect.findById(dId);
        if (originalDefect && originalDefect.isSplittable) {
          const carriedDefectCode = `${originalDefect.defectCode}-P2`;
          const remainingHrs = parseFloat((recommendation.carriedForwardMinutes / 60).toFixed(1));
          
          await Defect.create({
            defectCode: carriedDefectCode,
            assetId: originalDefect.assetId,
            department: originalDefect.department,
            source: originalDefect.source,
            faultDescription: `[Carried Forward] Remaining maintenance: ${originalDefect.faultDescription}`,
            priority: originalDefect.priority,
            priorityScore: originalDefect.priorityScore,
            status: 'PENDING',
            corridorId: originalDefect.corridorId,
            estimatedDurationHrs: remainingHrs,
            isSplittable: true,
            carriedForwardFrom: originalDefect._id
          });
        }
      }
    }

    // Update bundled defects to BUNDLED status
    if (recommendation.bundledDefectIds?.length > 0) {
      await Defect.updateMany(
        { _id: { $in: recommendation.bundledDefectIds } },
        { $set: { status: 'BUNDLED' } }
      );
    }

    // Update recommendation status to ACCEPTED / SCHEDULED
    recommendation.status = 'ACCEPTED';
    recommendation.resultingBlockId = newBlock._id;
    recommendation.operatorAction = {
      action: 'ACCEPTED',
      timestamp: now,
      reason: 'Chief Controller Approval via AI Recommendation Card',
      operatorId: 'CHIEF_CONTROLLER_01'
    };
    await recommendation.save();

    res.status(200).json({
      success: true,
      status: 'SCHEDULED',
      message: `Recommendation accepted and validated. Coordinated block ${blockCode} committed to schedule.`,
      block: newBlock,
      recommendation
    });
  } catch (err) {
    console.error('Error accepting recommendation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/recommendations/:id/reject
 * Marks recommendation as REJECTED and preserves audit history
 */
exports.rejectRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, operatorId = 'Senior Divisional Operations Manager (Sr. DOM)' } = req.body || {};
    const now = getNow();

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    }

    const recommendation = await Recommendation.findById(id);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }

    recommendation.status = 'REJECTED';
    recommendation.operatorAction = {
      action: 'REJECTED',
      timestamp: now,
      reason: reason.trim(),
      operatorId: operatorId || req.body.operatorRole || 'Senior Divisional Operations Manager (Sr. DOM)'
    };
    await recommendation.save();

    res.status(200).json({
      success: true,
      status: 'REJECTED',
      message: 'Recommendation rejected and recorded in operations audit history.',
      recommendation
    });
  } catch (err) {
    console.error('Error rejecting recommendation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/recommendations/history
 * Returns audit ledger of all recommendation decisions
 */
exports.getRecommendationHistory = async (req, res) => {
  try {
    const history = await Recommendation.find({})
      .sort({ createdAt: -1 })
      .populate('resultingBlockId')
      .lean();

    res.status(200).json(history);
  } catch (err) {
    console.error('Error fetching recommendation history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
