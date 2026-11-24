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

/** Loads one optional widget: 'loading' until the request settles, then 'live' (with data) or 'sample' (failed or empty). */
function useWidget(url, pick) {
  const [widget, setWidget] = useState({ state: 'loading', data: null });
  useEffect(() => {
    let active = true;
    http
      .get(url)
      .then(({ data }) => {
        if (!active) return;
        const picked = pick(data);
        setWidget(picked ? { state: 'live', data: picked } : { state: 'sample', data: null });
      })
      // Optional data never produces an error wall: the widget falls back to its labelled sample content.
      .catch(() => active && setWidget({ state: 'sample', data: null }));
    return () => {
      active = false;
    };
    // `pick` is a module-level function, so it is stable.
  }, [url, pick]);
  return widget;
}

const pickSummary = (d) => (d && (d.stats?.length || d.recent?.length) ? d : null);
const pickOpportunities = (d) => (d?.items?.length ? d.items : null);

const Skeleton = ({ rows = 3 }) => (
  <div className={styles.skeleton} aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <span key={i} className={styles.skeletonRow} />
    ))}
  </div>
);

/** Student Dashboard (WF-02). Each widget is live when its module provides data, otherwise clearly labelled sample data. */
export default function Dashboard() {
  const { user } = useAuth();
  const firstName = (user?.name || 'there').split(' ')[0];
  const summary = useWidget('/dashboard/summary', pickSummary);
  const opportunities = useWidget('/dashboard/recommended', pickOpportunities);

  const loadingSummary = summary.state === 'loading';
  const stats = mergeStats(summary.data?.stats);
  const liveRecent = summary.data?.recent?.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Welcome back, {firstName}</h1>
        <p className={styles.lead}>Everything happening around your campus, in one place.</p>
      </header>

      <section aria-label="Your numbers" aria-busy={loadingSummary} className={styles.stats}>
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className={`${styles.card} ${styles.stat}`}>
            <span className={styles.statLabel}>{s.label}</span>
            {loadingSummary ? (
              <span className={styles.statSkeleton} aria-label="Loading" />
            ) : (
              <>
                <span className={styles.statValue}>{s.value}</span>
                {s.sample && <SampleTag />}
              </>
            )}
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
        <section aria-labelledby="recent" aria-busy={loadingSummary} className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2 id="recent" className={styles.cardTitle}>
              Recent activity
            </h2>
            {!loadingSummary && !liveRecent && <SampleTag />}
          </div>
          {loadingSummary ? (
            <Skeleton rows={4} />
          ) : (
            <ul className={styles.list}>
              {liveRecent
                ? summary.data.recent.map((a, i) => (
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
          )}
        </section>

        <section aria-labelledby="opps" aria-busy={opportunities.state === 'loading'} className={`${styles.card} ${styles.panel}`}>
          <div className={styles.panelHead}>
            <h2 id="opps" className={styles.cardTitle}>
              Recommended opportunities
            </h2>
            {opportunities.state === 'sample' && <SampleTag />}
          </div>
          {opportunities.state === 'loading' ? (
            <Skeleton rows={3} />
          ) : (
            <ul className={styles.list}>
              {opportunities.state === 'live'
                ? opportunities.data.map((o) => (
                    <li key={o.id}>
                      <Link to={o.url} className={styles.opp}>
                        <strong>{o.title}</strong>
                        {o.snippet && <span className={styles.cardSub}>{o.snippet}</span>}
                      </Link>
                    </li>
                  ))
                : SAMPLE_OPPORTUNITIES.map((o) => (
                    <li key={o.id}>
                      <Link to={o.to} className={styles.opp}>
                        <strong>{o.title}</strong>
                        <span className={styles.cardSub}>{o.meta}</span>
                      </Link>
                    </li>
                  ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
