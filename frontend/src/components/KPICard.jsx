export default function KPICard({ label, value, sub, accentClass, icon }) {
  // accentClass expected: kpi-accent-em, kpi-accent-rd, kpi-accent-am, kpi-accent-bl, kpi-accent-vi
  let valueColor = 'text-slate-100';
  if (accentClass === 'kpi-accent-em') valueColor = 'text-emerald-400';
  if (accentClass === 'kpi-accent-rd') valueColor = 'text-red-400';
  if (accentClass === 'kpi-accent-am') valueColor = 'text-amber-400';
  if (accentClass === 'kpi-accent-bl') valueColor = 'text-blue-400';
  if (accentClass === 'kpi-accent-vi') valueColor = 'text-violet-400';

  return (
    <div className={`relative bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-hidden shadow-xs transition-colors ${accentClass}`}>
      {icon && <div className="absolute top-3 right-3 text-lg opacity-20">{icon}</div>}
      <div className="font-mono-rail text-[9px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`font-mono-rail text-2xl font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="font-mono-rail text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
