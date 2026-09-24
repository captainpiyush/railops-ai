import React, { createContext, useContext, useState } from 'react';

export const ROLES = {
  ALL: 'ALL',    // Admin / full access (COA + Operations Chief)
  TMS: 'TMS',   // Track Management — dept dashboard + optimization only
  SMMS: 'SMMS', // Signal Maintenance — dept dashboard + optimization only
  TDMS: 'TDMS', // Traction Distribution — dept dashboard + optimization only
  BDMS: 'BDMS', // Block Disconnection — data integration + corridor time + optimization
  COA: 'COA',   // Control Office Application — full access (same as ALL)
};

export const ROLE_META = {
  ALL:  { label: 'Admin / Operations',  color: 'slate',  icon: '🔧', home: '/' },
  TMS:  { label: 'Track Dept (TMS)',    color: 'blue',   icon: '🛤️',  home: '/department/tms' },
  SMMS: { label: 'Signal Dept (SMMS)', color: 'purple', icon: '🚦',  home: '/department/smms' },
  TDMS: { label: 'Traction Dept (TDMS)',color: 'amber',  icon: '⚡',  home: '/department/tdms' },
  BDMS: { label: 'Block Disconnection (BDMS)', color: 'teal', icon: '📋', home: '/integration' },
  COA:  { label: 'Control Office (COA)',color: 'rose',   icon: '🎛️',  home: '/' },
};

/**
 * Returns the routes accessible for a given role.
 * ALL/COA = unrestricted.
 */
export function getAllowedRoutes(role) {
  switch (role) {
    case 'TMS':  return ['/department/tms',  '/optimization'];
    case 'SMMS': return ['/department/smms', '/optimization'];
    case 'TDMS': return ['/department/tdms', '/optimization'];
    case 'BDMS': return ['/integration', '/department/bdms', '/optimization'];
    default:     return null; // null = unrestricted
  }
}

/**
 * Returns true if the given role can access the given pathname.
 */
export function canRoleAccess(role, pathname) {
  const allowed = getAllowedRoutes(role);
  if (!allowed) return true;
  return allowed.some(r => pathname.startsWith(r));
}

const UserRoleContext = createContext(null);

export function UserRoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    try { return localStorage.getItem('railops_role') || 'ALL'; }
    catch { return 'ALL'; }
  });

  const setRole = (newRole) => {
    try { localStorage.setItem('railops_role', newRole); } catch {}
    setRoleState(newRole);
  };

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const ctx = useContext(UserRoleContext);
  if (!ctx) throw new Error('useUserRole must be used within UserRoleProvider');
  return ctx;
}
