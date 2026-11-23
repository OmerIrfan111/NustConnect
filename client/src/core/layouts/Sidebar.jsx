import { NavLink } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';
import { registry, visibleFor } from '../modules/registry.js';
import { useAuth } from '../../modules/auth/useAuth.js';
import styles from './Sidebar.module.css';

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.path}
        onClick={onNavigate}
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
      >
        <span className={styles.icon} aria-hidden="true">
          {Icon ? <Icon size={18} strokeWidth={2} /> : <span className={styles.dot} />}
        </span>
        <span className={styles.label}>{item.label}</span>
      </NavLink>
    </li>
  );
}

/** Sidebar built entirely from module manifests (registry.nav). */
export default function Sidebar({ open, onNavigate, id }) {
  const { user } = useAuth();
  const main = visibleFor(registry.nav.main, user?.role);
  const more = visibleFor(registry.nav.more, user?.role);

  return (
    <aside id={id} className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Sidebar">
      <div className={styles.brand}>
        <Logo onDark to="/dashboard" onClick={onNavigate} />
      </div>
      <nav className={styles.nav} aria-label="Modules">
        <ul className={styles.list}>
          {main.map((item) => (
            <NavItem key={item.path} item={item} onNavigate={onNavigate} />
          ))}
        </ul>
        {more.length > 0 && (
          <>
            <p className={styles.groupLabel}>More</p>
            <ul className={styles.list}>
              {more.map((item) => (
                <NavItem key={item.path} item={item} onNavigate={onNavigate} />
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
