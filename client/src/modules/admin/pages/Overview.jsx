import { Link } from 'react-router-dom';
import { registry } from '@core/modules/registry.js';
import { useAuth } from '../../auth/useAuth.js';
import styles from '../components/ui.module.css';

/** Admin overview: one card per admin section, including sections contributed by other modules. */
export default function Overview() {
  const { user } = useAuth();
  const sections = registry.adminRoutes.filter(
    (r) => r.label && r.path !== '/admin' && (!r.roles || r.roles.includes(user?.role)),
  );

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Admin</h1>
        <p className={styles.lead}>Moderation, users and donation campaigns.</p>
      </div>
      <div className={styles.grid}>
        {sections.map((s) => (
          <Link key={s.path} to={s.path} className={styles.card}>
            <h2 className={styles.cardTitle}>{s.label}</h2>
            <span className={styles.muted}>Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
