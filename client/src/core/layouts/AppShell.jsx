import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import styles from './AppShell.module.css';

const SIDEBAR_ID = 'app-sidebar';

/** Signed-in shell: sidebar (from manifests) + top bar + content area. */
export default function AppShell({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className={styles.app}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Sidebar id={SIDEBAR_ID} open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      {drawerOpen && <div className={styles.scrim} onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
      <div className={styles.body}>
        <Topbar onMenu={() => setDrawerOpen(true)} menuOpen={drawerOpen} sidebarId={SIDEBAR_ID} />
        <main id="main" className={styles.content}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
