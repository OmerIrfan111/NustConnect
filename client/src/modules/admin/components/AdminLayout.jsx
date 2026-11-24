import { NavLink, Outlet } from 'react-router-dom';
import { registry } from '@core/modules/registry.js';
import { useAuth } from '../../auth/useAuth.js';
import styles from './AdminLayout.module.css';

/**
 * Admin layout (slot `adminLayout`). Core mounts it under /admin/* behind a role guard and renders it inside the
 * app shell. The tab bar is built from EVERY module's `adminRoutes` that has a `label`, so modules add their own
 * admin screens (for example complaint management) without touching this file.
 */
export default function AdminLayout() {
  const { user } = useAuth();
  const links = registry.adminRoutes.filter((r) => r.label && (!r.roles || r.roles.includes(user?.role)));

  return (
    <div className={styles.wrap}>
      <nav className={styles.tabs} aria-label="Admin sections">
        {links.map((l) => (
          <NavLink
            key={l.path}
            to={l.path}
            end={l.path === '/admin'}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
