import { useMemo, useState } from 'react';
import { useLoad } from '../useLoad.js';
import { shortDate } from '../format.js';
import styles from '../components/ui.module.css';

const FILTERS = [
  ['open', 'Open'],
  ['resolved', 'Resolved'],
  ['dismissed', 'Dismissed'],
  ['all', 'All'],
];
const PAGE = 20;

/** Moderation queue: reports created by the core ReportButton from any module. Actions arrive in Phase 2. */
export default function Reports() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ status, page, limit: PAGE }), [status, page]);
  const { data, state, error, reload } = useLoad('/admin/reports', params);

  const pick = (s) => {
    setStatus(s);
    setPage(1);
  };
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PAGE));

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Moderation queue</h1>
        <p className={styles.lead}>Content reported by students. Hide, restore and warn actions come in Phase 2.</p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Report status">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            className={`${styles.tab} ${status === key ? styles.tabActive : ''}`}
            onClick={() => pick(key)}
          >
            {label}
          </button>
        ))}
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
      {state === 'ready' && data.items.length === 0 && <p className={styles.note}>No reports here.</p>}

      {state === 'ready' && data.items.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Content</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Status</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.targetType} #{r.targetId}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeAmber}`}>{r.reason}</span>
                  </td>
                  <td>{r.details || '—'}</td>
                  <td>
                    <span className={styles.badge}>{r.status}</span>
                  </td>
                  <td>{shortDate(r.createdAt)}</td>
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
