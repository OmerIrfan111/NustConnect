import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import http from '@core/api/http.js';
import { pkr, shortDate } from '../format.js';
import ProgressBar from '../components/ProgressBar.jsx';
import styles from '../components/ui.module.css';

/**
 * Admin screen for one campaign: record manual pledges (no payment gateway) and post updates.
 * The total shown is the sum of the pledge records, calculated by the server.
 */
export default function CampaignManage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [pledge, setPledge] = useState({ amount: '', donorName: '', anonymous: false, note: '' });
  const [pledgeErrors, setPledgeErrors] = useState({});
  const [update, setUpdate] = useState('');
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, list] = await Promise.all([http.get(`/admin/campaigns/${id}`), http.get(`/admin/campaigns/${id}/contributions`)]);
      setCampaign(c.data.campaign);
      setItems(list.data.items);
      setState('ready');
    } catch (err) {
      setError(err?.message || 'Could not load the campaign.');
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPledge(e) {
    e.preventDefault();
    const amount = Number(pledge.amount);
    if (!Number.isFinite(amount) || amount < 1) return setPledgeErrors({ amount: 'Amount must be at least PKR 1' });
    setPledgeErrors({});
    setBusy(true);
    setMessage({ kind: '', text: '' });
    try {
      await http.post(`/admin/campaigns/${id}/contributions`, { ...pledge, amount });
      setPledge({ amount: '', donorName: '', anonymous: false, note: '' });
      setMessage({ kind: 'ok', text: 'Pledge recorded.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Could not record the pledge.' });
    }
    setBusy(false);
  }

  async function removePledge(c) {
    setMessage({ kind: '', text: '' });
    try {
      await http.delete(`/admin/campaigns/${id}/contributions/${c.id}`);
      setMessage({ kind: 'ok', text: 'Pledge removed.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Could not remove the pledge.' });
    }
  }

  async function postUpdate(e) {
    e.preventDefault();
    if (update.trim().length < 3) return setMessage({ kind: 'error', text: 'Write at least 3 characters.' });
    setBusy(true);
    setMessage({ kind: '', text: '' });
    try {
      await http.post(`/admin/campaigns/${id}/updates`, { text: update.trim() });
      setUpdate('');
      setMessage({ kind: 'ok', text: 'Update posted.' });
      await load();
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Could not post the update.' });
    }
    setBusy(false);
  }

  if (state === 'loading') return <p className={styles.note}>Loading…</p>;
  if (state === 'error') {
    return (
      <div className={styles.page}>
        <p className={styles.alert} role="alert">
          {error}
        </p>
        <Link to="/admin/donations" className={styles.link}>
          Back to campaigns
        </Link>
      </div>
    );
  }

  const sum = items.reduce((s, c) => s + c.amount, 0);

  return (
    <div className={styles.page}>
      <Link to="/admin/donations" className={styles.link}>
        ← All campaigns
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{campaign.title}</h1>
        <Link to={`/admin/donations/${id}/edit`} className={`${styles.btn} ${styles.btnOutline}`}>
          Edit details
        </Link>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>
          {pkr(campaign.raisedAmount)} <span className={styles.muted}>of {pkr(campaign.goalAmount)} ({campaign.progress}%)</span>
        </p>
        <ProgressBar raised={campaign.raisedAmount} goal={campaign.goalAmount} label={`${campaign.title} progress`} />
        <p className={styles.muted} style={{ margin: 'var(--nc-space-2) 0 0' }}>
          {items.length} pledge record{items.length === 1 ? '' : 's'} totalling {pkr(sum)}
        </p>
      </div>

      {message.text && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? styles.alert : styles.okNote}>
          {message.text}
        </p>
      )}

      <section aria-labelledby="pledges" className={styles.page}>
        <h2 id="pledges" className={styles.cardTitle}>
          Pledges
        </h2>
        <form onSubmit={addPledge} noValidate className={styles.head} style={{ alignItems: 'flex-end' }}>
          <div className={styles.field}>
            <label htmlFor="p-amount" className={styles.label}>
              Amount (PKR)
            </label>
            <input id="p-amount" type="number" min="1" className={`${styles.input} ${pledgeErrors.amount ? styles.inputError : ''}`} value={pledge.amount} onChange={(e) => setPledge((p) => ({ ...p, amount: e.target.value }))} aria-invalid={pledgeErrors.amount ? 'true' : undefined} />
            {pledgeErrors.amount && <p className={styles.error}>{pledgeErrors.amount}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="p-donor" className={styles.label}>
              Donor name
            </label>
            <input id="p-donor" className={styles.input} value={pledge.donorName} onChange={(e) => setPledge((p) => ({ ...p, donorName: e.target.value }))} />
          </div>
          <label className={styles.muted}>
            <input type="checkbox" checked={pledge.anonymous} onChange={(e) => setPledge((p) => ({ ...p, anonymous: e.target.checked }))} /> Anonymous
          </label>
          <button type="submit" className={styles.btn} disabled={busy}>
            Record pledge
          </button>
        </form>

        {items.length === 0 ? (
          <p className={styles.note}>No pledges recorded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>
                    <span className="nc-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{shortDate(c.createdAt)}</td>
                    <td>{c.donorName || (c.anonymous ? 'Anonymous' : '—')}</td>
                    <td>{pkr(c.amount)}</td>
                    <td>
                      <button type="button" className={styles.link} style={{ background: 'none', border: 0, cursor: 'pointer' }} aria-label={`Remove pledge of ${pkr(c.amount)}`} onClick={() => removePledge(c)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="updates" className={styles.page}>
        <h2 id="updates" className={styles.cardTitle}>
          Updates feed
        </h2>
        <form onSubmit={postUpdate} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="u-text" className={styles.label}>
              Post an update for students
            </label>
            <textarea id="u-text" rows={3} className={styles.input} value={update} onChange={(e) => setUpdate(e.target.value)} maxLength={500} />
          </div>
          <button type="submit" className={styles.btn} disabled={busy} style={{ justifySelf: 'start' }}>
            Post update
          </button>
        </form>
        {campaign.updates.length === 0 ? (
          <p className={styles.note}>No updates yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--nc-space-3)' }}>
            {campaign.updates.map((u, i) => (
              <li key={`${u.at}-${i}`} className={styles.card}>
                <p style={{ margin: 0 }}>{u.text}</p>
                <p className={styles.muted} style={{ margin: 'var(--nc-space-1) 0 0' }}>
                  {shortDate(u.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
