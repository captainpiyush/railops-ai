// Unified Constraint Engine for RailOps AI
// Reusable across:
//   A. Candidate Window Generation
//   B. Recommendation Generation
//   C. Pre-Commit Acceptance Validation (validateBeforeCommit)
//
// Enforces:
//   1. Future-only allocation (candidateStart >= now + SAFETY_BUFFER_MINUTES)
//   2. Operational priority: Passenger > Freight > Committed Blocks > New Maintenance
//   3. Configurable safety buffer (default 20 mins) around trains & blocks
//   4. Splittable vs Non-splittable task rules (partial execution with carry-forward)
//   5. Multi-department compatibility rules

const { SAFETY_BUFFER_MINUTES, isFutureWindow, formatTime } = require('./timeUtils');

/**
 * Evaluates candidate maintenance window against operational constraints
 * 
 * @param {Object} params
 * @param {Date|String} params.windowStart Proposed start time
 * @param {Date|String} params.windowEnd Proposed end time
 * @param {String} params.corridorId Target corridor ID (e.g. 'COR-01')
 * @param {String} [params.track] Target track (e.g. 'UP Main', 'DN Main', 'Both Tracks')
 * @param {Array} [params.defects] List of defects/tasks intended for this block
 * @param {Array} [params.activeBlocks] Existing committed blocks in database
 * @param {Array} [params.trainSchedules] Timetable train schedules (passenger & freight)
 * @param {Array} [params.freightForecasts] Forecasted freight flows
 * @param {Array} [params.blockWindows] Official corridor maintenance white-space windows
 * @param {Date} [params.now] Reference current time
 * @param {Number} [params.safetyBufferMinutes] Safety buffer override (default 20 min)
 * @returns {Object} Comprehensive evaluation result
 */
function evaluateConstraints({
  windowStart,
  windowEnd,
  corridorId,
  track = 'UP Main',
  defects = [],
  activeBlocks = [],
  trainSchedules = [],
  freightForecasts = [],
  blockWindows = [],
  now = new Date(),
  safetyBufferMinutes = SAFETY_BUFFER_MINUTES
}) {
  const violations = [];
  const warnings = [];
  const constraintsSatisfied = [];
  const rejectionReasons = [];
  let scorePenalty = 0;

  const wStart = new Date(windowStart);
  const wEnd = new Date(windowEnd);
  const sMs = wStart.getTime();
  const eMs = wEnd.getTime();
  const bufferMs = safetyBufferMinutes * 60 * 1000;
  const durationMins = Math.round((eMs - sMs) / 60000);
  const durationHrs = durationMins / 60;

  // ── CONSTRAINT 1: FUTURE-ONLY ALLOCATION ──
  const minEarliestMs = new Date(now).getTime() + bufferMs;
  if (sMs < minEarliestMs) {
    const minTimeStr = formatTime(new Date(minEarliestMs));
    const reason = `Window start (${formatTime(wStart)}) is in the past or violates ${safetyBufferMinutes}m preparation buffer (earliest safe start: ${minTimeStr})`;
    violations.push(`PAST_OR_IMMEDIATE_START: ${reason}`);
    rejectionReasons.push(reason);
    scorePenalty += 200;
  } else {
    constraintsSatisfied.push(`Future-only allocation satisfied (${safetyBufferMinutes}m advance buffer respected)`);
  }

  // ── CONSTRAINT 2: MAXIMUM ADMINISTRATIVE DURATION (8.0 Hours) ──
  if (durationHrs > 8.0) {
    const reason = `Block duration (${durationHrs.toFixed(1)}h) exceeds 8.0 hour administrative maximum`;
    violations.push(`EXCEEDS_MAX_DURATION: ${reason}`);
    rejectionReasons.push(reason);
    scorePenalty += 100;
  } else {
    constraintsSatisfied.push('Maximum 8.0h duration cap respected');
  }

  // ── CONSTRAINT 3: DURATION SUFFICIENCY & SPLITTABLE HANDLING ──
  let canSplit = false;
  let partialAllowed = false;
  let carryForwardMinutes = 0;
  let allocatedMinutes = durationMins;

  if (defects.length > 0) {
    // Total raw work required (sum for sequential tasks, or max single task + shared protection for concurrent bundling)
    const isMultiDept = new Set(defects.map(d => d.department)).size > 1;
    let requiredMins = 0;
    
    if (isMultiDept) {
      // Coordinated parallel possession: max task duration + 60 min shared setup/clearance
      const maxSingleMins = Math.max(...defects.map(d => (d.estimatedDurationHrs || d.durationHours || 2) * 60));
      requiredMins = Math.min(480, maxSingleMins + 60);
    } else {
      // Single department: sequential or single task duration
      requiredMins = defects.reduce((sum, d) => sum + (d.estimatedDurationHrs || d.durationHours || 2) * 60, 0);
    }

    if (durationMins < requiredMins) {
      const allSplittable = defects.every(d => d.isSplittable === true);
      if (allSplittable && durationMins >= 120) { // At least 2h useful window to split
        canSplit = true;
        partialAllowed = true;
        carryForwardMinutes = requiredMins - durationMins;
        warnings.push(`PARTIAL_EXECUTION: Available window (${durationMins}m) is less than required (${requiredMins}m). Splittable task will execute ${durationMins}m and carry forward ${carryForwardMinutes}m.`);
        constraintsSatisfied.push(`Task partially scheduled (${durationMins}m); ${carryForwardMinutes}m safely carried forward`);
      } else {
        const reason = `Window is ${durationHrs.toFixed(1)}h (${durationMins}m) but required work is ${(requiredMins/60).toFixed(1)}h (${requiredMins}m) and task is non-splittable`;
        violations.push(`INSUFFICIENT_DURATION: ${reason}`);
        rejectionReasons.push(reason);
        scorePenalty += 100;
      }
    } else {
      constraintsSatisfied.push(`Safe continuous duration satisfied (${durationMins}m available >= ${requiredMins}m required)`);
    }
  }

  // ── CONSTRAINT 4: PASSENGER / EXPRESS TRAIN MOVEMENTS (HIGHEST OPERATIONAL PRIORITY) ──
  const affectedPassengerTrains = [];
  let passengerImpact = 0;

  trainSchedules.forEach(train => {
    if (train.corridorId !== corridorId) return;
    const isPassenger = train.trainType !== 'Goods';
    if (!isPassenger) return;

    const trainDepMs = new Date(train.departureTime).getTime();
    const trainArrMs = new Date(train.arrivalTime).getTime();

    // Operational safety envelope around passenger train: [dep - buffer, arr + buffer]
    const trainEnvelopeStart = trainDepMs - bufferMs;
    const trainEnvelopeEnd = trainArrMs + bufferMs;

    const overlaps = sMs < trainEnvelopeEnd && eMs > trainEnvelopeStart;
    if (overlaps) {
      passengerImpact++;
      affectedPassengerTrains.push({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        trainType: train.trainType,
        priority: train.priority || 1,
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime,
        track: train.track || 'UP Main'
      });

      const depStr = formatTime(train.departureTime);
      const arrStr = formatTime(train.arrivalTime);
      const reason = `Passenger movement ${train.trainType} ${train.trainNumber} (${train.trainName || ''}, ${depStr}–${arrStr}) occupies corridor during requested window (operational priority)`;
      violations.push(`PASSENGER_TRAIN_PRIORITY: ${reason}`);
      rejectionReasons.push(reason);
      scorePenalty += 150;
    }
  });

  if (passengerImpact === 0) {
    constraintsSatisfied.push('Zero passenger express trains disrupted (clean operational clearance)');
  }

  // ── CONSTRAINT 5: GOODS / FREIGHT MOVEMENTS (HIGH OPERATIONAL PRIORITY) ──
  const affectedFreightTrains = [];
  let freightImpact = 0;

  trainSchedules.forEach(train => {
    if (train.corridorId !== corridorId) return;
    const isFreight = train.trainType === 'Goods';
    if (!isFreight) return;

    const trainDepMs = new Date(train.departureTime).getTime();
    const trainArrMs = new Date(train.arrivalTime).getTime();

    // Operational safety envelope around goods train: [dep - buffer, arr + buffer]
    const freightEnvelopeStart = trainDepMs - bufferMs;
    const freightEnvelopeEnd = trainArrMs + bufferMs;

    const overlaps = sMs < freightEnvelopeEnd && eMs > freightEnvelopeStart;
    if (overlaps) {
      freightImpact++;
      affectedFreightTrains.push({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        trainType: 'Goods',
        track: train.track || 'DN Main',
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime
      });

      const depStr = formatTime(train.departureTime);
      const arrStr = formatTime(train.arrivalTime);
      const reason = `Goods/Freight rake ${train.trainNumber} (${train.trainName || 'Freight'}, ${depStr}–${arrStr}) occupies corridor during requested window (operational priority)`;
      // Freight is a scoring penalty, not a hard infeasibility constraint
      warnings.push(`FREIGHT_SOFT_CONSTRAINT: ${reason}`);
      scorePenalty += 5; // -5 per freight overlap as per spec
    }
  });

  if (freightImpact === 0) {
    constraintsSatisfied.push('Zero dedicated goods rakes disrupted');
  }

  // ── CONSTRAINT 6: EXISTING COMMITTED MAINTENANCE POSSESSIONS ──
  const collidingBlocks = [];
  activeBlocks.forEach(existing => {
    if (existing.corridorId !== corridorId) return;
    const exStatus = (existing.status || 'PROPOSED').toUpperCase();
    if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(exStatus)) return;

    const exStartMs = new Date(existing.startTime).getTime();
    const exEndMs = new Date(existing.endTime).getTime();

    // Clearance between separate maintenance possessions
    const exEnvelopeStart = exStartMs - bufferMs;
    const exEnvelopeEnd = exEndMs + bufferMs;

    const overlaps = sMs < exEnvelopeEnd && eMs > exEnvelopeStart;
    if (overlaps) {
      collidingBlocks.push(existing);
      const exSStr = formatTime(existing.startTime);
      const exEStr = formatTime(existing.endTime);
      const reason = `Existing committed maintenance allocation ${existing.blockCode || existing.assetId} (${existing.department}, ${exSStr}–${exEStr}) occupies requested window`;
      violations.push(`BLOCK_COLLISION: ${reason}`);
      rejectionReasons.push(reason);
      scorePenalty += 120;
    }
  });

  if (collidingBlocks.length === 0) {
    constraintsSatisfied.push('No collision with existing committed maintenance blocks');
  }

  // ── CONSTRAINT 7: CORRIDOR AVAILABILITY / PEAK HOUR CLOSURES ──
  const startHourDec = wStart.getHours() + wStart.getMinutes() / 60;
  const endHourDec = wEnd.getHours() + wEnd.getMinutes() / 60;

  if (blockWindows && blockWindows.length > 0) {
    const blockedWindow = blockWindows.find(bw => {
      if (bw.corridorId !== corridorId || bw.available) return false;
      const [bsh, bsm] = (bw.windowStart || '00:00').split(':').map(Number);
      const [beh, bem] = (bw.windowEnd || '00:00').split(':').map(Number);
      const bwStartH = bsh + (bsm || 0) / 60;
      const bwEndH = beh + (bem || 0) / 60;
      return startHourDec < bwEndH && endHourDec > bwStartH;
    });

    if (blockedWindow) {
      const reason = `Corridor ${corridorId} is blocked for peak train operations (${blockedWindow.windowStart}–${blockedWindow.windowEnd}: ${blockedWindow.description || 'High-density commuter bank'})`;
      violations.push(`CORRIDOR_PEAK_CLOSED: ${reason}`);
      rejectionReasons.push(reason);
      scorePenalty += 90;
    } else {
      constraintsSatisfied.push('Corridor operating hours and availability windows verified');
    }
  }

  // ── CONSTRAINT 8: MULTI-DEPARTMENT COMPATIBILITY & WORK ZONE ──
  if (defects.length > 1) {
    const depts = Array.from(new Set(defects.map(d => d.department)));
    const compatibleDepts = ['Track', 'Signalling', 'Traction', 'Electrical'];
    const allCompatible = depts.every(d => compatibleDepts.includes(d));

    if (allCompatible) {
      constraintsSatisfied.push(`Compatible multi-department consolidation (${depts.join(' + ')}) in single possession`);
    } else {
      warnings.push(`Special safety briefing required: Diverse departmental tasks bundled (${depts.join(', ')})`);
    }
  }

  const feasible = violations.length === 0;

  return {
    feasible,
    scorePenalty: Math.round(scorePenalty),
    violations,
    warnings,
    constraintsSatisfied,
    rejectionReasons,
    passengerImpact,
    freightImpact,
    affectedPassengerTrains,
    affectedFreightTrains,
    collidingBlocks,
    safetyBufferMinutes,
    canSplit,
    partialAllowed,
    allocatedMinutes,
    carryForwardMinutes
  };
}

module.exports = {
  evaluateConstraints
};
