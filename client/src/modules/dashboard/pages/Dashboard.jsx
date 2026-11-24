import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth.js';
import { QUICK_ACCESS, SAMPLE_ACTIVITY, SAMPLE_OPPORTUNITIES, SAMPLE_STATS } from '../sampleData.js';
import styles from './Dashboard.module.css';

const SampleTag = () => <span className={styles.sample}>Sample data</span>;

/** Student Dashboard (WF-02). Phase 1 uses sample data, clearly labelled. */
export default function Dashboard() {
  const { user } = useAuth();
  const firstName = (user?.name || 'there').split(' ')[0];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Welcome back, {firstName}</h1>
        <p className={styles.lead}>Everything happening around your campus, in one place.</p>
      </header>

      <section aria-label="Your numbers" className={styles.stats}>
        {SAMPLE_STATS.map((s) => (
          <Link key={s.label} to={s.to} className={`${styles.card} ${styles.stat}`}>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statValue}>{s.value}</span>
            <SampleTag />
          </Link>
        ))}
      </section>

      <section aria-labelledby="quick-access">
        <h2 id="quick-access" className={styles.section}>
          Quick access
        </h2>
        <div className={styles.quick}>
          {QUICK_ACCESS.map(({ title, to, icon: Icon }) => (
            <Link key={title} to={to} className={`${styles.card} ${styles.quickCard}`}>
              <span className={styles.iconTile}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className={styles.cardTitle}>{title}</span>
              <span className={styles.cardSub}>Open module</span>
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.lower}>
        <section aria-labelledby="recent" className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2 id="recent" className={styles.cardTitle}>
              Recent activity
            </h2>
            <SampleTag />
          </div>
          <ul className={styles.list}>
            {SAMPLE_ACTIVITY.map((a) => (
              <li key={a.id}>
                <Link to={a.to} className={styles.activity}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.activityText}>{a.text}</span>
                  <span className={styles.when}>{a.at}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="opps" className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2 id="opps" className={styles.cardTitle}>
              Recommended opportunities
            </h2>
            <SampleTag />
          </div>
          <ul className={styles.list}>
            {SAMPLE_OPPORTUNITIES.map((o) => (
              <li key={o.id}>
                <Link to={o.to} className={styles.opp}>
                  <strong>{o.title}</strong>
                  <span className={styles.cardSub}>{o.meta}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
