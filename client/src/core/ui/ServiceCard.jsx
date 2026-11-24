import Card from './Card.jsx';
import styles from './ServiceCard.module.css';

/** ServiceCard: icon tile + title + description, with the teal hover border. `icon` is a lucide-react component. */
export default function ServiceCard({ icon: Icon, title, description, to, onClick, className = '' }) {
  return (
    <Card to={to} onClick={onClick} className={`${styles.card} ${className}`}>
      {Icon && (
        <span className={styles.tile}>
          <Icon size={24} aria-hidden="true" />
        </span>
      )}
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.desc}>{description}</span>}
    </Card>
  );
}
