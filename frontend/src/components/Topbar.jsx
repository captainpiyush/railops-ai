import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import { useTheme } from '../context/ThemeContext';
import { useUserRole, ROLES, ROLE_META } from '../context/UserRoleContext';

export default function Topbar() {
  const { handleResetDemo } = useRailOps();
  const { theme, setTheme } = useTheme();
  const { role, setRole } = useUserRole();
  const [resetting, setResetting]   = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getNavClass = ({ isActive }) =>
    `font-mono-rail text-[10px] uppercase tracking-wider px-3 py-3 transition-colors whitespace-nowrap ${
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

  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    setPickerOpen(false);
    const home = ROLE_META[newRole]?.home || '/';
    navigate(home);
  };

  // ── Nav items rendered per role ──────────────────────────────────────────
  const renderNav = () => {
    if (role === 'ALL') {
      return (
        <>
          <NavLink to="/"            className={getNavClass} end>Dashboard</NavLink>
          <NavLink to="/requests"    className={getNavClass}>Requests</NavLink>
          <NavLink to="/integration" className={getNavClass}>Data Integration</NavLink>
          <NavLink to="/optimization"className={getNavClass}>Optimization</NavLink>
          <NavLink to="/simulation"  className={getNavClass}>What-If Sim</NavLink>
          <NavLink to="/approval"    className={getNavClass}>Approval</NavLink>
          <NavLink to="/history"     className={getNavClass}>History</NavLink>
        </>
      );
    }

    if (role === 'COA') {
      return (
        <>
          <NavLink to="/"            className={getNavClass} end>Dashboard</NavLink>
          <NavLink to="/integration" className={getNavClass}>Data Integration</NavLink>
          <NavLink to="/optimization"className={getNavClass}>Optimization</NavLink>
          <NavLink to="/simulation"  className={getNavClass}>What-If Sim</NavLink>
          <NavLink to="/approval"    className={getNavClass}>Approval</NavLink>
          <NavLink to="/history"     className={getNavClass}>History</NavLink>
        </>
      );
    }

    if (role === 'TMS') {
      return (
        <>
          <NavLink to="/department/tms"  className={getNavClass}>My Dashboard (TMS)</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
          <NavLink to="/history"         className={getNavClass}>History</NavLink>
        </>
      );
    }

    if (role === 'SMMS') {
      return (
        <>
          <NavLink to="/department/smms" className={getNavClass}>My Dashboard (SMMS)</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
          <NavLink to="/history"         className={getNavClass}>History</NavLink>
        </>
      );
    }

    if (role === 'TDMS') {
      return (
        <>
          <NavLink to="/department/tdms" className={getNavClass}>My Dashboard (TDMS)</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
          <NavLink to="/history"         className={getNavClass}>History</NavLink>
        </>
      );
    }

    if (role === 'BDMS') {
      return (
        <>
          <NavLink to="/integration"     className={getNavClass}>Data Integration</NavLink>
          <NavLink to="/department/bdms" className={getNavClass}>Corridor Time Table</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
          <NavLink to="/history"         className={getNavClass}>History</NavLink>
        </>
      );
    }

    return null;
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700 h-12 flex items-center px-4 justify-between z-50 transition-colors shadow-xs">

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-700 dark:bg-emerald-500 rounded flex items-center justify-center font-mono-rail text-xs font-bold text-white shadow-xs">
          RA
        </div>
        <div className="flex flex-col">
          <span className="font-mono-rail text-sm font-bold text-slate-100 leading-tight">RAILOPS AI</span>
          <span className="font-mono-rail text-[10px] text-slate-500 leading-tight">Intelligent Block Planning System</span>
        </div>
      </div>

      {/* ── Role-aware navigation ─────────────────────────────────────── */}
      <nav className="flex items-center gap-0 h-full overflow-x-auto">
        {renderNav()}
      </nav>

      {/* ── Right-side controls ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* ── Role Switcher ──────────────────────────────────────────── */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono-rail text-[10px] font-bold transition-all cursor-pointer bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            title="Switch active role / department"
          >
            <span>Role: {role}</span>
            <span className="text-[9px] opacity-70">▼</span>
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-800">
              <div className="px-3 py-2 border-b border-slate-100 bg-white">
                <span className="font-mono-rail text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Switch Role / Department
                </span>
              </div>
              <div className="bg-white p-1 space-y-0.5">
                {Object.values(ROLES).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSwitch(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-all cursor-pointer bg-white ${
                      r === role
                        ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-l-slate-800'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-mono-rail text-[11px] font-bold text-slate-900">{r}</div>
                      <div className="font-mono-rail text-[9px] text-slate-500">{ROLE_META[r]?.label}</div>
                    </div>
                    {r === role && (
                      <span className="font-mono-rail text-[9px] text-slate-800 font-bold">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Theme Toggle ─────────────────────────────────────────────── */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 font-mono-rail text-[10px] shadow-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-blue-900 font-bold shadow-xs border border-slate-300'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Switch to Light Mode"
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 text-blue-300 font-bold shadow-xs border border-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Switch to Dark Mode"
          >
            Dark
          </button>
        </div>

        {/* ── Demo Clock ─────────────────────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono-rail text-[10px]">
          <span className="text-amber-600 dark:text-amber-400 font-bold">DEMO:</span>
          <span className="text-slate-300">09 Sep 2026, 10:00</span>
        </div>

        {/* ── Reset Demo (ALL/COA only) ─────────────────────────────── */}
        {(role === 'ALL' || role === 'COA') && (
          <button
            onClick={onResetClick}
            disabled={resetting}
            title="Reset to pristine deterministic presentation state"
            className="hidden md:flex items-center gap-1 font-mono-rail text-[10px] px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
          </button>
        )}

        {/* ── Live indicator ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></div>
          <span className="font-mono-rail text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">LIVE</span>
        </div>
      </div>
    </div>
  );
}
