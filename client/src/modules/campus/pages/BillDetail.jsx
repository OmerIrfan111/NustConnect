import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import http from '@core/api/http.js';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, SampleDataBanner, Skeleton } from '@core/ui';
import { useAuth } from '../../auth/useAuth.js';
import { SPLIT_LABELS, formatDate } from '../constants.js';
import { formatPKR } from '../money.js';
import styles from './Campus.module.css';

export default function BillDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payerId, setPayerId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payErrors, setPayErrors] = useState({});
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await http.get(`/campus/bills/${id}`);
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Could not load this bill.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(e) {
    e.preventDefault();
    if (!(Number(amount) > 0)) {
      setPayErrors({ amount: 'Enter an amount greater than zero.' });
      return;
    }
    setPaying(true);
    setPayErrors({});
    try {
      const res = await http.post(`/campus/bills/${id}/payments`, { userId: payerId || user.id, amount: Number(amount), note: note.trim() });
      setData(res.data);
      setAmount('');
      setNote('');
    } catch (err) {
      setPayErrors({ amount: err?.details?.amount || err?.message || 'Could not record the payment.' });
    } finally {
      setPaying(false);
    }
  }

  async function remove() {
    try {
      await http.delete(`/campus/bills/${id}`);
      navigate('/bills');
    } catch (err) {
      setError(err?.message || 'Could not delete the bill.');
    }
  }

  if (loading) return <Skeleton rows={4} />;
  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState title="Bill not found" />;

  const { bill, settlement, isCreator } = data;
  const payable = bill.participants.filter((p) => p.balanceCents > 0 && (isCreator || p.userId === user.id));

  return (
    <section className={styles.page}>
      <Link to="/bills" className={styles.backLink}>
        ← Back to Bill Splitting
      </Link>

      <PageHeader
        title={bill.title}
        subtitle={`${formatPKR(bill.totalAmount)} · ${SPLIT_LABELS[bill.splitMethod] || bill.splitMethod} · paid by ${bill.creatorName}${
          bill.dueDate ? ` · due ${formatDate(bill.dueDate)}` : ''
        }`}
        actions={
          <div className={styles.row}>
            <Badge variant={bill.status === 'settled' ? 'available' : 'new'}>{bill.status === 'settled' ? 'Settled' : 'Open'}</Badge>
            {isCreator && (
              <Button variant="outline" size="sm" onClick={remove}>
                Delete bill
              </Button>
            )}
          </div>
        }
      />

      {bill.isSample && <SampleDataBanner>Sample data: this bill is demo content.</SampleDataBanner>}
      {error && (
        <p role="alert" className={styles.errorBox}>
          {error}
        </p>
      )}
      {bill.description && <p className={styles.body}>{bill.description}</p>}

      <Card>
        <h2 className={styles.sectionTitle}>Who owes what</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Share</th>
                <th scope="col">Paid</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {bill.participants.map((p) => (
                <tr key={p.userId}>
                  <th scope="row">
                    {p.name}
                    {p.userId === bill.creatorId ? ' (paid the bill)' : ''}
                  </th>
                  <td>{formatPKR(p.owedAmount)}</td>
                  <td>{formatPKR(p.paidAmount)}</td>
                  <td>{p.balanceCents > 0 ? formatPKR(p.balanceAmount) : 'Settled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {bill.items.length > 0 && (
        <Card>
          <h2 className={styles.sectionTitle}>Items</h2>
          <ul className={styles.list}>
            {bill.items.map((it) => (
              <li key={it.label} className={styles.spread}>
                <span>{it.label}</span>
                <span>{formatPKR(it.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className={styles.sectionTitle}>Settle up</h2>
        {settlement.length === 0 ? (
          <p className={styles.meta}>Everyone is settled. Nothing left to pay.</p>
        ) : (
          <ul className={styles.list}>
            {settlement.map((t) => (
              <li key={t.fromUserId}>
                {t.fromName} pays {t.toName} <strong>{formatPKR(t.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {payable.length > 0 && (
        <Card>
          <h2 className={styles.sectionTitle}>Record a payment</h2>
          <form onSubmit={pay} className={styles.form} noValidate>
            {isCreator && (
              <Input label="Who paid" as="select" value={payerId || payable[0].userId} onChange={(e) => setPayerId(e.target.value)}>
                {payable.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.name} (owes {formatPKR(p.balanceAmount)})
                  </option>
                ))}
              </Input>
            )}
            <Input
              label="Amount (PKR)"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={payErrors.amount}
            />
            <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div>
              <Button type="submit" loading={paying}>
                Record payment
              </Button>
            </div>
          </form>
        </Card>
      )}

      {bill.payments.length > 0 && (
        <Card>
          <h2 className={styles.sectionTitle}>Payment history</h2>
          <ul className={styles.list}>
            {bill.payments.map((p, i) => (
              <li key={`${p.userId}-${i}`} className={styles.spread}>
                <span>
                  {p.userName} paid {formatPKR(p.amount)}
                  {p.note ? ` · ${p.note}` : ''}
                </span>
                <span className={styles.meta}>{formatDate(p.recordedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
