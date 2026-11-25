import { useCallback, useEffect, useState } from 'react';
import { PackageSearch, Plus } from 'lucide-react';
import http from '@core/api/http.js';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  SampleDataBanner,
  SearchBar,
  Skeleton,
  Tabs,
} from '@core/ui';
import { CATEGORIES, CATEGORY_LABELS, STATUS_OPTIONS, formatDate } from '../constants.js';
import styles from './LostFoundBoard.module.css';

const TABS = [
  { value: 'all', label: 'All Items' },
  { value: 'lost', label: 'Lost' },
  { value: 'found', label: 'Found' },
];

export default function LostFoundBoard() {
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('open');
  const [location, setLocation] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState('');

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { status };
      if (type !== 'all') params.type = type;
      if (category !== 'all') params.category = category;
      if (location.trim()) params.location = location.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (mine) params.mine = 'true';
      if (q.trim()) params.q = q.trim();

      const { data } = await http.get('/lostfound/items', { params });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      setError(err?.message || 'Could not load Lost & Found items.');
    } finally {
      setLoading(false);
    }
  }, [type, category, status, location, fromDate, toDate, mine, q]);

  useEffect(() => {
    load();
  }, [load]);

  const hasSamples = items.some((it) => it.isSample);

  const resetFilters = () => {
    setType('all');
    setCategory('all');
    setStatus('open');
    setLocation('');
    setFromDate('');
    setToDate('');
    setMine(false);
    setQ('');
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title="Lost & Found"
        subtitle="Report lost belongings or help return found items across NUST H-12 with privacy-masked OCR matching."
        actions={
          <Button to="/lost-found/new">
            <Plus size={16} aria-hidden="true" /> Post Lost / Found Item
          </Button>
        }
      />

      {hasSamples && (
        <SampleDataBanner>Sample data: some items below are seeded NUST H-12 examples labelled for demonstration.</SampleDataBanner>
      )}

      <div className={styles.controls}>
        <Tabs items={TABS} value={type} onChange={setType} label="Lost or found filter" />
        <div className={styles.searchWrap}>
          <SearchBar
            value={q}
            onChange={setQ}
            onSearch={setQ}
            allowEmpty
            placeholder="Search lost or found items…"
            label="Search lost and found"
          />
        </div>
      </div>

      <div className={styles.layout}>
        <Card as="aside" className={styles.filters} aria-label="Filters">
          <h2 className={styles.filterTitle}>Filters</h2>
          <Input label="Category" as="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Input>

          <Input label="Status" as="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Input>

          <Input
            label="Campus Location"
            placeholder="e.g. SEECS, Library"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            <span>Only my posts</span>
          </label>

          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset filters
          </Button>
        </Card>

        <div>
          {loading ? (
            <Skeleton rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No matching items found"
              description="Try clearing a filter or post a lost or found report for the community."
              action={
                <Button to="/lost-found/new" variant="secondary">
                  Post an item
                </Button>
              }
            />
          ) : (
            <>
              <p className={styles.countText}>
                Showing {items.length} of {total} {total === 1 ? 'item' : 'items'}
              </p>
              <div className={styles.grid}>
                {items.map((item) => (
                  <Card key={item.id} className={styles.itemCard}>
                    <div className={styles.thumb}>
                      {item.photos?.[0] ? (
                        <img src={item.photos[0]} alt={item.title} className={styles.thumbImg} loading="lazy" />
                      ) : (
                        <PackageSearch size={32} aria-hidden="true" />
                      )}
                    </div>
                    <div className={styles.badgeRow}>
                      <Badge variant={item.type === 'found' ? 'available' : 'new'}>
                        {item.type === 'found' ? 'Found' : 'Lost'}
                      </Badge>
                      <Badge variant={item.status === 'open' ? 'neutral' : 'full'}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                      {item.isSample && <Badge variant="neutral">Sample</Badge>}
                    </div>
                    <h2 className={styles.cardTitle}>{item.title}</h2>
                    <p className={styles.meta}>
                      {CATEGORY_LABELS[item.category] || 'Other'} · {item.location}
                    </p>
                    <p className={styles.meta}>
                      {formatDate(item.eventDate)} · Posted by {item.ownerName}
                    </p>
                    <p className={styles.excerpt}>{item.description}</p>
                    <div className={styles.cardFooter}>
                      <Button to={`/lost-found/${item.id}`} variant="outline" fullWidth>
                        View Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
