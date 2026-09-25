// Candidate Window Scorer for Indian Railways AI-Assisted Block Scheduling
// Implements explainable, deterministic scoring based on multi-criteria heuristic:
//   Score = Priority Benefit + Bundling Benefit + Off-Peak Benefit + Continuous Window Benefit
//           - Train Proximity Penalty - Safety Buffer Penalty - Splitting Penalty - Infeasibility Penalty

const { formatTime } = require('./timeUtils');

/**
 * Scores an individual candidate window against evaluated constraints and bundling metadata
 * 
 * @param {Object} candidate Candidate window object
 * @param {Object} constraintResult Result from evaluateConstraints()
 * @param {Object} bundle Consolidated task bundle
 * @returns {Object} Scored candidate evaluation with explainability reasons
 */
function scoreCandidateWindow(candidate, constraintResult, bundle = {}) {
  const {
    feasible,
    passengerImpact = 0,
    freightImpact = 0,
    violations = [],
    warnings = [],
    constraintsSatisfied = [],
    rejectionReasons = [],
    canSplit = false,
    carryForwardMinutes = 0
  } = constraintResult;

  // 1. Positive Benefits
  // Priority Benefit (0 - 40 pts)
  const avgPriority = bundle.defects?.length
    ? Math.round(bundle.defects.reduce((s, d) => s + (d.score || d.priorityScore || 70), 0) / bundle.defects.length)
    : 75;
  const priorityBenefit = Math.round(avgPriority * 0.35); // ~26 - 35 pts

  // Bundling Benefit (10 - 35 pts)
  const deptCount = new Set((bundle.defects || []).map(d => d.department)).size || 1;
  const bundlingBenefit = deptCount >= 3 ? 35 : deptCount === 2 ? 25 : 10;

  // Off-Peak Traffic Benefit (10 - 25 pts)
  const startH = new Date(candidate.windowStart).getHours();
  const isNightGoldenWindow = startH >= 1 && startH < 5;
  const isMiddayInterPeak = startH >= 12 && startH < 15;
  const offPeakBenefit = isNightGoldenWindow ? 25 : isMiddayInterPeak ? 18 : 10;

  // Continuous Safe Window Benefit (10 - 20 pts)
  const continuousHrs = (candidate.availableContinuousMins || candidate.durationMins || 240) / 60;
  const continuousWindowBenefit = continuousHrs >= 4.0 ? 20 : continuousHrs >= 3.0 ? 15 : 10;

  // Asset Availability & Repetitive Possession Reduction (10 - 20 pts)
  const assetAvailabilityBenefit = bundle.timeSavedHrs > 0 ? 20 : 10;

  // 2. Penalties
  const passengerPenalty = passengerImpact * 30;
  const freightPenalty = freightImpact * 5; // was 15, now 5 as per spec
  const splittingPenalty = canSplit ? 12 : 0;
  const violationPenalty = violations.length * 50;

  const rawScore = (
    priorityBenefit +
    bundlingBenefit +
    offPeakBenefit +
    continuousWindowBenefit +
    assetAvailabilityBenefit
  ) - (
    passengerPenalty +
    freightPenalty +
    splittingPenalty +
    violationPenalty
  );

  const compositeScore = feasible
    ? Math.min(100, Math.max(15, Math.round(rawScore)))
    : Math.max(0, Math.round(rawScore - 50));

  // 3. Explainability Reasons ("Why this window?")
  const reasons = [];
  if (feasible) {
    reasons.push(`Strict future window with verified safety clearance`);
    reasons.push(`${candidate.durationMins} minutes continuous operational availability`);
    if (deptCount >= 2) {
      reasons.push(`Compatible ${Array.from(new Set(bundle.defects.map(d => d.department))).join(' + ')} work consolidated into one possession`);
    }
    if (passengerImpact === 0) {
      reasons.push('Zero passenger express movements disrupted');
    }
    if (freightImpact === 0) {
      reasons.push('Zero goods rake movements disrupted');
    }
    if (isNightGoldenWindow) {
      reasons.push('Scheduled during low-density night golden window (01:00–05:00)');
    }
    if (bundle.timeSavedHrs > 0) {
      reasons.push(`Shared protection setup saves ${bundle.timeSavedHrs}h of corridor closure`);
    }
    if (canSplit) {
      reasons.push(`Splittable task: ${candidate.durationMins}m allocated, ${carryForwardMinutes}m safely carried forward`);
    }
  } else {
    rejectionReasons.forEach(r => reasons.push(`Rejected: ${r}`));
  }

  return {
    candidateId: candidate.candidateId,
    corridorId: candidate.corridorId,
    shiftName: candidate.shiftName,
    timeLabel: candidate.timeLabel,
    windowStart: candidate.windowStart,
    windowEnd: candidate.windowEnd,
    durationHrs: candidate.durationHrs,
    durationMins: candidate.durationMins,
    feasible,
    compositeScore,
    breakdown: {
      priorityBenefit,
      bundlingBenefit,
      offPeakBenefit,
      continuousWindowBenefit,
      assetAvailabilityBenefit,
      passengerPenalty,
      freightPenalty,
      splittingPenalty,
      violationPenalty
    },
    metrics: {
      passengerImpact,
      freightImpact,
      violationsCount: violations.length,
      warningsCount: warnings.length,
      isPartial: canSplit,
      carriedForwardMinutes: carryForwardMinutes
    },
    violations,
    warnings,
    constraintsSatisfied,
    constraintsRejected: rejectionReasons,
    reasons
  };
}

module.exports = { scoreCandidateWindow };
