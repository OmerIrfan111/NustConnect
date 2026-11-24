import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/useAuth.js';
import AppShell from '../layouts/AppShell.jsx';
import VisitorLayout from '../layouts/VisitorLayout.jsx';
import Forbidden from '../pages/Forbidden.jsx';

/** Redirects guests to /login?next=<current path>. */
export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

/** Shows a 403 page unless the signed-in user has one of `roles`. Use inside RequireAuth. */
export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles || roles.length === 0) return children;
  if (!user || !roles.includes(user.role)) return <Forbidden />;
  return children;
}

/** Public pages (map, FAQ…): signed-in users see the AppShell, guests see the visitor shell. */
export function AdaptiveLayout() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell /> : <VisitorLayout />;
}
