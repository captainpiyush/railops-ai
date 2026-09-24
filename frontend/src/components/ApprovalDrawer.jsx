import DataSourceBadge from './DataSourceBadge';
import PriorityScoreBar from './PriorityScoreBar';

export default function ApprovalDrawer({ defect, pendingCount, onApprove, onReject, loading }) {
  if (!defect) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 h-full flex items-center justify-center shadow-xs">
        <div className="text-emerald-500 font-mono-rail text-sm">All defects processed</div>
      </div>
    );
  }

  const getPriorityBadgeClass = (p) => {
    switch(p) {
      case 'CRITICAL': return 'bg-red-500/15 text-red-400 border border-red-500/30';
      case 'HIGH': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'MEDIUM': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      default: return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 relative overflow-hidden flex flex-col h-full shadow-xs">
      {loading && (
        <div className="absolute inset-0 bg-slate-800/80 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="font-mono-rail text-[9px] uppercase text-slate-500 mb-2">NEXT FOR APPROVAL</div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono-rail text-emerald-400 text-sm font-bold truncate pr-2">{defect.defectCode || defect._id.toString().slice(-8).toUpperCase()}</div>
        <DataSourceBadge source={defect.source} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="font-mono-rail text-[8px] text-slate-500 uppercase">Asset</div>
            <div className="font-mono-rail text-xs text-slate-200">{defect.assetId}</div>
          </div>
          <div>
            <div className="font-mono-rail text-[8px] text-slate-500 uppercase">Department</div>
            <div className="font-mono-rail text-xs text-slate-200">{defect.department}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className={`font-mono-rail text-[9px] px-2 py-0.5 rounded-full font-semibold ${getPriorityBadgeClass(defect.priority)}`}>
            {defect.priority}
          </span>
          <div className="font-mono-rail text-[8px] text-slate-500 text-right">
            {new Date(defect.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="mb-4">
          <div className="font-mono-rail text-[8px] text-slate-500 uppercase mb-1">Priority Score</div>
          <PriorityScoreBar score={defect.priorityScore} />
        </div>

        <div className="text-[11px] text-slate-300 bg-slate-800 rounded p-2 border-l-2 border-slate-500 my-3 font-inter">
          {defect.faultDescription}
        </div>

        <div className="font-mono-rail text-[10px] text-slate-400 mb-4">
          EST. DURATION: {defect.estimatedDurationHrs}h
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          onClick={() => onApprove(defect._id)}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-mono-rail text-xs font-bold py-2 rounded-lg transition-colors"
        >
          APPROVE & EXECUTE
        </button>
        <button
          onClick={() => onReject(defect._id)}
          className="w-full border border-red-500/40 text-red-400 hover:bg-red-500/10 font-mono-rail text-xs py-2 rounded-lg transition-colors"
        >
          REJECT
        </button>
        {pendingCount > 1 && (
          <div className="text-center font-mono-rail text-[10px] text-slate-500 mt-1">
            {pendingCount - 1} more in queue
          </div>
        )}
      </div>
    </div>
  );
}
