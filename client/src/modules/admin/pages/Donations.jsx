import { Link } from 'react-router-dom';
import { useLoad } from '../useLoad.js';
import { pkr } from '../format.js';
import ProgressBar from '../components/ProgressBar.jsx';
import styles from '../components/ui.module.css';

/** Student-facing list of donation campaigns (/donations). */
export default function Donations() {
  const { data, state, error, reload } = useLoad('/admin/campaigns');

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Donation campaigns</h1>
        <p className={styles.lead}>Campaigns organised by NUST administration. Pledges only, no payments are taken here.</p>
      </div>

      {state === 'loading' && <p className={styles.note}>Loading…</p>}
      {state === 'error' && (
        <p className={styles.alert} role="alert">
          {error}{' '}
          <button type="button" className={styles.link} onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {state === 'ready' && data.items.length === 0 && <p className={styles.note}>No campaigns are running right now.</p>}

      {state === 'ready' && data.items.length > 0 && (
        <div className={styles.grid}>
          {data.items.map((c) => (
            <Link key={c.id} to={`/donations/${c.id}`} className={styles.card}>
              <h2 className={styles.cardTitle}>{c.title}</h2>
              {c.sample && <span className={styles.sample}>Sample data</span>}
              <p className={styles.muted}>
                {pkr(c.raisedAmount)} raised of {pkr(c.goalAmount)}
              </p>
              <ProgressBar raised={c.raisedAmount} goal={c.goalAmount} label={`${c.title} progress`} />
              <p className={styles.muted} style={{ margin: 'var(--nc-space-2) 0 0' }}>
                {c.progress}% funded{c.status === 'closed' ? ' · Closed' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
