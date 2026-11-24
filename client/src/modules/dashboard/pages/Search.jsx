import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import http from '@core/api/http.js';
import styles from './Search.module.css';

const MODULE_LABELS = {
  auth: 'People',
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

/** /search?q=: results from every module that provides a searchProvider, grouped by module, with a type filter. */
export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const type = params.get('type') || '';
  const [data, setData] = useState(null);
  const [state, setState] = useState(q.length >= 2 ? 'loading' : 'idle'); // idle | loading | ready | error
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (q.length < 2) {
      setState('idle');
      return undefined;
    }
    let active = true;
    setState('loading');
    http
      .get('/dashboard/search', { params: { q, ...(type ? { type } : {}) } })
      .then(({ data: d }) => {
        if (!active) return;
        setData(d);
        setState('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Search failed.');
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [q, type, attempt]);

  const pickType = (t) => {
    const next = new URLSearchParams(params);
    if (t) next.set('type', t);
    else next.delete('type');
    setParams(next);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{q.length >= 2 ? <>Results for &ldquo;{q}&rdquo;</> : 'Search'}</h1>

      {state === 'idle' && <p className={styles.note}>Type at least 2 characters in the search bar above to search rides, items, reviews and more.</p>}
      {state === 'loading' && <p className={styles.note} role="status">Searching…</p>}
      {state === 'error' && (
        <p className={styles.alert} role="alert">
          {error}{' '}
          <button type="button" className={styles.link} onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </p>
      )}

      {state === 'ready' && (
        <>
          {(data.types.length > 0 || type) && (
            <div className={styles.chips} role="group" aria-label="Filter by type">
              <button type="button" className={`${styles.chip} ${!type ? styles.active : ''}`} aria-pressed={!type} onClick={() => pickType('')}>
                All
              </button>
              {[...new Set([...data.types, ...(type ? [type] : [])])].map((t) => (
                <button key={t} type="button" className={`${styles.chip} ${type === t ? styles.active : ''}`} aria-pressed={type === t} onClick={() => pickType(t)}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {data.total === 0 && <p className={styles.note}>No results for &ldquo;{q}&rdquo;. Try a different word.</p>}

          {data.groups.map((g) => (
            <section key={g.module} aria-labelledby={`g-${g.module}`} className={styles.group}>
              <h2 id={`g-${g.module}`} className={styles.groupTitle}>
                {moduleLabel(g.module)} <span className={styles.count}>{g.results.length}</span>
              </h2>
              <ul className={styles.list}>
                {g.results.map((r) => (
                  <li key={`${g.module}-${r.id}`}>
                    <Link to={r.url} className={styles.result}>
                      <span className={styles.resultTitle}>{r.title}</span>
                      {r.snippet && <span className={styles.snippet}>{r.snippet}</span>}
                      <span className={styles.type}>{r.type}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {data.skipped.length > 0 && (
            <p className={styles.footnote}>Some results could not be loaded: {data.skipped.map(moduleLabel).join(', ')}.</p>
          )}
        </>
      )}
    </div>
  );
}
