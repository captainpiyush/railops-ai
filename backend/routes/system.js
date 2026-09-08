const express = require('express');
const router = express.Router();
const { getDemoConfig, setDemoConfig } = require('../engine/timeUtils');
const { seedDatabase } = require('../seed/seed');

// GET /api/system/clock
router.get('/clock', (req, res) => {
  res.json({
    success: true,
    ...getDemoConfig()
  });
});

// POST /api/system/clock
router.post('/clock', (req, res) => {
  const { isDemoMode, effectiveDate, effectiveTime } = req.body;
  const updated = setDemoConfig({
    ...(typeof isDemoMode === 'boolean' && { isDemoMode }),
    ...(effectiveDate && { effectiveDate }),
    ...(effectiveTime && { effectiveTime })
  });
  res.json({
    success: true,
    message: 'Demo clock updated',
    ...updated
  });
});

// POST /api/system/reset
router.post('/reset', async (req, res) => {
  try {
    console.log('API requested system reset to clean deterministic presentation dataset...');
    await seedDatabase(true);
    res.json({
      success: true,
      message: 'System reset complete. Pristine deterministic presentation dataset restored.',
      clock: getDemoConfig()
    });
  } catch (err) {
    console.error('System reset error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
