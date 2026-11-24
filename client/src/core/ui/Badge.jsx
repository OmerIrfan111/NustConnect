import { Check } from 'lucide-react';
import styles from './Badge.module.css';

const DEFAULT_TEXT = { verified: 'Verified Student', new: 'New', available: 'Available', full: 'Full' };

/**
 * Badge variants from the design board: verified (teal, with a check), new (amber), available (navy), full (grey).
 * `neutral` is a plain grey-blue pill. Children override the default text ("2 seats available").
 */
export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`${styles.badge} ${styles[variant] || styles.neutral} ${className}`}>
      {variant === 'verified' && <Check size={13} aria-hidden="true" />}
      {children ?? DEFAULT_TEXT[variant] ?? null}
    </span>
  );
}
