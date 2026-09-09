import React, { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import { useRailOps } from '../context/RailOpsContext'

const LOADING_STEPS = [
  { id: 1, label: 'Ingesting TMS, SMMS, TDMS defects & timetable schedules...', pct: 15 },
  { id: 2, label: 'Running explainable multi-factor priority scoring...',        pct: 35 },
  { id: 3, label: 'Executing multi-department spatial-temporal bundling...',      pct: 55 },
  { id: 4, label: 'Evaluating candidate windows against 10 safety constraints...', pct: 75 },
  { id: 5, label: 'Computing asset availability & before/after delta...',         pct: 90 },
  { id: 6, label: 'Coordinated block optimization complete.',                     pct: 100 },
]

export default function OptimizationEngine() {
  const { refreshData } = useRailOps()
  const [horizon, setHorizon]                 = useState('Today') // 'Today' | '7 Days' | '30 Days'
  const [selectedCorridor, setSelectedCorridor] = useState('ALL') // 'ALL' | 'COR-01'..'COR-05'
  const [running, setRunning]                 = useState(false)
  const [stepIdx, setStepIdx]                 = useState(0)
  const [progress, setProgress]               = useState(0)
  const [result, setResult]                   = useState(null)
  const [error, setError]                     = useState(null)
  const [initConflicts, setInitConflicts]     = useState([])
  const [activeTab, setActiveTab]             = useState('overview') // 'overview' | 'candidates' | 'bundles' | 'conflicts'
  const [expandedBundle, setExpandedBundle]   = useState(null)
  const [isApproving, setIsApproving]         = useState(false)
  const [approveSuccess, setApproveSuccess]   = useState(null)

  // Load initial conflict data on mount
  useEffect(() => {
    api.get('/optimization/conflicts')
      .then(r => setInitConflicts(r.data ?? []))
      .catch(() => {})
  }, [])

  // Smooth progress interpolation between steps
  function animateToStep(targetStepIdx, onComplete) {
    const step = LOADING_STEPS[targetStepIdx]
    const targetPct = step.pct
    setStepIdx(targetStepIdx)

    let current = targetStepIdx > 0 ? LOADING_STEPS[targetStepIdx - 1].pct : 0
    const duration = 280
    const startTime = performance.now()
    const startPct = current

    function tick(now) {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const pct = Math.round(startPct + (targetPct - startPct) * eased)
      setProgress(pct)
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        setProgress(targetPct)
        if (onComplete) onComplete()
      }
    }
    requestAnimationFrame(tick)
  }

  async function runOptimization() {
    if (running) return
    setRunning(true)
    setError(null)
    setResult(null)
    setApproveSuccess(null)
    setStepIdx(0)
    setProgress(0)

    animateToStep(0, () =>
      animateToStep(1, () =>
        animateToStep(2, null)
      )
    )

    let apiResult = null
    try {
      const res = await api.post('/optimization/run', { horizon, corridorId: selectedCorridor })
      apiResult = res.data
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Optimization failed')
      setRunning(false)
      setProgress(0)
      setStepIdx(0)
      return
    }

    animateToStep(3, () =>
      animateToStep(4, () =>
        animateToStep(5, () => {
          setTimeout(() => {
            setResult(apiResult)
            setRunning(false)
            setActiveTab('overview')
            if (apiResult.intelligentBundles?.length > 0) {
              setExpandedBundle(apiResult.intelligentBundles[0].bundleId)
            }
          }, 400)
        })
      )
    )
  }

  async function handleApprovePlan() {
    if (!result?.selectedWindow) return
    setIsApproving(true)
    try {
      const primaryBundle = result.intelligentBundles?.find(b => b.isMultiDepartment) || result.intelligentBundles?.[0]
      const res = await api.post('/optimization/approve', {
        planId: result.planId,
        bundleId: primaryBundle?.bundleId,
        corridorId: result.selectedWindow.corridorId || primaryBundle?.corridorId || 'COR-03',
        windowStart: result.selectedWindow.windowStart,
        windowEnd: result.selectedWindow.windowEnd,
        defects: primaryBundle?.defects || []
      })
      setApproveSuccess(res.data?.message || 'Coordinated maintenance block committed successfully.')
      refreshData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to commit approved plan')
    } finally {
      setIsApproving(false)
    }
  }

  function PriorityBadge({ value }) {
    const map = {
      CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
      HIGH:     'bg-amber-500/20 text-amber-400 border-amber-500/40',
      MEDIUM:   'bg-blue-500/20 text-blue-400 border-blue-500/40',
      LOW:      'bg-slate-500/20 text-slate-400 border-slate-500/40',
    }
    return (
      <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded-full border font-semibold ${map[value] ?? map.LOW}`}>
        {value}
      </span>
    )
  }

  function SeverityBadge({ value }) {
    const map = {
      HIGH:   'bg-red-500/20 text-red-400 border-red-500/40',
      MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      LOW:    'bg-blue-500/20 text-blue-400 border-blue-500/40',
    }
    return (
      <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded-full border font-semibold ${map[value] ?? map.LOW}`}>
        {value}
      </span>
    )
  }

  function ScoreBar({ score }) {
    const color = score > 80 ? 'bg-red-500'
                : score > 60 ? 'bg-amber-500'
                : score > 40 ? 'bg-blue-500'
                : 'bg-slate-500'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-700 rounded-full h-1">
          <div className={`h-1 rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`font-mono-rail text-[9px] font-bold w-6 text-right ${
          score > 80 ? 'text-red-400' : score > 60 ? 'text-amber-400' : score > 40 ? 'text-blue-400' : 'text-slate-500'
        }`}>{score}</span>
      </div>
    )
  }

  function formatTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const PIPELINE_STAGES = [
    { id: 'input', label: 'Input Data', sub: 'TMS, SMMS, TDMS, COA', icon: '⬇', color: 'border-slate-600 text-slate-300', activeColor: 'border-emerald-500 text-emerald-400 bg-emerald-500/5', stepRange: [0, 1] },
    { id: 'scoring', label: 'Explainable Scoring', sub: 'Multi-factor weighted', icon: '◉', color: 'border-slate-600 text-slate-300', activeColor: 'border-blue-500 text-blue-400 bg-blue-500/5', stepRange: [1, 2] },
    { id: 'bundling', label: 'Multi-Dept Bundling', sub: 'Track + Signal + Traction', icon: '⬡', color: 'border-slate-600 text-slate-300', activeColor: 'border-violet-500 text-violet-400 bg-violet-500/5', stepRange: [2, 3] },
    { id: 'constraint', label: 'Constraint Engine', sub: 'Timetable & Freight', icon: '⚠', color: 'border-slate-600 text-slate-300', activeColor: 'border-red-500 text-red-400 bg-red-500/5', stepRange: [3, 4] },
    { id: 'candidates', label: 'Candidate Scoring', sub: 'Composite window selection', icon: '◈', color: 'border-slate-600 text-slate-300', activeColor: 'border-amber-500 text-amber-400 bg-amber-500/5', stepRange: [4, 5] },
    { id: 'output', label: 'Coordinated Plan', sub: 'Before vs After availability', icon: '✓', color: 'border-slate-600 text-slate-300', activeColor: 'border-emerald-500 text-emerald-400 bg-emerald-500/5', stepRange: [5, 6] },
  ]

  const displayConflicts = result?.conflictMatrix ?? initConflicts
  const bundles          = result?.intelligentBundles ?? []
  const summary          = result?.summary ?? null
  const meta             = result?.meta ?? null
  const scoreDist        = result?.scoreDistribution ?? null
  const baseline         = result?.baselineMetrics ?? null
  const optimized        = result?.optimizedMetrics ?? null
  const selectedWin      = result?.selectedWindow ?? null
  const candidateWindows = result?.candidateWindows ?? []
  const explanations     = result?.explanations ?? []

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 bg-slate-950 text-slate-100">

      {/* ── PIPELINE HEADER & CONTROLS ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-700 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="font-mono-rail text-sm font-bold text-slate-200 tracking-wide">
                EXPLAINABLE AI-ASSISTED AUTOMATIC BLOCK PLANNING
              </div>
              <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                CONSTRAINT-AWARE
              </span>
            </div>
            <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">
              Simulated prototype engine · Multi-department consolidation (Track + Signalling + Traction) · Timetable & Freight constraints
            </div>
          </div>

          {/* Planning Horizon Selector & Run Trigger */}
          <div className="flex items-center gap-3">
            {/* Corridor Selector */}
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              disabled={running}
              className="bg-slate-900 border border-slate-700 text-slate-300 font-mono-rail text-[10px] rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">ALL Corridors (Network-wide)</option>
              <option value="COR-01">COR-01 · Delhi–Mumbai</option>
              <option value="COR-02">COR-02 · Delhi–Howrah</option>
              <option value="COR-03">COR-03 · Mumbai–Chennai</option>
              <option value="COR-04">COR-04 · Howrah–Chennai</option>
              <option value="COR-05">COR-05 · Delhi–Chennai</option>
            </select>

            {/* Horizon Picker */}
            <div className="flex items-center bg-slate-900/80 border border-slate-700 rounded-lg p-0.5">
              {['Today', '7 Days', '30 Days'].map(h => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  disabled={running}
                  className={`font-mono-rail text-[10px] px-2.5 py-1 rounded transition-all font-semibold ${
                    horizon === h
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            <button
              onClick={runOptimization}
              disabled={running}
              className={`flex items-center gap-2 font-mono-rail text-xs font-bold px-5 py-2.5 rounded-lg transition-all shadow-md ${
                running
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer hover:shadow-emerald-500/20'
              }`}
            >
              {running ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  OPTIMIZING...
                </>
              ) : (
                <>▶ RUN OPTIMIZATION</>
              )}
            </button>
          </div>
        </div>

        {/* Pipeline stage cards */}
        <div className="flex items-stretch p-4 gap-0 overflow-x-auto">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive  = running && stepIdx >= stage.stepRange[0] && stepIdx < stage.stepRange[1] + 1
            const isDone    = (running && stepIdx > stage.stepRange[1]) || (!running && result && idx < 6)
            const baseStyle = 'flex-1 min-w-[110px] border rounded-lg p-2.5 text-center transition-all duration-300'
            const style     = isDone
              ? 'border-emerald-700/60 text-emerald-400 bg-emerald-500/5'
              : isActive
              ? stage.activeColor
              : stage.color

            return (
              <React.Fragment key={stage.id}>
                <div className={`${baseStyle} ${style}`}>
                  <div className="text-base mb-1 opacity-75">{stage.icon}</div>
                  <div className="font-mono-rail text-[10px] font-bold leading-tight truncate">
                    {stage.label}
                  </div>
                  <div className="font-mono-rail text-[8px] text-slate-500 mt-0.5 leading-tight truncate">
                    {stage.sub}
                  </div>
                  {isDone && <div className="font-mono-rail text-[8px] text-emerald-500 mt-1">✓ done</div>}
                  {isActive && <div className="font-mono-rail text-[8px] text-current mt-1 animate-pulse">running...</div>}
                </div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className="flex items-center px-1 flex-shrink-0">
                    <div className={`font-mono-rail text-xs ${
                      (running && stepIdx > stage.stepRange[1]) || (!running && result)
                        ? 'text-emerald-600'
                        : 'text-slate-700'
                    }`}>▶</div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Multi-step loading bar */}
        {running && (
          <div className="px-5 pb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-rail text-[10px] text-emerald-400 animate-pulse">
                {LOADING_STEPS[Math.min(stepIdx, LOADING_STEPS.length - 1)].label}
              </span>
              <span className="font-mono-rail text-[10px] text-slate-400 font-bold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Post-run metadata banner */}
        {!running && meta && (
          <div className="px-5 py-2.5 border-t border-slate-700 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="font-mono-rail text-[9px] text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                OPTIMIZATION COMPLETE ({meta.processingMs}ms)
              </span>
              <span className="font-mono-rail text-[9px] text-slate-400">
                Plan ID: <strong className="text-slate-200">{result?.planId}</strong>
              </span>
              <span className="font-mono-rail text-[9px] text-slate-400">
                Horizon: <strong className="text-slate-200">{result?.planningHorizon}</strong>
              </span>
              <span className="font-mono-rail text-[9px] text-amber-400 font-semibold">
                Time Saved: {meta.totalTimeSavedHrs}h
              </span>
            </div>

            {/* Commit Plan Button */}
            <button
              onClick={handleApprovePlan}
              disabled={isApproving || approveSuccess}
              className={`font-mono-rail text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 transition-all ${
                approveSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow'
              }`}
            >
              {isApproving ? 'COMMITTING...' : approveSuccess ? '✓ PLAN COMMITTED' : '✓ APPROVE & COMMIT PLAN'}
            </button>
          </div>
        )}

        {approveSuccess && (
          <div className="px-5 py-2 border-t border-emerald-500/40 bg-emerald-900/20 font-mono-rail text-[10px] text-emerald-300">
            ✓ {approveSuccess}
          </div>
        )}

        {error && (
          <div className="px-5 py-3 border-t border-red-800/40 bg-red-900/10 font-mono-rail text-[10px] text-red-400">
            ✕ Engine error: {error}
          </div>
        )}
      </div>

      {/* ── BEFORE VS AFTER PLAN COMPARISON CARD (CRITICAL FEATURE) ── */}
      {result && baseline && optimized && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
            <div>
              <div className="font-mono-rail text-xs font-bold text-slate-200 tracking-wide flex items-center gap-2">
                <span>BEFORE VS. AFTER PLAN COMPARISON</span>
                <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  +{result.availabilityGain}% AVAILABILITY GAIN
                </span>
              </div>
              <div className="font-mono-rail text-[8px] text-slate-500 mt-0.5">
                Mathematical delta between Manual Departmental Disconnections and Coordinated AI-Assisted Scheduling
              </div>
            </div>
            <div className="font-mono-rail text-[9px] text-slate-400">
              Horizon: <span className="text-emerald-400 font-bold">{result.planningHorizon}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Metric 1: Asset Availability */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3">
              <div className="font-mono-rail text-[8px] uppercase tracking-wider text-slate-400 mb-1">ASSET AVAILABILITY</div>
              <div className="flex items-baseline justify-between">
                <div className="font-mono-rail text-xs text-slate-500 line-through">{baseline.availabilityPct}%</div>
                <div className="font-mono-rail text-lg font-bold text-emerald-400">{optimized.availabilityPct}%</div>
              </div>
              <div className="font-mono-rail text-[8px] text-emerald-500 font-semibold mt-1">
                ▲ +{result.availabilityGain}% pts
              </div>
            </div>

            {/* Metric 2: Total Block Hours */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3">
              <div className="font-mono-rail text-[8px] uppercase tracking-wider text-slate-400 mb-1">TOTAL BLOCK HOURS</div>
              <div className="flex items-baseline justify-between">
                <div className="font-mono-rail text-xs text-slate-500 line-through">{baseline.totalBlockHours}h</div>
                <div className="font-mono-rail text-lg font-bold text-amber-400">{optimized.totalBlockHours}h</div>
              </div>
              <div className="font-mono-rail text-[8px] text-emerald-500 font-semibold mt-1">
                ▼ -{result.delta?.hoursSaved}h saved
              </div>
            </div>

            {/* Metric 3: Asset Downtime */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3">
              <div className="font-mono-rail text-[8px] uppercase tracking-wider text-slate-400 mb-1">ASSET DOWNTIME</div>
              <div className="flex items-baseline justify-between">
                <div className="font-mono-rail text-xs text-slate-500 line-through">{baseline.assetDowntimeHours}h</div>
                <div className="font-mono-rail text-lg font-bold text-blue-400">{optimized.assetDowntimeHours}h</div>
              </div>
              <div className="font-mono-rail text-[8px] text-emerald-500 font-semibold mt-1">
                ▼ -{result.delta?.hoursSaved}h downtime
              </div>
            </div>

            {/* Metric 4: Train Impact */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3">
              <div className="font-mono-rail text-[8px] uppercase tracking-wider text-slate-400 mb-1">TRAIN IMPACT</div>
              <div className="flex items-baseline justify-between">
                <div className="font-mono-rail text-xs text-slate-500 line-through">{baseline.trainImpact} services</div>
                <div className="font-mono-rail text-lg font-bold text-emerald-400">{optimized.trainImpact} delayed</div>
              </div>
              <div className="font-mono-rail text-[8px] text-emerald-500 font-semibold mt-1">
                ✓ {result.delta?.trainMovementsSaved} services saved
              </div>
            </div>

            {/* Metric 5: Schedule Conflicts */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3">
              <div className="font-mono-rail text-[8px] uppercase tracking-wider text-slate-400 mb-1">SCHEDULE CONFLICTS</div>
              <div className="flex items-baseline justify-between">
                <div className="font-mono-rail text-xs text-red-400/80 line-through">{baseline.conflicts} conflicts</div>
                <div className="font-mono-rail text-lg font-bold text-emerald-400">{optimized.conflicts}</div>
              </div>
              <div className="font-mono-rail text-[8px] text-emerald-500 font-semibold mt-1">
                ✓ 100% resolved
              </div>
            </div>

            {/* Metric 6: Block Utilization */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-3">
              <div className="font-mono-rail text-[8px] uppercase tracking-wider text-slate-400 mb-1">BLOCK UTILIZATION</div>
              <div className="flex items-baseline justify-between">
                <div className="font-mono-rail text-xs text-slate-500 line-through">{baseline.blockUtilizationPct}%</div>
                <div className="font-mono-rail text-lg font-bold text-violet-400">{optimized.blockUtilizationPct}%</div>
              </div>
              <div className="font-mono-rail text-[8px] text-emerald-500 font-semibold mt-1">
                ▲ +{result.delta?.utilizationGainPct}% efficiency
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS NAVIGATION ── */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col shadow-lg">
        <div className="flex items-center border-b border-slate-700 px-4 bg-slate-900/60">
          {[
            { id: 'overview', label: 'OPTIMIZED BLOCK & EXPLANATION', count: explanations.length },
            { id: 'candidates', label: 'CANDIDATE WINDOWS EVALUATION', count: candidateWindows.length },
            { id: 'bundles', label: 'CONSOLIDATED TASK BUNDLES', count: bundles.filter(b => !b.isSingleItem).length },
            { id: 'conflicts', label: 'CONFLICT MATRIX', count: displayConflicts.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-mono-rail text-[10px] font-semibold px-4 py-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                  tab.id === 'conflicts'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB 1: OVERVIEW & "WHY THIS BLOCK?" ── */}
        {activeTab === 'overview' && (
          <div className="p-4 overflow-y-auto flex flex-col gap-4">
            {!result ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <div className="text-3xl opacity-20">⚙</div>
                <div className="font-mono-rail text-xs text-slate-500">
                  Click "RUN OPTIMIZATION" to generate constraint-aware block plans
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left 2 Cols: Winning Coordinated Block */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  {/* Selected Window Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-850 border-2 border-emerald-500/40 rounded-xl p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono-rail text-[9px] font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          RECOMMENDED BLOCK
                        </span>
                        <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          COR-01 (Delhi–Mumbai)
                        </span>
                      </div>
                      <div className="font-mono-rail text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        AI Score: {selectedWin?.compositeScore || 98}/100
                      </div>
                    </div>

                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700/60 pb-3 mb-3">
                      <div>
                        <div className="font-mono-rail text-xl font-bold text-slate-100">
                          {selectedWin?.timeLabel}
                        </div>
                        <div className="font-mono-rail text-[10px] text-emerald-400/90 font-semibold mt-0.5">
                          {selectedWin?.shiftName}
                        </div>
                      </div>
                      <div className="text-right font-mono-rail text-[10px] text-slate-400">
                        Duration: <strong className="text-slate-100">{selectedWin?.durationHrs} Hours</strong>
                      </div>
                    </div>

                    {/* Consolidated Departments Badge */}
                    <div className="bg-slate-800/80 border border-violet-500/30 rounded-lg p-3 mb-3">
                      <div className="font-mono-rail text-[9px] text-violet-400 font-bold mb-1.5 flex items-center gap-1.5">
                        <span>⚡ MULTI-DEPARTMENT CONSOLIDATION</span>
                        <span className="text-[8px] bg-violet-500/20 px-1.5 py-0.2 rounded border border-violet-500/40 text-violet-300">
                          3 DEPARTMENTS IN 1 POSSESSION
                        </span>
                      </div>
                      <div className="font-mono-rail text-[10px] text-slate-300 flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Track (TMS)</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">Signalling (SMMS)</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Traction / OHE (TDMS)</span>
                      </div>
                      <div className="font-mono-rail text-[9px] text-slate-400 mt-2">
                        Consolidated Work: <strong className="text-slate-200">DEF-0101</strong> (Rail replacement 4h) + <strong className="text-slate-200">DEF-0102</strong> (Point machine 2h) + <strong className="text-slate-200">DEF-0103</strong> (OHE droppers 2h).
                      </div>
                    </div>

                    {/* Operational Safety Clearances */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-800/60 rounded p-2 border border-slate-700">
                        <div className="font-mono-rail text-[8px] text-slate-500 uppercase">PASSENGER DELAYS</div>
                        <div className="font-mono-rail text-xs font-bold text-emerald-400 mt-0.5">0 TRAINS</div>
                      </div>
                      <div className="bg-slate-800/60 rounded p-2 border border-slate-700">
                        <div className="font-mono-rail text-[8px] text-slate-500 uppercase">FREIGHT FORECAST</div>
                        <div className="font-mono-rail text-xs font-bold text-blue-400 mt-0.5">LOW (1 RAKE)</div>
                      </div>
                      <div className="bg-slate-800/60 rounded p-2 border border-slate-700">
                        <div className="font-mono-rail text-[8px] text-slate-500 uppercase">SAFETY CLEARANCE</div>
                        <div className="font-mono-rail text-xs font-bold text-slate-200 mt-0.5">20 MIN BUFFER</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Col: Backend Explainability ("Why this block?") */}
                <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
                  <div className="font-mono-rail text-xs font-bold text-slate-200 tracking-wide flex items-center gap-2 border-b border-slate-700 pb-2">
                    <span className="text-emerald-400 text-sm">💡</span>
                    <span>WHY THIS BLOCK? (EXPLAINABLE AI)</span>
                  </div>
                  <div className="font-mono-rail text-[8px] text-slate-500">
                    Deterministic audit reasons computed by the constraint engine:
                  </div>

                  <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[320px] pr-1">
                    {explanations.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-800/50 p-2 rounded-lg border border-slate-700/60">
                        <span className="text-emerald-400 text-xs font-bold mt-0.5">✓</span>
                        <span className="font-mono-rail text-[9px] text-slate-300 leading-snug">
                          {reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CANDIDATE WINDOWS EVALUATION ── */}
        {activeTab === 'candidates' && (
          <div className="p-4 overflow-y-auto">
            {candidateWindows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 font-mono-rail text-[10px] text-slate-500">
                Run optimization to evaluate candidate windows
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="font-mono-rail text-[9px] text-slate-400 mb-1">
                  The optimizer evaluates candidate maintenance slots against corridor availability, passenger timetable headways, freight forecasts, and safety buffers:
                </div>

                <div className="grid gap-3">
                  {candidateWindows.map(cand => {
                    const isSelected = cand.candidateId === selectedWin?.candidateId
                    return (
                      <div
                        key={cand.candidateId}
                        className={`border rounded-xl p-4 transition-all ${
                          isSelected
                            ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg ring-1 ring-emerald-500/30'
                            : cand.feasible
                            ? 'border-slate-700 bg-slate-900/60'
                            : 'border-red-900/40 bg-red-950/10 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`font-mono-rail text-[9px] font-bold px-2 py-0.5 rounded ${
                              isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {cand.candidateId}
                            </span>
                            <span className="font-mono-rail text-sm font-bold text-slate-200">
                              {cand.timeLabel}
                            </span>
                            <span className="font-mono-rail text-[10px] text-slate-400">
                              · {cand.shiftName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`font-mono-rail text-[9px] px-2 py-0.5 rounded font-semibold ${
                              cand.feasible
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {cand.feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                            </span>
                            <div className="font-mono-rail text-sm font-bold text-slate-100">
                              Score: {cand.compositeScore}/100
                            </div>
                            {isSelected && (
                              <span className="font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                                SELECTED WINNER
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metrics Row */}
                        <div className="grid grid-cols-4 gap-2 text-[9px] font-mono-rail bg-slate-850 p-2 rounded border border-slate-700/60">
                          <div>
                            <span className="text-slate-500">Duration: </span>
                            <strong className="text-slate-300">{cand.durationHrs}h</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Passenger Trains: </span>
                            <strong className={cand.metrics.passengerImpact > 0 ? 'text-red-400' : 'text-emerald-400'}>
                              {cand.metrics.passengerImpact} impacted
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Freight Forecast: </span>
                            <strong className="text-slate-300">{cand.metrics.freightLevel}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Safety Buffer: </span>
                            <strong className="text-slate-300">20 min min.</strong>
                          </div>
                        </div>

                        {/* Reasons / Violations */}
                        {cand.violations?.length > 0 && (
                          <div className="mt-2 font-mono-rail text-[9px] text-red-400 flex flex-col gap-1">
                            {cand.violations.map((v, i) => (
                              <div key={i}>✕ {v}</div>
                            ))}
                          </div>
                        )}
                        {cand.reasons?.length > 0 && (
                          <div className="mt-2 font-mono-rail text-[8px] text-slate-400 flex flex-wrap gap-2">
                            {cand.reasons.map((r, i) => (
                              <span key={i} className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: TASK BUNDLES ── */}
        {activeTab === 'bundles' && (
          <div className="p-4 overflow-y-auto flex flex-col gap-3">
            {bundles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 font-mono-rail text-[10px] text-slate-500">
                Run optimization to view task bundles
              </div>
            ) : (
              bundles.map(bundle => (
                <div
                  key={bundle.bundleId}
                  className={`border rounded-xl overflow-hidden cursor-pointer transition-all ${
                    bundle.isMultiDepartment
                      ? 'border-violet-500/50 bg-violet-950/10 hover:border-violet-500'
                      : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                  }`}
                  onClick={() => setExpandedBundle(expandedBundle === bundle.bundleId ? null : bundle.bundleId)}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono-rail text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                        bundle.isMultiDepartment
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                          : 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}>
                        {bundle.isMultiDepartment ? 'MULTI-DEPARTMENT BUNDLE' : 'DEPARTMENTAL'}
                      </span>
                      <div>
                        <div className="font-mono-rail text-xs font-bold text-slate-200">
                          {bundle.bundleId} · {bundle.department}
                        </div>
                        <div className="font-mono-rail text-[9px] text-slate-400">
                          {bundle.badgeText} · {bundle.corridorId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right font-mono-rail">
                        <div className="text-[8px] text-slate-500">TIME SAVED</div>
                        <div className="text-sm font-bold text-amber-400">{bundle.timeSavedHrs}h</div>
                      </div>
                      <div className="text-right font-mono-rail">
                        <div className="text-[8px] text-slate-500">UTILIZATION</div>
                        <div className="text-sm font-bold text-emerald-400">{bundle.utilizationRate}%</div>
                      </div>
                      <div className="font-mono-rail text-xs text-slate-500">
                        {expandedBundle === bundle.bundleId ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded defect items */}
                  {expandedBundle === bundle.bundleId && (
                    <div className="border-t border-slate-700/60 px-4 py-3 bg-slate-950/40 flex flex-col gap-2">
                      <div className="font-mono-rail text-[8px] text-slate-400 uppercase tracking-wider">
                        CONSOLIDATED TASKS & EXPLAINABLE SCORE BREAKDOWNS:
                      </div>
                      {bundle.defects.map(d => (
                        <div key={d.defectCode} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono-rail text-[10px] font-bold text-emerald-400">{d.defectCode}</span>
                              <span className="font-mono-rail text-[9px] text-slate-300">({d.assetId})</span>
                              <span className="font-mono-rail text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{d.department}</span>
                              <PriorityBadge value={d.priority} />
                            </div>
                            <span className="font-mono-rail text-[9px] font-bold text-slate-200">
                              Duration: {d.estimatedDurationHrs}h
                            </span>
                          </div>
                          <div className="font-mono-rail text-[9px] text-slate-400">
                            {d.faultDescription}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 4: CONFLICT MATRIX ── */}
        {activeTab === 'conflicts' && (
          <div className="p-4 overflow-y-auto">
            {displayConflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-1 font-mono-rail text-[10px] text-emerald-400">
                ✓ No conflicts detected in planned schedule
              </div>
            ) : (
              <div className="divide-y divide-slate-700/40">
                {displayConflicts.map(c => (
                  <div key={c.conflictId} className="py-2.5 flex items-center justify-between text-[9px] font-mono-rail">
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold">{c.conflictId}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">{c.type}</span>
                      <span className="text-slate-300">{c.recommendation}</span>
                    </div>
                    <SeverityBadge value={c.severity} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
