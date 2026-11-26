import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import http from '@core/api/http.js';
import styles from '../components/ui.module.css';

const EMPTY = { title: '', description: '', goalAmount: '', status: 'active', deadline: '' };

function Field({ id, label, error, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error && (
        <p className={styles.error} id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Create (/admin/donations/new) or edit (/admin/donations/:id/edit) a campaign. Admin only. */
export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    http
      .get(`/admin/campaigns/${id}`)
      .then(({ data }) => {
        const c = data.campaign;
        setForm({
          title: c.title,
          description: c.description || '',
          goalAmount: String(c.goalAmount),
          status: c.status,
          deadline: c.deadline ? c.deadline.slice(0, 10) : '',
        });
      })
      .catch((err) => setFormError(err?.message || 'Could not load the campaign.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cls = (k) => `${styles.input} ${errors[k] ? styles.inputError : ''}`;

  async function onSubmit(e) {
    e.preventDefault();
    const found = {};
    if (form.title.trim().length < 3) found.title = 'Title must be at least 3 characters';
    if (!(Number(form.goalAmount) >= 1)) found.goalAmount = 'Goal must be a positive amount';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      goalAmount: Number(form.goalAmount),
      status: form.status,
      deadline: form.deadline || null,
    };
    try {
      if (id) await http.put(`/admin/campaigns/${id}`, body);
      else await http.post('/admin/campaigns', body);
      navigate('/admin/donations');
    } catch (err) {
      if (err?.details && typeof err.details === 'object') setErrors(err.details);
      else setFormError(err?.message || 'Could not save the campaign.');
      setBusy(false);
    }
  }

  if (loading) return <p className={styles.note}>Loading…</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{id ? 'Edit campaign' : 'New campaign'}</h1>
      {formError && (
        <p className={styles.alert} role="alert">
          {formError}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <Field id="c-title" label="Title" error={errors.title}>
          <input id="c-title" className={cls('title')} value={form.title} onChange={set('title')} aria-invalid={errors.title ? 'true' : undefined} />
        </Field>
        <Field id="c-desc" label="Description" error={errors.description}>
          <textarea id="c-desc" className={cls('description')} rows={4} value={form.description} onChange={set('description')} />
        </Field>
        <Field id="c-goal" label="Goal (PKR)" error={errors.goalAmount}>
          <input id="c-goal" type="number" min="1" className={cls('goalAmount')} value={form.goalAmount} onChange={set('goalAmount')} />
        </Field>
        <Field id="c-status" label="Status" error={errors.status}>
          <select id="c-status" className={cls('status')} value={form.status} onChange={set('status')}>
            <option value="draft">Draft (hidden from students)</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field id="c-deadline" label="Deadline (optional)" error={errors.deadline}>
          <input id="c-deadline" type="date" className={cls('deadline')} value={form.deadline} onChange={set('deadline')} />
        </Field>
        <div className={styles.head} style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className={styles.btn} disabled={busy}>
            {busy ? 'Saving…' : 'Save campaign'}
          </button>
          <Link to="/admin/donations" className={`${styles.btn} ${styles.btnOutline}`}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
