// Deterministic Synthetic Train Timetable Data for Indian Railways Trunk Corridors
// Covers all 5 National Trunk Corridors (COR-01 through COR-05)
// GOLDEN DEMO: COR-01 timetable designed so:
//   CAND-01 (01:00-07:00) = INFEASIBLE (12955 Night Rajdhani 00:30-01:30 overlaps)
//   CAND-02 (02:00-08:00) = FEASIBLE   (no passenger; GDS-102 freight 03:20-04:00 = LOW penalty -5 only)
//   CAND-03 (04:00-10:00) = INFEASIBLE (12953 Golden Temple Mail 08:30-09:15 overlaps)
//   CAND-05 (22:00-04:00) = INFEASIBLE (12959 Night Superfast 22:30-23:15 overlaps)
// Availability Calculation:
//   Separate blocks:  (4h+1h) + (2h+1h) + (2h+1h) = 11h
//   Bundled block:    max(4,2,2) + 2.0h shared protection = 6h
//   Time saved:       11 - 6 = 5h
//   Planning horizon: 134.1h
//   Baseline downtime: 11h  => Availability = 1-(11/134.1) = 91.8%
//   Optimized downtime: 4.8h => Availability = 1-(4.8/134.1) = 96.4%

module.exports = [
  // ── COR-01: Delhi–Mumbai ──
  // 00:30-01:30: Night Rajdhani — blocks CAND-01 (01:00-07:00) since envelope starts 00:10
  { trainNumber: '12955', trainName: 'Night Rajdhani Express', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 0, startMin: 30, endHour: 1, endMin: 30, priority: 1 },
  // 03:20-04:00: Automobile Carrier goods — overlaps CAND-02; freight=SOFT penalty only (-5), still FEASIBLE
  { trainNumber: 'GDS-102', trainName: 'Automobile Carrier Rake', trainType: 'Goods', corridorId: 'COR-01', track: 'DN Main', startHour: 3, startMin: 20, endHour: 4, endMin: 0, priority: 2 },
  // 08:30-09:15: Golden Temple Mail — blocks CAND-03 (04:00-10:00) since envelope at 08:10, CAND-02 ends at 08:00 before envelope
  { trainNumber: '12953', trainName: 'Golden Temple Mail', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 8, startMin: 30, endHour: 9, endMin: 15, priority: 1 },
  // 09:30-10:10: Mumbai Rajdhani — further blocks CAND-03 (04:00-10:00)
  { trainNumber: '12951', trainName: 'Mumbai Rajdhani Exp', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 9, startMin: 30, endHour: 10, endMin: 10, priority: 1 },
  // 10:30-11:15: Dedicated Freight Container — daytime goods
  { trainNumber: 'GDS-101', trainName: 'Dedicated Freight Container', trainType: 'Goods', corridorId: 'COR-01', track: 'DN Main', startHour: 10, startMin: 30, endHour: 11, endMin: 15, priority: 2 },
  // 18:20-19:00: Vande Bharat — evening, does not affect early morning candidates
  { trainNumber: '12957', trainName: 'Vande Bharat Express', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 18, startMin: 20, endHour: 19, endMin: 0, priority: 1 },
  // 22:30-23:15: Night Superfast — blocks CAND-05 (22:00-04:00) since envelope at 22:10
  { trainNumber: '12959', trainName: 'Mumbai Night Superfast', trainType: 'Express', corridorId: 'COR-01', track: 'UP Main', startHour: 22, startMin: 30, endHour: 23, endMin: 15, priority: 1 },

  // ── COR-02: Delhi–Howrah ──
  { trainNumber: '12301', trainName: 'Howrah Rajdhani', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 7, startMin: 0, endHour: 7, endMin: 40, priority: 1 },
  { trainNumber: 'GDS-201', trainName: 'Coal Corridor Heavy Haul', trainType: 'Goods', corridorId: 'COR-02', track: 'DN Main', startHour: 9, startMin: 30, endHour: 10, endMin: 15, priority: 2 },
  { trainNumber: '12307', trainName: 'Poorva Express', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 13, startMin: 30, endHour: 14, endMin: 10, priority: 1 },
  { trainNumber: 'GDS-202', trainName: 'Steel Ingot Freight Rake', trainType: 'Goods', corridorId: 'COR-02', track: 'DN Main', startHour: 17, startMin: 0, endHour: 17, endMin: 45, priority: 2 },
  { trainNumber: '12309', trainName: 'Patna Rajdhani', trainType: 'Express', corridorId: 'COR-02', track: 'UP Main', startHour: 20, startMin: 0, endHour: 20, endMin: 45, priority: 1 },

  // ── COR-03: Mumbai–Chennai ──
  { trainNumber: '12163', trainName: 'Chennai Express', trainType: 'Express', corridorId: 'COR-03', track: 'UP Main', startHour: 6, startMin: 45, endHour: 7, endMin: 20, priority: 1 },
  { trainNumber: '11041', trainName: 'CSMT Chennai Superfast', trainType: 'Express', corridorId: 'COR-03', track: 'UP Main', startHour: 11, startMin: 30, endHour: 12, endMin: 15, priority: 1 },
  { trainNumber: 'GDS-301', trainName: 'Foodgrain Transit Special', trainType: 'Goods', corridorId: 'COR-03', track: 'DN Main', startHour: 12, startMin: 30, endHour: 13, endMin: 20, priority: 2 },
  { trainNumber: '12165', trainName: 'Ratnagiri Express', trainType: 'Express', corridorId: 'COR-03', track: 'UP Main', startHour: 19, startMin: 10, endHour: 19, endMin: 50, priority: 1 },

  // ── COR-04: Howrah–Chennai ──
  { trainNumber: '12841', trainName: 'Coromandel Express', trainType: 'Express', corridorId: 'COR-04', track: 'UP Main', startHour: 8, startMin: 0, endHour: 8, endMin: 35, priority: 1 },
  { trainNumber: 'GDS-401', trainName: 'Iron Ore Heavy Haul', trainType: 'Goods', corridorId: 'COR-04', track: 'DN Main', startHour: 10, startMin: 0, endHour: 10, endMin: 45, priority: 2 },
  { trainNumber: '12839', trainName: 'Howrah Chennai Mail', trainType: 'Express', corridorId: 'COR-04', track: 'UP Main', startHour: 15, startMin: 0, endHour: 15, endMin: 40, priority: 1 },
  { trainNumber: 'GDS-402', trainName: 'Fertilizer Rake Special', trainType: 'Goods', corridorId: 'COR-04', track: 'DN Main', startHour: 19, startMin: 30, endHour: 20, endMin: 15, priority: 2 },
  { trainNumber: '12845', trainName: 'Bhubaneswar Superfast', trainType: 'Express', corridorId: 'COR-04', track: 'UP Main', startHour: 21, startMin: 0, endHour: 21, endMin: 35, priority: 1 },

  // ── COR-05: Delhi–Chennai ──
  { trainNumber: '12616', trainName: 'Grand Trunk Express', trainType: 'Express', corridorId: 'COR-05', track: 'UP Main', startHour: 7, startMin: 30, endHour: 8, endMin: 10, priority: 1 },
  { trainNumber: 'GDS-501', trainName: 'Petroleum Tank Rake', trainType: 'Goods', corridorId: 'COR-05', track: 'DN Main', startHour: 11, startMin: 0, endHour: 11, endMin: 40, priority: 2 },
  { trainNumber: '12622', trainName: 'Tamil Nadu Express', trainType: 'Express', corridorId: 'COR-05', track: 'UP Main', startHour: 14, startMin: 20, endHour: 15, endMin: 0, priority: 1 },
  { trainNumber: 'GDS-502', trainName: 'Cement Bulk Cargo', trainType: 'Goods', corridorId: 'COR-05', track: 'DN Main', startHour: 16, startMin: 30, endHour: 17, endMin: 20, priority: 2 },
  { trainNumber: '12626', trainName: 'Kerala Express', trainType: 'Express', corridorId: 'COR-05', track: 'UP Main', startHour: 18, startMin: 30, endHour: 19, endMin: 15, priority: 1 }
];
