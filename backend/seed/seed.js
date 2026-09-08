// Controlled Deterministic Seed Data for RailOps AI Prototype
// Covers all 5 Trunk Corridors with clean schedules, realistic requests, and traceable audit history
// Anchored strictly to centralized getNow() / getToday() for consistent presentation stability.

const mongoose = require('mongoose');
const Defect = require('../models/Defect');
const Block = require('../models/Block');
const Corridor = require('../models/Corridor');
const TrainSchedule = require('../models/TrainSchedule');
const FreightForecast = require('../models/FreightForecast');
const BlockWindow = require('../models/BlockWindow');
const Recommendation = require('../models/Recommendation');

const timetableData = require('../data/timetableData');
const freightForecastData = require('../data/freightForecastData');
const blockWindowsData = require('../data/blockWindowsData');
const { getNow, getToday, getTomorrow } = require('../engine/timeUtils');

const CORRIDORS_DATA = [
  { corridorId: 'COR-01', name: 'Delhi–Mumbai', fromStation: 'NDLS', toStation: 'CSMT', totalKm: 1384 },
  { corridorId: 'COR-02', name: 'Delhi–Howrah', fromStation: 'NDLS', toStation: 'HWH', totalKm: 1441 },
  { corridorId: 'COR-03', name: 'Mumbai–Chennai', fromStation: 'CSMT', toStation: 'MAS', totalKm: 1279 },
  { corridorId: 'COR-04', name: 'Howrah–Chennai', fromStation: 'HWH', toStation: 'MAS', totalKm: 1659 },
  { corridorId: 'COR-05', name: 'Delhi–Chennai', fromStation: 'NDLS', toStation: 'MAS', totalKm: 2175 }
];

function generateTrainSchedules(baseDate) {
  const schedules = [];
  const days = [-1, 0, 1, 2]; // yesterday, today, tomorrow, day after
  days.forEach(dayOffset => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(0, 0, 0, 0);

    timetableData.forEach(t => {
      const dep = new Date(d);
      dep.setHours(t.startHour, t.startMin, 0, 0);
      const arr = new Date(d);
      arr.setHours(t.endHour, t.endMin, 0, 0);
      if (arr < dep) {
        arr.setDate(arr.getDate() + 1);
      }

      schedules.push({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        trainType: t.trainType,
        corridorId: t.corridorId,
        track: t.track || (t.trainType === 'Goods' ? 'DN Main' : 'UP Main'),
        departureTime: dep,
        arrivalTime: arr,
        priority: t.priority || 1,
        isAffected: false
      });
    });
  });
  return schedules;
}

const seedDatabase = async (force = true) => {
  const now = getNow();
  const today = getToday(now);
  const tomorrow = getTomorrow(now);

  console.log(`Seeding deterministic RailOps AI dataset for reference date: ${today.toISOString().slice(0, 10)}...`);

  await Corridor.deleteMany({});
  await Defect.deleteMany({});
  await Block.deleteMany({});
  await TrainSchedule.deleteMany({});
  await FreightForecast.deleteMany({});
  await BlockWindow.deleteMany({});
  await Recommendation.deleteMany({});

  // 1. Corridors, Forecasts, Windows, Timetable
  await Corridor.insertMany(CORRIDORS_DATA);
  await FreightForecast.insertMany(freightForecastData);
  await BlockWindow.insertMany(blockWindowsData);
  await TrainSchedule.insertMany(generateTrainSchedules(today));

  // 2. Controlled Active Defects (11 requests across departments & corridors)
  const defectsData = [
    // ── SCENARIO 1: MULTI-DEPARTMENT BUNDLING 1 (COR-03) ──
    {
      defectCode: 'DEF-0101',
      assetId: 'TRK-COR3-301',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-03',
      estimatedDurationHrs: 2.0,
      priority: 'HIGH',
      priorityScore: 88,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-3A',
      faultDescription: 'Rail gauge widening inspection and sleeper renewal at KM 245.4 near Pune.'
    },
    {
      defectCode: 'DEF-0102',
      assetId: 'SIG-COR3-302',
      department: 'Signalling',
      source: 'SMMS',
      corridorId: 'COR-03',
      estimatedDurationHrs: 1.5,
      priority: 'HIGH',
      priorityScore: 84,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-3A',
      faultDescription: 'Point machine electronic interlocking and signal relay inspection at Junction 245.'
    },
    {
      defectCode: 'DEF-0103',
      assetId: 'OHE-COR3-303',
      department: 'Traction',
      source: 'TDMS',
      corridorId: 'COR-03',
      estimatedDurationHrs: 1.0,
      priority: 'MEDIUM',
      priorityScore: 78,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-3A',
      faultDescription: 'OHE contact wire dropper replacement and catenary tension adjustment at KM 245.8.'
    },

    // ── SCENARIO 2: MULTI-DEPARTMENT BUNDLING 2 (COR-02) ──
    {
      defectCode: 'DEF-0201',
      assetId: 'TRK-COR2-201',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-02',
      estimatedDurationHrs: 3.0,
      priority: 'CRITICAL',
      priorityScore: 94,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-2A',
      faultDescription: 'Ultrasonic track flaw detected near Kanpur KM 188. Requires switch rail renewal and machine tamping.'
    },
    {
      defectCode: 'DEF-0202',
      assetId: 'SIG-COR2-202',
      department: 'Signalling',
      source: 'SMMS',
      corridorId: 'COR-02',
      estimatedDurationHrs: 2.0,
      priority: 'HIGH',
      priorityScore: 86,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-2A',
      faultDescription: 'Interlocking equipment maintenance and axle counter calibration at Kanpur junction.'
    },

    // ── SCENARIO 3: PASSENGER-BLOCKED PREFERRED WINDOW (COR-01) ──
    {
      defectCode: 'DEF-0301',
      assetId: 'TRK-COR1-102',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-01',
      estimatedDurationHrs: 2.5,
      priority: 'HIGH',
      priorityScore: 82,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-1B',
      preferredStartHour: 9,
      faultDescription: 'Track geometry correction on UP Main. Preferred morning slot 09:10 blocked by Mumbai Rajdhani Exp (12951).'
    },

    // ── SCENARIO 4: FREIGHT-BLOCKED PREFERRED WINDOW (COR-04) ──
    {
      defectCode: 'DEF-0401',
      assetId: 'OHE-COR4-401',
      department: 'Traction',
      source: 'TDMS',
      corridorId: 'COR-04',
      estimatedDurationHrs: 2.0,
      priority: 'MEDIUM',
      priorityScore: 68,
      status: 'PENDING',
      isSplittable: false,
      workZone: 'Zone-4A',
      preferredStartHour: 10,
      faultDescription: 'Catenary insulator washing and mast earth checking. Morning slot 10:00 blocked by Iron Ore Heavy Haul GDS-401.'
    },

    // ── SCENARIO 5: SPLITTABLE WORK WITH CARRY-FORWARD (COR-05) ──
    {
      defectCode: 'DEF-0501',
      assetId: 'TRK-COR5-501',
      department: 'Track',
      source: 'TMS',
      corridorId: 'COR-05',
      estimatedDurationHrs: 4.0,
      priority: 'HIGH',
      priorityScore: 85,
      status: 'PENDING',
      isSplittable: true,
      workZone: 'Zone-5C',
      faultDescription: 'Deep ballast screening and sleeper spacing adjustment over 800m segment. Splittable into 3h initial block + 1h carry-forward.'
    },

    // ── SCENARIO 6: ROUTINE ROLLING STOCK & ASSET MAINTENANCE ──
    {
      defectCode: 'DEF-0601',
      assetId: 'LOCO-003',
      department: 'Rolling Stock',
      source: 'BDMS',
      corridorId: 'COR-01',
      estimatedDurationHrs: 3.0,
      priority: 'MEDIUM',
      priorityScore: 58,
      status: 'PENDING',
      isSplittable: false,
      faultDescription: 'Traction motor brush wear and bogie clearance inspection at Vadodara shed.'
    },
    {
      defectCode: 'DEF-0602',
      assetId: 'SIG-COR4-412',
      department: 'Signalling',
      source: 'SMMS',
      corridorId: 'COR-04',
      estimatedDurationHrs: 2.0,
      priority: 'LOW',
      priorityScore: 42,
      status: 'PENDING',
      isSplittable: true,
      faultDescription: 'Signalling cable insulation testing and telemetry battery backup check.'
    },
    {
      defectCode: 'DEF-0603',
      assetId: 'OHE-COR5-502',
      department: 'Traction',
      source: 'TDMS',
      corridorId: 'COR-05',
      estimatedDurationHrs: 2.5,
      priority: 'MEDIUM',
      priorityScore: 62,
      status: 'PENDING',
      isSplittable: false,
      faultDescription: 'OHE isolator inspection and pantograph clearance verification at Substation 6.'
    }
  ];

  await Defect.insertMany(defectsData);

  // 3. Controlled Committed Blocks (Clean, purposeful baseline)
  const blocksData = [
    // ── COR-01: Morning completed block + Evening approved block ──
    {
      blockCode: 'BLK-C1-01',
      assetId: 'TRK-COR1-01',
      corridorId: 'COR-01',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(4, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(6, 0, 0, 0); return d; })(),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'HISTORICAL'
    },
    {
      blockCode: 'BLK-C1-02',
      assetId: 'OHE-COR1-02',
      corridorId: 'COR-01',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(today); d.setHours(20, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(21, 45, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },

    // ── COR-02: Morning completed track possession ──
    {
      blockCode: 'BLK-C2-01',
      assetId: 'TRK-COR2-01',
      corridorId: 'COR-02',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(5, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(6, 45, 0, 0); return d; })(),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },

    // ── COR-03: EXACTLY ONE GENUINE ACTIVE CONFLICT PAIR for demo resolution ──
    {
      blockCode: 'BLK-CONF-01',
      assetId: 'TRK-COR3-302',
      corridorId: 'COR-03',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(15, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(17, 30, 0, 0); return d; })(),
      status: 'ACTIVE',
      trainImpact: 1,
      conflictFlags: ['DEPT_CONFLICT'],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },
    {
      blockCode: 'BLK-CONF-02',
      assetId: 'SIG-COR3-303',
      corridorId: 'COR-03',
      department: 'Signalling',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(15, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(18, 0, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 1,
      conflictFlags: ['DEPT_CONFLICT'],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },

    // ── COR-04: Midday track on UP Main (clean) ──
    {
      blockCode: 'BLK-C4-01',
      assetId: 'TRK-COR4-01',
      corridorId: 'COR-04',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(today); d.setHours(12, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(14, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },

    // ── COR-05: Clean afternoon traction possession ──
    {
      blockCode: 'BLK-C5-01',
      assetId: 'OHE-COR5-01',
      corridorId: 'COR-05',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(today); d.setHours(12, 30, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(15, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },

    // ── TOMORROW BLOCKS (Tomorrow): 2 clean approved possessions ──
    {
      blockCode: 'BLK-TM-01',
      assetId: 'TRK-TM-01',
      corridorId: 'COR-01',
      department: 'Track',
      track: 'UP Main',
      startTime: (() => { const d = new Date(tomorrow); d.setHours(2, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(tomorrow); d.setHours(5, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },
    {
      blockCode: 'BLK-TM-02',
      assetId: 'OHE-TM-02',
      corridorId: 'COR-02',
      department: 'Traction',
      track: 'DN Main',
      startTime: (() => { const d = new Date(tomorrow); d.setHours(14, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(tomorrow); d.setHours(16, 30, 0, 0); return d; })(),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    }
  ];

  await Block.insertMany(blocksData);

  // 4. Controlled Purposeful Audit History in Recommendation collection
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const historyRecs = [
    {
      recommendationId: 'REC-HIST-01',
      corridorId: 'COR-01',
      startTime: (() => { const d = new Date(yesterday); d.setHours(2, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(yesterday); d.setHours(6, 0, 0, 0); return d; })(),
      durationMinutes: 240,
      status: 'ACCEPTED',
      departments: ['Track', 'Signalling', 'Traction'],
      score: 96,
      reasons: ['Night golden window consolidation; zero passenger disruption; saved 5.0h corridor downtime.'],
      operatorAction: {
        action: 'ACCEPTED',
        timestamp: (() => { const d = new Date(yesterday); d.setHours(1, 30, 0, 0); return d; })(),
        reason: 'Approved by Chief Controller (Night Shift)',
        operatorId: 'CHIEF_CONTROLLER_01'
      },
      expiresAt: (() => { const d = new Date(yesterday); d.setHours(6, 0, 0, 0); return d; })()
    },
    {
      recommendationId: 'REC-HIST-02',
      corridorId: 'COR-02',
      startTime: (() => { const d = new Date(yesterday); d.setHours(13, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(yesterday); d.setHours(16, 30, 0, 0); return d; })(),
      durationMinutes: 210,
      status: 'ACCEPTED',
      departments: ['Track', 'Signalling'],
      score: 91,
      reasons: ['Midday inter-peak window on Kanpur segment; shared possession.'],
      operatorAction: {
        action: 'ACCEPTED',
        timestamp: (() => { const d = new Date(yesterday); d.setHours(12, 15, 0, 0); return d; })(),
        reason: 'Approved by Sr. DOM',
        operatorId: 'SR_DOM_KANPUR'
      },
      expiresAt: (() => { const d = new Date(yesterday); d.setHours(16, 30, 0, 0); return d; })()
    },
    {
      recommendationId: 'REC-HIST-03',
      corridorId: 'COR-05',
      startTime: (() => { const d = new Date(today); d.setHours(8, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(10, 30, 0, 0); return d; })(),
      durationMinutes: 150,
      status: 'REJECTED',
      departments: ['Traction'],
      score: 72,
      reasons: ['Morning window proposal rejected to prioritize bulk freight rakes dispatch.'],
      operatorAction: {
        action: 'REJECTED',
        timestamp: (() => { const d = new Date(today); d.setHours(7, 45, 0, 0); return d; })(),
        reason: 'Prioritized high-density industrial siding release',
        operatorId: 'CHIEF_CONTROLLER_01'
      },
      expiresAt: (() => { const d = new Date(today); d.setHours(10, 30, 0, 0); return d; })()
    },
    {
      recommendationId: 'REC-HIST-04',
      corridorId: 'COR-04',
      startTime: (() => { const d = new Date(today); d.setHours(6, 0, 0, 0); return d; })(),
      endTime:   (() => { const d = new Date(today); d.setHours(8, 0, 0, 0); return d; })(),
      durationMinutes: 120,
      status: 'EXPIRED',
      departments: ['Signalling'],
      score: 69,
      reasons: ['Window elapsed without operator action; automatically transitioned to audit archive.'],
      operatorAction: {
        action: null,
        timestamp: null,
        reason: 'Window elapsed prior to operator decision',
        operatorId: 'SYSTEM_CLOCK'
      },
      expiresAt: (() => { const d = new Date(today); d.setHours(8, 0, 0, 0); return d; })()
    }
  ];

  await Recommendation.insertMany(historyRecs);

  console.log('Deterministic presentation dataset successfully seeded!');
  console.log('Single source of truth ready: 11 active defects, 5 corridors, 1 genuine conflict pair on COR-03.');
};

module.exports = { seedDatabase };

if (require.main === module) {
  mongoose.connect('mongodb://127.0.0.1:27017/railops_ai')
    .then(() => seedDatabase(true))
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed script error:', err);
      process.exit(1);
    });
}
