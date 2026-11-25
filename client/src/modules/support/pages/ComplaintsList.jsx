import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import http from '@core/api/http.js';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, SampleDataBanner, Skeleton } from '@core/ui';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_LABELS, formatDateTime } from '../constants.js';
import styles from './Support.module.css';

export default function ComplaintsList() {
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status !== 'all') params.status = status;
      if (category !== 'all') params.category = category;
      const { data } = await http.get('/support/complaints', { params });
      setComplaints(Array.isArray(data?.complaints) ? data.complaints : []);
    } catch (err) {
      setError(err?.message || 'Could not load your complaints.');
    } finally {
      setLoading(false);
    }
  }, [status, category]);

  useEffect(() => {
    load();
  }, [load]);

  const hasSamples = complaints.some((c) => c.isSample);

  return (
    <section className={styles.page}>
      <PageHeader
        title="My Complaints"
        subtitle="Track facility issues you submitted. Only you and campus staff can view your complaints."
        actions={
          <Button to="/complaints/new">
            <Plus size={16} aria-hidden="true" /> Submit Complaint
          </Button>
        }
      />

      {hasSamples && <SampleDataBanner>Sample data: seeded demonstration complaints are labelled below.</SampleDataBanner>}

      <div className={styles.filterRow}>
        <Input label="Category" as="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Input>
        <Input label="Status" as="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Input>
      </div>

      {loading ? (
        <Skeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No complaints submitted yet"
          description="Need to report a broken AC, Wi-Fi outage, or hostel issue? Submit a trackable complaint."
          action={
            <Button to="/complaints/new" variant="secondary">
              Submit Complaint
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {complaints.map((c) => (
            <Card key={c.id} className={styles.list}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{c.title}</h2>
                  <p className={styles.meta}>
                    {c.location} · {c.category} · {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <div className={styles.badges}>
                  <Badge variant={c.status === 'resolved' ? 'available' : 'new'}>
                    {COMPLAINT_STATUS_LABELS[c.status] || c.status}
                  </Badge>
                  {c.isSample && <Badge variant="neutral">Sample</Badge>}
                </div>
              </div>
              <p className={styles.body}>{c.description}</p>
              <div className={styles.actions}>
                <Button to={`/complaints/${c.id}`} variant="outline" size="sm">
                  View Timeline
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
