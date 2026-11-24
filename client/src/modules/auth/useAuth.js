/**
 * Session contract: client side (docs/CONTRACTS.md §2). Owner: A1.
 * Exported names and shapes are stable:
 *   <AuthProvider>            wraps the app (mounted by core)
 *   useAuth() → { user, isAuthenticated, login, logout, register }
 *   user = { id, name, email, role, verified, department, batch }
 *
 * The session is an httpOnly cookie set by the server, so on load the provider asks GET /api/auth/me.
 * Children render only after that check, so a page refresh never bounces a signed-in user to /login.
 * Dev: with VITE_DEV_FAKE_AUTH=true the demo user "Ahmed Khan" is signed in without calling the server.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import http from '@core/api/http.js';
import PageLoading from '@core/pages/PageLoading.jsx';

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

/**
 * `initialUser` (even `null`) skips the server check. Tests use it; leave it out in the real app.
 */
export function AuthProvider({ children, initialUser }) {
  const skipCheck = initialUser !== undefined || FAKE_AUTH;
  const [user, setUser] = useState(initialUser !== undefined ? initialUser : FAKE_AUTH ? DEMO_USER : null);
  const [checking, setChecking] = useState(!skipCheck);

  useEffect(() => {
    if (skipCheck) return undefined;
    let active = true;
    http
      .get('/auth/me')
      .then(({ data }) => active && setUser(data.user))
      .catch(() => active && setUser(null)) // 401 = guest. A network error also leaves the visitor signed out.
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [skipCheck]);

  const login = useCallback(async (email, password, remember = false) => {
    const { data } = await http.post('/auth/login', { email, password, remember });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const { data } = await http.post('/auth/register', form);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout, register }),
    [user, login, logout, register],
  );

  return createElement(AuthContext.Provider, { value }, checking ? createElement(PageLoading) : children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}

export default useAuth;
