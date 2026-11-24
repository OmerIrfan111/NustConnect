import { Link } from 'react-router-dom';
import styles from './Button.module.css';

/**
 * Button. Variants follow the design board: primary (navy fill), secondary (teal fill), outline (white fill, navy border).
 * - `to` renders a router <Link> that looks like a button (use it for navigation, a <button> for actions).
 * - `disabled` gives the grey disabled look; `loading` also disables it and sets aria-busy.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const off = disabled || loading;
  const cls = [styles.btn, styles[variant], styles[size], fullWidth ? styles.full : '', off ? styles.disabled : '', className]
    .filter(Boolean)
    .join(' ');

  if (to && !off) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (href && !off) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={off} aria-busy={loading || undefined} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
