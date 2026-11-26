import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import http from '@core/api/http.js';
import { useAuth } from '../useAuth.js';
import Field from '../components/Field.jsx';
import { DEPARTMENTS } from './Register.jsx';
import form from '../components/form.module.css';
import styles from '../components/account.module.css';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

/**
 * My Profile: view and edit name, department, batch and avatar.
 * The session can end while this page is still mounted (delete my data, sign out), so the form only renders with a user.
 */
export default function Profile() {
  const { user } = useAuth();
  return user ? <ProfileForm /> : null;
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [values, setValues] = useState({ name: user.name, department: user.department || '', batch: user.batch || '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const year = new Date().getFullYear();

  async function save(e) {
    e.preventDefault();
    const found = {};
    if (values.name.trim().length < 2) found.name = 'Enter your full name';
    if (!values.department) found.department = 'Select your department or school';
    if (!/^\d{4}$/.test(values.batch)) found.batch = 'Enter your batch year, for example 2023';
    setErrors(found);
    setMessage({ kind: '', text: '' });
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const { data } = await http.patch('/auth/profile', { ...values, name: values.name.trim() });
      setUser(data.user);
      setMessage({ kind: 'ok', text: 'Profile saved.' });
    } catch (err) {
      if (err?.details && typeof err.details === 'object') setErrors(err.details);
      else setMessage({ kind: 'error', text: err?.message || 'Could not save your profile.' });
    }
    setBusy(false);
  }

  async function onAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setMessage({ kind: 'error', text: 'Upload a JPEG, PNG or WebP image.' });
    if (file.size > 2 * 1024 * 1024) return setMessage({ kind: 'error', text: 'Image must be 2 MB or smaller.' });

    const body = new FormData();
    body.append('avatar', file);
    setMessage({ kind: '', text: '' });
    try {
      const { data } = await http.post('/auth/profile/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(data.user);
      setMessage({ kind: 'ok', text: 'Photo updated.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Could not upload the photo.' });
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My Profile</h1>

      <div className={styles.card}>
        <div className={styles.identity}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`${user.name}'s photo`} className={styles.avatar} />
          ) : (
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name)}
            </span>
          )}
          <div>
            <strong>{user.name}</strong>
            <p className={styles.muted}>{user.email}</p>
            <span className={styles.badge}>
              <Check size={14} aria-hidden="true" /> Verified Student
            </span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatar} className="nc-sr-only" aria-label="Upload profile photo" tabIndex={-1} />
        <button type="button" className={styles.outline} onClick={() => fileRef.current?.click()}>
          Change photo
        </button>
      </div>

      <form onSubmit={save} noValidate className={`${styles.card} ${form.form}`}>
        {message.text && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? form.alert : styles.ok}>
            {message.text}
          </p>
        )}
        <Field label="Full name" value={values.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Email" value={user.email} readOnly hint="Your NUST email cannot be changed." />
        <Field label="Department / School" as="select" value={values.department} onChange={set('department')} error={errors.department}>
          <option value="">Select…</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Field>
        <Field label="Batch" as="select" value={values.batch} onChange={set('batch')} error={errors.batch}>
          <option value="">Select…</option>
          {Array.from({ length: 12 }, (_, i) => String(year + 1 - i)).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Field>
        <button type="submit" className={form.submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
