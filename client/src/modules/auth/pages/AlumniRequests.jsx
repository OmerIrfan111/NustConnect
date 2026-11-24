import { useCallback, useEffect, useState } from 'react';
import http from '@core/api/http.js';
import styles from '../components/account.module.css';
import form from '../components/form.module.css';

/** Admin screen (rendered inside the admin layout): approve or reject alumni requests by hand. Shows no email or phone. */
export default function AlumniRequests() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await http.get('/auth/alumni-requests', { params: { status: 'pending' } });
      setItems(data.items);
      setState('ready');
    } catch (err) {
      setError(err?.message || 'Could not load requests.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(item, decision) {
    setBusyId(item.id);
    setMessage({ kind: '', text: '' });
    try {
      await http.post(`/auth/alumni-requests/${item.id}/${decision}`);
      setMessage({ kind: 'ok', text: `${item.name}: ${decision === 'approve' ? 'approved' : 'rejected'}.` });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'The action failed.' });
    }
    setBusyId(null);
  }

  return (
    <div className={styles.page} style={{ maxWidth: 'none' }}>
      <div>
        <h1 className={styles.title}>Alumni requests</h1>
        <p className={styles.muted}>Students asking to be recognised as alumni. Approving changes their role to alumni.</p>
      </div>

      {message.text && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? form.alert : styles.ok}>
          {message.text}
        </p>
      )}
      {state === 'loading' && <p className={styles.muted}>Loading…</p>}
      {state === 'error' && (
        <p role="alert" className={form.alert}>
          {error}{' '}
          <button type="button" className={form.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={load}>
            Try again
          </button>
        </p>
      )}
      {state === 'ready' && items.length === 0 && <p className={styles.muted}>No pending requests.</p>}

      {state === 'ready' &&
        items.map((r) => (
          <div key={r.id} className={styles.card}>
            <strong>{r.name}</strong>
            <p className={styles.muted}>
              {r.department} · Batch {r.batch} · Graduated {r.gradYear}
            </p>
            {r.note && <p style={{ margin: 0 }}>{r.note}</p>}
            <div className={form.row} style={{ justifyContent: 'flex-start' }}>
              <button type="button" className={form.submit} style={{ width: 'auto' }} disabled={busyId === r.id} onClick={() => decide(r, 'approve')}>
                Approve
              </button>
              <button type="button" className={styles.outline} disabled={busyId === r.id} onClick={() => decide(r, 'reject')}>
                Reject
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
