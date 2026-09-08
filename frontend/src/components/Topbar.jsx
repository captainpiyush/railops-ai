import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';

export default function Topbar() {
  const { demoClock, handleResetDemo } = useRailOps();
  const [resetting, setResetting] = useState(false);

  const getNavClass = ({ isActive }) =>
    `font-mono-rail text-[10px] uppercase tracking-wider px-3 py-3 transition-colors ${
      isActive ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'
    }`;

  const onResetClick = async () => {
    if (resetting) return;
    try {
      setResetting(true);
      await handleResetDemo();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 h-12 flex items-center px-4 justify-between z-50">
      
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-mono-rail text-xs font-bold text-white">
          RA
        </div>
        <div className="flex flex-col">
          <span className="font-mono-rail text-sm font-bold text-slate-200 leading-tight">RAILOPS AI</span>
          <span className="font-mono-rail text-[10px] text-slate-500 leading-tight">Intelligent Block Planning System</span>
        </div>
      </div>

      <nav className="flex items-center gap-1 h-full">
        <NavLink to="/" className={getNavClass}>Dashboard</NavLink>
        <NavLink to="/requests" className={getNavClass}>Requests</NavLink>
        <NavLink to="/integration" className={getNavClass}>Data Integration</NavLink>
        <NavLink to="/optimization" className={getNavClass}>Optimization</NavLink>
        <NavLink to="/simulation" className={getNavClass}>What-If Sim</NavLink>
        <NavLink to="/approval" className={getNavClass}>Approval</NavLink>
        <NavLink to="/history" className={getNavClass}>History</NavLink>
      </nav>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden lg:flex gap-1">
          <span className="font-mono-rail text-[8px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">TMS</span>
          <span className="font-mono-rail text-[8px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">SMMS</span>
          <span className="font-mono-rail text-[8px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">TDMS</span>
          <span className="font-mono-rail text-[8px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">BDMS</span>
          <span className="font-mono-rail text-[8px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">COA</span>
        </div>

        {/* Demo Mode & Presentation Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono-rail text-[10px]">
          <span className="text-amber-400 font-bold">DEMO:</span>
          <span className="text-slate-300">09 Sep 2026, 10:00</span>
        </div>

        {/* Presentation Reset Button */}
        <button
          onClick={onResetClick}
          disabled={resetting}
          title="Reset to pristine deterministic presentation state"
          className="flex items-center gap-1 font-mono-rail text-[10px] px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
        >
          <span>{resetting ? '↺ Resetting...' : '↺ Reset Demo'}</span>
        </button>

        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></div>
          <span className="font-mono-rail text-[10px] text-emerald-500">LIVE</span>
        </div>
      </div>

    </div>
  );
}
