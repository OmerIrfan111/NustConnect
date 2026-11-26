import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import http from '@core/api/http.js';
import { Badge, Button, Card, Input, PageHeader, SearchBar } from '@core/ui';
import { useAuth } from '../../auth/useAuth.js';
import { SPLIT_METHODS } from '../constants.js';
import { divideEvenly, formatPKR, toCents } from '../money.js';
import styles from './Campus.module.css';

const MAX_PEOPLE = 20;

export default function NewBill() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const me = { userId: user.id, name: user.name, verified: Boolean(user.verified) };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [method, setMethod] = useState('equal');
  const [dueDate, setDueDate] = useState('');
  const [people, setPeople] = useState([]);
  const [custom, setCustom] = useState({});
  const [items, setItems] = useState([{ label: '', amount: '', sharedBy: [] }]);

  const [lookupResults, setLookupResults] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const everyone = [me, ...people];
  const totalCents = toCents(total);

  async function lookup(q) {
    setLookupBusy(true);
    setLookupError('');
    try {
      const { data } = await http.get('/auth/users/lookup', { params: { q } });
      setLookupResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setLookupError(err?.message || 'Could not search for people.');
    } finally {
      setLookupBusy(false);
    }
  }

  function addPerson(found) {
    if (found.id === me.userId || people.some((p) => p.userId === found.id) || people.length >= MAX_PEOPLE - 1) return;
    setPeople((prev) => [...prev, { userId: found.id, name: found.name, verified: Boolean(found.verified) }]);
  }

  function removePerson(userId) {
    setPeople((prev) => prev.filter((p) => p.userId !== userId));
    setItems((prev) => prev.map((it) => ({ ...it, sharedBy: it.sharedBy.filter((id) => id !== userId) })));
  }

  const patchItem = (index, patch) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const toggleShare = (index, userId) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, sharedBy: it.sharedBy.includes(userId) ? it.sharedBy.filter((id) => id !== userId) : [...it.sharedBy, userId] } : it,
      ),
    );

  const customSum = everyone.reduce((sum, p) => sum + (toCents(custom[p.userId]) || 0), 0);
  const itemsSum = items.reduce((sum, it) => sum + (toCents(it.amount) || 0), 0);
  const shares = method === 'equal' && totalCents > 0 ? divideEvenly(totalCents, everyone.length) : [];

  function validate() {
    const errs = {};
    if (title.trim().length < 2) errs.title = 'Give the bill a title.';
    if (!(totalCents > 0)) errs.total = 'Enter a total greater than zero.';
    if (people.length < 1) errs.people = 'Add at least one other person.';
    if (method === 'custom' && totalCents > 0 && customSum !== totalCents) errs.custom = 'Custom amounts must add up to the total.';
    if (method === 'item') {
      if (items.some((it) => !it.label.trim() || !(toCents(it.amount) > 0) || it.sharedBy.length === 0)) {
        errs.items = 'Every item needs a name, an amount and at least one person.';
      } else if (totalCents > 0 && itemsSum !== totalCents) {
        errs.items = 'Item amounts must add up to the total.';
      }
    }
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await http.post('/campus/bills', {
        title: title.trim(),
        description: description.trim(),
        total: Number(total),
        splitMethod: method,
        dueDate: dueDate || undefined,
        participants: everyone.map((p) => ({
          ...p,
          ...(method === 'custom' ? { owedAmount: Number(custom[p.userId] || 0) } : {}),
        })),
        ...(method === 'item'
          ? { items: items.map((it) => ({ label: it.label.trim(), amount: Number(it.amount), sharedBy: it.sharedBy })) }
          : {}),
      });
      navigate(`/bills/${data.bill.id}`);
    } catch (err) {
      if (err?.details && typeof err.details === 'object') setErrors((prev) => ({ ...prev, ...err.details }));
      setSubmitError(err?.message || 'Could not create the bill.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <Link to="/bills" className={styles.backLink}>
        ← Back to Bill Splitting
      </Link>
      <PageHeader title="Create a bill" subtitle="You paid; the others owe you their share. You are included automatically." />

      <Card className={styles.stack}>
        <div className={styles.stack}>
          <h2 className={styles.cardTitle}>People</h2>
          <SearchBar onSearch={lookup} placeholder="Search a student by name…" label="Search students" />
          {lookupBusy && <p className={styles.meta}>Searching…</p>}
          {lookupError && (
            <p role="alert" className={styles.errorBox}>
              {lookupError}
            </p>
          )}
          {lookupResults && !lookupBusy && (
            <ul className={styles.list} aria-label="Search results">
              {lookupResults.length === 0 && <li className={styles.meta}>No students found.</li>}
              {lookupResults.map((r) => (
                <li key={r.id} className={styles.row}>
                  <span>{r.name}</span>
                  {r.verified && <Badge variant="verified" />}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={r.id === me.userId || people.some((p) => p.userId === r.id)}
                    onClick={() => addPerson(r)}
                    aria-label={`Add ${r.name}`}
                  >
                    <Plus size={14} aria-hidden="true" /> Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {errors.people && (
            <p role="alert" className={styles.errorBox}>
              {errors.people}
            </p>
          )}
          <ul className={styles.chipList} aria-label="People on this bill">
            <li>
              <Badge variant="available">{me.name} (you)</Badge>
            </li>
            {people.map((p) => (
              <li key={p.userId} className={styles.row}>
                <Badge variant="neutral">{p.name}</Badge>
                <button type="button" onClick={() => removePerson(p.userId)} aria-label={`Remove ${p.name}`}>
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} className={styles.form} noValidate>
          {submitError && (
            <p role="alert" className={styles.errorBox}>
              {submitError}
            </p>
          )}

          <Input label="Title" placeholder="e.g. Murree trip cabin" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} required />
          <Input label="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className={styles.grid2}>
            <Input
              label="Total (PKR)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              error={errors.total}
              required
            />
            <Input label="Due date (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={errors.dueDate} />
          </div>

          <Input label="How to split" as="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {SPLIT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Input>

          {method === 'equal' && shares.length > 0 && (
            <p className={styles.totalLine} aria-live="polite">
              Each person pays about {formatPKR(Math.floor(totalCents / everyone.length) / 100)}
              {totalCents % everyone.length ? ` (a few pay 1 paisa more so it adds up exactly)` : ''}.
            </p>
          )}

          {method === 'custom' && (
            <div className={styles.stack}>
              {everyone.map((p) => (
                <div key={p.userId} className={styles.personRow}>
                  <span>{p.name}</span>
                  <Input
                    label={`Amount for ${p.name}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={custom[p.userId] ?? ''}
                    onChange={(e) => setCustom((prev) => ({ ...prev, [p.userId]: e.target.value }))}
                  />
                </div>
              ))}
              <p className={styles.totalLine} aria-live="polite">
                Entered {formatPKR(customSum / 100)} of {formatPKR((totalCents || 0) / 100)}
              </p>
              {errors.custom && (
                <p role="alert" className={styles.errorBox}>
                  {errors.custom}
                </p>
              )}
            </div>
          )}

          {method === 'item' && (
            <div className={styles.stack}>
              {items.map((it, i) => (
                <div key={i} className={styles.itemRow}>
                  <div className={styles.grid2}>
                    <Input label={`Item ${i + 1} name`} value={it.label} onChange={(e) => patchItem(i, { label: e.target.value })} />
                    <Input
                      label={`Item ${i + 1} amount (PKR)`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.amount}
                      onChange={(e) => patchItem(i, { amount: e.target.value })}
                    />
                  </div>
                  <div className={styles.checkRow} role="group" aria-label={`Who shares item ${i + 1}`}>
                    {everyone.map((p) => (
                      <label key={p.userId}>
                        <input type="checkbox" checked={it.sharedBy.includes(p.userId)} onChange={() => toggleShare(i, p.userId)} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  {items.length > 1 && (
                    <div>
                      <Button size="sm" variant="outline" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                        Remove item {i + 1}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <div>
                <Button size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, { label: '', amount: '', sharedBy: [] }])}>
                  <Plus size={14} aria-hidden="true" /> Add item
                </Button>
              </div>
              <p className={styles.totalLine} aria-live="polite">
                Items add up to {formatPKR(itemsSum / 100)} of {formatPKR((totalCents || 0) / 100)}
              </p>
              {errors.items && (
                <p role="alert" className={styles.errorBox}>
                  {errors.items}
                </p>
              )}
            </div>
          )}

          <div className={styles.row}>
            <Button type="submit" loading={submitting}>
              Create bill
            </Button>
            <Button to="/bills" variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
