import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useRailOps } from '../context/RailOpsContext';
import { useTheme } from '../context/ThemeContext';
import { useUserRole, ROLES, ROLE_META } from '../context/UserRoleContext';

// Colour classes for each role badge in the picker
const ROLE_COLORS = {
  ALL:  'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600',
  TMS:  'bg-blue-500/20   text-blue-300   border-blue-500/40   hover:bg-blue-500/35',
  SMMS: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/35',
  TDMS: 'bg-amber-500/20  text-amber-300  border-amber-500/40  hover:bg-amber-500/35',
  BDMS: 'bg-teal-500/20   text-teal-300   border-teal-500/40   hover:bg-teal-500/35',
  COA:  'bg-rose-500/20   text-rose-300   border-rose-500/40   hover:bg-rose-500/35',
};
const ROLE_ACTIVE_COLORS = {
  ALL:  'bg-slate-500   text-white border-slate-400',
  TMS:  'bg-blue-600   text-white border-blue-500',
  SMMS: 'bg-purple-600 text-white border-purple-500',
  TDMS: 'bg-amber-600  text-white border-amber-500',
  BDMS: 'bg-teal-600   text-white border-teal-500',
  COA:  'bg-rose-600   text-white border-rose-500',
};

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

  const isDeptActive = (code) =>
    location.pathname.toLowerCase().includes(`/department/${code.toLowerCase()}`);

  const isAllAccess = role === 'ALL' || role === 'COA';

  // ── Nav items rendered per role ──────────────────────────────────────────
  const renderNav = () => {
    if (isAllAccess) {
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

    if (role === 'TMS') {
      return (
        <>
          <NavLink to="/department/tms"  className={getNavClass}>My Dashboard (TMS)</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
        </>
      );
    }
    if (role === 'SMMS') {
      return (
        <>
          <NavLink to="/department/smms" className={getNavClass}>My Dashboard (SMMS)</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
        </>
      );
    }
    if (role === 'TDMS') {
      return (
        <>
          <NavLink to="/department/tdms" className={getNavClass}>My Dashboard (TDMS)</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
        </>
      );
    }
    if (role === 'BDMS') {
      return (
        <>
          <NavLink to="/integration"     className={getNavClass}>Data Integration</NavLink>
          <NavLink to="/department/bdms" className={getNavClass}>Corridor Time Table</NavLink>
          <NavLink to="/optimization"    className={getNavClass}>Optimization Engine</NavLink>
        </>
      );
    }
    return null;
  };

  // ── Department quick-launch buttons (only for ALL/COA) ───────────────────
  const renderDeptButtons = () => {
    if (!isAllAccess) return null;

    const depts = [
      { code: 'tms',  label: 'TMS',  active: 'bg-blue-600   text-white border-blue-500   ring-2 ring-blue-400/50',   idle: 'bg-blue-500/15   text-blue-700   dark:text-blue-400   border-blue-500/30   hover:bg-blue-500/30'   },
      { code: 'smms', label: 'SMMS', active: 'bg-purple-600 text-white border-purple-500 ring-2 ring-purple-400/50', idle: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/30' },
      { code: 'tdms', label: 'TDMS', active: 'bg-amber-600  text-white border-amber-500  ring-2 ring-amber-400/50',  idle: 'bg-amber-500/15  text-amber-700  dark:text-amber-400  border-amber-500/30  hover:bg-amber-500/30'  },
      { code: 'bdms', label: 'BDMS', active: 'bg-teal-600   text-white border-teal-500   ring-2 ring-teal-400/50',   idle: 'bg-teal-500/15   text-teal-700   dark:text-teal-400   border-teal-500/30   hover:bg-teal-500/30'   },
      { code: 'coa',  label: 'COA',  active: 'bg-rose-600   text-white border-rose-500   ring-2 ring-rose-400/50',   idle: 'bg-rose-500/15   text-rose-700   dark:text-rose-400   border-rose-500/30   hover:bg-rose-500/30'   },
    ];

    return (
      <div className="flex gap-1 items-center bg-slate-800/80 p-0.5 rounded-full border border-slate-700">
        {depts.map(d => (
          <button
            key={d.code}
            type="button"
            onClick={() => navigate(`/department/${d.code}`)}
            title={`Open ${d.label} Department Dashboard`}
            className={`font-mono-rail text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isDeptActive(d.code) ? d.active : d.idle
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    );
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

        {/* Department quick-launch buttons (ALL/COA only) */}
        {renderDeptButtons()}

        {/* ── Role Switcher ──────────────────────────────────────────── */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono-rail text-[10px] font-bold transition-all cursor-pointer ${ROLE_ACTIVE_COLORS[role] || ROLE_ACTIVE_COLORS.ALL}`}
            title="Switch active role / department"
          >
            <span>{ROLE_META[role]?.icon}</span>
            <span className="hidden sm:inline">{role}</span>
            <span className="text-[8px] opacity-70">▾</span>
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800">
                <span className="font-mono-rail text-[10px] text-slate-400 uppercase tracking-wider">
                  Switch Role / Login As
                </span>
              </div>
              {Object.values(ROLES).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSwitch(r)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all cursor-pointer ${
                    r === role
                      ? `${ROLE_ACTIVE_COLORS[r]} font-bold`
                      : `hover:bg-slate-800 text-slate-300 ${ROLE_COLORS[r]}`
                  }`}
                >
                  <span className="text-sm">{ROLE_META[r]?.icon}</span>
                  <div>
                    <div className="font-mono-rail text-[11px] font-bold">{r}</div>
                    <div className="font-mono-rail text-[9px] opacity-70">{ROLE_META[r]?.label}</div>
                  </div>
                  {r === role && (
                    <span className="ml-auto font-mono-rail text-[9px] opacity-80">● Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Theme Toggle ─────────────────────────────────────────────── */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 font-mono-rail text-[10px] shadow-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-blue-900 font-bold shadow-xs border border-slate-300'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Switch to Light Mode"
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
            title="Switch to Dark Mode"
          >
            <span>☾</span>
            <span className="hidden md:inline">Dark</span>
          </button>
        </div>

        {/* ── Demo Clock ─────────────────────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono-rail text-[10px]">
          <span className="text-amber-600 dark:text-amber-400 font-bold">DEMO:</span>
          <span className="text-slate-300">09 Sep 2026, 10:00</span>
        </div>

        {/* ── Reset Demo (ALL/COA only) ─────────────────────────────── */}
        {isAllAccess && (
          <button
            onClick={onResetClick}
            disabled={resetting}
            title="Reset to pristine deterministic presentation state"
            className="hidden md:flex items-center gap-1 font-mono-rail text-[10px] px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{resetting ? '↺ Resetting...' : '↺ Reset Demo'}</span>
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
