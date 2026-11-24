import { useMemo, useState } from 'react';
import { useLoad } from '../useLoad.js';
import styles from '../components/ui.module.css';

const PAGE = 25;
const when = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/** Audit log (admin only): who did what, to what, and when. Read-only. */
export default function AuditLog() {
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, limit: PAGE }), [page]);
  const { data, state, error, reload } = useLoad('/admin/audit', params);
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PAGE));

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Audit log</h1>
        <p className={styles.lead}>Every moderation and admin action, newest first. Entries cannot be changed or removed.</p>
      </div>

      {state === 'loading' && <p className={styles.note}>Loading…</p>}
      {state === 'error' && (
        <p className={styles.alert} role="alert">
          {error}{' '}
          <button type="button" className={styles.link} onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {state === 'ready' && data.items.length === 0 && <p className={styles.note}>Nothing has been recorded yet.</p>}

      {state === 'ready' && data.items.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td>{when(a.at)}</td>
                  <td>
                    {a.actorName || a.actorId} <span className={styles.muted}>({a.actorRole})</span>
                  </td>
                  <td>
                    <span className={styles.badge}>{a.action}</span>
                  </td>
                  <td>{a.targetType ? `${a.targetType} #${a.targetId}` : '—'}</td>
                  <td style={{ whiteSpace: 'normal' }}>{a.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state === 'ready' && pages > 1 && (
        <div className={styles.pager}>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
