import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/axios';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';

const PIPELINE_SOURCES = [
  { id: 'TMS', name: 'TMS', desc: 'Track Management', defaultCount: 35 },
  { id: 'SMMS', name: 'SMMS', desc: 'Signal Maintenance', defaultCount: 35 },
  { id: 'TDMS', name: 'TDMS', desc: 'Traction Distribution', defaultCount: 32 },
  { id: 'BDMS', name: 'BDMS', desc: 'Block Disconnection', defaultCount: 28 },
  { id: 'COA', name: 'COA', desc: 'Control Office Ops', defaultCount: 42 },
  { id: 'TIMETABLE', name: 'Timetable', desc: 'Train Timetable', defaultCount: 129 },
  { id: 'FREIGHT', name: 'Freight Forecast', desc: 'Goods Traffic Stream', defaultCount: 18 },
];

export default function DataIntegration() {
  const { defects = [], blocks = [], schedules = [], activeRecommendation, refreshData } = useRailOps();
  const [metrics, setMetrics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);

  // Dynamic counts derived from Context datasets and backend metrics
  const pipelineCounts = useMemo(() => {
    const safeDefects = defects || [];
    const safeBlocks = blocks || [];
    const safeSchedules = schedules || [];

    const tms = safeDefects.filter(d => d.source === 'TMS' || d.department === 'Track').length;
    const smms = safeDefects.filter(d => d.source === 'SMMS' || d.department === 'Signalling').length;
    const tdms = safeDefects.filter(d => d.source === 'TDMS' || ['Traction', 'Electrical'].includes(d.department)).length;
    const bdms = safeDefects.filter(d => d.source === 'BDMS' || d.department === 'Rolling Stock').length;
    const coa = safeBlocks.length;
    const timetable = safeSchedules.length || 92;
    const freight = 18;

    return {
      TMS: { count: tms },
      SMMS: { count: smms },
      TDMS: { count: tdms },
      BDMS: { count: bdms },
      COA: { count: coa },
      TIMETABLE: { count: timetable },
      FREIGHT: { count: freight }
    };
  }, [defects, blocks, schedules]);

  const totalDynamicRecords = useMemo(() => {
    if (metrics?.summary?.totalRecords) return metrics.summary.totalRecords;
    return Object.values(pipelineCounts).reduce((a, b) => a + (b.count || 0), 0);
  }, [metrics, pipelineCounts]);

  const fetchMetrics = async (isBackground = false) => {
    if (isBackground) setIsPolling(true);
    try {
      const metricsRes = await api.get('/integration/metrics');
      if (metricsRes.data) {
        setMetrics(metricsRes.data);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch integration metrics:', err);
    } finally {
      setInitialLoading(false);
      if (isBackground) {
        setTimeout(() => setIsPolling(false), 600);
      }
    }
  };

  useEffect(() => {
    fetchMetrics(false);
    intervalRef.current = setInterval(() => {
      fetchMetrics(true);
    }, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const unifiedStorage = {
    totalRecords: totalDynamicRecords,
    volumeMb: metrics?.summary?.storageVolumeMb || (((totalDynamicRecords * 2.1) / 1024).toFixed(2) + ' MB')
  };

  const sourcesList = useMemo(() => {
    if (metrics?.sources && metrics.sources.length > 0) {
      return metrics.sources;
    }
    return PIPELINE_SOURCES.map(s => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      records: pipelineCounts[s.id]?.count ?? 0,
      latency: 18,
      errorRate: '0.0%',
      isOnline: true,
      status: 'ONLINE'
    }));
  }, [metrics, pipelineCounts]);

  const getLatencyColor = (latency) => {
    if (latency > 100) return 'text-red-400 font-bold';
    if (latency > 50) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden bg-slate-950 text-slate-100">

      {/* ── SYNTHETIC DEMONSTRATION DISCLAIMER BANNER ── */}
      <div className="bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
            PROTOTYPE DATA ARCHITECTURE
          </span>
          <span className="font-mono-rail text-[10px] text-slate-300">
            Synthetic / simulated data for prototype demonstration — Unified ingestion across Indian Railways TMS, SMMS, TDMS, BDMS, COA, Timetable & Freight streams.
          </span>
        </div>
        <div className="font-mono-rail text-[9px] text-slate-500 flex items-center gap-2">
          <span>Latency Polling: 5s</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {/* ── TOP PIPELINE STREAM CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 flex-shrink-0">
        {sourcesList.map(src => (
          <div key={src.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono-rail text-[10px] font-bold text-emerald-400">{src.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="font-mono-rail text-lg font-bold text-slate-100">{src.records}</div>
            <div className="font-mono-rail text-[8px] text-slate-500 truncate mt-0.5">{src.desc}</div>
            <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between font-mono-rail text-[8px]">
              <span className="text-slate-500">Latency</span>
              <span className={getLatencyColor(src.latency)}>{src.latency}ms</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── LOWER SECTION: DEFECT FEED + LIVE SOURCE HEALTH MONITOR ── */}
      <div className="flex-1 grid grid-cols-[1fr_340px] gap-4 overflow-hidden min-h-0">
        
        {/* Left Table: Defect Ingestion Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
            <div className="flex items-center gap-2">
              <h2 className="font-mono-rail text-xs font-bold text-slate-200">
                UNIFIED MULTI-DEPARTMENT INGESTION STREAM
              </h2>
              <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                {(defects || []).length} RECORDS ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono-rail text-[9px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                AI Suggested Task / Bundle Highlighted
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/95 sticky top-0 z-10">
                <tr>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">ID</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Source</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Asset</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Dept</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Priority</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800">Corridor</th>
                  <th className="p-3 font-mono-rail text-[9px] uppercase text-slate-400 border-b border-slate-800 text-right">AI Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {(defects || []).slice(0, 50).map(d => {
                  const isAiSuggested =
                    d.status === 'BUNDLED' ||
                    d.status === 'SCHEDULED' ||
                    d.source === 'AI_OPTIMIZED' ||
                    activeRecommendation?.taskSummary?.some(t => t.defectCode === d.defectCode || t._id === d._id);

                  return (
                    <tr
                      key={d._id}
                      className={`border-b border-slate-800/60 transition-colors ${
                        isAiSuggested
                          ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400 hover:bg-emerald-950/60'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 font-mono-rail text-[10px] text-emerald-400 font-bold">
                        {d.defectCode || d._id.substring(0, 8)}
                      </td>
                      <td className="p-3">
                        <DataSourceBadge source={d.source} />
                      </td>
                      <td className="p-3 font-mono-rail text-[10px] text-slate-300">
                        {d.assetId}
                      </td>
                      <td className="p-3 font-mono-rail text-[10px] text-slate-400">
                        {d.department}
                      </td>
                      <td className="p-3">
                        <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded-full border font-semibold ${
                          d.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          d.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          d.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {d.priority}
                        </span>
                      </td>
                      <td className="p-3 font-mono-rail text-[10px] text-slate-500">
                        {d.corridorId || 'COR-01'}
                      </td>
                      <td className="p-3 text-right">
                        {isAiSuggested ? (
                          <span className="font-mono-rail text-[8px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold whitespace-nowrap">
                            AI SUGGESTED BUNDLE
                          </span>
                        ) : (
                          <span className="font-mono-rail text-[8px] text-slate-500">Standard</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Live Source Health Monitoring */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
            <h2 className="font-mono-rail text-xs font-bold text-slate-200">
              SOURCE HEALTH MONITOR
            </h2>
            <span className="font-mono-rail text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
            {sourcesList.map(s => {
              const isSpike = parseFloat(s.errorRate) > 0;
              const isHighLatency = s.latency > 100;
              const isHealthy = s.isOnline && !isSpike && !isHighLatency;

              return (
                <div
                  key={s.id || s.name}
                  className="bg-slate-800/50 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DataSourceBadge source={s.name} />
                      <span className="font-mono-rail text-[9px] text-slate-400 truncate max-w-[140px]">
                        {s.desc}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="font-mono-rail text-[8px] text-slate-400">{s.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono-rail text-[8px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Records: <strong className="text-slate-200">{s.records}</strong></span>
                    <span>Latency: <strong className={getLatencyColor(s.latency)}>{s.latency}ms</strong></span>
                    <span>Errors: <strong className={isSpike ? 'text-red-400' : 'text-slate-400'}>{s.errorRate}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
