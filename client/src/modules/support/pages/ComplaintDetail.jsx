import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import http from '@core/api/http.js';
import { useAuth } from '../../auth/useAuth.js';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, ReportButton, SampleDataBanner, Skeleton } from '@core/ui';
import { ALLOWED_TRANSITIONS, COMPLAINT_STATUS_LABELS, formatDateTime } from '../constants.js';
import styles from './Support.module.css';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isStaff = user?.role === 'moderator' || user?.role === 'admin';

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get(`/support/complaints/${id}`);
      setComplaint(data.complaint);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setIsOwner(Boolean(data.isOwner));
      const allowed = ALLOWED_TRANSITIONS[data.complaint?.status] || [];
      setNextStatus(allowed[0] || '');
    } catch (err) {
      setError(err?.message || 'Could not load complaint.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyTransition(statusToApply, extraNote = note) {
    setUpdating(true);
    setError('');
    try {
      const { data } = await http.patch(`/support/complaints/${id}/status`, {
        status: statusToApply,
        note: extraNote.trim(),
        assignedTo: assignedTo.trim(),
      });
      setComplaint(data.complaint);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setNote('');
      const allowed = ALLOWED_TRANSITIONS[data.complaint?.status] || [];
      setNextStatus(allowed[0] || '');
    } catch (err) {
      setError(err?.message || 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <Skeleton rows={4} />;
  if (error && !complaint) return <ErrorState message={error} onRetry={load} />;
  if (!complaint) return <EmptyState title="Complaint not found" />;

  const allowed = ALLOWED_TRANSITIONS[complaint.status] || [];

  return (
    <section className={styles.page}>
      <Link to="/complaints" className={styles.backLink}>
        ← Back to My Complaints
      </Link>

      <PageHeader
        title={complaint.title}
        subtitle={`${complaint.location} · ${complaint.category} · Submitted ${formatDateTime(complaint.createdAt)}`}
        actions={<ReportButton targetType="complaint" targetId={complaint.id} />}
      />

      {complaint.isSample && <SampleDataBanner>Sample data: seeded demonstration complaint.</SampleDataBanner>}
      {error && (
        <p role="alert" className={styles.errorBox}>
          {error}
        </p>
      )}

      <Card className={styles.list}>
        <div className={styles.badges}>
          <Badge variant={complaint.status === 'resolved' ? 'available' : 'new'}>
            {COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status}
          </Badge>
          {complaint.assignedTo && <Badge variant="neutral">Assigned: {complaint.assignedTo}</Badge>}
        </div>
        <p className={styles.body}>{complaint.description}</p>
        {complaint.photo && <img src={complaint.photo} alt={complaint.title} className={styles.photo} />}
        {isOwner && complaint.status === 'resolved' && (
          <div>
            <Button variant="outline" size="sm" disabled={updating} onClick={() => applyTransition('reopened', 'Reopened by student')}>
              Reopen Complaint
            </Button>
          </div>
        )}
      </Card>

      {isStaff && allowed.length > 0 && (
        <Card className={styles.list}>
          <h2 className={styles.sectionTitle}>Staff Status Update</h2>
          <div className={styles.form}>
            <Input label="Next Status" as="select" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              {allowed.map((s) => (
                <option key={s} value={s}>
                  {COMPLAINT_STATUS_LABELS[s] || s}
                </option>
              ))}
            </Input>
            <Input label="Assigned Team (optional)" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
            <Input label="Status Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain what action was taken" />
            <div>
              <Button loading={updating} onClick={() => applyTransition(nextStatus)}>
                Update Status
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className={styles.sectionTitle}>Status Timeline</h2>
        {history.length === 0 ? (
          <p className={styles.meta}>No history recorded yet.</p>
        ) : (
          <ol className={styles.timeline}>
            {history.map((h) => (
              <li key={h.id} className={styles.timelineItem}>
                <strong>{COMPLAINT_STATUS_LABELS[h.toStatus] || h.toStatus}</strong>
                <span className={styles.meta}>
                  {h.actorName} ({h.actorRole}) · {formatDateTime(h.createdAt)}
                </span>
                {h.note && <span className={styles.body}>{h.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}
