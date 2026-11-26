import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import http from '@core/api/http.js';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import { passwordProblem } from '../passwordRules.js';
import styles from '../components/form.module.css';

function RequestLink() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Invalid email');
    setError('');
    setBusy(true);
    try {
      await http.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send the email. Try again in a moment.');
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <>
        <h2 className={styles.title}>Check your inbox</h2>
        <p className={styles.lead} role="status">
          If that email is registered, a reset link is on its way. It is valid for 1 hour and works once.
        </p>
        <Link to="/login" className={styles.link}>
          Back to Sign In
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className={styles.title}>Forgot password?</h2>
      <p className={styles.lead}>Enter your NUST email and we will send you a link to choose a new password.</p>
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <Field label="NUST Email" type="email" autoComplete="email" placeholder="ahmed@students.nust.edu.pk" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className={styles.switch}>
        <Link to="/login" className={styles.link}>
          Back to Sign In
        </Link>
      </p>
    </>
  );
}

function ChoosePassword({ token }) {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const found = {};
    const problem = passwordProblem(form.password);
    if (problem) found.password = problem;
    if (form.confirmPassword !== form.password) found.confirmPassword = 'Passwords do not match';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await http.post('/auth/reset-password', { token, ...form });
      setDone(true);
    } catch (err) {
      setFormError(err?.message || 'Could not reset your password.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <h2 className={styles.title}>Password updated</h2>
        <p className={styles.lead} role="status">
          Your password was changed and every other session was signed out.
        </p>
        <Link to="/login" className={styles.submit} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
          Sign In
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className={styles.title}>Choose a new password</h2>
      {formError && (
        <p role="alert" className={styles.alert}>
          {formError}{' '}
          <Link to="/forgot-password" className={styles.link}>
            Request a new link
          </Link>
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." value={form.password} onChange={set('password')} error={errors.password} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </>
  );
}

/** /forgot-password: asks for the email, or (with ?token= from the emailed link) lets the user choose a new password. */
export default function ForgotPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return <AuthLayout>{token ? <ChoosePassword token={token} /> : <RequestLink />}</AuthLayout>;
}
