import { Link } from 'react-router-dom';
import styles from './Card.module.css';

/**
 * Card: white surface, 1px border, 12px radius, subtle shadow (docs/DESIGN.md section 4).
 * - `to` / `onClick` make it clickable (teal border on hover); `selected` gives the amber border (ProductCard selected state).
 * - `as` picks the element for non-interactive cards (default div).
 */
export default function Card({ as: Tag = 'div', to, onClick, selected = false, padding = 'md', className = '', children, ...rest }) {
  const interactive = Boolean(to || onClick);
  const cls = [styles.card, styles[padding], interactive ? styles.interactive : '', selected ? styles.selected : '', className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={`${cls} ${styles.asButton}`} onClick={onClick} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
