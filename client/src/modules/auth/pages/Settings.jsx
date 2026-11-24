import { useState } from 'react';
import http from '@core/api/http.js';
import { useAuth } from '../useAuth.js';
import Field from '../components/Field.jsx';
import AlumniSection from '../components/AlumniSection.jsx';
import DeleteAccount from '../components/DeleteAccount.jsx';
import form from '../components/form.module.css';
import styles from '../components/account.module.css';

/** Settings: privacy and contact preferences. */
export default function Settings() {
  const { user, setUser } = useAuth();
  const s = user.settings || {};
  const [values, setValues] = useState({
    profileVisibility: s.profileVisibility || 'verified',
    contactPreference: s.contactPreference || 'in-app',
    phone: user.phone || '',
    emailNotifications: s.emailNotifications !== false,
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    const found = {};
    if (values.contactPreference === 'phone' && !values.phone.trim()) found.phone = 'Add a phone number to use phone as your contact preference';
    setErrors(found);
    setMessage({ kind: '', text: '' });
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const { data } = await http.patch('/auth/settings', { ...values, phone: values.phone.trim() });
      setUser(data.user);
      setMessage({ kind: 'ok', text: 'Settings saved.' });
    } catch (err) {
      if (err?.details && typeof err.details === 'object') setErrors(err.details);
      else setMessage({ kind: 'error', text: err?.message || 'Could not save your settings.' });
    }
    setBusy(false);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <form onSubmit={save} noValidate className={`${styles.card} ${form.form}`}>
        {message.text && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? form.alert : styles.ok}>
            {message.text}
          </p>
        )}

        <h2 className={styles.section}>Privacy</h2>
        <Field label="Who can see my profile" as="select" value={values.profileVisibility} onChange={set('profileVisibility')} error={errors.profileVisibility}>
          <option value="everyone">Everyone</option>
          <option value="verified">Verified students only</option>
          <option value="private">Only me</option>
        </Field>

        <h2 className={styles.section}>Contact preferences</h2>
        <Field label="How should people reach me" as="select" value={values.contactPreference} onChange={set('contactPreference')} error={errors.contactPreference} hint="Your email and phone are never shown in search or lookup.">
          <option value="in-app">In-app notification</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </Field>
        <Field label="Phone number (optional)" type="tel" autoComplete="tel" placeholder="+92 300 1234567" value={values.phone} onChange={set('phone')} error={errors.phone} />

        <label className={form.check}>
          <input type="checkbox" checked={values.emailNotifications} onChange={set('emailNotifications')} /> Email me about important activity
        </label>

        <button type="submit" className={form.submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <AlumniSection />
      <DeleteAccount />
    </div>
  );
}
