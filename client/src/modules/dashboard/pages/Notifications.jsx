import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '@core/api/http.js';
import { timeAgo } from '../timeAgo.js';
import styles from './Notifications.module.css';

const PAGE = 20;

/** Notifications page: All / Unread filter, mark read, deep links to the source module. */
export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, unread: 0 });
  const [state, setState] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await http.get('/dashboard/notifications', { params: { filter, page, limit: PAGE } });
      setData(res.data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pick = (f) => {
    setFilter(f);
    setPage(1);
  };

  async function open(n) {
    if (!n.read) await http.post(`/dashboard/notifications/${n.id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    else load();
  }

  async function markAll() {
    await http.post('/dashboard/notifications/read-all').catch(() => {});
    load();
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Notifications</h1>
        <button type="button" className={styles.btn} onClick={markAll} disabled={data.unread === 0}>
          Mark all read
        </button>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Filter notifications">
        {[
          ['all', 'All'],
          ['unread', `Unread${data.unread ? ` (${data.unread})` : ''}`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={`${styles.tab} ${filter === key ? styles.active : ''}`}
            onClick={() => pick(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {state === 'loading' && <p className={styles.note}>Loading…</p>}
      {state === 'error' && (
        <p className={styles.note} role="alert">
          Could not load notifications.{' '}
          <button type="button" className={styles.inline} onClick={load}>
            Try again
          </button>
        </p>
      )}
      {state === 'ready' && data.items.length === 0 && (
        <p className={styles.note}>{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
      )}

      {state === 'ready' && data.items.length > 0 && (
        <ul className={styles.list}>
          {data.items.map((n) => (
            <li key={n.id}>
              <button type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => open(n)}>
                <span className={styles.itemTitle}>{n.title}</span>
                {n.body && <span className={styles.itemBody}>{n.body}</span>}
                <span className={styles.itemWhen}>{timeAgo(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state === 'ready' && pages > 1 && (
        <div className={styles.pager}>
          <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className={styles.btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
