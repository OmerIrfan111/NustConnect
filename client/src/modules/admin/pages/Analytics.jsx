import { useLoad } from '../useLoad.js';
import { pkr } from '../format.js';
import styles from '../components/ui.module.css';

const MODULE_LABELS = {
  auth: 'Accounts',
  dashboard: 'Dashboard',
  admin: 'Donations',
  rideshare: 'RideShare',
  marketplace: 'Marketplace',
  reviews: 'Review Hub',
  lostfound: 'Lost & Found',
  support: 'Help & FAQ',
  campus: 'Campus',
};
export const moduleLabel = (slug) => MODULE_LABELS[slug] || slug;

/** Usage analytics: aggregate counts from every module plus moderation and donation figures. Contains no personal data. */
export default function Analytics() {
  const { data, state, error, reload } = useLoad('/admin/analytics');

  const platform = data?.platform;
  const tiles = platform
    ? [
        ['Open reports', platform.reportsOpen],
        ['Resolved reports', platform.reportsResolved],
        ['Dismissed reports', platform.reportsDismissed],
        ['Active campaigns', `${platform.campaignsActive} of ${platform.campaigns}`],
        ['Pledged in total', pkr(platform.pledgedTotal)],
        ['Audit entries', platform.auditEntries],
      ]
    : [];

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.lead}>Platform-wide counts only. No names, emails or activity of individual students.</p>
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

      {state === 'ready' && (
        <>
          <section aria-labelledby="mod-h">
            <h2 id="mod-h" className={styles.cardTitle}>
              Moderation and donations
            </h2>
            <div className={styles.grid}>
              {tiles.map(([label, value]) => (
                <div key={label} className={styles.card}>
                  <p className={styles.muted} style={{ margin: 0 }}>
                    {label}
                  </p>
                  <p className={styles.title} style={{ fontSize: 'var(--nc-fs-section)' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="usage-h">
            <h2 id="usage-h" className={styles.cardTitle}>
              Usage by module
            </h2>
            {data.modules.length === 0 ? (
              <p className={styles.note}>No module has reported usage figures yet.</p>
            ) : (
              <div className={styles.grid}>
                {data.modules.map((m) => (
                  <div key={m.module} className={styles.card}>
                    <p className={styles.muted} style={{ margin: 0 }}>
                      {moduleLabel(m.module)} · {m.label}
                    </p>
                    <p className={styles.title} style={{ fontSize: 'var(--nc-fs-section)' }}>
                      {m.value.toLocaleString('en-US')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {data.skipped.length > 0 && (
              <p className={styles.muted}>Not available from: {data.skipped.map(moduleLabel).join(', ')}.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
