import { Fragment, useMemo, useState } from 'react';
import http from '@core/api/http.js';
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

/** The actions that make sense for a report in its current state. */
export function actionsFor(r) {
  if (r.action === 'hidden') return ['restore'];
  if (r.status === 'open') return ['hide', 'dismiss'];
  return [];
}

const LABEL = { hide: 'Hide content', restore: 'Restore content', dismiss: 'Dismiss report' };

/** Moderation queue: reports created by the core ReportButton from any module, with hide / restore / dismiss. */
export default function Reports() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ status, page, limit: PAGE }), [status, page]);
  const { data, state, error, reload } = useLoad('/admin/reports', params);

  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });

  const pick = (s) => {
    setStatus(s);
    setPage(1);
    setOpenId(null);
  };
  const pages = Math.max(1, Math.ceil((data?.total || 0) / PAGE));

  async function act(report, action) {
    setBusy(true);
    setMessage({ kind: '', text: '' });
    try {
      await http.post(`/admin/reports/${report.id}/${action}`, { note: note.trim() });
      setMessage({ kind: 'ok', text: `${LABEL[action]}: done. Recorded in the audit log.` });
      setOpenId(null);
      setNote('');
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'The action failed.' });
    }
    setBusy(false);
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Moderation queue</h1>
        <p className={styles.lead}>Content reported by students. Every action is written to the audit log.</p>
      </div>

      {message.text && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? styles.alert : styles.okNote}>
          {message.text}
        </p>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Report status">
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={status === key} className={`${styles.tab} ${status === key ? styles.tabActive : ''}`} onClick={() => pick(key)}>
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
                <th>
                  <span className="nc-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => {
                const actions = actionsFor(r);
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td>
                        {r.targetType} #{r.targetId}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeAmber}`}>{r.reason}</span>
                      </td>
                      <td>{r.details || '—'}</td>
                      <td>
                        <span className={styles.badge}>{r.action === 'hidden' ? 'hidden' : r.status}</span>
                      </td>
                      <td>{shortDate(r.createdAt)}</td>
                      <td>
                        {actions.length > 0 && (
                          <button type="button" className={styles.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} aria-expanded={openId === r.id} onClick={() => { setOpenId(openId === r.id ? null : r.id); setNote(''); }}>
                            {openId === r.id ? 'Close' : 'Take action'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {openId === r.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className={styles.field} style={{ maxWidth: 520, whiteSpace: 'normal' }}>
                            <label htmlFor={`note-${r.id}`} className={styles.label}>
                              Note (optional, saved in the audit log)
                            </label>
                            <input id={`note-${r.id}`} className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                            <div className={styles.head} style={{ justifyContent: 'flex-start' }}>
                              {actions.map((a) => (
                                <button key={a} type="button" className={`${styles.btn} ${a === 'dismiss' ? styles.btnOutline : ''}`} disabled={busy} onClick={() => act(r, a)}>
                                  {LABEL[a]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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
