import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import http from '@core/api/http.js';
import { timeAgo } from '../timeAgo.js';
import styles from './topbar.module.css';

/** Top-bar bell (slot `topbarNotifications`): unread badge plus a dropdown with the latest notifications. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | error
  const ref = useRef(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await http.get('/dashboard/notifications', { params: { limit: 6 } });
      setItems(data.items);
      setUnread(data.unread);
      setState('idle');
    } catch {
      setState('error');
    }
  }, []);

  // Badge on first render and refreshed each time the panel opens.
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    load();
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, load]);

  async function openItem(n) {
    setOpen(false);
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      http.post(`/dashboard/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    http.post('/dashboard/notifications/read-all').catch(load);
  }

  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';

  return (
    <div className={styles.bellWrap} ref={ref}>
      <button
        type="button"
        className={styles.bell}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHead}>
            <strong>Notifications</strong>
            <button type="button" className={styles.linkBtn} onClick={markAll} disabled={unread === 0}>
              Mark all read
            </button>
          </div>

          {state === 'loading' && items.length === 0 && <p className={styles.note}>Loading…</p>}
          {state === 'error' && <p className={styles.note}>Could not load notifications.</p>}
          {state === 'idle' && items.length === 0 && <p className={styles.note}>You&apos;re all caught up.</p>}

          <ul className={styles.items}>
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => openItem(n)}>
                  <span className={styles.itemTitle}>{n.title}</span>
                  {n.body && <span className={styles.itemBody}>{n.body}</span>}
                  <span className={styles.itemWhen}>{timeAgo(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>

          <Link to="/notifications" className={styles.all} onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
