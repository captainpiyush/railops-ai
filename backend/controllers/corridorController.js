const Corridor = require('../models/Corridor');
const Block = require('../models/Block');
const Defect = require('../models/Defect');
const BlockWindow = require('../models/BlockWindow');

exports.getAllCorridors = async (req, res) => {
  try {
    const corridors = await Corridor.find();
    
    const results = await Promise.all(corridors.map(async (c) => {
      const activeBlocks = await Block.countDocuments({
        corridorId: c.corridorId,
        status: { $in: ['ACTIVE', 'APPROVED'] }
      });
      return { ...c.toObject(), activeBlocks };
    }));

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllWindows = async (req, res) => {
  try {
    const windows = await BlockWindow.find().sort({ corridorId: 1, windowStart: 1 });
    res.status(200).json(windows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCorridorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const corridor = await Corridor.findOne({ corridorId: id });
    if (!corridor) return res.status(404).json({ error: 'Not found' });

    const blocks = await Block.find({ corridorId: id, status: { $in: ['ACTIVE', 'APPROVED'] } });
    const defects = await Defect.find({ corridorId: id, status: 'PENDING' });

    res.status(200).json({ corridor, activeBlocks: blocks, pendingDefects: defects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
