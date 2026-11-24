import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../useAuth.js';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import { safeNext } from '../safeNext.js';
import styles from '../components/form.module.css';

/** Login (UI-06). */
export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to={next} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!form.email.trim()) found.email = 'Enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Invalid email';
    if (!form.password) found.password = 'Enter your password';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await login(form.email.trim(), form.password, form.remember);
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Could not sign in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className={styles.title}>Welcome Back</h2>
      <p className={styles.lead}>Sign in with your NUST student email to access campus services.</p>

      {formError && (
        <p role="alert" className={styles.alert}>
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <Field
          label="NUST Email"
          type="email"
          autoComplete="email"
          placeholder="ahmed@students.nust.edu.pk"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <div className={styles.row}>
          <label className={styles.check}>
            <input type="checkbox" checked={form.remember} onChange={set('remember')} /> Remember Me
          </label>
          <Link to="/forgot-password" className={styles.link}>
            Forgot Password?
          </Link>
        </div>
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className={styles.switch}>
        New to NUSTConnect?{' '}
        <Link to="/register" className={styles.link}>
          Register Now
        </Link>
      </p>
    </AuthLayout>
  );
}
