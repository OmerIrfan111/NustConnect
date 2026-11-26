import { Link, useParams } from 'react-router-dom';
import { useLoad } from '../useLoad.js';
import { pkr, shortDate } from '../format.js';
import ProgressBar from '../components/ProgressBar.jsx';
import styles from '../components/ui.module.css';

/** Campaign detail (/donations/:id) with the progress bar. */
export default function DonationDetail() {
  const { id } = useParams();
  const { data, state, error, reload } = useLoad(`/admin/campaigns/${id}`);

  if (state === 'loading') return <p className={styles.note}>Loading…</p>;
  if (state === 'error') {
    return (
      <div className={styles.page}>
        <p className={styles.alert} role="alert">
          {error}{' '}
          <button type="button" className={styles.link} onClick={reload}>
            Try again
          </button>
        </p>
        <Link to="/donations" className={styles.link}>
          Back to campaigns
        </Link>
      </div>
    );
  }

  const c = data.campaign;
  return (
    <div className={styles.page}>
      <Link to="/donations" className={styles.link}>
        ← All campaigns
      </Link>
      <div className={styles.card} style={{ maxWidth: 720 }}>
        <div className={styles.head}>
          <h1 className={styles.title}>{c.title}</h1>
          {c.status === 'closed' && <span className={styles.badge}>Closed</span>}
        </div>
        {c.sample && <span className={styles.sample}>Sample data</span>}
        {c.description && <p style={{ lineHeight: 'var(--nc-lh-body)' }}>{c.description}</p>}
        <p className={styles.cardTitle} style={{ marginTop: 'var(--nc-space-5)' }}>
          {pkr(c.raisedAmount)} <span className={styles.muted}>raised of {pkr(c.goalAmount)}</span>
        </p>
        <ProgressBar raised={c.raisedAmount} goal={c.goalAmount} label={`${c.title} progress`} />
        <p className={styles.muted}>
          {c.progress}% funded{c.deadline ? ` · Ends ${shortDate(c.deadline)}` : ''}
        </p>
      </div>

      <section aria-labelledby="updates" style={{ maxWidth: 720 }}>
        <h2 id="updates" className={styles.cardTitle}>
          Updates
        </h2>
        {c.updates?.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--nc-space-3)' }}>
            {c.updates.map((u, i) => (
              <li key={`${u.at}-${i}`} className={styles.card}>
                <p style={{ margin: 0 }}>{u.text}</p>
                <p className={styles.muted} style={{ margin: 'var(--nc-space-1) 0 0' }}>{shortDate(u.at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>No updates yet.</p>
        )}
      </section>
    </div>
  );
}
