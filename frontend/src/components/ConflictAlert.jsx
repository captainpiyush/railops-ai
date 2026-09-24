export default function ConflictAlert({ conflicts = [] }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
      <h3 className="font-mono-rail text-xs text-red-400 font-bold mb-2">CONFLICTS DETECTED</h3>
      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
        {conflicts.map((c, i) => (
          <div key={i} className="flex items-start gap-2 bg-slate-800/50 p-2 rounded">
            <span className={`font-mono-rail text-[8px] px-1.5 py-0.5 rounded flex-shrink-0 ${c.severity === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {c.severity}
            </span>
            <span className="font-mono-rail text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded flex-shrink-0">
              {c.type}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {c.description} (Block: {c.blockId})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
