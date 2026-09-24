import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import KPICard from '../components/KPICard';
import NativeTimeline from '../components/NativeTimeline';
import TrainMovementTimeline from '../components/TrainMovementTimeline';
import ApprovalDrawer from '../components/ApprovalDrawer';
import Toast from '../components/Toast';
import api from '../api/axios';

// Compact Freight Traffic Density Context Dataset
const FREIGHT_CONTEXT_STRIP = [
  { hours: '00–04', level: 'LOW', rakes: '1 Rake', desc: 'Off-peak freight clearance', status: 'low' },
  { hours: '04–08', level: 'LOW', rakes: '1 Rake', desc: 'Night golden window (minimal goods)', status: 'low' },
  { hours: '08–12', level: 'HIGH', rakes: '5 Rakes', desc: 'Peak industrial siding release', status: 'high' },
  { hours: '12–16', level: 'LOW', rakes: '2 Rakes', desc: 'Midday inter-peak freight', status: 'low' },
  { hours: '16–20', level: 'MED', rakes: '4 Rakes', desc: 'Evening container transit', status: 'med' },
  { hours: '20–24', level: 'LOW', rakes: '1 Rake', desc: 'Late night container stream', status: 'low' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    defects,
    blocks,
    conflicts,
    schedules,
    isLoading: loading,
    activityFeed,
    activeRecommendation,
    refreshData,
    handleApproveDefect,
    handleRejectDefect,
    handleRescheduleBlock,
    handleAcceptRecommendation,
    handleRejectRecommendation,
    effectiveNow,
    demoClock
  } = useRailOps();

  const [selectedCorridor, setSelectedCorridor] = useState('COR-01'); // Default: COR-01 Delhi -> Mumbai
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // -1: Yesterday, 0: Today, 1: Tomorrow
  const [actionLoading, setActionLoading] = useState(false);
  const [aiCommitLoading, setAiCommitLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activeConflict, setActiveConflict] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Synchronized reference clock derived from central Demo Mode
  const baseTime = useMemo(() => effectiveNow || new Date(), [effectiveNow]);

  const nowPct = useMemo(() => {
    const minutes = baseTime.getHours() * 60 + baseTime.getMinutes();
    return (minutes / (24 * 60)) * 100;
  }, [baseTime]);

  const nowTimeStr = baseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  // Derive target date anchored strictly to demo clock
  const targetDate = useMemo(() => {
    const d = new Date(baseTime);
    d.setDate(d.getDate() + selectedDayOffset);
    return d;
  }, [baseTime, selectedDayOffset]);

  const formattedDateStr = targetDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Filter blocks for active corridor & date
  const filteredBlocks = useMemo(() => {
    return blocks.filter((block) => {
      if (!block.startTime) return false;
      const blockDate = new Date(block.startTime);
      return (
        blockDate.getFullYear() === targetDate.getFullYear() &&
        blockDate.getMonth() === targetDate.getMonth() &&
        blockDate.getDate() === targetDate.getDate()
      );
    });
  }, [blocks, targetDate]);

  // Operational conflict classification (genuine active conflicts only)
  const activeOperationalConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      const matchCorridor =
        selectedCorridor === 'ALL' ||
        c.blockA?.corridorId === selectedCorridor ||
        c.blockB?.corridorId === selectedCorridor;
      return matchCorridor && c.isOperationalActive;
    });
  }, [conflicts, selectedCorridor]);

  // KPIs
  const totalPending = defects.filter((d) => d.status === 'PENDING').length;
  const criticalCount = defects.filter((d) => d.priority === 'CRITICAL' && d.status === 'PENDING').length;
  const activeBlocksCount = blocks.filter(
    (b) =>
      (selectedCorridor === 'ALL' || b.corridorId === selectedCorridor) &&
      ['ACTIVE', 'APPROVED'].includes((b.status || '').toUpperCase())
  ).length;
  const conflictsCount = activeOperationalConflicts.length;

  const handleReschedule = async (blockId) => {
    const targetBlock = activeConflict || blocks.find((b) => b._id === blockId);
    const id = blockId || targetBlock?._id;
    if (!id || !targetBlock) return;

    try {
      setRescheduleLoading(true);
      const s = new Date(targetBlock.startTime);
      const e = new Date(targetBlock.endTime);
      const newStartTime = new Date(s.getTime() + 30 * 60 * 1000);
      const newEndTime = new Date(e.getTime() + 30 * 60 * 1000);

      await handleRescheduleBlock(id, newStartTime, newEndTime);

      setToast({
        visible: true,
        message: `Conflict auto-resolved: Block shifted +30 mins`,
        type: 'success',
      });
      setActiveConflict(null);
    } catch (err) {
      console.error('Failed to reschedule block:', err);
      setToast({
        visible: true,
        message: `Failed to reschedule: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      setActionLoading(true);
      if (status === 'EXECUTED') {
        await handleApproveDefect(id);
        setToast({ visible: true, message: `Defect approved & executed — Block Created`, type: 'success' });
      } else {
        await handleRejectDefect(id);
        setToast({ visible: true, message: `Defect marked as ${status}`, type: 'info' });
      }
    } catch (e) {
      setToast({ visible: true, message: `Failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Reactive Accept of AI Recommended Block with fresh pre-commit revalidation
  const handleAcceptAi = async () => {
    if (!activeRecommendation) return;
    try {
      setAiCommitLoading(true);
      const result = await handleAcceptRecommendation(activeRecommendation._id);
      if (result.success && result.status === 'SCHEDULED') {
        setToast({
          visible: true,
          message: `Coordinated Block ${result.block?.blockCode} validated & committed to live schedule!`,
          type: 'success',
        });
      } else if (result.status === 'REPLANNED') {
        setToast({
          visible: true,
          message: `Window no longer available (${result.reason || 'schedule collision'}). AI automatically replanned to next safe window!`,
          type: 'info',
        });
      }
    } catch (err) {
      setToast({
        visible: true,
        message: `Accept failed: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setAiCommitLoading(false);
    }
  };

  // Reject recommendation
  const handleRejectAi = async () => {
    if (!activeRecommendation) return;
    try {
      setAiCommitLoading(true);
      await handleRejectRecommendation(activeRecommendation._id, 'Operator rejected from Dashboard');
      setToast({
        visible: true,
        message: 'Recommendation rejected and preserved in operations audit ledger.',
        type: 'info',
      });
    } catch (err) {
      setToast({
        visible: true,
        message: `Reject failed: ${err.response?.data?.error || err.message}`,
        type: 'error',
      });
    } finally {
      setAiCommitLoading(false);
    }
  };

  if (loading && defects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 font-mono-rail text-sm">
        LOADING RAIL OPERATIONS ENGINE...
      </div>
    );
  }

  const oldestPending =
    defects
      .filter((d) => d.status === 'PENDING')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0] || null;

  const SOURCES = ['TMS', 'SMMS', 'TDMS', 'BDMS', 'COA'];
  const SOURCE_COLORS = {
    TMS: '#3b82f6',
    SMMS: '#a855f7',
    TDMS: '#f59e0b',
    BDMS: '#14b8a6',
    COA: '#f43f5e',
  };
  const sourceCounts = SOURCES.map((s) => ({
    source: s,
    count: defects.filter((d) => d.source === s).length,
    color: SOURCE_COLORS[s],
  }));
  const maxSourceCount = Math.max(...sourceCounts.map((s) => s.count), 1);

  return (
    <div className="h-full p-3 grid grid-cols-[270px_1fr_310px] gap-3 overflow-hidden bg-slate-950 text-slate-100">
      
      {/* ══════════════════════════════════════════════════════════════
          COLUMN 1: METRICS, AVAILABILITY & ACTIVE CONFLICTS
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <KPICard label="Total Pending" value={totalPending} accentClass="kpi-accent-em" />
          <KPICard label="Critical Tasks" value={criticalCount} accentClass="kpi-accent-rd" />
          <KPICard label="Active Blocks" value={activeBlocksCount} accentClass="kpi-accent-bl" />
          <KPICard label="Active Conflicts" value={conflictsCount} accentClass="kpi-accent-rd" />
        </div>

        {/* ASSET AVAILABILITY: BEFORE VS AFTER (MATCHES OPTIMIZER SOURCE OF TRUTH) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 shadow-md flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              NETWORK ASSET AVAILABILITY
            </span>
            <span className="font-mono-rail text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              +4.6% GAIN
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-mono-rail text-[9px] text-slate-500 block">MANUAL BASELINE</span>
              <span className="font-mono-rail text-sm text-slate-400 line-through font-bold">91.8%</span>
            </div>
            <div className="text-right">
              <span className="font-mono-rail text-[9px] text-emerald-400 block font-bold">AI OPTIMIZED</span>
              <span className="font-mono-rail text-xl font-black text-emerald-400">96.4%</span>
            </div>
          </div>
        </div>

        {/* DATA INTEGRATION SOURCE BREAKDOWN */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-mono-rail text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              DATA INTEGRATION SOURCES
            </h2>
          </div>
          <div className="flex flex-col gap-1.5 p-2.5">
            {sourceCounts.map(({ source, count, color }) => (
              <div key={source}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-mono-rail text-[8px] text-slate-400">{source}</span>
                  <span className="font-mono-rail text-[8px] text-slate-400 font-bold">{count}</span>
                </div>
                <div className="bg-slate-800 rounded h-1 w-full">
                  <div
                    className="h-1 rounded transition-all duration-500"
                    style={{
                      width: `${Math.round((count / maxSourceCount) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE OPERATIONAL CONFLICT FEED */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <span className="font-mono-rail text-[10px] font-bold text-slate-300 tracking-wide uppercase">
              ACTIVE CONFLICTS
            </span>
            <span
              className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded font-bold ${
                conflictsCount === 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {conflictsCount} ACTIVE
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
            {activeOperationalConflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 gap-1 text-center">
                <div className="font-mono-rail text-[9px] text-emerald-400 font-semibold">
                  NO ACTIVE CONFLICTS ON {selectedCorridor}
                </div>
                <div className="font-mono-rail text-[8px] text-slate-500">
                  Headways & possessions are clear
                </div>
              </div>
            ) : (
              activeOperationalConflicts.map((c, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-rail text-[8px] px-1 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
                      {c.severity} · {c.type}
                    </span>
                    <span className="font-mono-rail text-[8px] text-slate-400">
                      {c.overlapMinutes} min overlap
                    </span>
                  </div>
                  <div className="font-mono-rail text-[9px] text-slate-300 leading-snug">
                    {c.blockA?.id} ({c.blockA?.department}) vs {c.blockB?.id} ({c.blockB?.department})
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <button
                      onClick={() => setActiveConflict(c)}
                      className="text-[8px] font-mono-rail text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-800 hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => navigate('/simulation', { state: { conflict: c } })}
                      className="text-[8px] font-mono-rail font-bold bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      RESOLVE CONFLICT →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          COLUMN 2: CENTER OPERATIONAL BLOCK & TRAIN SCHEDULE
          Separated into:
          1. MAINTENANCE BLOCK SCHEDULE (NativeTimeline - simple 5-row corridor layout)
          2. TRAIN MOVEMENT SCHEDULE (TrainMovementTimeline - passenger vs goods)
          3. FREIGHT / TRAFFIC CONTEXT STRIP
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2.5 h-full overflow-hidden">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-xl">
          
          {/* Main Controls Header: Corridor Selector, Date Toggle, Dynamic NOW Clock */}
          <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Corridor Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono-rail text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  CORRIDOR:
                </span>
                <select
                  value={selectedCorridor}
                  onChange={(e) => setSelectedCorridor(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-emerald-400 text-xs py-1 px-2.5 rounded font-mono-rail font-bold outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="COR-01">COR-01 — Delhi → Mumbai (Golden Demo)</option>
                  <option value="COR-02">COR-02 — Delhi → Howrah</option>
                  <option value="COR-03">COR-03 — Mumbai → Chennai</option>
                  <option value="COR-04">COR-04 — Howrah → Chennai</option>
                  <option value="COR-05">COR-05 — Delhi → Chennai</option>
                  <option value="ALL">ALL CORRIDORS (5-TRUNK OVERVIEW)</option>
                </select>
              </div>

              <div className="h-4 w-[1px] bg-slate-800" />

              {/* Date Selector: Yesterday | TODAY | Tomorrow */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedDayOffset(-1)}
                  className={`rounded px-2 py-0.5 text-[10px] font-mono transition-all cursor-pointer ${
                    selectedDayOffset === -1
                      ? 'bg-emerald-500 font-bold text-slate-950 shadow'
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  YESTERDAY
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayOffset(0)}
                  className={`rounded px-2.5 py-0.5 text-[10px] font-mono transition-all cursor-pointer ${
                    selectedDayOffset === 0
                      ? 'bg-emerald-500 font-bold text-slate-950 shadow'
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TODAY
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayOffset(1)}
                  className={`rounded px-2 py-0.5 text-[10px] font-mono transition-all cursor-pointer ${
                    selectedDayOffset === 1
                      ? 'bg-emerald-500 font-bold text-slate-950 shadow'
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TOMORROW
                </button>
              </div>
            </div>

            {/* Dynamic NOW Clock Indicator & Date */}
            <div className="flex items-center gap-2">
              <span className="font-mono-rail text-[10px] text-slate-400">
                {formattedDateStr}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-emerald-500/50 px-2 py-0.5 rounded shadow">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono-rail text-[9px] font-extrabold text-emerald-400">
                  NOW • {nowTimeStr}
                </span>
              </div>
            </div>
          </div>

          {/* Synchronized 24-Hour Time Axis Header */}
          <div className="flex-shrink-0 px-3.5 pt-1.5 pb-1 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center">
              <div className="w-36 flex-shrink-0 pr-2 font-mono-rail text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                TIME SCALE (24H)
              </div>
              <div className="flex-1 relative h-3.5">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((h) => (
                  <span
                    key={h}
                    className="absolute font-mono-rail text-[8px] text-slate-500 -translate-x-1/2"
                    style={{ left: `${(h / 24) * 100}%` }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Central Scrollable Area Containing Separated Sections */}
          <div className="flex-1 overflow-y-auto px-3.5 py-2.5 flex flex-col gap-2.5">
            
            {/* SECTION 1: MAINTENANCE BLOCK SCHEDULE (SIMPLE 5-ROW PREVIOUS STYLE) */}
            <NativeTimeline
              blocks={filteredBlocks}
              schedules={schedules}
              selectedCorridor={selectedCorridor}
              targetDate={targetDate}
              selectedDayOffset={selectedDayOffset}
              onBlockClick={setActiveConflict}
              setActiveConflict={setActiveConflict}
              nowPct={nowPct}
            />

            {/* SECTION 2: TRAIN MOVEMENT SCHEDULE (SEPARATE COMPONENT) */}
            <TrainMovementTimeline
              schedules={schedules}
              blocks={filteredBlocks}
              selectedCorridor={selectedCorridor}
              targetDate={targetDate}
              selectedDayOffset={selectedDayOffset}
              nowPct={nowPct}
              nowTimeStr={nowTimeStr}
            />

            {/* SECTION 3: FREIGHT / TRAFFIC CONTEXT STRIP */}
            <div className="flex flex-col gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="font-mono-rail text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    FREIGHT TRAFFIC CONTEXT — EXPECTED DENSITY ON {selectedCorridor === 'ALL' ? 'ALL TRUNKS' : selectedCorridor}
                  </span>
                </div>
                <span className="font-mono-rail text-[8px] text-slate-500">
                  COA projection · Low traffic windows indicate optimal block possession slots
                </span>
              </div>

              <div className="flex items-center gap-0 mt-0.5">
                <div className="w-36 flex-shrink-0 pr-2 font-mono-rail text-[8px] text-slate-500">
                  Headway Pressure:
                </div>
                <div className="flex-1 relative bg-slate-950 border border-slate-800 rounded overflow-hidden h-5 flex">
                  {FREIGHT_CONTEXT_STRIP.map((fc, i) => {
                    const bgClass =
                      fc.status === 'high'
                        ? 'bg-red-500/20 text-red-300 border-r border-red-500/30'
                        : fc.status === 'med'
                        ? 'bg-amber-500/20 text-amber-300 border-r border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-r border-emerald-500/20';

                    return (
                      <div
                        key={i}
                        className={`flex-1 flex items-center justify-center px-1 font-mono-rail text-[7.5px] font-bold truncate ${bgClass}`}
                        title={`${fc.hours}:00 | ${fc.level} (${fc.rakes}) — ${fc.desc}`}
                      >
                        <span>{fc.hours}h: {fc.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Clear Visual Legend */}
          <div className="flex-shrink-0 px-3.5 py-1.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between flex-wrap gap-2 text-[8px] font-mono-rail">
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-cyan-500/50 border border-cyan-400" />
                <span className="text-slate-400">Passenger / Express</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-amber-500/50 border border-amber-400" />
                <span className="text-slate-400">Goods / Freight</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-slate-700 border border-slate-500" />
                <span className="text-slate-400">Maintenance Block</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-emerald-500/50 border border-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">AI Recommended (02:00–08:00)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-red-500/50 border border-red-500 ring-1 ring-red-400" />
                <span className="text-red-400 font-bold">Conflict / At Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-slate-600 border border-slate-500" />
                <span className="text-slate-500">Completed / Historical</span>
              </div>
            </div>
            <div className="text-slate-500">
              Synchronized 24h operational timeline
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          COLUMN 3: RIGHT PANEL (AI RECOMMENDATION CARD, APPROVAL DRAWER, ACTIVITY)
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2.5 h-full overflow-hidden">
        
        {/* DYNAMIC AI RECOMMENDED BLOCK CARD */}
        <div className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-xl p-3 shadow-xl flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-mono-rail text-xs font-bold text-emerald-400">
                AI COORDINATED RECOMMENDATION
              </span>
            </div>
            <span className="font-mono-rail text-[7.5px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
              {activeRecommendation ? 'PROPOSED' : 'ALL CLEAR'}
            </span>
          </div>

          {activeRecommendation ? (
            <>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1 font-mono-rail text-[9.5px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Target Corridor:</span>
                  <span className="text-slate-100 font-bold">{activeRecommendation.corridorId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Optimal Window:</span>
                  <span className="text-emerald-400 font-bold">
                    {new Date(activeRecommendation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(activeRecommendation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} ({(activeRecommendation.durationMinutes / 60).toFixed(1)}h)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">AI Composite Score:</span>
                  <span className="text-emerald-400 font-bold">{activeRecommendation.score} / 100 (FEASIBLE)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Consolidated Depts:</span>
                  <span className="text-slate-200 font-bold">{activeRecommendation.departments?.join(' + ')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Bundled Tasks:</span>
                  <span className="text-slate-300 truncate max-w-[150px]">
                    {activeRecommendation.taskSummary?.map((t) => t.defectCode).join(', ') || 'Consolidated Work'}
                  </span>
                </div>

                {/* Explainability Reasons Checklist */}
                <div className="border-t border-slate-800/80 pt-1.5 mt-0.5 flex flex-col gap-0.5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                    Why this window?
                  </span>
                  {activeRecommendation.reasons?.slice(0, 3).map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-[8.5px] text-slate-300">
                      <span className="text-emerald-400 font-bold flex-shrink-0">•</span>
                      <span className="truncate">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleAcceptAi}
                  disabled={aiCommitLoading}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono-rail font-bold text-[11px] shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {aiCommitLoading ? 'VALIDATING & COMMITTING...' : 'ACCEPT & COMMIT BLOCK'}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleRejectAi}
                    disabled={aiCommitLoading}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-red-400 border border-slate-800 hover:border-red-500/40 font-mono-rail text-[9px] transition-colors cursor-pointer text-center disabled:opacity-50"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={() => navigate('/optimization')}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono-rail text-[9px] transition-colors cursor-pointer text-center"
                  >
                    OPTIMIZER →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 px-2 gap-2 text-center bg-slate-950 rounded-lg border border-slate-800">
              <div className="font-mono-rail text-[10px] text-slate-200 font-bold">
                ALL CORRIDORS FULLY COORDINATED
              </div>
              <div className="font-mono-rail text-[8px] text-slate-500 max-w-[200px]">
                No pending proposals. Train movements, safety buffers, and maintenance possessions are fully clear.
              </div>
              <button
                onClick={() => navigate('/optimization')}
                className="mt-1 py-1 px-2.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono-rail text-[9px] hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                OPEN OPTIMIZATION ENGINE →
              </button>
            </div>
          )}
        </div>

        {/* QUICK DEFECT APPROVAL DRAWER */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ApprovalDrawer
            defect={oldestPending}
            pendingCount={totalPending}
            onApprove={(id) => handleAction(id, 'EXECUTED')}
            onReject={(id) => handleAction(id, 'REJECTED')}
            loading={actionLoading}
          />
        </div>

        {/* OPERATIONAL ACTIVITY FEED */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col overflow-hidden h-36 flex-shrink-0">
          <div className="px-3 py-1.5 border-b border-slate-800">
            <h2 className="font-mono-rail text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              OPERATIONAL ACTIVITY FEED
            </h2>
          </div>
          <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-1">
            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 gap-1">
                <div className="font-mono-rail text-[8px] text-slate-500">No recent activity</div>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-800/60">
                {activityFeed.map((item) => (
                  <div key={item.id} className="flex items-start justify-between px-1.5 py-0.5">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`font-mono-rail text-[8px] font-bold ${
                          item.action === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {item.action === 'APPROVED' ? 'OK' : 'REJ'} {item.defectCode}
                      </span>
                      <span className="font-mono-rail text-[7px] text-slate-500">
                        {item.assetId} {item.blockCode && `→ ${item.blockCode}`}
                      </span>
                    </div>
                    <span className="font-mono-rail text-[7px] text-slate-600 flex-shrink-0">
                      {item.timestamp?.toLocaleTimeString ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />

      {/* ── OPERATIONAL CONFLICT MODAL (NO BLIND +30 MINUTE SHIFTING) ── */}
      {activeConflict && (() => {
        const s = new Date(activeConflict.startTime || activeConflict.blockA?.startTime);
        const e = new Date(activeConflict.endTime || activeConflict.blockA?.endTime);
        const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 slide-in">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col gap-4 font-mono-rail">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-xs">
                    ALERT
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                      OPERATIONAL CONFLICT DETECTED
                    </h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Corridor Possession Infeasibility · {activeConflict.corridorId || selectedCorridor}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveConflict(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 rounded hover:bg-slate-800 cursor-pointer"
                >
                  X
                </button>
              </div>

              {/* Target & Conflict Context */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Affected Corridor:</span>
                  <span className="font-bold text-slate-200">{activeConflict.corridorId || selectedCorridor}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Conflicting Possession:</span>
                  <span className="font-bold text-red-400">
                    {activeConflict.blockCode || activeConflict.assetId} ({activeConflict.department || 'Maintenance'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Conflicting Window:</span>
                  <span className="font-bold text-slate-100">{sStr} – {eStr}</span>
                </div>
                <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-1">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Reason for Infeasibility:</span>
                  <span className="text-amber-300/90 text-[9.5px]">
                    Two simultaneous track possessions requested on same corridor segment. Risk of track fouling, catenary isolation conflicts, and safety buffer violations with scheduled express trains.
                  </span>
                </div>
              </div>

              {/* Reoptimization Notice & Feasible Alternatives */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 flex flex-col gap-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 uppercase text-[10px] flex items-center gap-1">
                    REOPTIMIZATION AVAILABLE
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded text-[8px] font-bold">
                    FEASIBLE ALTERNATIVE
                  </span>
                </div>
                <div className="text-slate-300 text-[9.5px]">
                  Current window is infeasible. Multi-criteria optimization has evaluated alternative feasible slots outside peak passenger headways:
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded p-2.5 flex justify-between items-center mt-1">
                  <div>
                    <div className="font-bold text-emerald-300 text-[10px]">ALT-02: Tomorrow 02:00 – 07:00</div>
                    <div className="text-slate-500 text-[8.5px]">Night Golden Window · Score: 52 · 0 Express Delays</div>
                  </div>
                  <span className="text-emerald-400 font-black text-xs">FEASIBLE</span>
                </div>
              </div>

              {/* Action Buttons: View Alternatives vs Dismiss */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setActiveConflict(null)}
                  className="font-mono-rail text-xs text-slate-400 hover:text-slate-200 px-3.5 py-2 rounded-lg border border-slate-800 hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    const conflictContext = activeConflict;
                    setActiveConflict(null);
                    navigate('/simulation', { state: { conflict: conflictContext } });
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono-rail font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
                >
                  View Alternatives in What-If Sim →
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
