const express = require('express');
const router = express.Router();
const corridorController = require('../controllers/corridorController');

router.get('/', corridorController.getAllCorridors);
router.get('/windows', corridorController.getAllWindows);
router.get('/:id', corridorController.getCorridorStatus);

module.exports = router;
