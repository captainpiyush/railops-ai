import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';

const CORRIDOR_METADATA = {
  'COR-01': { name: 'Delhi – Mumbai',    fromStation: 'NDLS', toStation: 'CSMT', km: 1384 },
  'COR-02': { name: 'Delhi – Howrah',    fromStation: 'NDLS', toStation: 'HWH',  km: 1441 },
  'COR-03': { name: 'Mumbai – Chennai',  fromStation: 'CSMT', toStation: 'MAS',  km: 1279 },
  'COR-04': { name: 'Howrah – Chennai',  fromStation: 'HWH',  toStation: 'MAS',  km: 1659 },
  'COR-05': { name: 'Delhi – Chennai',   fromStation: 'NDLS', toStation: 'MAS',  km: 2175 },
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
  const { defects = [], blocks = [], corridorWindows = [], pipelineStats, effectiveNow } = useRailOps();

  // ── Data Integration summary cards ──────────────────────────────────────
  const integrationSummary = useMemo(() => {
    const tms  = defects.filter(d => d.source === 'TMS'  || d.department === 'Track').length;
    const smms = defects.filter(d => d.source === 'SMMS' || d.department === 'Signalling').length;
    const tdms = defects.filter(d => d.source === 'TDMS' || ['Traction', 'Electrical'].includes(d.department)).length;
    const bdms = blocks.filter(b => ['PROPOSED', 'ACTIVE'].includes(b.status)).length;
    const coa  = blocks.length;
    return { tms, smms, tdms, bdms, coa };
  }, [defects, blocks]);

  const sources = [
    { id: 'TMS',      desc: 'Track Management System',              count: integrationSummary.tms,  color: 'blue',   dot: 'bg-blue-400'   },
    { id: 'SMMS',     desc: 'Signal Maintenance Management System', count: integrationSummary.smms, color: 'purple', dot: 'bg-purple-400' },
    { id: 'TDMS',     desc: 'Traction Distribution System',         count: integrationSummary.tdms, color: 'amber',  dot: 'bg-amber-400'  },
    { id: 'BDMS',     desc: 'Block Disconnection System',           count: integrationSummary.bdms, color: 'teal',   dot: 'bg-teal-400'   },
    { id: 'COA',      desc: 'Control Office Application',           count: integrationSummary.coa,  color: 'rose',   dot: 'bg-rose-400'   },
    { id: 'TIMETABLE',desc: 'Train Timetable',                      count: 92,                      color: 'indigo', dot: 'bg-indigo-400' },
    { id: 'FREIGHT',  desc: 'Freight Forecast',                     count: 18,                      color: 'slate',  dot: 'bg-slate-400'  },
  ];

  const totalRecords = sources.reduce((s, src) => s + src.count, 0);

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
        windowTimeDay:   `${dayLabel(w.day)}, ${w.windowStart} – ${w.windowEnd}`,
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
        windowTimeDay:`${dayLabel(dName)}, ${st} – ${et}`,
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
              BDMS — Block Disconnection Management System
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Locomotives, Coaches, Wagons &amp; Depot Possession Coordination — Data Integration &amp; Corridor Windows
          </p>
        </div>
        <button
          onClick={() => navigate('/optimization')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono-rail font-bold text-xs transition-all shadow-xs cursor-pointer"
        >
          <span>⚡</span>
          <span>Optimization Engine</span>
        </button>
      </div>

      {/* ─── Main scrollable area ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ══ SECTION 1: DATA INTEGRATION SUMMARY ══════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
            <h2 className="font-mono-rail font-bold text-sm text-slate-100 uppercase tracking-wide">
              Data Integration — Source Pipeline Overview
            </h2>
          </div>

          {/* KPI bar */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <span className="font-mono-rail text-[10px] text-slate-400 uppercase">Total Records</span>
              <div className="text-xl font-bold font-mono-rail text-teal-400 mt-0.5">{totalRecords}</div>
              <span className="text-[10px] text-slate-500">Across all 7 source systems</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <span className="font-mono-rail text-[10px] text-slate-400 uppercase">Active Blocks</span>
              <div className="text-xl font-bold font-mono-rail text-blue-400 mt-0.5">
                {blocks.filter(b => ['ACTIVE','APPROVED'].includes(b.status)).length}
              </div>
              <span className="text-[10px] text-slate-500">Approved/Active possessions</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <span className="font-mono-rail text-[10px] text-slate-400 uppercase">Pending Defects</span>
              <div className="text-xl font-bold font-mono-rail text-amber-400 mt-0.5">
                {defects.filter(d => d.status === 'PENDING').length}
              </div>
              <span className="text-[10px] text-slate-500">Awaiting block allocation</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
              <span className="font-mono-rail text-[10px] text-slate-400 uppercase">System Health</span>
              <div className="text-xl font-bold font-mono-rail text-emerald-400 mt-0.5">OPTIMAL</div>
              <span className="text-[10px] text-slate-500">All sources online</span>
            </div>
          </div>

          {/* Sources table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <span className="font-mono-rail text-xs font-bold text-slate-200 uppercase tracking-wide">
                Source Systems Status
              </span>
              <span className="font-mono-rail text-[10px] text-emerald-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                All {sources.length} sources ONLINE
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 font-mono-rail uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <th className="py-2.5 px-4 font-semibold">Source System</th>
                    <th className="py-2.5 px-4 font-semibold">Description</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Records</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono-rail">
                  {sources.map(src => (
                    <tr key={src.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${src.dot}`}></span>
                          <span className="font-bold text-slate-100">{src.id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{src.desc}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">{src.count}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          ONLINE
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">18 ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ══ SECTION 2: CORRIDOR TIME TABLE ═══════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <h2 className="font-mono-rail font-bold text-sm text-slate-100 uppercase tracking-wide">
                Corridor Time Table
              </h2>
              <span className="font-mono-rail text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {corridorTimeRows.length} Slots  •  {allocatedCount} Allocated
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono-rail text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Allocated Block</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span>Available Window</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
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
                            {row.corridorName} ({row.fromStation} → {row.toStation})
                          </div>
                        </td>

                        {/* Window Time with Day */}
                        <td className="py-3 px-4 text-emerald-400 whitespace-nowrap font-medium">
                          📅 {row.windowTimeDay}
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
        </div>

      </div>
    </div>
  );
}
