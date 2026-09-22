import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import { useTheme } from '../context/ThemeContext';

export default function Topbar() {
  const { demoClock, handleResetDemo } = useRailOps();
  const { theme, setTheme } = useTheme();
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getNavClass = ({ isActive }) =>
    `font-mono-rail text-[10px] uppercase tracking-wider px-3 py-3 transition-colors ${
      isActive
        ? 'text-blue-700 dark:text-emerald-400 border-b-2 border-blue-600 dark:border-emerald-500 font-bold'
        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
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

  const isDeptActive = (code) => location.pathname.toLowerCase().includes(`/department/${code.toLowerCase()}`);

  return (
    <div className="bg-slate-900 border-b border-slate-700 h-12 flex items-center px-4 justify-between z-50 transition-colors shadow-xs">
      
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-700 dark:bg-emerald-500 rounded flex items-center justify-center font-mono-rail text-xs font-bold text-white shadow-xs">
          RA
        </div>
        <div className="flex flex-col">
          <span className="font-mono-rail text-sm font-bold text-slate-100 leading-tight">RAILOPS AI</span>
          <span className="font-mono-rail text-[10px] text-slate-500 leading-tight">Intelligent Block Planning System</span>
        </div>
      </div>

      <nav className="flex items-center gap-1 h-full">
        <NavLink to="/" className={getNavClass}>Dashboard</NavLink>
        <NavLink to="/department/tms" className={getNavClass}>Dept Dashboards</NavLink>
        <NavLink to="/requests" className={getNavClass}>Requests</NavLink>
        <NavLink to="/integration" className={getNavClass}>Data Integration</NavLink>
        <NavLink to="/optimization" className={getNavClass}>Optimization</NavLink>
        <NavLink to="/simulation" className={getNavClass}>What-If Sim</NavLink>
        <NavLink to="/approval" className={getNavClass}>Approval</NavLink>
        <NavLink to="/history" className={getNavClass}>History</NavLink>
      </nav>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Interactive Department Dashboard Quick Launch Buttons */}
        <div className="flex gap-1 items-center bg-slate-800/80 p-0.5 rounded-full border border-slate-700">
          <button
            type="button"
            onClick={() => navigate('/department/tms')}
            title="Open TMS (Track Management System) Dashboard"
            className={`font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
              isDeptActive('tms')
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs ring-2 ring-blue-400/50'
                : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            TMS
          </button>
          <button
            type="button"
            onClick={() => navigate('/department/smms')}
            title="Open SMMS (Signal Maintenance Management System) Dashboard"
            className={`font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
              isDeptActive('smms')
                ? 'bg-purple-600 text-white border-purple-500 shadow-xs ring-2 ring-purple-400/50'
                : 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            SMMS
          </button>
          <button
            type="button"
            onClick={() => navigate('/department/tdms')}
            title="Open TDMS (Traction Distribution Management System) Dashboard"
            className={`font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
              isDeptActive('tdms')
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs ring-2 ring-amber-400/50'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            TDMS
          </button>
          <button
            type="button"
            onClick={() => navigate('/department/bdms')}
            title="Open BDMS (Block Disconnection Management System) Dashboard"
            className={`font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
              isDeptActive('bdms')
                ? 'bg-teal-600 text-white border-teal-500 shadow-xs ring-2 ring-teal-400/50'
                : 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            BDMS
          </button>
          <button
            type="button"
            onClick={() => navigate('/department/coa')}
            title="Open COA (Control Office Application) Dashboard"
            className={`font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
              isDeptActive('coa')
                ? 'bg-rose-600 text-white border-rose-500 shadow-xs ring-2 ring-rose-400/50'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            COA
          </button>
        </div>

        {/* Global Light / Dark Theme Toggle Switch */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 font-mono-rail text-[10px] shadow-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-blue-900 font-bold shadow-xs border border-slate-300'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Switch to Light Mode (Government / Enterprise style)"
          >
            <span>☀</span>
            <span className="hidden md:inline">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 text-blue-300 font-bold shadow-xs border border-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Switch to Dark Mode (Operations Control style)"
          >
            <span>☾</span>
            <span className="hidden md:inline">Dark</span>
          </button>
        </div>

        {/* Demo Mode & Presentation Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono-rail text-[10px]">
          <span className="text-amber-600 dark:text-amber-400 font-bold">DEMO:</span>
          <span className="text-slate-300">09 Sep 2026, 10:00</span>
        </div>

        {/* Presentation Reset Button */}
        <button
          onClick={onResetClick}
          disabled={resetting}
          title="Reset to pristine deterministic presentation state"
          className="flex items-center gap-1 font-mono-rail text-[10px] px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
        >
          <span>{resetting ? '↺ Resetting...' : '↺ Reset Demo'}</span>
        </button>

        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></div>
          <span className="font-mono-rail text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">LIVE</span>
        </div>
      </div>

    </div>
  );
}
