import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../brand/Logo.jsx';
import Footer from './Footer.jsx';
import { useAuth } from '../../modules/auth/useAuth.js';
import styles from './VisitorLayout.module.css';

const LINKS = [
  { label: 'Home', to: '/', end: true },
  { label: 'Explore Services', to: '/#services' },
  { label: 'About', to: '/about' },
];

export function VisitorNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  return (
    <header className={styles.top}>
      <div className={styles.inner}>
        <Logo />
        <button
          type="button"
          className={styles.burger}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="visitor-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="visitor-menu" className={`${styles.nav} ${open ? styles.open : ''}`} aria-label="Main">
          {LINKS.map((l) =>
            l.to.includes('#') ? (
              <Link key={l.label} to={l.to} className={styles.link}>
                {l.label}
              </Link>
            ) : (
              <NavLink
                key={l.label}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `${styles.link} ${isActive && !location.hash ? styles.active : ''}`}
              >
                {l.label}
              </NavLink>
            ),
          )}
          {isAuthenticated ? (
            <Link to="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={`${styles.btn} ${styles.btnOutline}`}>
                Login
              </Link>
              <Link to="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function VisitorLayout({ children }) {
  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <VisitorNav />
      <main id="main" className={styles.main}>
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  );
}
