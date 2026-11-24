import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import { registry } from '../modules/registry.js';
import { useAuth } from '../../modules/auth/useAuth.js';
import styles from './Topbar.module.css';

/** Inert search stub — replaced by A2's GlobalSearchBar via slots.topbarSearch. */
function SearchStub() {
  return (
    <form className={styles.search} role="search" onSubmit={(e) => e.preventDefault()}>
      <Search size={16} className={styles.searchIcon} aria-hidden="true" />
      <label htmlFor="global-search" className="nc-sr-only">
        Search
      </label>
      <input
        id="global-search"
        type="search"
        placeholder="Search services, rides, items, reviews…"
        className={styles.searchInput}
        title="Global search arrives with the dashboard module"
      />
    </form>
  );
}

/** Inert bell stub — replaced by A2's NotificationBell via slots.topbarNotifications. */
function BellStub() {
  return (
    <Link to="/notifications" className={styles.bell} aria-label="Notifications">
      <Bell size={18} aria-hidden="true" />
      <span className={styles.bellDot} aria-hidden="true" />
    </Link>
  );
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className={styles.profile} ref={ref}>
      <button
        type="button"
        className={styles.profileBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className={styles.profileName}>{user.name}</span>
        <ChevronDown size={16} aria-hidden="true" className={styles.chev} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHead}>
            <strong>{user.name}</strong>
            <span>
              {user.department ? `${user.department} · ` : ''}
              {user.role}
            </span>
          </div>
          <Link to="/profile" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
            <User size={16} aria-hidden="true" /> Profile
          </Link>
          <Link to="/settings" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
            <Settings size={16} aria-hidden="true" /> Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/');
            }}
          >
            <LogOut size={16} aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ onMenu, menuOpen, sidebarId }) {
  const SearchSlot = registry.slots.topbarSearch ?? SearchStub;
  const BellSlot = registry.slots.topbarNotifications ?? BellStub;

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuBtn}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls={sidebarId}
        onClick={onMenu}
      >
        <Menu size={20} />
      </button>
      <div className={styles.searchWrap}>
        <SearchSlot />
      </div>
      <BellSlot />
      <ProfileMenu />
    </header>
  );
}
