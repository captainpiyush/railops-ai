import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import DataIntegration from './pages/DataIntegration';
import OptimizationEngine from './pages/OptimizationEngine';
import WhatIfSimulation from './pages/WhatIfSimulation';
import ApprovalPipeline from './pages/ApprovalPipeline';
import History from './pages/History';
import SubmitRequest from './pages/SubmitRequest';
import DepartmentDashboard from './pages/DepartmentDashboard';
import BDMSDashboard from './pages/BDMSDashboard';
import LoginPage from './pages/LoginPage';
import { RailOpsProvider } from './context/RailOpsContext';
import { ThemeProvider } from './context/ThemeContext';
import { UserRoleProvider, useUserRole, canRoleAccess, ROLE_META } from './context/UserRoleContext';

/**
 * Redirects the user to /login if unauthenticated, or to their role's
 * home page if they try to access a route they are not allowed to visit.
 */
function ProtectedRoute({ children }) {
  const { role, isAuthenticated } = useUserRole();
  const { pathname } = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only ALL is unrestricted
  if (role === 'ALL') return children;

  // COA cannot access requests
  if (role === 'COA' && pathname.startsWith('/requests')) {
    return <Navigate to="/" replace />;
  }

  if (!canRoleAccess(role, pathname)) {
    const home = ROLE_META[role]?.home || '/';
    return <Navigate to={home} replace />;
  }

  return children;
}

/**
 * For TMS / SMMS / TDMS / BDMS roles the root path "/" should redirect
 * to their designated home page so they never land on the main dashboard.
 */
function HomeRedirect() {
  const { role, isAuthenticated } = useUserRole();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'ALL' || role === 'COA') return <Dashboard />;
  const home = ROLE_META[role]?.home;
  return home ? <Navigate to={home} replace /> : <Dashboard />;
}

function AppRoutes() {
  const { isAuthenticated, role } = useUserRole();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={ROLE_META[role]?.home || '/'} replace /> : <LoginPage />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden transition-colors duration-200">
      <Topbar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          {/* Login — redirects to home if already authenticated */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to={ROLE_META[role]?.home || '/'} replace /> : <LoginPage />}
          />

          {/* Home — redirects restricted roles to their designated page */}
          <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />

          {/* Department dashboards — TMS / SMMS / TDMS / COA view */}
          <Route path="/department" element={<ProtectedRoute><DepartmentDashboard /></ProtectedRoute>} />

          {/* BDMS dedicated view (Data Integration + Corridor Time Table) — MUST be before :dept wildcard */}
          <Route path="/department/bdms" element={<ProtectedRoute><BDMSDashboard /></ProtectedRoute>} />

          {/* Generic dept param route — catches tms / smms / tdms / coa */}
          <Route path="/department/:dept" element={<ProtectedRoute><DepartmentDashboard /></ProtectedRoute>} />

          {/* All-access pages (guarded) */}
          <Route path="/requests" element={<ProtectedRoute><SubmitRequest /></ProtectedRoute>} />
          <Route path="/integration" element={<ProtectedRoute><DataIntegration /></ProtectedRoute>} />
          <Route path="/optimization" element={<ProtectedRoute><OptimizationEngine /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><WhatIfSimulation /></ProtectedRoute>} />
          <Route path="/approval" element={<ProtectedRoute><ApprovalPipeline /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />

          {/* Catch-all — redirect to home or login */}
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserRoleProvider>
        <RailOpsProvider>
          <AppRoutes />
        </RailOpsProvider>
      </UserRoleProvider>
    </ThemeProvider>
  );
}
