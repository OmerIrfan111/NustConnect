import { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import http from '@core/api/http.js';
import { Badge, Card, Chips, EmptyState, ErrorState, PageHeader, SampleDataBanner, Skeleton } from '@core/ui';
import { GUIDE_SECTIONS } from '../constants.js';
import styles from './Campus.module.css';

const SECTION_LABELS = Object.fromEntries(GUIDE_SECTIONS.map((s) => [s.value, s.label]));

export default function FreshieGuide() {
  const [guides, setGuides] = useState([]);
  const [section, setSection] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get('/campus/guides');
      setGuides(Array.isArray(data?.guides) ? data.guides : []);
    } catch (err) {
      setError(err?.message || 'Could not load the guide.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => guides.filter((g) => section === 'all' || g.section === section), [guides, section]);

  return (
    <section className={styles.page}>
      <PageHeader title="Freshie Guide" subtitle="Everything a new NUST student needs in the first weeks. Open to everyone." />

      {guides.some((g) => g.isSample) && <SampleDataBanner>Sample data: these guide articles are demo content.</SampleDataBanner>}

      <Chips items={GUIDE_SECTIONS} value={section} onChange={setSection} label="Guide topic" />

      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Compass} title="No articles in this topic yet" />
      ) : (
        <div className={styles.grid2}>
          {shown.map((g) => (
            <Card key={g.id} className={styles.stack}>
              <div>
                <Badge variant="available">{SECTION_LABELS[g.section] || g.section}</Badge>
              </div>
              <h2 className={styles.cardTitle}>{g.title}</h2>
              <p className={styles.meta}>{g.summary}</p>
              <details className={styles.details}>
                <summary>Read the full article</summary>
                <p className={styles.body}>{g.body}</p>
              </details>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
