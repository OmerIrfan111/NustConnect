import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import http from '@core/api/http.js';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  ReportButton,
  SampleDataBanner,
  Skeleton,
} from '@core/ui';
import { CATEGORY_LABELS, formatDate } from '../constants.js';
import styles from './LostFoundDetail.module.css';

export default function LostFoundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [claims, setClaims] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [claimMessage, setClaimMessage] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get(`/lostfound/items/${id}`);
      setItem(data.item);
      setClaims(Array.isArray(data.claims) ? data.claims : []);
      setIsOwner(Boolean(data.isOwner));

      if (data.isOwner) {
        try {
          const matchRes = await http.get(`/lostfound/items/${id}/matches`);
          setMatches(Array.isArray(matchRes.data?.matches) ? matchRes.data.matches : []);
        } catch {
          setMatches([]);
        }
      } else {
        setMatches([]);
      }
    } catch (err) {
      setError(err?.message || 'Could not load item.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitClaim(e) {
    e.preventDefault();
    if (claimMessage.trim().length < 5) {
      setClaimError('Please share identifying proof (at least 5 characters).');
      return;
    }
    setClaiming(true);
    setClaimError('');
    try {
      await http.post(`/lostfound/items/${id}/claims`, { message: claimMessage.trim() });
      setClaimMessage('');
      await load();
    } catch (err) {
      setClaimError(err?.message || 'Could not submit claim.');
    } finally {
      setClaiming(false);
    }
  }

  async function decideClaim(claimId, action) {
    setActionBusy(true);
    try {
      await http.patch(`/lostfound/claims/${claimId}`, { action });
      await load();
    } catch (err) {
      setError(err?.message || 'Could not update claim.');
    } finally {
      setActionBusy(false);
    }
  }

  async function updateStatus(status) {
    setActionBusy(true);
    try {
      const { data } = await http.patch(`/lostfound/items/${id}`, { status });
      setItem(data.item);
    } catch (err) {
      setError(err?.message || 'Could not update status.');
    } finally {
      setActionBusy(false);
    }
  }

  async function deletePost() {
    setActionBusy(true);
    try {
      await http.delete(`/lostfound/items/${id}`);
      navigate('/lost-found');
    } catch (err) {
      setError(err?.message || 'Could not delete item.');
      setActionBusy(false);
    }
  }

  if (loading) return <Skeleton rows={5} />;
  if (error && !item) return <ErrorState message={error} onRetry={load} />;
  if (!item) return <EmptyState icon={PackageSearch} title="Item not found" />;

  return (
    <section className={styles.page}>
      <Link to="/lost-found" className={styles.backLink}>
        ← Back to Lost &amp; Found
      </Link>

      <PageHeader
        title={item.title}
        subtitle={`${item.type === 'found' ? 'Found' : 'Lost'} near ${item.location} · ${formatDate(item.eventDate)}`}
        actions={<ReportButton targetType="lostitem" targetId={item.id} />}
      />

      {item.isSample && (
        <SampleDataBanner>Sample data: this Lost &amp; Found entry is a seeded demonstration item.</SampleDataBanner>
      )}

      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}

      <div className={styles.hero}>
        <div className={styles.gallery}>
          <div className={styles.mainPhoto}>
            {item.photos?.[0] ? (
              <img src={item.photos[0]} alt={item.title} className={styles.mainImg} />
            ) : (
              <PackageSearch size={56} aria-hidden="true" />
            )}
          </div>
        </div>

        <Card className={styles.info}>
          <div className={styles.badges}>
            <Badge variant={item.type === 'found' ? 'available' : 'new'}>
              {item.type === 'found' ? 'Found' : 'Lost'}
            </Badge>
            <Badge variant={item.status === 'open' ? 'neutral' : 'full'}>
              Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Badge>
            {item.ownerVerified && <Badge variant="verified" />}
          </div>

          <p className={styles.description}>{item.description}</p>

          <div className={styles.metaGrid}>
            <div>
              <span className={styles.metaLabel}>Category</span>
              <span className={styles.metaValue}>{CATEGORY_LABELS[item.category] || 'Other'}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Location</span>
              <span className={styles.metaValue}>{item.location}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Posted by</span>
              <span className={styles.metaValue}>{item.ownerName}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>OCR / Matching</span>
              <span className={styles.metaValue}>{item.ocrStatus === 'completed' ? 'Privacy-masked OCR active' : item.ocrStatus}</span>
            </div>
          </div>

          {isOwner && (
            <div className={styles.row}>
              {item.status !== 'open' && (
                <Button variant="outline" size="sm" disabled={actionBusy} onClick={() => updateStatus('open')}>
                  Mark Open
                </Button>
              )}
              {item.status !== 'claimed' && (
                <Button variant="secondary" size="sm" disabled={actionBusy} onClick={() => updateStatus('claimed')}>
                  Mark Claimed
                </Button>
              )}
              {item.status !== 'returned' && (
                <Button size="sm" disabled={actionBusy} onClick={() => updateStatus('returned')}>
                  Mark Returned
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={actionBusy} onClick={deletePost}>
                Delete Post
              </Button>
            </div>
          )}
        </Card>
      </div>

      {isOwner && (
        <Card>
          <h2 className={styles.sectionTitle}>Suggested Matches (Owner-only)</h2>
          {matches.length === 0 ? (
            <p className={styles.metaLabel}>No probable opposite-type matches found yet.</p>
          ) : (
            <div className={styles.matchList}>
              {matches.map((m) => (
                <Card key={m.item.id} className={styles.claimCard}>
                  <div className={styles.badges}>
                    <Badge variant="available">{m.score}% match</Badge>
                    <Badge variant="neutral">{m.item.type === 'found' ? 'Found' : 'Lost'}</Badge>
                  </div>
                  <strong>{m.item.title}</strong>
                  <span className={styles.metaLabel}>
                    {m.item.location} · {m.reasons.join(', ')}
                  </span>
                  <Button to={`/lost-found/${m.item.id}`} variant="outline" size="sm">
                    Inspect Match
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {isOwner ? (
        <Card>
          <h2 className={styles.sectionTitle}>Claim Requests ({claims.length})</h2>
          {claims.length === 0 ? (
            <p className={styles.metaLabel}>No claim requests received yet.</p>
          ) : (
            <div className={styles.claimList}>
              {claims.map((c) => (
                <Card key={c.id} className={styles.claimCard}>
                  <div className={styles.row}>
                    <strong>{c.claimantName}</strong>
                    {c.claimantVerified && <Badge variant="verified" />}
                    <Badge variant={c.status === 'approved' ? 'available' : 'neutral'}>{c.status}</Badge>
                  </div>
                  <p className={styles.description}>{c.message}</p>
                  {c.status === 'pending' && (
                    <div className={styles.row}>
                      <Button size="sm" disabled={actionBusy} onClick={() => decideClaim(c.id, 'approved')}>
                        Approve Claim
                      </Button>
                      <Button variant="outline" size="sm" disabled={actionBusy} onClick={() => decideClaim(c.id, 'rejected')}>
                        Decline
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <h2 className={styles.sectionTitle}>Request to Claim</h2>
          {claims.length > 0 && (
            <div className={styles.claimList}>
              {claims.map((c) => (
                <Card key={c.id} className={styles.claimCard}>
                  <div className={styles.row}>
                    <strong>Your claim status:</strong>
                    <Badge variant={c.status === 'approved' ? 'available' : 'neutral'}>{c.status}</Badge>
                  </div>
                  <p className={styles.description}>{c.message}</p>
                </Card>
              ))}
            </div>
          )}
          {item.status === 'open' && !claims.some((c) => c.status === 'pending') && (
            <form onSubmit={submitClaim} className={styles.claimList}>
              <Input
                label="Identifying proof"
                as="textarea"
                rows={3}
                placeholder="Describe unique marks, stickers, contents, or where you lost/left it."
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                error={claimError}
              />
              <div>
                <Button type="submit" loading={claiming}>
                  Submit Claim Request
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </section>
  );
}
