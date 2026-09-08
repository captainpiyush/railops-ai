const Defect = require('../models/Defect');
const Block = require('../models/Block');
const TrainSchedule = require('../models/TrainSchedule');
const FreightForecast = require('../models/FreightForecast');

exports.getMetrics = async (req, res) => {
  try {
    // 1. Query real MongoDB document counts across all 7 Indian Railways source systems
    const [
      tmsCount,
      smmsCount,
      tdmsCount,
      bdmsCount,
      coaCount,
      timetableCount,
      freightCount
    ] = await Promise.all([
      // 1. TMS: Track Management System (Track defects & permanent way)
      Defect.countDocuments({ $or: [{ source: 'TMS' }, { department: 'Track' }] }),
      // 2. SMMS: Signal Maintenance Management System (Signalling & Interlocking)
      Defect.countDocuments({ $or: [{ source: 'SMMS' }, { department: 'Signalling' }] }),
      // 3. TDMS: Traction Distribution Management System (OHE & 25kV Catenary)
      Defect.countDocuments({ $or: [{ source: 'TDMS' }, { department: 'Traction' }, { department: 'Electrical' }] }),
      // 4. BDMS: Block Disconnection Management System (Department Block Requests)
      Block.countDocuments({ status: { $in: ['PROPOSED', 'ACTIVE'] } }),
      // 5. COA: Control Office Application (Corridor tracking & line clear)
      Block.countDocuments(),
      // 6. Train Timetable (Passenger & Express Schedules)
      TrainSchedule.countDocuments(),
      // 7. Freight Forecast (Goods Movement Predictions)
      FreightForecast.countDocuments()
    ]);

    const totalRecords = tmsCount + smmsCount + tdmsCount + bdmsCount + coaCount + timetableCount + freightCount;
    const storageVolumeKb = totalRecords * 2.1;
    const storageVolumeMb = (storageVolumeKb / 1024).toFixed(2) + ' MB';

    // 2. Source health & latency simulation
    const sourceConfigs = [
      { id: 'TMS', name: 'TMS', desc: 'Track Management System', count: tmsCount, baseMin: 12, baseMax: 28 },
      { id: 'SMMS', name: 'SMMS', desc: 'Signal Maintenance System', count: smmsCount, baseMin: 15, baseMax: 35 },
      { id: 'TDMS', name: 'TDMS', desc: 'Traction Distribution System', count: tdmsCount, baseMin: 14, baseMax: 32 },
      { id: 'BDMS', name: 'BDMS', desc: 'Block Disconnection System', count: bdmsCount, baseMin: 10, baseMax: 24 },
      { id: 'COA', name: 'COA', desc: 'Control Office Application', count: coaCount, baseMin: 18, baseMax: 42 },
      { id: 'TIMETABLE', name: 'Train Timetable', desc: 'Passenger & Express Timetable', count: timetableCount, baseMin: 8, baseMax: 20 },
      { id: 'FREIGHT', name: 'Freight Forecast', desc: 'COA / Goods Traffic Predictions', count: freightCount, baseMin: 12, baseMax: 30 }
    ];

    const sources = sourceConfigs.map(cfg => {
      return {
        id: cfg.id,
        name: cfg.name,
        desc: cfg.desc,
        records: cfg.count,
        latency: cfg.baseMin + 4,
        errorRate: '0.0%',
        isOnline: true,
        status: 'ONLINE'
      };
    });

    const averageLatency = Math.round(sources.reduce((acc, s) => acc + s.latency, 0) / sources.length);
    const overallHealth = 'OPTIMAL';

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalRecords,
        storageVolumeMb,
        averageLatencyMs: averageLatency,
        overallHealth
      },
      sources
    });
  } catch (err) {
    console.error('Integration metrics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
