import styles from './Avatar.module.css';

/** "Ahmed Khan" -> "AK". One word -> its first letter. Empty -> "?". */
export function initialsOf(name = '') {
  const parts = String(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Round avatar: the photo when `src` is given, otherwise the initials. Sizes sm (32), md (40), lg (72). */
export function Avatar({ name = '', src, size = 'md', className = '' }) {
  return src ? (
    <img src={src} alt={name ? `${name}'s photo` : ''} className={`${styles.avatar} ${styles[size]} ${className}`} />
  ) : (
    <span className={`${styles.avatar} ${styles.initials} ${styles[size]} ${className}`} role="img" aria-label={name || 'Unknown user'}>
      {initialsOf(name)}
    </span>
  );
}

/** ProfileChip from the design board: avatar + name + "BSCS · Batch 2023". */
export function ProfileChip({ name, department, batch, src, verified = false }) {
  const meta = [department, batch ? `Batch ${batch}` : ''].filter(Boolean).join(' · ');
  return (
    <span className={styles.chip}>
      <Avatar name={name} src={src} />
      <span className={styles.text}>
        <strong className={styles.name}>
          {name}
          {verified && <span className="nc-sr-only"> (verified)</span>}
        </strong>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
    </span>
  );
}

/** Small amber dot with a count (notification badge). Renders nothing for 0. */
export function NotificationDot({ count = 0, max = 9 }) {
  if (!count || count < 1) return null;
  return (
    <span className={styles.dot} aria-hidden="true">
      {count > max ? `${max}+` : count}
    </span>
  );
}

export default Avatar;
