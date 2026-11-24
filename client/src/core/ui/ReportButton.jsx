import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flag } from 'lucide-react';
import http from '../api/http.js';
import { useAuth } from '../../modules/auth/useAuth.js'; // the one sanctioned cross-module import (session contract)
import Button from './Button.jsx';
import Input from './Input.jsx';
import styles from './ReportButton.module.css';

export const REPORT_REASONS = [
  ['spam', 'Spam or scam'],
  ['abuse', 'Abusive or harassing'],
  ['inappropriate', 'Inappropriate content'],
  ['misleading', 'Misleading or fake'],
  ['other', 'Something else'],
];

/**
 * <ReportButton targetType="ride" targetId="123" />   (docs/CONTRACTS.md section 6)
 * Opens a small form (reason + optional details) and POSTs to /api/admin/reports. Moderators see it in the queue and can hide the
 * content through the owning module's `moderationHooks`. The reporter's identity is never shown to staff.
 * Signed-out visitors get a link to sign in instead.
 */
export default function ReportButton({ targetType, targetId, label = 'Report', className = '' }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    return (
      <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className={`${styles.trigger} ${className}`}>
        <Flag size={14} aria-hidden="true" /> Sign in to report
      </Link>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      await http.post('/admin/reports', { targetType, targetId: String(targetId), reason, details: details.trim() });
      setState('done');
    } catch (err) {
      setError(err?.message || 'Could not send your report. Please try again.');
      setState('error');
    }
  }

  const close = () => {
    setOpen(false);
    if (state === 'done') setState('idle');
  };

  return (
    <span className={`${styles.wrap} ${className}`}>
      <button type="button" className={styles.trigger} aria-expanded={open} aria-controls={panelId} aria-label={`${label} this ${targetType}`} onClick={() => (open ? close() : setOpen(true))}>
        <Flag size={14} aria-hidden="true" /> {label}
      </button>

      {open && (
        <div id={panelId} role="group" aria-label={`Report this ${targetType}`} className={styles.panel}>
          {state === 'done' ? (
            <>
              <p role="status" className={styles.done}>
                Thanks. A moderator will review this.
              </p>
              <Button variant="outline" size="sm" onClick={close}>
                Close
              </Button>
            </>
          ) : (
            <form onSubmit={submit} className={styles.form}>
              {state === 'error' && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <Input label="Why are you reporting this?" as="select" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REPORT_REASONS.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </Input>
              <Input label="Details (optional)" as="textarea" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
              <div className={styles.row}>
                <Button type="submit" size="sm" loading={state === 'sending'}>
                  Send report
                </Button>
                <Button variant="outline" size="sm" onClick={close}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </span>
  );
}
