import { useState } from 'react';
import http from '@core/api/http.js';
import { useAuth } from '../../auth/useAuth.js';
import styles from '../components/ui.module.css';

/**
 * User lookup. Uses the user-lookup contract, GET /api/auth/users/lookup?q=, so it only ever sees id, name and
 * verified: email and phone are never exposed here. Moderators can warn; admins can also suspend and unsuspend.
 */
export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [state, setState] = useState('idle'); // idle | loading | error
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });

  const shown = (users || []).filter((u) => !verifiedOnly || u.verified);

  async function search(e) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) {
      setError('Type at least 2 characters.');
      setState('error');
      return;
    }
    setState('loading');
    try {
      const { data } = await http.get('/auth/users/lookup', { params: { q: term } });
      setUsers(data);
      setState('idle');
    } catch (err) {
      setError(err?.message || 'Search failed.');
      setState('error');
    }
  }

  async function act(u, action) {
    if (action !== 'unsuspend' && reason.trim().length < 3) {
      setMessage({ kind: 'error', text: 'Give a short reason (at least 3 characters).' });
      return;
    }
    setBusy(true);
    setMessage({ kind: '', text: '' });
    try {
      await http.post(`/admin/users/${u.id}/${action}`, { reason: reason.trim() });
      setMessage({ kind: 'ok', text: `${u.name}: ${action} done. Recorded in the audit log.` });
      setOpenId(null);
      setReason('');
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'The action failed.' });
    }
    setBusy(false);
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Users</h1>
        <p className={styles.lead}>Look up students by name. Only name and verified status are shown.</p>
      </div>

      <form onSubmit={search} className={styles.head} role="search">
        <div className={styles.field} style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="user-q" className={styles.label}>
            Name
          </label>
          <input id="user-q" className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" />
        </div>
        <button type="submit" className={styles.btn} disabled={state === 'loading'} style={{ alignSelf: 'end' }}>
          {state === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {state === 'error' && (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      )}
      {message.text && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? styles.alert : styles.okNote}>
          {message.text}
        </p>
      )}
      {users && users.length > 0 && (
        <label className={styles.muted}>
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified only
        </label>
      )}
      {users && shown.length === 0 && <p className={styles.note}>{users.length > 0 ? 'No verified users in these results.' : 'No users found.'}</p>}
      {users && shown.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Verified</th>
                <th>ID</th>
                <th>
                  <span className="nc-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>
                    <span className={`${styles.badge} ${u.verified ? styles.badgeTeal : ''}`}>{u.verified ? 'Verified' : 'Unverified'}</span>
                  </td>
                  <td>{u.id}</td>
                  <td>
                    <button type="button" className={styles.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} aria-expanded={openId === u.id} onClick={() => { setOpenId(openId === u.id ? null : u.id); setReason(''); setMessage({ kind: '', text: '' }); }}>
                      {openId === u.id ? 'Close' : 'Moderate'}
                    </button>
                    {openId === u.id && (
                      <div className={styles.field} style={{ marginTop: 'var(--nc-space-3)', minWidth: 260, whiteSpace: 'normal' }}>
                        <label htmlFor={`reason-${u.id}`} className={styles.label}>
                          Reason
                        </label>
                        <input id={`reason-${u.id}`} className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                        <div className={styles.head} style={{ justifyContent: 'flex-start' }}>
                          <button type="button" className={styles.btn} disabled={busy} onClick={() => act(u, 'warn')}>
                            Warn
                          </button>
                          {isAdmin && (
                            <>
                              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => act(u, 'suspend')}>
                                Suspend
                              </button>
                              <button type="button" className={`${styles.btn} ${styles.btnOutline}`} disabled={busy} onClick={() => act(u, 'unsuspend')}>
                                Unsuspend
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
