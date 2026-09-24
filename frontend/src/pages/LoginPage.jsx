import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole, ROLES, ROLE_META } from '../context/UserRoleContext';

export default function LoginPage() {
  const { login } = useUserRole();
  const navigate = useNavigate();

  const [selectedDept, setSelectedDept] = useState('ALL');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEPARTMENT_OPTIONS = [
    { value: 'ALL',  label: 'Admin / Operations (Full Access)', code: 'ALL',  defaultUser: 'admin' },
    { value: 'TMS',  label: 'Track Management System (TMS)',     code: 'TMS',  defaultUser: 'tms_officer' },
    { value: 'SMMS', label: 'Signal Maintenance System (SMMS)',  code: 'SMMS', defaultUser: 'smms_officer' },
    { value: 'TDMS', label: 'Traction Distribution (TDMS)',      code: 'TDMS', defaultUser: 'tdms_officer' },
    { value: 'BDMS', label: 'Block Disconnection (BDMS)',        code: 'BDMS', defaultUser: 'bdms_officer' },
    { value: 'COA',  label: 'Control Office Application (COA)',  code: 'COA',  defaultUser: 'coa_controller' },
  ];

  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    const opt = DEPARTMENT_OPTIONS.find(o => o.value === dept);
    if (opt) {
      setUsername(opt.defaultUser);
    }
  };

  const handleQuickLogin = (dept) => {
    const opt = DEPARTMENT_OPTIONS.find(o => o.value === dept);
    setSelectedDept(dept);
    if (opt) setUsername(opt.defaultUser);
    setPassword('••••••••');
    setError('');

    // Perform immediate login
    login({ role: dept, username: opt?.defaultUser || dept });
    const targetRoute = ROLE_META[dept]?.home || '/';
    navigate(targetRoute, { replace: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your Employee ID / Username');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      login({ role: selectedDept, username: username.trim() });
      const targetRoute = ROLE_META[selectedDept]?.home || '/';
      navigate(targetRoute, { replace: true });
      setLoading(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Container Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-mono-rail text-base font-bold text-white shadow-lg">
            RA
          </div>
          <div>
            <h1 className="font-mono-rail text-lg font-bold text-slate-100 tracking-wider">
              RAILOPS AI
            </h1>
            <p className="font-mono-rail text-[11px] text-slate-400 mt-0.5">
              Intelligent Block Planning System
            </p>
          </div>
          <span className="font-mono-rail text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 mt-1">
            Department Operations Portal
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono-rail text-xs text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Department Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-rail text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Select Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 font-mono-rail text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {DEPARTMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="font-mono-rail text-[9px] text-slate-500">
              Users are routed to their assigned department view.
            </span>
          </div>

          {/* Employee ID / Username */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-rail text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Employee ID / Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin, tms_officer"
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 font-mono-rail text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-rail text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 font-mono-rail text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono-rail font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : `Sign In to ${selectedDept}`}
          </button>
        </form>

        {/* Quick Demo Access Pills */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
          <span className="font-mono-rail text-[10px] text-slate-500 text-center uppercase tracking-wider">
            Quick Department Sign-In
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {DEPARTMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleQuickLogin(opt.value)}
                className={`py-1.5 px-2 rounded-lg font-mono-rail text-[10px] font-bold border transition-all text-center cursor-pointer ${
                  selectedDept === opt.value
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {opt.code}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-6 text-center font-mono-rail text-[10px] text-slate-500">
        Indian Railways · Centralized AI Block Coordination System
      </div>
    </div>
  );
}
