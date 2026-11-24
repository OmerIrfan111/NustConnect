/**
 * Session contract — client side (docs/CONTRACTS.md §2). BASE STUB.
 * Owner: A1 (module/auth) replaces the implementation; the exported names and shapes must stay the same:
 *   <AuthProvider>            wraps the app (mounted by core)
 *   useAuth() → { user, isAuthenticated, login, logout }
 *   user = { id, name, email, role, verified, department, batch }
 *
 * Stub behaviour: when VITE_DEV_FAKE_AUTH=true the demo user "Ahmed Khan" is signed in.
 * Role comes from VITE_DEV_FAKE_ROLE (student | alumni | moderator | admin). login() signs in the demo user.
 */
import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';

export const ROLES = ['student', 'alumni', 'moderator', 'admin'];

const env = import.meta.env;
const FAKE_AUTH = env.VITE_DEV_FAKE_AUTH === 'true';
const FAKE_ROLE = ROLES.includes(env.VITE_DEV_FAKE_ROLE) ? env.VITE_DEV_FAKE_ROLE : 'student';

export const DEMO_USER = Object.freeze({
  id: 'demo-ahmed-khan',
  name: 'Ahmed Khan',
  email: 'ahmed@students.nust.edu.pk',
  role: FAKE_ROLE,
  verified: true,
  department: 'SEECS',
  batch: '2023',
});

const AuthContext = createContext(null);

export function AuthProvider({ children, initialUser = FAKE_AUTH ? DEMO_USER : null }) {
  const [user, setUser] = useState(initialUser);

  // Stub: accepts any credentials and signs in the demo user.
  const login = useCallback(async () => {
    setUser(DEMO_USER);
    return DEMO_USER;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout }),
    [user, login, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}

export default useAuth;
