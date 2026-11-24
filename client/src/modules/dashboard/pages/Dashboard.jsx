import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '@core/api/http.js';
import { useAuth } from '../../auth/useAuth.js';
import { QUICK_ACCESS, SAMPLE_ACTIVITY, SAMPLE_OPPORTUNITIES, SAMPLE_STATS } from '../sampleData.js';
import { timeAgo } from '../timeAgo.js';
import styles from './Dashboard.module.css';

const SampleTag = () => <span className={styles.sample}>Sample data</span>;
const norm = (s) => String(s).trim().toLowerCase();

/**
 * Merges the live stats from each module's summaryProvider into the 4 designed stat cards.
 * A card without a live value falls back to its sample number and is labelled as sample data.
 */
export function mergeStats(live = []) {
  const byLabel = new Map(live.map((s) => [norm(s.label), s]));
  return SAMPLE_STATS.map((s) => {
    const hit = byLabel.get(norm(s.label));
    return hit ? { ...s, value: hit.value, sample: false } : { ...s, sample: true };
  });
}

/** Student Dashboard (WF-02). Live where a module provides a summary, labelled sample data everywhere else. */
export default function Dashboard() {
  const { user } = useAuth();
  const firstName = (user?.name || 'there').split(' ')[0];
  const [summary, setSummary] = useState(null); // null until loaded, or when it fails

  useEffect(() => {
    let active = true;
    http
      .get('/dashboard/summary')
      .then(({ data }) => active && setSummary(data))
      .catch(() => {}); // keep the sample widgets: the dashboard never shows an error wall for optional data
    return () => {
      active = false;
    };
  }, []);

  const stats = mergeStats(summary?.stats);
  const liveRecent = summary?.recent?.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Welcome back, {firstName}</h1>
        <p className={styles.lead}>Everything happening around your campus, in one place.</p>
      </header>

      <section aria-label="Your numbers" className={styles.stats}>
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className={`${styles.card} ${styles.stat}`}>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statValue}>{s.value}</span>
            {s.sample && <SampleTag />}
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
            {!liveRecent && <SampleTag />}
          </div>
          <ul className={styles.list}>
            {liveRecent
              ? summary.recent.map((a, i) => (
                  <li key={`${a.module}-${i}`}>
                    <Link to={a.url || `/${a.module}`} className={styles.activity}>
                      <span className={styles.dot} aria-hidden="true" />
                      <span className={styles.activityText}>{a.text}</span>
                      <span className={styles.when}>{a.at ? timeAgo(a.at) : ''}</span>
                    </Link>
                  </li>
                ))
              : SAMPLE_ACTIVITY.map((a) => (
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
