import { Link } from 'react-router-dom';
import { useLoad } from '../useLoad.js';
import { pkr } from '../format.js';
import ProgressBar from '../components/ProgressBar.jsx';
import styles from '../components/ui.module.css';

/** Admin list of donation campaigns (drafts included) with create / edit links. */
export default function CampaignsAdmin() {
  const { data, state, error, reload } = useLoad('/admin/campaigns');

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Donation campaigns</h1>
          <p className={styles.lead}>Create and edit campaigns. Contribution records arrive in Phase 2.</p>
        </div>
        <Link to="/admin/donations/new" className={styles.btn}>
          New campaign
        </Link>
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
      {state === 'ready' && data.items.length === 0 && <p className={styles.note}>No campaigns yet. Create the first one.</p>}

      {state === 'ready' && data.items.length > 0 && (
        <div className={styles.grid}>
          {data.items.map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.head}>
                <h2 className={styles.cardTitle}>{c.title}</h2>
                <span className={`${styles.badge} ${c.status === 'active' ? styles.badgeTeal : ''}`}>{c.status}</span>
              </div>
              {c.sample && <span className={styles.sample}>Sample data</span>}
              <p className={styles.muted}>
                {pkr(c.raisedAmount)} of {pkr(c.goalAmount)} ({c.progress}%)
              </p>
              <ProgressBar raised={c.raisedAmount} goal={c.goalAmount} label={`${c.title} progress`} />
              <p style={{ margin: 'var(--nc-space-4) 0 0' }}>
                <Link to={`/admin/donations/${c.id}/edit`} className={styles.link}>
                  Edit
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
