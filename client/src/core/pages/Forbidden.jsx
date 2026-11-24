import { Link } from 'react-router-dom';
import styles from './StaticPage.module.css';

export default function Forbidden() {
  return (
    <section className={styles.center}>
      <div>
        <p className={styles.code}>403</p>
        <h1 className={styles.title}>You don&apos;t have access</h1>
        <p style={{ color: 'var(--nc-text-2)' }}>This area is limited to moderators and administrators.</p>
        <div className={styles.actions}>
          <Link to="/dashboard" className={styles.btn}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
