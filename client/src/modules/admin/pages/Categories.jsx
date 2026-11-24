import { useState } from 'react';
import http from '@core/api/http.js';
import { useLoad } from '../useLoad.js';
import styles from '../components/ui.module.css';

const SCOPES = [
  ['marketplace', 'Marketplace'],
  ['reviews', 'Review Hub'],
  ['lostfound', 'Lost & Found'],
  ['support', 'Complaints & FAQ'],
  ['rideshare', 'RideShare'],
  ['campus', 'Campus'],
];

/** Admin category management. A module uses these when present and falls back to its own defaults when a scope is empty. */
export default function Categories() {
  const { data, state, error, reload } = useLoad('/admin/categories');
  const [form, setForm] = useState({ scope: 'marketplace', name: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErrors({ name: 'Name must be at least 2 characters' });
    setErrors({});
    setBusy(true);
    try {
      await http.post('/admin/categories', { scope: form.scope, name: form.name.trim() });
      setForm((f) => ({ ...f, name: '' }));
      setMessage({ kind: 'ok', text: 'Category added.' });
      reload();
    } catch (err) {
      if (err?.status === 409) setErrors({ name: 'This category already exists for that module' });
      else setMessage({ kind: 'error', text: err?.message || 'Could not add the category.' });
    }
    setBusy(false);
  }

  async function toggle(c) {
    try {
      await http.put(`/admin/categories/${c.id}`, { active: !c.active });
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Could not update the category.' });
    }
  }

  async function remove(c) {
    try {
      await http.delete(`/admin/categories/${c.id}`);
      setMessage({ kind: 'ok', text: `Removed "${c.name}".` });
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Could not remove the category.' });
    }
  }

  const byScope = SCOPES.map(([slug, label]) => [slug, label, (data?.items || []).filter((c) => c.scope === slug)]);

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Categories</h1>
        <p className={styles.lead}>When a module has no categories here, it uses its own built-in defaults.</p>
      </div>

      <form onSubmit={add} noValidate className={styles.head} style={{ alignItems: 'flex-end' }}>
        <div className={styles.field}>
          <label htmlFor="cat-scope" className={styles.label}>
            Module
          </label>
          <select id="cat-scope" className={styles.input} value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}>
            {SCOPES.map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field} style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="cat-name" className={styles.label}>
            New category
          </label>
          <input id="cat-name" className={`${styles.input} ${errors.name ? styles.inputError : ''}`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-invalid={errors.name ? 'true' : undefined} />
          {errors.name && <p className={styles.error}>{errors.name}</p>}
        </div>
        <button type="submit" className={styles.btn} disabled={busy}>
          Add category
        </button>
      </form>

      {message.text && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? styles.alert : styles.okNote}>
          {message.text}
        </p>
      )}
      {state === 'loading' && <p className={styles.note}>Loading…</p>}
      {state === 'error' && (
        <p className={styles.alert} role="alert">
          {error}{' '}
          <button type="button" className={styles.link} onClick={reload}>
            Try again
          </button>
        </p>
      )}

      {state === 'ready' &&
        byScope.map(([slug, label, items]) => (
          <section key={slug} aria-labelledby={`cat-${slug}`} className={styles.card}>
            <h2 id={`cat-${slug}`} className={styles.cardTitle}>
              {label}
            </h2>
            {items.length === 0 ? (
              <p className={styles.muted}>No custom categories. Using the module&apos;s defaults.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--nc-space-2)' }}>
                {items.map((c) => (
                  <li key={c.id} className={styles.head}>
                    <span>
                      {c.name} {!c.active && <span className={styles.badge}>inactive</span>}
                    </span>
                    <span>
                      <button type="button" className={styles.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => toggle(c)}>
                        {c.active ? 'Deactivate' : 'Activate'}
                      </button>{' '}
                      <button type="button" className={styles.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} aria-label={`Remove ${c.name}`} onClick={() => remove(c)}>
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
