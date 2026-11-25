import { useCallback, useEffect, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import http from '@core/api/http.js';
import { Badge, Button, Card, Chips, EmptyState, ErrorState, PageHeader, SampleDataBanner, Skeleton } from '@core/ui';
import { SPLIT_LABELS, formatDate } from '../constants.js';
import { formatPKR } from '../money.js';
import styles from './Campus.module.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'settled', label: 'Settled' },
];

export default function BillsList() {
  const [status, setStatus] = useState('all');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get('/campus/bills', { params: status === 'all' ? {} : { status } });
      setBills(Array.isArray(data?.bills) ? data.bills : []);
    } catch (err) {
      setError(err?.message || 'Could not load your bills.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className={styles.page}>
      <PageHeader
        title="Bill Splitting"
        subtitle="Split trips, dinners and hostel costs. Only the people on a bill can see it."
        actions={
          <Button to="/bills/new">
            <Plus size={16} aria-hidden="true" /> New bill
          </Button>
        }
      />

      {bills.some((b) => b.isSample) && <SampleDataBanner>Sample data: the bill marked Sample is demo content.</SampleDataBanner>}

      <Chips items={FILTERS} value={status} onChange={setStatus} label="Bill status" />

      {loading ? (
        <Skeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Create a bill, add your friends and see who owes what."
          action={
            <Button to="/bills/new" variant="secondary">
              Create a bill
            </Button>
          }
        />
      ) : (
        <div className={styles.grid2}>
          {bills.map((b) => (
            <Card key={b.id} to={`/bills/${b.id}`} className={styles.stack}>
              <div className={styles.spread}>
                <h2 className={styles.cardTitle}>{b.title}</h2>
                <div className={styles.row}>
                  <Badge variant={b.status === 'settled' ? 'available' : 'new'}>{b.status === 'settled' ? 'Settled' : 'Open'}</Badge>
                  {b.isSample && <Badge variant="neutral">Sample</Badge>}
                </div>
              </div>
              <p className={styles.meta}>
                {formatPKR(b.totalAmount)} · {b.participants.length} people · {SPLIT_LABELS[b.splitMethod] || b.splitMethod}
              </p>
              <p className={styles.meta}>
                Paid by {b.creatorName}
                {b.dueDate ? ` · Due ${formatDate(b.dueDate)}` : ''}
              </p>
              <p className={styles.meta}>Remaining: {formatPKR(b.remainingCents / 100)}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
