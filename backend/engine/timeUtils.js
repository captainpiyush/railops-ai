// Centralized Time Utilities for RailOps AI Engine
// Enforces single source of truth for runtime dates, safety buffers, candidate time validation,
// and controlled Demo Mode / presentation clock.

const SAFETY_BUFFER_MINUTES = 20;

let demoConfig = {
  isDemoMode: true,
  effectiveDate: '2026-09-25',
  effectiveTime: '10:00:00'
};

/**
 * Returns current reference time.
 * In Demo Mode, constructs Date from effectiveDate & effectiveTime.
 * Otherwise returns system new Date().
 */
function getNow() {
  if (demoConfig.isDemoMode) {
    return new Date(`${demoConfig.effectiveDate}T${demoConfig.effectiveTime}`);
  }
  return new Date();
}

function getDemoConfig() {
  const now = getNow();
  return {
    ...demoConfig,
    effectiveNow: now.toISOString(),
    formattedClock: `${demoConfig.effectiveDate} ${demoConfig.effectiveTime.slice(0, 5)}`
  };
}

function setDemoConfig(updates = {}) {
  demoConfig = {
    ...demoConfig,
    ...updates
  };
  return getDemoConfig();
}

/**
 * Normalizes a date to 00:00:00.000 of that day.
 */
function getStartOfDay(date = getNow()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns Start of Today
 */
function getToday(baseDate = getNow()) {
  return getStartOfDay(baseDate);
}

/**
 * Returns Start of Tomorrow
 */
function getTomorrow(baseDate = getNow()) {
  const d = getStartOfDay(baseDate);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Returns Start of Day After Tomorrow
 */
function getDayAfterTomorrow(baseDate = getNow()) {
  const d = getStartOfDay(baseDate);
  d.setDate(d.getDate() + 2);
  return d;
}

/**
 * Validates whether a proposed maintenance window starts safely in the future.
 * CONCEPT: candidateStart >= now + SAFETY_BUFFER_MINUTES
 */
function isFutureWindow(windowStart, now = getNow(), bufferMinutes = SAFETY_BUFFER_MINUTES) {
  const sMs = new Date(windowStart).getTime();
  const minEarliestMs = new Date(now).getTime() + bufferMinutes * 60 * 1000;
  return sMs >= minEarliestMs;
}

/**
 * Checks if a proposed window has already expired (end time has passed).
 */
function isExpired(windowEnd, now = getNow()) {
  return new Date(windowEnd).getTime() <= new Date(now).getTime();
}

/**
 * Format helper for time labels (HH:mm)
 */
function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

module.exports = {
  SAFETY_BUFFER_MINUTES,
  getNow,
  getDemoConfig,
  setDemoConfig,
  getStartOfDay,
  getToday,
  getTomorrow,
  getDayAfterTomorrow,
  isFutureWindow,
  isExpired,
  formatTime
};

