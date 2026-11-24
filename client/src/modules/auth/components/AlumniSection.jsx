import { useState } from 'react';
import http from '@core/api/http.js';
import { useAuth } from '../useAuth.js';
import Field from './Field.jsx';
import form from './form.module.css';
import styles from './account.module.css';

const STATUS_TEXT = {
  pending: 'Your alumni request is waiting for an administrator to review it.',
  approved: 'You are verified as alumni.',
  rejected: 'Your last alumni request was not approved. You can send a new one.',
};

/** Settings section: ask to be recognised as alumni. An administrator approves each request by hand. */
export default function AlumniSection() {
  const { user, setUser } = useAuth();
  const status = user.alumniStatus || 'none';
  const [gradYear, setGradYear] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const thisYear = new Date().getFullYear();

  // Staff and existing alumni have no use for this section.
  if (user.role !== 'student' && status !== 'approved') return null;

  async function submit(e) {
    e.preventDefault();
    if (!/^\d{4}$/.test(gradYear) || Number(gradYear) < 1990 || Number(gradYear) > thisYear) {
      return setErrors({ gradYear: `Enter your graduation year (1990 to ${thisYear})` });
    }
    setErrors({});
    setMessage({ kind: '', text: '' });
    setBusy(true);
    try {
      const { data } = await http.post('/auth/alumni-request', { gradYear, note: note.trim() });
      setUser(data.user);
      setMessage({ kind: 'ok', text: 'Request sent.' });
    } catch (err) {
      if (err?.details && typeof err.details === 'object') setErrors(err.details);
      else setMessage({ kind: 'error', text: err?.message || 'Could not send your request.' });
    }
    setBusy(false);
  }

  const canRequest = user.role === 'student' && (status === 'none' || status === 'rejected');

  return (
    <section aria-labelledby="alumni-h" className={`${styles.card} ${form.form}`}>
      <h2 id="alumni-h" className={styles.section}>
        Alumni verification
      </h2>
      {STATUS_TEXT[status] && <p className={styles.muted}>{STATUS_TEXT[status]}</p>}
      {message.text && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? form.alert : styles.ok}>
          {message.text}
        </p>
      )}
      {canRequest && (
        <form onSubmit={submit} noValidate className={form.form}>
          <Field label="Graduation year" inputMode="numeric" placeholder={String(thisYear - 1)} value={gradYear} onChange={(e) => setGradYear(e.target.value)} error={errors.gradYear} />
          <Field label="Anything that helps us verify you (optional)" as="textarea" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} hint="For example your degree and batch." />
          <button type="submit" className={form.submit} disabled={busy}>
            {busy ? 'Sending…' : 'Request alumni status'}
          </button>
        </form>
      )}
    </section>
  );
}
