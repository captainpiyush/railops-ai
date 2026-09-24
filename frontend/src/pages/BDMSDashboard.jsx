import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';

const CORRIDOR_METADATA = {
  'COR-01': { name: 'Delhi - Mumbai',    fromStation: 'NDLS', toStation: 'CSMT', km: 1384 },
  'COR-02': { name: 'Delhi - Howrah',    fromStation: 'NDLS', toStation: 'HWH',  km: 1441 },
  'COR-03': { name: 'Mumbai - Chennai',  fromStation: 'CSMT', toStation: 'MAS',  km: 1279 },
  'COR-04': { name: 'Howrah - Chennai',  fromStation: 'HWH',  toStation: 'MAS',  km: 1659 },
  'COR-05': { name: 'Delhi - Chennai',   fromStation: 'NDLS', toStation: 'MAS',  km: 2175 },
};

const FALLBACK_WINDOWS = [
  { corridorId: 'COR-01', day: 'Today',    windowStart: '00:00', windowEnd: '08:00', trafficLevel: 'LOW',    description: 'Primary Overhaul Window (Night Shift)' },
  { corridorId: 'COR-01', day: 'Today',    windowStart: '12:30', windowEnd: '17:00', trafficLevel: 'MEDIUM', description: 'Secondary Afternoon Maintenance Window' },
  { corridorId: 'COR-01', day: 'Today',    windowStart: '22:00', windowEnd: '24:00', trafficLevel: 'LOW',    description: 'Late Night Pre-Block Preparation Window' },
  { corridorId: 'COR-01', day: 'Tomorrow', windowStart: '02:00', windowEnd: '05:30', trafficLevel: 'LOW',    description: 'Approved Track Possession Slot' },
  { corridorId: 'COR-02', day: 'Today',    windowStart: '01:00', windowEnd: '07:30', trafficLevel: 'LOW',    description: 'Early Morning Freight/Maintenance Slot' },
  { corridorId: 'COR-02', day: 'Today',    windowStart: '13:00', windowEnd: '17:00', trafficLevel: 'MEDIUM', description: 'Midday Inter-Peak Maintenance Slot' },
  { corridorId: 'COR-02', day: 'Tomorrow', windowStart: '14:00', windowEnd: '16:30', trafficLevel: 'MEDIUM', description: 'Traction Inspection Scheduled Slot' },
  { corridorId: 'COR-03', day: 'Today',    windowStart: '01:30', windowEnd: '08:00', trafficLevel: 'LOW',    description: 'Deep Night Overhaul Possession' },
  { corridorId: 'COR-03', day: 'Today',    windowStart: '13:30', windowEnd: '17:30', trafficLevel: 'MEDIUM', description: 'Afternoon Operational Possession' },
  { corridorId: 'COR-03', day: 'Tomorrow', windowStart: '01:30', windowEnd: '06:00', trafficLevel: 'LOW',    description: 'Night Maintenance Clearance' },
  { corridorId: 'COR-04', day: 'Today',    windowStart: '01:00', windowEnd: '07:00', trafficLevel: 'LOW',    description: 'Early Morning Heavy Haul Gap' },
  { corridorId: 'COR-04', day: 'Today',    windowStart: '12:00', windowEnd: '16:00', trafficLevel: 'MEDIUM', description: 'Midday Track & OHE Maintenance Window' },
  { corridorId: 'COR-04', day: 'Tomorrow', windowStart: '02:00', windowEnd: '06:30', trafficLevel: 'LOW',    description: 'Coastal Corridor Pre-Scheduled Gap' },
  { corridorId: 'COR-05', day: 'Today',    windowStart: '01:00', windowEnd: '08:00', trafficLevel: 'LOW',    description: 'Long-haul Night Catenary Maintenance' },
  { corridorId: 'COR-05', day: 'Today',    windowStart: '12:30', windowEnd: '15:30', trafficLevel: 'MEDIUM', description: 'Afternoon Traction Possession Slot' },
  { corridorId: 'COR-05', day: 'Tomorrow', windowStart: '01:00', windowEnd: '07:00', trafficLevel: 'LOW',    description: 'Trunk Route Overhaul Slot' },
];

export default function BDMSDashboard() {
  const navigate = useNavigate();
  const {
    defects = [],
    blocks = [],
    corridorWindows = [],
    activeRecommendation,
    recommendationHistory = [],
    effectiveNow
  } = useRailOps();

  // ── BDMS Tasks with AI suggested task/bundle detection ───────────────────
  const bdmsTasks = useMemo(() => {
    return defects.map(d => {
      const isAiSuggested =
        d.status === 'BUNDLED' ||
        d.status === 'SCHEDULED' ||
        d.source === 'AI_OPTIMIZED' ||
        activeRecommendation?.taskSummary?.some(t => t.defectCode === d.defectCode || t._id === d._id);

      return {
        ...d,
        isAiSuggested
      };
    });
  }, [defects, activeRecommendation]);

  // ── Corridor Time table rows ─────────────────────────────────────────────
  const corridorTimeRows = useMemo(() => {
    const rawWindows = corridorWindows?.length > 0 ? corridorWindows : FALLBACK_WINDOWS;
    const rows = [];
    const todayDate = effectiveNow ? new Date(effectiveNow) : new Date();
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const dayLabel = (d) =>
      `${d} (${(d === 'Today' ? todayDate : tomorrowDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })})`;

    rawWindows.forEach(w => {
      const dayForBlock = w.day === 'Today' ? todayDate : tomorrowDate;
      const matchingBlock = blocks.find(b => {
        if (b.corridorId !== w.corridorId || !b.startTime) return false;
        const bd = new Date(b.startTime);
        if (bd.toDateString() !== dayForBlock.toDateString()) return false;
        const [wsh] = (w.windowStart || '00:00').split(':').map(Number);
        const [weh] = (w.windowEnd   || '24:00').split(':').map(Number);
        return bd.getHours() >= wsh - 1 && bd.getHours() < weh;
      });

      rows.push({
        id:              `${w.corridorId}-${w.day}-${w.windowStart}`,
        corridorNo:      w.corridorId,
        corridorName:    CORRIDOR_METADATA[w.corridorId]?.name || 'Trunk Route',
        fromStation:     CORRIDOR_METADATA[w.corridorId]?.fromStation || '',
        toStation:       CORRIDOR_METADATA[w.corridorId]?.toStation   || '',
        windowTimeDay:   `${dayLabel(w.day)}, ${w.windowStart} - ${w.windowEnd}`,
        rawDay:          w.day,
        blockId:         matchingBlock?.blockCode || null,
        blockDept:       matchingBlock?.department || null,
        trafficLevel:    w.trafficLevel || 'LOW',
        description:     w.description  || 'Corridor Maintenance Window',
      });
    });

    // Inject any actual blocks not already covered
    blocks.forEach(b => {
      if (!b.startTime || !b.endTime) return;
      const bd      = new Date(b.startTime);
      const isToday = bd.toDateString() === todayDate.toDateString();
      const isTomorrow = bd.toDateString() === tomorrowDate.toDateString();
      if (!isToday && !isTomorrow) return;
      if (rows.some(r => r.blockId === b.blockCode)) return;
      const dName   = isToday ? 'Today' : 'Tomorrow';
      const st = bd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const et = new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      rows.unshift({
        id:           `blk-${b._id || b.blockCode}`,
        corridorNo:   b.corridorId,
        corridorName: CORRIDOR_METADATA[b.corridorId]?.name || 'Trunk Route',
        fromStation:  CORRIDOR_METADATA[b.corridorId]?.fromStation || '',
        toStation:    CORRIDOR_METADATA[b.corridorId]?.toStation   || '',
        windowTimeDay:`${dayLabel(dName)}, ${st} - ${et}`,
        rawDay:       dName,
        blockId:      b.blockCode,
        blockDept:    b.department,
        trafficLevel: 'MEDIUM',
        description:  `${b.department} Dedicated Block Possession`,
      });
    });

    return rows;
  }, [corridorWindows, blocks, effectiveNow]);

  const allocatedCount = corridorTimeRows.filter(r => r.blockId).length;

  // ── BDMS History Rows ────────────────────────────────────────────────────
  const bdmsHistoryRows = useMemo(() => {
    const baseline = [
      {
        planVersion: 'PLAN-2026-09-03-01',
        blockCode: 'BLK-COORD-01',
        corridorId: 'COR-01',
        departments: 'Track + Signalling + Traction',
        window: '02:00 - 08:00 (Night Shift)',
        timeSaved: '5.0 Hours Saved',
        status: 'SCHEDULED',
        approvalState: 'APPROVED (Sr. DOM)'
      },
      {
        planVersion: 'PLAN-2026-09-02-04',
        blockCode: 'BLK-COORD-04',
        corridorId: 'COR-02',
        departments: 'Rolling Stock + Track',
        window: '01:30 - 05:30 (Early Night)',
        timeSaved: '3.5 Hours Saved',
        status: 'COMPLETED',
        approvalState: 'APPROVED (Dy. COM)'
      }
    ];

    const dynamic = recommendationHistory.map(r => ({
      planVersion: r.recommendationId,
      blockCode: r.resultingBlockId?.blockCode || 'BLK-HIST',
      corridorId: r.corridorId,
      departments: r.departments?.join(' + ') || 'Rolling Stock',
      window: `${new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`,
      timeSaved: '3.5 Hours Saved',
      status: r.status,
      approvalState: r.status === 'ACCEPTED' || r.status === 'SCHEDULED' ? 'APPROVED' : r.status
    }));

    return dynamic.length > 0 ? dynamic : baseline;
  }, [recommendationHistory]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">

      {/* ─── Header ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono-rail text-xs font-bold px-2.5 py-1 rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/30">
              BDMS
            </span>
            <h1 className="text-lg font-bold font-mono-rail text-slate-100">
              BDMS - Block Disconnection Management System
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Locomotives, Coaches, Wagons &amp; Depot Possession Coordination - Data Integration &amp; Corridor Windows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/optimization')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono-rail font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <span>Optimization Engine</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono-rail font-bold text-xs border border-slate-700 transition-all shadow-xs cursor-pointer"
          >
            <span>History</span>
          </button>
        </div>
      </div>

      {/* ─── Main scrollable area ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ══ SECTION 1: DATA INTEGRATION TABLE (AI SUGGESTED TASKS/BUNDLES HIGHLIGHTED) ══ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 uppercase tracking-wide">
                Data Integration Tasks
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                {bdmsTasks.length} Tasks Active
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono-rail">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                AI Suggested Task / Bundle Highlighted
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800/80 sticky top-0 z-10 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Task ID</th>
                  <th className="py-2.5 px-4 font-semibold">Source</th>
                  <th className="py-2.5 px-4 font-semibold">Description</th>
                  <th className="py-2.5 px-4 font-semibold">Department</th>
                  <th className="py-2.5 px-4 font-semibold">Priority</th>
                  <th className="py-2.5 px-4 font-semibold">Corridor</th>
                  <th className="py-2.5 px-4 font-semibold text-right">AI Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono-rail">
                {bdmsTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  bdmsTasks.slice(0, 30).map((d) => (
                    <tr
                      key={d._id}
                      className={`transition-colors ${
                        d.isAiSuggested
                          ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400 hover:bg-emerald-950/60'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-bold whitespace-nowrap text-slate-100">
                        {d.defectCode || d._id.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <DataSourceBadge source={d.source} />
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">
                        {d.faultDescription || d.assetId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {d.department}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                          d.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          d.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {d.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {d.corridorId || 'COR-01'}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {d.isAiSuggested ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            AI SUGGESTED BUNDLE
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            Standard
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ SECTION 2: CORRIDOR TIME TABLE ═══════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 uppercase tracking-wide">
                Corridor Time Table
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {corridorTimeRows.length} Slots - {allocatedCount} Allocated
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono-rail text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Allocated Block</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span>Available Window</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="py-2.5 px-4 font-semibold">Corridor No.</th>
                  <th className="py-2.5 px-4 font-semibold">Window Time with Day</th>
                  <th className="py-2.5 px-4 font-semibold">Block ID</th>
                  <th className="py-2.5 px-4 font-semibold">Traffic</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono-rail">
                {corridorTimeRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No corridor window data available.
                    </td>
                  </tr>
                ) : (
                  corridorTimeRows.map((row, i) => (
                    <tr key={row.id || i} className="hover:bg-slate-800/50 transition-colors">
                      {/* Corridor No. */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-100">{row.corridorNo}</div>
                        <div className="text-[10px] text-slate-400">
                          {row.corridorName} ({row.fromStation} to {row.toStation})
                        </div>
                      </td>

                      {/* Window Time with Day */}
                      <td className="py-3 px-4 text-emerald-400 whitespace-nowrap font-medium">
                        {row.windowTimeDay}
                      </td>

                      {/* Block ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.blockId ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {row.blockId}
                            </span>
                            {row.blockDept && (
                              <span className="text-[10px] text-slate-400">({row.blockDept})</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            AVAILABLE
                          </span>
                        )}
                      </td>

                      {/* Traffic Level */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          row.trafficLevel === 'LOW'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : row.trafficLevel === 'MEDIUM'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {row.trafficLevel}
                        </span>
                      </td>

                      {/* Purpose */}
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                        {row.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ SECTION 3: BDMS HISTORY TABLE ═════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 uppercase tracking-wide">
                BDMS Execution &amp; Planning History
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {bdmsHistoryRows.length} Historical Records
              </span>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono-rail underline cursor-pointer"
            >
              Open Full Audit Ledger
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono-rail">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <th className="py-2.5 px-4 font-semibold">Plan Version</th>
                  <th className="py-2.5 px-4 font-semibold">Block ID</th>
                  <th className="py-2.5 px-4 font-semibold">Corridor</th>
                  <th className="py-2.5 px-4 font-semibold">Departments</th>
                  <th className="py-2.5 px-4 font-semibold">Window</th>
                  <th className="py-2.5 px-4 font-semibold">Time Saved</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bdmsHistoryRows.map((h, i) => (
                  <tr key={h.planVersion || i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-400 whitespace-nowrap">{h.planVersion}</td>
                    <td className="py-3 px-4 text-slate-200 font-bold whitespace-nowrap">{h.blockCode}</td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{h.corridorId}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[9px]">
                        {h.departments}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 whitespace-nowrap">{h.window}</td>
                    <td className="py-3 px-4 text-amber-400 font-bold whitespace-nowrap">{h.timeSaved}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        {h.approvalState}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
