import { useState } from 'react';
import http from '@core/api/http.js';
import styles from '../components/ui.module.css';

/**
 * User lookup (read-only). Uses the user-lookup contract, GET /api/auth/users/lookup?q=, so it can only ever see
 * id, name and verified. Email and phone are never exposed here. Warn / suspend arrive in Phase 2.
 */
export default function Users() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | error
  const [error, setError] = useState('');

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

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Users</h1>
        <p className={styles.lead}>Look up students by name. Read-only.</p>
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
      {users && users.length === 0 && <p className={styles.note}>No users found.</p>}
      {users && users.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Verified</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>
                    <span className={`${styles.badge} ${u.verified ? styles.badgeTeal : ''}`}>{u.verified ? 'Verified' : 'Unverified'}</span>
                  </td>
                  <td>{u.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
