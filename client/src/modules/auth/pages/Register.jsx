import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth.js';
import AuthLayout from '../components/AuthLayout.jsx';
import Field from '../components/Field.jsx';
import styles from '../components/form.module.css';

export const DEPARTMENTS = [
  'SEECS', 'SMME', 'SCEE', 'NBS', 'S3H', 'SADA', 'SNS', 'SCME', 'NICE', 'ASAB', 'IGIS', 'SINES', 'Other',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors the server's rule so the user gets instant feedback. The server remains the source of truth.
const NUST_DOMAINS = ['nust.edu.pk', 'students.nust.edu.pk'];

export function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name';
  const email = f.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) e.email = 'Invalid email';
  else if (!NUST_DOMAINS.includes(email.split('@').pop())) e.email = 'Use your NUST email, for example name@students.nust.edu.pk';
  if (!f.department) e.department = 'Select your department or school';
  if (!/^\d{4}$/.test(f.batch.trim())) e.batch = 'Enter your batch year, for example 2023';
  if (f.password.length < 8) e.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Password must contain a letter and a number';
  if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match';
  if (!f.acceptTerms) e.acceptTerms = 'You must accept the Terms and Privacy Policy';
  return e;
}

/** Registration (UI-07). */
export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', department: '', batch: '', password: '', confirmPassword: '', acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), batch: form.batch.trim() });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Per-field messages from the server (for example a non-NUST email or a duplicate account).
      if (err.details && typeof err.details === 'object') setErrors(err.details);
      else setFormError(err.message || 'Could not create your account. Please try again.');
      setBusy(false);
    }
  }

  const year = new Date().getFullYear();

  return (
    <AuthLayout>
      <h2 className={styles.title}>Join the NUST Community</h2>
      <p className={styles.lead}>
        Institutional email verification is required to keep our community trusted (prototype only).
      </p>

      {formError && (
        <p role="alert" className={styles.alert}>
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <Field label="Full Name" autoComplete="name" placeholder="Ahmed Khan" value={form.name} onChange={set('name')} error={errors.name} />
        <Field
          label="NUST Email Address"
          type="email"
          autoComplete="email"
          placeholder="name@students.nust.edu.pk"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Field label="Department / School" as="select" value={form.department} onChange={set('department')} error={errors.department}>
          <option value="">Select…</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Field>
        <Field label="Batch" as="select" value={form.batch} onChange={set('batch')} error={errors.batch}>
          <option value="">Select…</option>
          {Array.from({ length: 9 }, (_, i) => String(year + 1 - i)).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Field>
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          hint="At least 8 characters, with a letter and a number."
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <Field
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
        />
        <div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={set('acceptTerms')}
              aria-invalid={errors.acceptTerms ? 'true' : undefined}
            />
            <span>
              I accept the Terms and{' '}
              <Link to="/privacy" className={styles.link} target="_blank">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.acceptTerms && <p className={styles.error}>{errors.acceptTerms}</p>}
        </div>
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className={styles.switch}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
