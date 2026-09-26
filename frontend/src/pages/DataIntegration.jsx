import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/axios';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';
import RejectionModal from '../components/RejectionModal';
import Toast from '../components/Toast';
import { useUserRole } from '../context/UserRoleContext';

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
  const {
    defects = [],
    blocks = [],
    schedules = [],
    activeRecommendation,
    handleAcceptRecommendation,
    handleRejectRecommendation,
    handleApproveDefect,
    handleRejectDefect,
    refreshData
  } = useRailOps();
  
  const { role, isAdmin } = useUserRole();

  const [metrics, setMetrics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetDefect, setRejectTargetDefect] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
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

  const fetchMetrics = async () => {
    try {
      const metricsRes = await api.get('/integration/metrics').catch(() => ({ data: null }));
      if (metricsRes.data) {
        setMetrics(metricsRes.data);
      }
    } catch {
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const sourcesList = useMemo(() => {
    if (metrics?.sources && metrics.sources.length > 0) {
      return metrics.sources;
    }
    return PIPELINE_SOURCES.map(s => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      records: pipelineCounts[s.id]?.count ?? s.defaultCount,
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

  // Handle Accept Bundle Action
  const handleAcceptBundle = async () => {
    if (!activeRecommendation) return;
    setIsAccepting(true);
    try {
      const res = await handleAcceptRecommendation(activeRecommendation._id);
      setToast({
        visible: true,
        message: res.message || 'AI Coordinated Bundle Approved & Scheduled to COR-01 UP Main!',
        type: 'success'
      });
    } catch (err) {
      setToast({
        visible: true,
        message: `Accept failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Accept Single Task Action
  const handleAcceptTask = async (task) => {
    try {
      if (task.suggestedBundleId === 'BNDL-COR1-01' || ['DEF-0101', 'DEF-0102', 'DEF-0103'].includes(task.defectCode)) {
        const res = await handleAcceptRecommendation(activeRecommendation?._id || 'REC-GOLDEN-01');
        setToast({
          visible: true,
          message: res.message || `Task ${task.defectCode} & AI Bundle Approved & Scheduled!`,
          type: 'success'
        });
      } else {
        await handleApproveDefect(task._id || task.defectCode);
        setToast({
          visible: true,
          message: `Task ${task.defectCode || task.assetId} Approved & Scheduled!`,
          type: 'success'
        });
      }
    } catch (err) {
      setToast({
        visible: true,
        message: `Accept failed: ${err.message}`,
        type: 'error'
      });
    }
  };

  // Handle Reject Bundle Action
  const handleRejectBundle = () => {
    setRejectTargetDefect(null);
    setIsRejectModalOpen(true);
  };

  // Handle Reject Single Task Action
  const handleOpenRejectTask = (task) => {
    setRejectTargetDefect(task);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (reason) => {
    try {
      if (rejectTargetDefect) {
        if (rejectTargetDefect.suggestedBundleId === 'BNDL-COR1-01' || ['DEF-0101', 'DEF-0102', 'DEF-0103'].includes(rejectTargetDefect.defectCode)) {
          await handleRejectRecommendation(activeRecommendation?._id || 'REC-GOLDEN-01', reason);
        } else {
          await handleRejectDefect(rejectTargetDefect._id || rejectTargetDefect.defectCode, reason);
        }
        setToast({
          visible: true,
          message: `Task ${rejectTargetDefect.defectCode || rejectTargetDefect._id} Rejected — Stamped in Operations Audit History`,
          type: 'info'
        });
        setRejectTargetDefect(null);
      } else if (activeRecommendation) {
        await handleRejectRecommendation(activeRecommendation._id, reason);
        setToast({
          visible: true,
          message: 'AI Bundle Rejected — Stamped in Operations Audit History',
          type: 'info'
        });
      }
      setIsRejectModalOpen(false);
    } catch (err) {
      setToast({
        visible: true,
        message: `Reject failed: ${err.message}`,
        type: 'error'
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden bg-slate-950 text-slate-100 font-mono-rail">

      {/* ── TOP BANNER: SYNTHETIC DATA & AI BUNDLE OVERVIEW ── */}
      <div className="bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
            INTEGRATED TASK TABLE
          </span>
          <span className="text-[10px] text-slate-300">
            Unified Multi-Department Ingestion: Track (TMS), Signalling (SMMS), Traction (TDMS), Rolling Stock (BDMS), COA & Timetable Streams.
          </span>
        </div>
        <div className="text-[9px] text-slate-400 flex items-center gap-2">
          <span>Active Total: <strong className="text-emerald-400">{defects.length} Tasks</strong></span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {/* ── TOP PIPELINE STREAM CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 flex-shrink-0">
        {sourcesList.map(src => (
          <div key={src.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-emerald-400">{src.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-lg font-bold text-slate-100">{src.records}</div>
            <div className="text-[8px] text-slate-500 truncate mt-0.5">{src.desc}</div>
            <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[8px]">
              <span className="text-slate-500">Latency</span>
              <span className={getLatencyColor(src.latency)}>{src.latency}ms</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI SUGGESTED BUNDLED TASK HIGHLIGHT CARD (WITH ACCEPT & REJECT BUTTONS) ── */}
      {activeRecommendation && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg flex-shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                AI SUGGESTED BUNDLE
              </span>
              <span className="text-[11px] font-bold text-slate-100">
                {activeRecommendation.corridorName || 'COR-01: Delhi–Mumbai'} · Optimal Window: {activeRecommendation.timeLabel} ({activeRecommendation.durationHrs}h)
              </span>
              <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                AI Score: {activeRecommendation.score}/100
              </span>
            </div>
            <div className="text-[9.5px] text-slate-400 flex flex-wrap items-center gap-3 mt-0.5">
              <span>Consolidated Tasks: <strong className="text-emerald-300">DEF-0101 (Track 4h) + DEF-0102 (Signalling 2h) + DEF-0103 (Traction 2h)</strong></span>
              <span className="text-slate-600">|</span>
              <span>Downtime Reduction: <strong className="text-slate-200">11.0h Separate → 6.0h Bundled (5.0h Saved)</strong></span>
              <span className="text-slate-600">|</span>
              <span>Availability: <strong className="text-emerald-400">91.8% → 96.4% (+4.6 pp)</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-shrink-0">
            <button
              type="button"
              onClick={handleAcceptBundle}
              disabled={isAccepting}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider transition-all shadow cursor-pointer disabled:opacity-50"
            >
              {isAccepting ? 'Scheduling...' : 'Accept & Assign Block'}
            </button>
            <button
              type="button"
              onClick={handleRejectBundle}
              disabled={isAccepting}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 border border-slate-700 hover:border-red-500/40 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              Reject (With Reason)
            </button>
          </div>
        </div>
      )}

      {/* ── LOWER SECTION: UNIFIED TASK FEED + LIVE SOURCE MONITOR ── */}
      <div className={`flex-1 grid ${(isAdmin || role === 'ALL') ? 'grid-cols-[1fr_340px]' : 'grid-cols-1'} gap-4 overflow-hidden min-h-0`}>
        
        {/* Left Table: Defect Ingestion Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Integrated Task Table
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                {(defects || []).length} TASKS ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                AI Suggested Multi-Dept Bundles Highlighted
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/95 sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Task ID</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Source Dept</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Asset</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Priority</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Duration</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Corridor</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800">Status</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800 text-center">AI Recommendation</th>
                  <th className="p-3 text-[9px] uppercase text-slate-400 border-b border-slate-800 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(defects || []).map(d => {
                  const isAiSuggested =
                    d.status === 'APPROVED' ||
                    d.isAiSuggested ||
                    d.suggestedBundleId === 'BNDL-COR1-01' ||
                    activeRecommendation?.taskSummary?.some(t => t.defectCode === d.defectCode);

                  return (
                    <tr
                      key={d._id || d.defectCode}
                      className={`border-b border-slate-800/60 transition-colors ${
                        isAiSuggested
                          ? 'bg-emerald-950/30 border-l-4 border-l-emerald-400 hover:bg-emerald-950/50'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 text-[10px] text-emerald-400 font-bold">
                        {d.defectCode || d._id}
                      </td>
                      <td className="p-3">
                        <DataSourceBadge source={d.source || d.department} />
                      </td>
                      <td className="p-3 text-[10px] text-slate-300">
                        {d.assetId}
                      </td>
                      <td className="p-3">
                        <span className={`text-[8px] px-2 py-0.5 rounded-full border font-semibold ${
                          d.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          d.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          d.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {d.priority}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-slate-300">
                        {d.estimatedDurationHrs || 2} Hours
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">
                        {d.corridorId || 'COR-01'}
                      </td>
                      <td className="p-3 text-[10px]">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          d.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                          d.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}>
                          {d.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {isAiSuggested ? (
                          <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold whitespace-nowrap">
                            AI BUNDLED (02:00–08:00)
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-500">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {d.status === 'APPROVED' ? (
                            <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                              APPROVED
                            </span>
                          ) : d.status === 'REJECTED' ? (
                            <span className="text-[8px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/40">
                              REJECTED
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptTask(d)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[8px] uppercase tracking-wider transition-all shadow cursor-pointer disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectTask(d)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-red-500/20 text-red-400 border border-slate-700 hover:border-red-500/40 font-bold text-[8px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Live Source Health Monitoring */}
        {(isAdmin || role === 'ALL') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h2 className="text-xs font-bold text-slate-200">
                SOURCE HEALTH MONITOR
              </h2>
              <span className="text-[9px] text-emerald-400 flex items-center gap-1">
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
                        <span className="text-[9px] text-slate-400 truncate max-w-[140px]">
                          {s.desc}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="text-[8px] text-slate-400">{s.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Records: <strong className="text-slate-200">{s.records}</strong></span>
                      <span>Latency: <strong className={getLatencyColor(s.latency)}>{s.latency}ms</strong></span>
                      <span>Errors: <strong className={isSpike ? 'text-red-400' : 'text-slate-400'}>{s.errorRate}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />

      {/* ── REJECTION REASON MODAL WITH OPERATOR JUSTIFICATION TEXTBOX ── */}
      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectTargetDefect(null);
        }}
        onSubmit={handleConfirmReject}
        title={rejectTargetDefect ? "Reject Maintenance Task" : "Reject AI Suggested Task / Bundle"}
        targetName={rejectTargetDefect ? `Task ${rejectTargetDefect.defectCode || rejectTargetDefect._id} (${rejectTargetDefect.department || 'Maintenance'})` : "CAND-02: DEF-0101 + DEF-0102 + DEF-0103 Coordinated Bundle"}
      />
    </div>
  );
}
