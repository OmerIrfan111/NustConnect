import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

/** Original NUSTConnect mark: three connected nodes. Does not use the NUST crest. */
export function LogoMark({ size = 32, onDark = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="12" fill={onDark ? 'var(--nc-surface)' : 'var(--nc-navy)'} />
      <path
        d="M14 33 24 14 34 33Z"
        stroke={onDark ? 'var(--nc-navy)' : 'var(--nc-on-primary)'}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="33" r="5" fill="var(--nc-teal)" />
      <circle cx="34" cy="33" r="5" fill="var(--nc-teal)" />
      <circle cx="24" cy="14" r="5" fill="var(--nc-teal)" />
    </svg>
  );
}

export default function Logo({ onDark = false, to = '/', size = 32, onClick }) {
  return (
    <Link to={to} onClick={onClick} className={`${styles.logo} ${onDark ? styles.onDark : ''}`} aria-label="NUSTConnect home">
      <LogoMark size={size} onDark={onDark} />
      <span className={styles.word}>
        NUST<span className={styles.accent}>Connect</span>
      </span>
    </Link>
  );
}
