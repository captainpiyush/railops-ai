// Controlled Deterministic Dataset for RailOps AI Prototype (Sep 25 - Nov 10, 2026)
// Provides pristine data for all 5 Trunk Corridors:
//   COR-01: Delhi - Mumbai (Golden Demo)
//   COR-02: Delhi - Howrah
//   COR-03: Mumbai - Chennai
//   COR-04: Howrah - Chennai
//   COR-05: Delhi - Chennai

export const BASE_DATE_STR = '2026-09-25';
export const BASE_DATE = new Date('2026-09-25T10:00:00');

export const CORRIDORS = [
  { corridorId: 'COR-01', name: 'Delhi–Mumbai', fromStation: 'NDLS', toStation: 'CSMT', totalKm: 1384 },
  { corridorId: 'COR-02', name: 'Delhi–Howrah', fromStation: 'NDLS', toStation: 'HWH', totalKm: 1441 },
  { corridorId: 'COR-03', name: 'Mumbai–Chennai', fromStation: 'CSMT', toStation: 'MAS', totalKm: 1279 },
  { corridorId: 'COR-04', name: 'Howrah–Chennai', fromStation: 'HWH', toStation: 'MAS', totalKm: 1659 },
  { corridorId: 'COR-05', name: 'Delhi–Chennai', fromStation: 'NDLS', toStation: 'MAS', totalKm: 2175 }
];

export const INITIAL_DEFECTS = [
  // ── GOLDEN DEMO: COR-01 (Delhi - Mumbai) Multi-Department Bundle ──
  {
    _id: 'DEF-0101',
    defectCode: 'DEF-0101',
    assetId: 'TRK-COR1-101',
    department: 'Track',
    source: 'TMS',
    corridorId: 'COR-01',
    estimatedDurationHrs: 4.0,
    priority: 'CRITICAL',
    priorityScore: 94,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Zone-1A',
    isAiSuggested: true,
    suggestedBundleId: 'BNDL-COR1-01',
    faultDescription: 'Deep rail gauge widening, flaw detection and sleeper renewal at KM 245.4 near Vadodara.'
  },
  {
    _id: 'DEF-0102',
    defectCode: 'DEF-0102',
    assetId: 'SIG-COR1-102',
    department: 'Signalling',
    source: 'SMMS',
    corridorId: 'COR-01',
    estimatedDurationHrs: 2.0,
    priority: 'HIGH',
    priorityScore: 84,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Zone-1A',
    isAiSuggested: true,
    suggestedBundleId: 'BNDL-COR1-01',
    faultDescription: 'Point machine electronic interlocking and signal relay calibration at Junction 245.'
  },
  {
    _id: 'DEF-0103',
    defectCode: 'DEF-0103',
    assetId: 'OHE-COR1-103',
    department: 'Traction',
    source: 'TDMS',
    corridorId: 'COR-01',
    estimatedDurationHrs: 2.0,
    priority: 'HIGH',
    priorityScore: 84,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Zone-1A',
    isAiSuggested: true,
    suggestedBundleId: 'BNDL-COR1-01',
    faultDescription: 'OHE 25kV contact wire dropper replacement and catenary tension adjustment at KM 245.8.'
  },

  // ── SCENARIO 2: COR-02 (Delhi - Howrah) ──
  {
    _id: 'DEF-0201',
    defectCode: 'DEF-0201',
    assetId: 'TRK-COR2-201',
    department: 'Track',
    source: 'TMS',
    corridorId: 'COR-02',
    estimatedDurationHrs: 3.0,
    priority: 'CRITICAL',
    priorityScore: 92,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Zone-2A',
    isAiSuggested: true,
    suggestedBundleId: 'BNDL-COR2-01',
    faultDescription: 'Ultrasonic flaw detected near Kanpur KM 188. Requires switch rail renewal and machine tamping.'
  },
  {
    _id: 'DEF-0202',
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
    isAiSuggested: true,
    suggestedBundleId: 'BNDL-COR2-01',
    faultDescription: 'Interlocking equipment maintenance and axle counter recalibration at Kanpur outer.'
  },

  // ── SCENARIO 3: COR-03 (Mumbai - Chennai) ──
  {
    _id: 'DEF-0301',
    defectCode: 'DEF-0301',
    assetId: 'TRK-COR3-301',
    department: 'Track',
    source: 'TMS',
    corridorId: 'COR-03',
    estimatedDurationHrs: 2.5,
    priority: 'HIGH',
    priorityScore: 82,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Zone-3B',
    faultDescription: 'Track geometry correction on Pune-Solapur section.'
  },

  // ── SCENARIO 4: COR-04 (Howrah - Chennai) ──
  {
    _id: 'DEF-0401',
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
    faultDescription: 'Catenary insulator washing and mast earth resistance check near Kharagpur.'
  },

  // ── SCENARIO 5: COR-05 (Delhi - Chennai) Splittable Work ──
  {
    _id: 'DEF-0501',
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
    faultDescription: 'Deep ballast screening and sleeper spacing over 800m track segment (Splittable: 3h + 1h).'
  },
  {
    _id: 'DEF-0502',
    defectCode: 'DEF-0502',
    assetId: 'OHE-COR5-502',
    department: 'Traction',
    source: 'TDMS',
    corridorId: 'COR-05',
    estimatedDurationHrs: 2.5,
    priority: 'MEDIUM',
    priorityScore: 65,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Zone-5C',
    faultDescription: 'OHE isolator inspection and pantograph clearance check at Substation 6.'
  },

  // ── SCENARIO 6: Rolling Stock & Depots (BDMS) & Routine Tasks ──
  {
    _id: 'DEF-0601',
    defectCode: 'DEF-0601',
    assetId: 'LOCO-WAP7-003',
    department: 'Rolling Stock',
    source: 'BDMS',
    corridorId: 'COR-01',
    estimatedDurationHrs: 3.0,
    priority: 'MEDIUM',
    priorityScore: 60,
    status: 'PENDING',
    isSplittable: false,
    workZone: 'Vadodara Shed',
    faultDescription: 'Traction motor carbon brush wear and bogie clearance overhaul at Vadodara electric shed.'
  },
  {
    _id: 'DEF-0602',
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
    workZone: 'Zone-4B',
    faultDescription: 'Signalling cable insulation testing and standby power battery bank check.'
  }
];

export function generateSchedulesForBaseDate(baseDate) {
  const d = new Date(baseDate);
  const makeTime = (hour, min) => {
    const t = new Date(d);
    t.setHours(hour, min, 0, 0);
    return t.toISOString();
  };

  return [
    // ── COR-01: Delhi–Mumbai ──
    {
      _id: 'SCH-C1-01',
      trainNumber: '12955',
      trainName: 'Night Rajdhani Express',
      trainType: 'Express',
      corridorId: 'COR-01',
      track: 'UP Main',
      departureTime: makeTime(0, 30),
      arrivalTime: makeTime(1, 30),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C1-02',
      trainNumber: 'GDS-102',
      trainName: 'Automobile Carrier Rake',
      trainType: 'Goods',
      corridorId: 'COR-01',
      track: 'DN Main',
      departureTime: makeTime(3, 20),
      arrivalTime: makeTime(4, 0),
      priority: 2,
      impactStatus: 'REGULATED (Soft -5 Penalty)'
    },
    {
      _id: 'SCH-C1-03',
      trainNumber: '12953',
      trainName: 'Golden Temple Mail',
      trainType: 'Express',
      corridorId: 'COR-01',
      track: 'UP Main',
      departureTime: makeTime(8, 30),
      arrivalTime: makeTime(9, 15),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C1-04',
      trainNumber: '12951',
      trainName: 'Mumbai Rajdhani Exp',
      trainType: 'Express',
      corridorId: 'COR-01',
      track: 'UP Main',
      departureTime: makeTime(9, 30),
      arrivalTime: makeTime(10, 10),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C1-05',
      trainNumber: 'GDS-101',
      trainName: 'Dedicated Freight Container',
      trainType: 'Goods',
      corridorId: 'COR-01',
      track: 'DN Main',
      departureTime: makeTime(10, 30),
      arrivalTime: makeTime(11, 15),
      priority: 2,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C1-06',
      trainNumber: '12957',
      trainName: 'Vande Bharat Express',
      trainType: 'Express',
      corridorId: 'COR-01',
      track: 'UP Main',
      departureTime: makeTime(18, 20),
      arrivalTime: makeTime(19, 0),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C1-07',
      trainNumber: '12959',
      trainName: 'Mumbai Night Superfast',
      trainType: 'Express',
      corridorId: 'COR-01',
      track: 'UP Main',
      departureTime: makeTime(22, 30),
      arrivalTime: makeTime(23, 15),
      priority: 1,
      impactStatus: 'CLEAR'
    },

    // ── COR-02: Delhi–Howrah ──
    {
      _id: 'SCH-C2-01',
      trainNumber: '12301',
      trainName: 'Howrah Rajdhani',
      trainType: 'Express',
      corridorId: 'COR-02',
      track: 'UP Main',
      departureTime: makeTime(7, 0),
      arrivalTime: makeTime(7, 40),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C2-02',
      trainNumber: 'GDS-201',
      trainName: 'Coal Corridor Heavy Haul',
      trainType: 'Goods',
      corridorId: 'COR-02',
      track: 'DN Main',
      departureTime: makeTime(9, 30),
      arrivalTime: makeTime(10, 15),
      priority: 2,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C2-03',
      trainNumber: '12307',
      trainName: 'Poorva Express',
      trainType: 'Express',
      corridorId: 'COR-02',
      track: 'UP Main',
      departureTime: makeTime(13, 30),
      arrivalTime: makeTime(14, 10),
      priority: 1,
      impactStatus: 'CLEAR'
    },

    // ── COR-03: Mumbai–Chennai ──
    {
      _id: 'SCH-C3-01',
      trainNumber: '12163',
      trainName: 'Chennai Express',
      trainType: 'Express',
      corridorId: 'COR-03',
      track: 'UP Main',
      departureTime: makeTime(6, 45),
      arrivalTime: makeTime(7, 20),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C3-02',
      trainNumber: '11041',
      trainName: 'CSMT Chennai Superfast',
      trainType: 'Express',
      corridorId: 'COR-03',
      track: 'UP Main',
      departureTime: makeTime(11, 30),
      arrivalTime: makeTime(12, 15),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C3-03',
      trainNumber: 'GDS-301',
      trainName: 'Foodgrain Transit Special',
      trainType: 'Goods',
      corridorId: 'COR-03',
      track: 'DN Main',
      departureTime: makeTime(12, 30),
      arrivalTime: makeTime(13, 20),
      priority: 2,
      impactStatus: 'CLEAR'
    },

    // ── COR-04: Howrah–Chennai ──
    {
      _id: 'SCH-C4-01',
      trainNumber: '12841',
      trainName: 'Coromandel Express',
      trainType: 'Express',
      corridorId: 'COR-04',
      track: 'UP Main',
      departureTime: makeTime(8, 0),
      arrivalTime: makeTime(8, 35),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C4-02',
      trainNumber: 'GDS-401',
      trainName: 'Iron Ore Heavy Haul',
      trainType: 'Goods',
      corridorId: 'COR-04',
      track: 'DN Main',
      departureTime: makeTime(10, 0),
      arrivalTime: makeTime(10, 45),
      priority: 2,
      impactStatus: 'CLEAR'
    },

    // ── COR-05: Delhi–Chennai ──
    {
      _id: 'SCH-C5-01',
      trainNumber: '12616',
      trainName: 'Grand Trunk Express',
      trainType: 'Express',
      corridorId: 'COR-05',
      track: 'UP Main',
      departureTime: makeTime(7, 30),
      arrivalTime: makeTime(8, 10),
      priority: 1,
      impactStatus: 'CLEAR'
    },
    {
      _id: 'SCH-C5-02',
      trainNumber: 'GDS-501',
      trainName: 'Petroleum Tank Rake',
      trainType: 'Goods',
      corridorId: 'COR-05',
      track: 'DN Main',
      departureTime: makeTime(11, 0),
      arrivalTime: makeTime(11, 40),
      priority: 2,
      impactStatus: 'CLEAR'
    }
  ];
}

export function generateBlocksForBaseDate(baseDate) {
  const d = new Date(baseDate);
  const makeTime = (hour, min) => {
    const t = new Date(d);
    t.setHours(hour, min, 0, 0);
    return t.toISOString();
  };

  return [
    {
      _id: 'BLK-C1-01',
      blockCode: 'BLK-C1-01',
      assetId: 'TRK-COR1-01',
      corridorId: 'COR-01',
      department: 'Track',
      track: 'UP Main',
      startTime: makeTime(4, 30),
      endTime: makeTime(6, 0),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'HISTORICAL'
    },
    {
      _id: 'BLK-C1-02',
      blockCode: 'BLK-C1-02',
      assetId: 'OHE-COR1-02',
      corridorId: 'COR-01',
      department: 'Traction',
      track: 'DN Main',
      startTime: makeTime(20, 0),
      endTime: makeTime(21, 45),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },
    {
      _id: 'BLK-C2-01',
      blockCode: 'BLK-C2-01',
      assetId: 'TRK-COR2-01',
      corridorId: 'COR-02',
      department: 'Track',
      track: 'UP Main',
      startTime: makeTime(5, 0),
      endTime: makeTime(6, 45),
      status: 'COMPLETED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },
    // ── COR-03: Controlled genuine active conflict pair for demo resolution ──
    {
      _id: 'BLK-CONF-01',
      blockCode: 'BLK-CONF-01',
      assetId: 'TRK-COR3-302',
      corridorId: 'COR-03',
      department: 'Track',
      track: 'UP Main',
      startTime: makeTime(15, 0),
      endTime: makeTime(17, 30),
      status: 'ACTIVE',
      trainImpact: 1,
      conflictFlags: ['DEPT_CONFLICT'],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },
    {
      _id: 'BLK-CONF-02',
      blockCode: 'BLK-CONF-02',
      assetId: 'SIG-COR3-303',
      corridorId: 'COR-03',
      department: 'Signalling',
      track: 'UP Main',
      startTime: makeTime(15, 30),
      endTime: makeTime(18, 0),
      status: 'APPROVED',
      trainImpact: 1,
      conflictFlags: ['DEPT_CONFLICT'],
      safetyBufferMinutes: 20,
      source: 'MANUAL'
    },
    {
      _id: 'BLK-C4-01',
      blockCode: 'BLK-C4-01',
      assetId: 'TRK-COR4-01',
      corridorId: 'COR-04',
      department: 'Track',
      track: 'UP Main',
      startTime: makeTime(12, 0),
      endTime: makeTime(14, 30),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    },
    {
      _id: 'BLK-C5-01',
      blockCode: 'BLK-C5-01',
      assetId: 'OHE-COR5-01',
      corridorId: 'COR-05',
      department: 'Traction',
      track: 'DN Main',
      startTime: makeTime(12, 30),
      endTime: makeTime(15, 30),
      status: 'APPROVED',
      trainImpact: 0,
      conflictFlags: [],
      safetyBufferMinutes: 20,
      source: 'AI_OPTIMIZED'
    }
  ];
}

export const INITIAL_CORRIDOR_WINDOWS = [
  { corridorId: 'COR-01', windowStart: '00:00', windowEnd: '08:00', available: true, trafficLevel: 'LOW', description: 'Primary Overhaul & Maintenance Window (Night Shift)' },
  { corridorId: 'COR-01', windowStart: '08:00', windowEnd: '12:30', available: false, trafficLevel: 'HIGH', description: 'Morning Superfast Express & Intercity Peak — Blocks Prohibited' },
  { corridorId: 'COR-01', windowStart: '12:30', windowEnd: '17:00', available: true, trafficLevel: 'MEDIUM', description: 'Secondary Afternoon Maintenance Window' },
  { corridorId: 'COR-01', windowStart: '17:00', windowEnd: '22:00', available: false, trafficLevel: 'HIGH', description: 'Evening Express Departures Peak — Blocks Prohibited' },
  { corridorId: 'COR-01', windowStart: '22:00', windowEnd: '24:00', available: true, trafficLevel: 'LOW', description: 'Late Night Pre-Block Preparation Window' },
  { corridorId: 'COR-02', windowStart: '01:00', windowEnd: '07:30', available: true, trafficLevel: 'LOW' },
  { corridorId: 'COR-02', windowStart: '07:30', windowEnd: '13:00', available: false, trafficLevel: 'HIGH' },
  { corridorId: 'COR-03', windowStart: '01:30', windowEnd: '08:00', available: true, trafficLevel: 'LOW' },
  { corridorId: 'COR-04', windowStart: '01:00', windowEnd: '07:00', available: true, trafficLevel: 'LOW' },
  { corridorId: 'COR-05', windowStart: '01:00', windowEnd: '08:00', available: true, trafficLevel: 'LOW' }
];

export function getInitialActiveRecommendation(baseDate) {
  const d = new Date(baseDate);
  const start = new Date(d);
  start.setHours(2, 0, 0, 0);
  const end = new Date(d);
  end.setHours(8, 0, 0, 0);

  return {
    _id: 'REC-GOLDEN-01',
    recommendationId: 'REC-GOLDEN-01',
    candidateId: 'CAND-02',
    corridorId: 'COR-01',
    corridorName: 'Delhi–Mumbai (COR-01)',
    track: 'UP Main',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    timeLabel: '02:00 – 08:00',
    shiftName: 'Early Night Golden Window',
    durationMinutes: 360,
    durationHrs: 6.0,
    status: 'PENDING_REVIEW',
    score: 78,
    compositeScore: 78,
    feasible: true,
    departments: ['Track', 'Signalling', 'Traction'],
    departmentsList: ['Track', 'Signalling', 'Traction'],
    timeSavedHrs: 5.0,
    separateDurationHrs: 11.0,
    totalDurationHrs: 6.0,
    rawWorkHours: 8.0,
    baselineAvailabilityPct: 91.8,
    optimizedAvailabilityPct: 96.4,
    availabilityGainPct: 4.6,
    planningHorizonHours: 134.1,
    taskSummary: [
      {
        defectCode: 'DEF-0101',
        assetId: 'TRK-COR1-101',
        department: 'Track',
        priority: 'CRITICAL',
        durationHours: 4.0,
        description: 'Deep rail gauge widening and sleeper renewal'
      },
      {
        defectCode: 'DEF-0102',
        assetId: 'SIG-COR1-102',
        department: 'Signalling',
        priority: 'HIGH',
        durationHours: 2.0,
        description: 'Point machine electronic interlocking inspection'
      },
      {
        defectCode: 'DEF-0103',
        assetId: 'OHE-COR1-103',
        department: 'Traction',
        priority: 'HIGH',
        durationHours: 2.0,
        description: 'OHE contact wire dropper replacement'
      }
    ],
    reasons: [
      'Strict future window with verified safety clearance (02:00–08:00)',
      'Consolidates 3 compatible departmental tasks (DEF-0101, DEF-0102, DEF-0103) into 1 shared possession',
      'Saves 5.0 hours of corridor downtime (11.0h separate -> 6.0h bundled)',
      'Increases corridor asset availability from 91.8% to 96.4% (+4.6 percentage points)',
      'Zero passenger express movements disrupted during night slot',
      'Low freight interference: 1 freight rake (GDS-102 at 03:20) managed with soft speed regulation (-5 penalty)'
    ]
  };
}

export const INITIAL_HISTORY = [
  {
    recommendationId: 'REC-HIST-01',
    corridorId: 'COR-01',
    startTime: '2026-09-24T02:00:00.000Z',
    endTime: '2026-09-24T06:00:00.000Z',
    durationMinutes: 240,
    status: 'ACCEPTED',
    departments: ['Track', 'Signalling', 'Traction'],
    score: 96,
    reasons: ['Night golden window consolidation; zero passenger disruption; saved 5.0h corridor downtime.'],
    operatorAction: {
      action: 'ACCEPTED',
      timestamp: '2026-09-24T01:30:00.000Z',
      reason: 'Approved by Chief Controller (Night Shift)',
      operatorId: 'CHIEF_CONTROLLER_01'
    }
  },
  {
    recommendationId: 'REC-HIST-02',
    corridorId: 'COR-02',
    startTime: '2026-09-24T13:00:00.000Z',
    endTime: '2026-09-24T16:30:00.000Z',
    durationMinutes: 210,
    status: 'ACCEPTED',
    departments: ['Track', 'Signalling'],
    score: 91,
    reasons: ['Midday inter-peak window on Kanpur segment; shared possession.'],
    operatorAction: {
      action: 'ACCEPTED',
      timestamp: '2026-09-24T12:15:00.000Z',
      reason: 'Approved by Sr. DOM',
      operatorId: 'SR_DOM_KANPUR'
    }
  },
  {
    recommendationId: 'REC-HIST-03',
    corridorId: 'COR-05',
    startTime: '2026-09-25T08:00:00.000Z',
    endTime: '2026-09-25T10:30:00.000Z',
    durationMinutes: 150,
    status: 'REJECTED',
    departments: ['Traction'],
    score: 72,
    reasons: ['Morning window proposal rejected to prioritize bulk freight rakes dispatch.'],
    operatorAction: {
      action: 'REJECTED',
      timestamp: '2026-09-25T07:45:00.000Z',
      reason: 'Prioritized high-density industrial siding release (Bulk Coal rake transit)',
      operatorId: 'CHIEF_CONTROLLER_01'
    }
  }
];
