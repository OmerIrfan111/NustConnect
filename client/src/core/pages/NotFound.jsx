import { Link } from 'react-router-dom';
import styles from './StaticPage.module.css';

export default function NotFound() {
  return (
    <section className={styles.center}>
      <div>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Page not found</h1>
        <p style={{ color: 'var(--nc-text-2)' }}>The page you are looking for does not exist or has moved.</p>
        <div className={styles.actions}>
          <Link to="/" className={styles.btn}>
            Go home
          </Link>
          <Link to="/dashboard" className={`${styles.btn} ${styles.btnOutline}`}>
            Open dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
