import { useState } from 'react';
import http from '@core/api/http.js';
import { leaveApp } from '../leaveApp.js';
import Field from './Field.jsx';
import form from './form.module.css';
import styles from './account.module.css';

/** Settings "danger zone": delete my account and data. Asks for the password again, and for an explicit confirmation. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove(e) {
    e.preventDefault();
    if (!password) return setError('Enter your password to confirm');
    if (!sure) return setError('Tick the box to confirm you understand this cannot be undone');
    setError('');
    setBusy(true);
    try {
      await http.delete('/auth/me', { data: { password } });
      leaveApp(); // reloads the home page as a guest
    } catch (err) {
      setError(err?.details?.password || err?.message || 'Could not delete your account.');
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="danger-h" className={`${styles.card} ${styles.danger}`}>
      <h2 id="danger-h" className={styles.section}>
        Delete my data
      </h2>
      <p className={styles.muted}>
        Permanently deletes your account and asks every NUSTConnect service to remove what it stores about you. This cannot be undone.
      </p>
      {!open ? (
        <button type="button" className={styles.dangerBtn} onClick={() => setOpen(true)}>
          Delete my account…
        </button>
      ) : (
        <form onSubmit={remove} noValidate className={form.form}>
          {error && (
            <p role="alert" className={form.alert}>
              {error}
            </p>
          )}
          <Field label="Confirm with your password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className={form.check}>
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /> I understand this is permanent
          </label>
          <div className={form.row}>
            <button type="submit" className={styles.dangerBtn} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete everything'}
            </button>
            <button type="button" className={styles.outline} onClick={() => { setOpen(false); setPassword(''); setSure(false); setError(''); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
