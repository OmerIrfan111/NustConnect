import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import http from '@core/api/http.js';
import { useAuth } from '../useAuth.js';
import AuthLayout from '../components/AuthLayout.jsx';
import styles from '../components/form.module.css';

/**
 * /verify. With ?token= (the emailed link) it verifies the account. Without a token it tells a newly registered user
 * to check their inbox and lets them request a fresh link.
 */
export default function Verify() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { pendingUser, isAuthenticated, refresh, logout } = useAuth();
  const [state, setState] = useState(token ? 'checking' : 'idle'); // checking | done | failed | idle
  const [error, setError] = useState('');
  const [resent, setResent] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // the link works once, so never call twice (React StrictMode runs effects twice in dev)
    http
      .post('/auth/verify-email', { token })
      .then(async () => {
        await refresh();
        setState('done');
      })
      .catch((err) => {
        setError(err?.message || 'This verification link is invalid or has expired.');
        setState('failed');
      });
  }, [token, refresh]);

  async function resend() {
    setResent('');
    try {
      const { data } = await http.post('/auth/resend-verification');
      setResent(data.sent ? 'A new link is on its way. Check your inbox.' : 'Your email is already verified.');
    } catch (err) {
      setResent(err?.message || 'Could not send the email. Try again in a moment.');
    }
  }

  return (
    <AuthLayout>
      {state === 'checking' && (
        <>
          <h2 className={styles.title}>Verifying…</h2>
          <p className={styles.lead} role="status">
            Confirming your NUST email.
          </p>
        </>
      )}

      {state === 'done' && (
        <>
          <h2 className={styles.title}>Email verified</h2>
          <p className={styles.lead}>Your NUST email is confirmed. Welcome to the community.</p>
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className={styles.submit} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
            {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
          </Link>
        </>
      )}

      {state === 'failed' && (
        <>
          <h2 className={styles.title}>Link not valid</h2>
          <p role="alert" className={styles.alert}>
            {error}
          </p>
          <p className={styles.lead}>Sign in and request a new verification email.</p>
          <Link to="/login" className={styles.link}>
            Go to Sign In
          </Link>
        </>
      )}

      {state === 'idle' && (
        <>
          <h2 className={styles.title}>Check your inbox</h2>
          {pendingUser ? (
            <>
              <p className={styles.lead}>
                We sent a verification link to <strong>{pendingUser.email}</strong>. Open it to activate your account. The link is
                valid for 24 hours.
              </p>
              {resent && (
                <p role="status" className={styles.lead}>
                  {resent}
                </p>
              )}
              <div className={styles.form}>
                <button type="button" className={styles.submit} onClick={resend}>
                  Resend verification email
                </button>
                <button type="button" className={styles.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={logout}>
                  Use a different account
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.lead}>Sign in to resend your verification email.</p>
              <Link to="/login" className={styles.link}>
                Go to Sign In
              </Link>
            </>
          )}
        </>
      )}
    </AuthLayout>
  );
}
