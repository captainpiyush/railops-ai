import React, { createContext, useContext, useState } from 'react';

export const ROLES = {
  ALL: 'ALL',    // Admin / full access
  TMS: 'TMS',   // Track Management
  SMMS: 'SMMS', // Signal Maintenance
  TDMS: 'TDMS', // Traction Distribution
  BDMS: 'BDMS', // Block Disconnection
  COA: 'COA',   // Control Office Application (requests removed)
};

export const ROLE_META = {
  ALL:  { label: 'Admin / Operations',  color: 'slate', home: '/' },
  TMS:  { label: 'Track Dept (TMS)',    color: 'blue',  home: '/department/tms' },
  SMMS: { label: 'Signal Dept (SMMS)', color: 'purple', home: '/department/smms' },
  TDMS: { label: 'Traction Dept (TDMS)',color: 'amber', home: '/department/tdms' },
  BDMS: { label: 'Block Disconnection (BDMS)', color: 'teal', home: '/department/bdms' },
  COA:  { label: 'Control Office (COA)',color: 'rose',  home: '/' },
};

/**
 * Returns the routes accessible for a given role.
 * ALL = unrestricted.
 * COA = full access EXCEPT /requests.
 * TMS, SMMS, TDMS, BDMS = department dashboard, optimization, and history.
 */
export function getAllowedRoutes(role) {
  switch (role) {
    case 'TMS':  return ['/department/tms',  '/optimization', '/history'];
    case 'SMMS': return ['/department/smms', '/optimization', '/history'];
    case 'TDMS': return ['/department/tdms', '/optimization', '/history'];
    case 'BDMS': return ['/integration', '/department/bdms', '/optimization', '/history'];
    case 'COA':  return ['/', '/department', '/integration', '/optimization', '/simulation', '/approval', '/history'];
    default:     return null; // null = unrestricted (ALL)
  }
}

/**
 * Returns true if the given role can access the given pathname.
 */
export function canRoleAccess(role, pathname) {
  if (role === 'COA' && pathname.startsWith('/requests')) {
    return false;
  }
  const allowed = getAllowedRoutes(role);
  if (!allowed) return true;
  return allowed.some(r => pathname === r || pathname.startsWith(r + '/') || (r === '/' && pathname === '/'));
}

const UserRoleContext = createContext(null);

export function UserRoleProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('railops_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Preserve admin status: if user logged in as ALL or username is 'admin', they are an Admin
  const authRole = user ? (user.authRole || (user.username === 'admin' ? 'ALL' : user.role) || 'ALL') : null;
  const isAdmin = Boolean(user && authRole === 'ALL');

  const [role, setRoleState] = useState(() => {
    try {
      const storedRole = localStorage.getItem('railops_role');
      if (storedRole) return storedRole;
      const storedUser = localStorage.getItem('railops_auth_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.role) return parsed.role;
      }
      return 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const login = ({ role: newRole, username }) => {
    const userData = {
      username: username || `${newRole.toLowerCase()}_officer`,
      authRole: newRole,
      role: newRole,
      loginTime: new Date().toISOString()
    };
    try {
      localStorage.setItem('railops_auth_user', JSON.stringify(userData));
      localStorage.setItem('railops_role', newRole);
    } catch {}
    setUser(userData);
    setRoleState(newRole);
  };

  const logout = () => {
    try {
      localStorage.removeItem('railops_auth_user');
      localStorage.removeItem('railops_role');
    } catch {}
    setUser(null);
    setRoleState('ALL');
  };

  const setRole = (newRole) => {
    try {
      localStorage.setItem('railops_role', newRole);
      if (user) {
        // Keep authRole intact so admin privileges are never lost!
        const updated = { ...user, role: newRole };
        localStorage.setItem('railops_auth_user', JSON.stringify(updated));
        setUser(updated);
      }
    } catch {}
    setRoleState(newRole);
  };

  const isAuthenticated = Boolean(user);

  return (
    <UserRoleContext.Provider value={{ user, role, authRole, isAdmin, setRole, login, logout, isAuthenticated }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const ctx = useContext(UserRoleContext);
  if (!ctx) throw new Error('useUserRole must be used within UserRoleProvider');
  return ctx;
}
