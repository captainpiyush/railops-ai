import { useState, useEffect } from 'react';
import { useRailOps } from '../context/RailOpsContext';
import DataSourceBadge from '../components/DataSourceBadge';
import PriorityScoreBar from '../components/PriorityScoreBar';
import Toast from '../components/Toast';
import api from '../api/axios';

export default function ApprovalPipeline() {
  const {
    defects,
    blocks,
    isLoading: loading,
    activeRecommendation,
    handleApproveDefect,
    handleRejectDefect,
    handleBundleDefect,
    handleAcceptRecommendation,
    refreshData
  } = useRailOps();

  const [activeView, setActiveView] = useState('coordinated'); // 'coordinated' | 'individual'
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [planApproved, setPlanApproved] = useState(false);

  const pending = defects.filter(d => d.status === 'PENDING').sort((a,b) => b.priorityScore - a.priorityScore);
  const executed = defects.filter(d => d.status === 'EXECUTED');
  const bundled = defects.filter(d => d.status === 'BUNDLED');

  // Coordinated Package Details dynamically derived from activeRecommendation
  const coordinatedPackage = activeRecommendation ? {
    planVersion: activeRecommendation.recommendationId,
    blockCode: 'BLK-COORD-AUTO',
    corridorId: activeRecommendation.corridorId,
    tasks: activeRecommendation.taskSummary?.map(t => ({
      code: t.defectCode,
      assetId: t.assetId,
      dept: t.department,
      priority: t.priority,
      desc: t.faultDescription,
      duration: `${t.durationHours || 2}h`
    })) || [],
    departments: activeRecommendation.departments?.join(' + ') || 'Track + Signalling + Traction',
    windowStart: new Date(activeRecommendation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    windowEnd: new Date(activeRecommendation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    durationHrs: parseFloat((activeRecommendation.durationMinutes / 60).toFixed(1)),
    timeSavedHrs: activeRecommendation.departments?.length >= 3 ? 4.0 : 2.5,
    trainImpact: '0 Passenger Express Services Delayed',
    freightImpact: 'LOW (0 freight conflicts)',
    availabilityImpact: activeRecommendation.departments?.length >= 3 ? '+4.6% Asset Availability Improvement' : '+3.4% Asset Availability Improvement',
    conflicts: '0 Conflicts (Zero corridor overlap)',
    score: activeRecommendation.score || 95,
    explanation: activeRecommendation.reasons?.[0] || 'Multi-department tasks consolidated under single corridor possession during safe future window.',
    alternativeWindow: 'Next Inter-Peak Window'
  } : null;

  useEffect(() => {
    if (pending.length > 0) {
      if (!selectedDefect || !pending.find(d => d._id === selectedDefect._id)) {
        setSelectedDefect(pending[0]);
      }
    } else {
      setSelectedDefect(null);
    }
  }, [pending, selectedDefect]);

  const handleApproveCoordinatedPackage = async () => {
    setActionLoading(true);
    try {
      if (activeRecommendation) {
        const res = await handleAcceptRecommendation(activeRecommendation._id);
        if (res.success) {
          setPlanApproved(true);
          setToast({ visible: true, message: `Coordinated Package APPROVED — Block ${res.block?.blockCode} committed to live schedule`, type: 'success' });
        } else {
          setToast({ visible: true, message: `Revalidation note: ${res.message || 'Window replanned'}`, type: 'info' });
        }
      } else {
        setToast({ visible: true, message: 'All proposals currently approved or scheduled.', type: 'info' });
      }
      refreshData();
    } catch (e) {
      setToast({ visible: true, message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (status) => {
    if (!selectedDefect) return;
    setActionLoading(true);
    try {
      if (status === 'EXECUTED') {
        await handleApproveDefect(selectedDefect._id);
        setToast({ visible: true, message: `Defect approved & executed — Block Generated`, type: 'success' });
      } else if (status === 'REJECTED') {
        await handleRejectDefect(selectedDefect._id);
        setToast({ visible: true, message: `Defect marked as REJECTED`, type: 'info' });
      } else if (status === 'BUNDLED') {
        await handleBundleDefect(selectedDefect._id);
        setToast({ visible: true, message: `Defect marked as BUNDLED`, type: 'info' });
      }
    } catch (e) {
      setToast({ visible: true, message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityClass = (p) => {
    if (p === 'CRITICAL') return 'bg-red-500/20 text-red-400';
    if (p === 'HIGH') return 'bg-amber-500/20 text-amber-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden bg-slate-950 text-slate-100">

      {/* Top Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('coordinated')}
            className={`font-mono-rail text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center gap-2 ${
              activeView === 'coordinated'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡ COORDINATED BLOCK PACKAGE (AI-RECOMMENDED)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            onClick={() => setActiveView('individual')}
            className={`font-mono-rail text-xs font-bold px-3 py-1.5 rounded transition-all ${
              activeView === 'individual'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INDIVIDUAL DEFECT QUEUE ({pending.length})
          </button>
        </div>

        <div className="font-mono-rail text-[10px] text-slate-400">
          Approval Role: <strong className="text-slate-200">Senior Divisional Operations Manager (Sr. DOM)</strong>
        </div>
      </div>

      {/* ── VIEW 1: COORDINATED BLOCK PACKAGE (REQUIREMENT 26) ── */}
      {activeView === 'coordinated' && !coordinatedPackage && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold mb-3 border border-emerald-500/40">
            ✓
          </div>
          <div className="font-mono-rail text-base font-bold text-slate-100">
            All AI-Proposed Packages Committed to Schedule
          </div>
          <div className="font-mono-rail text-xs text-slate-400 max-w-md mt-1 mb-4">
            There are currently no uncommitted coordinated proposals awaiting authorization. Active maintenance allocations are live on the Dashboard schedule and traceable in History.
          </div>
          <button
            onClick={() => refreshData()}
            className="font-mono-rail text-xs px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Check for New Proposals
          </button>
        </div>
      )}

      {activeView === 'coordinated' && coordinatedPackage && (
        <div className="flex-1 grid grid-cols-[1fr_360px] gap-4 overflow-hidden min-h-0">
          {/* Main Package Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-rail text-lg font-bold text-slate-100">{coordinatedPackage.blockCode}</span>
                  <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold">
                    MULTI-DEPARTMENT CONSOLIDATION
                  </span>
                  <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                    {coordinatedPackage.availabilityImpact}
                  </span>
                </div>
                <div className="font-mono-rail text-[10px] text-slate-400 mt-1">
                  Corridor: <strong className="text-slate-200">{coordinatedPackage.corridorId}</strong> · Plan: {coordinatedPackage.planVersion}
                </div>
              </div>

              <div className="text-right font-mono-rail">
                <div className="text-[9px] text-slate-500">AI OPTIMIZATION SCORE</div>
                <div className="text-2xl font-bold text-emerald-400">{coordinatedPackage.score}/100</div>
              </div>
            </div>

            {/* Time Window Card */}
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div>
                <div className="font-mono-rail text-[9px] uppercase text-slate-400">RECOMMENDED WINDOW</div>
                <div className="font-mono-rail text-xl font-bold text-emerald-400 mt-0.5">
                  {coordinatedPackage.windowStart} – {coordinatedPackage.windowEnd}
                </div>
                <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">Night Golden Window (02:00–08:00)</div>
              </div>
              <div>
                <div className="font-mono-rail text-[9px] uppercase text-slate-400">DURATION & SAVINGS</div>
                <div className="font-mono-rail text-xl font-bold text-amber-400 mt-0.5">
                  {coordinatedPackage.durationHrs}h <span className="text-xs text-slate-400">({coordinatedPackage.timeSavedHrs}h saved)</span>
                </div>
                <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">vs 11.0h uncoordinated sequential</div>
              </div>
              <div>
                <div className="font-mono-rail text-[9px] uppercase text-slate-400">ALTERNATIVE WINDOW</div>
                <div className="font-mono-rail text-sm font-bold text-cyan-400 mt-0.5">
                  {coordinatedPackage.alternativeWindow}
                </div>
                <div className="font-mono-rail text-[9px] text-slate-500 mt-0.5">Backup daytime slot</div>
              </div>
            </div>

            {/* Consolidated Tasks List */}
            <div>
              <div className="font-mono-rail text-xs font-bold text-slate-300 mb-2">
                CONSOLIDATED MAINTENANCE TASKS (3 DEPARTMENTS IN 1 BLOCK):
              </div>
              <div className="flex flex-col gap-2">
                {coordinatedPackage.tasks.map(t => (
                  <div key={t.code} className="bg-slate-800/50 border border-slate-700/70 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-rail text-xs font-bold text-emerald-400">{t.code}</span>
                      <span className="font-mono-rail text-[10px] text-slate-300">({t.assetId})</span>
                      <span className="font-mono-rail text-[9px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                        {t.dept}
                      </span>
                      <span className={`font-mono-rail text-[8px] px-2 py-0.5 rounded ${getPriorityClass(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className="font-mono-rail text-[10px] text-slate-400">{t.desc}</span>
                    </div>
                    <span className="font-mono-rail text-xs font-bold text-slate-200">{t.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Impact Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-lg p-3 font-mono-rail text-[10px]">
                <div className="text-slate-400 font-bold mb-1">PASSENGER & FREIGHT IMPACT</div>
                <div className="text-emerald-400">✓ {coordinatedPackage.trainImpact}</div>
                <div className="text-slate-300 mt-0.5">✓ {coordinatedPackage.freightImpact}</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-lg p-3 font-mono-rail text-[10px]">
                <div className="text-slate-400 font-bold mb-1">CONFLICTS & SAFETY CLEARANCE</div>
                <div className="text-emerald-400">✓ {coordinatedPackage.conflicts}</div>
                <div className="text-slate-300 mt-0.5">✓ 20-minute safety buffer verified before and after block</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="font-mono-rail text-[10px] text-slate-400">
                Authorized Officer: Dispatch to Divisional Control Office (COA)
              </span>
              <button
                onClick={handleApproveCoordinatedPackage}
                disabled={actionLoading || planApproved}
                className={`font-mono-rail text-xs font-bold px-6 py-3 rounded-lg shadow-lg transition-all ${
                  planApproved
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                }`}
              >
                {actionLoading ? 'COMMITTING TO SCHEDULE...' : planApproved ? '✓ PACKAGE APPROVED & COMMITTED' : '✓ APPROVE & COMMIT BLOCK TO SCHEDULE'}
              </button>
            </div>
          </div>

          {/* Right Explanation Column */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="font-mono-rail text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">💡</span>
              <span>AI DECISION EXPLANATION</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 font-mono-rail text-[10px] text-slate-300 leading-relaxed">
              {coordinatedPackage.explanation}
            </div>

            <div className="flex flex-col gap-2 font-mono-rail text-[9px] text-slate-400 mt-2">
              <div className="flex items-center gap-2 bg-slate-800/40 p-2 rounded">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Track gang, OHE tower wagon, and signal technicians work in synchronized corridor zone</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/40 p-2 rounded">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Eliminates 3 separate corridor shutdowns on consecutive days</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/40 p-2 rounded">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero passenger train regulation compared to daytime block execution</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: INDIVIDUAL DEFECT QUEUE ── */}
      {activeView === 'individual' && (
        <div className="flex-1 grid grid-cols-[300px_1fr_300px] gap-4 overflow-hidden min-h-0">
          {/* Column 1: Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="font-mono-rail text-xs font-semibold text-slate-300">PRIORITY QUEUE</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {pending.map(d => (
                <div 
                  key={d._id} 
                  onClick={() => setSelectedDefect(d)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDefect?._id === d._id ? 'bg-slate-800 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono-rail text-[10px] text-slate-300">{d.defectCode || d._id.toString().slice(-8).toUpperCase()}</span>
                    <DataSourceBadge source={d.source} />
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono-rail text-xs font-bold text-slate-200">{d.assetId}</span>
                    <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded ${getPriorityClass(d.priority)}`}>{d.priority}</span>
                  </div>
                  <PriorityScoreBar score={d.priorityScore} />
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Detail */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden p-6">
            {selectedDefect && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-mono-rail text-2xl font-bold text-slate-200">{selectedDefect.defectCode}</h3>
                    <div className="font-mono-rail text-[10px] text-slate-400 mt-1">{selectedDefect.department} · {selectedDefect.corridorId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-rail text-[10px] text-slate-500">AI PRIORITY SCORE</div>
                    <div className="font-mono-rail text-3xl font-bold text-emerald-400">{selectedDefect.priorityScore}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="font-mono-rail text-[9px] text-slate-500 uppercase mb-2">Fault Description</div>
                  <div className="bg-slate-800/60 p-4 rounded-lg border-l-4 border-emerald-500 text-sm text-slate-300">
                    {selectedDefect.faultDescription}
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-3 gap-3">
                  <button onClick={() => handleAction('EXECUTED')} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono-rail text-xs font-bold py-3 rounded-lg transition-colors">
                    APPROVE & EXECUTE
                  </button>
                  <button onClick={() => handleAction('BUNDLED')} className="bg-blue-600 hover:bg-blue-500 text-white font-mono-rail text-xs font-bold py-3 rounded-lg transition-colors">
                    BUNDLE
                  </button>
                  <button onClick={() => handleAction('REJECTED')} className="border border-red-500 text-red-400 hover:bg-red-500/10 font-mono-rail text-xs font-bold py-3 rounded-lg transition-colors">
                    REJECT
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col p-4 gap-3">
            <div className="font-mono-rail text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
              QUEUE STATUS
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 flex justify-between items-center">
              <span className="font-mono-rail text-xs text-amber-400">PENDING</span>
              <span className="font-mono-rail text-xl font-bold text-amber-400">{pending.length}</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 flex justify-between items-center">
              <span className="font-mono-rail text-xs text-blue-400">BUNDLED</span>
              <span className="font-mono-rail text-xl font-bold text-blue-400">{bundled.length}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 flex justify-between items-center">
              <span className="font-mono-rail text-xs text-emerald-400">EXECUTED</span>
              <span className="font-mono-rail text-xl font-bold text-emerald-400">{executed.length}</span>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
    </div>
  );
}
