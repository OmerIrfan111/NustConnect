import { useCallback, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import http from '@core/api/http.js';
import { useAuth } from '../../auth/useAuth.js';
import { Badge, Button, Card, Chips, EmptyState, ErrorState, PageHeader, SampleDataBanner, SearchBar, Skeleton } from '@core/ui';
import { FAQ_CATEGORIES } from '../constants.js';
import styles from './Support.module.css';

export default function FaqList() {
  const { user } = useAuth();
  const isStaff = user?.role === 'moderator' || user?.role === 'admin';

  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (q.trim()) params.q = q.trim();
      const { data } = await http.get('/support/faq', { params });
      setArticles(Array.isArray(data?.articles) ? data.articles : []);
    } catch (err) {
      setError(err?.message || 'Could not load FAQ articles.');
    } finally {
      setLoading(false);
    }
  }, [category, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className={styles.page}>
      <PageHeader
        title="Campus FAQ & Wiki"
        subtitle="Verified answers to common NUST student questions, open to guests and students."
        actions={
          isStaff ? (
            <Button to="/admin/support" variant="secondary">
              Manage FAQ &amp; Help Box
            </Button>
          ) : null
        }
      />

      {articles.some((a) => a.isSample) && <SampleDataBanner>Sample data: seeded FAQ articles are labelled below.</SampleDataBanner>}

      <div className={styles.controls}>
        <SearchBar value={q} onChange={setQ} onSearch={setQ} allowEmpty placeholder="Search FAQ & campus wiki…" label="Search FAQ" />
      </div>

      <Chips items={FAQ_CATEGORIES} value={category} onChange={setCategory} label="FAQ category" />

      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="No FAQ articles match" description="Try another topic or search keyword." />
      ) : (
        <div className={styles.grid2}>
          {articles.map((article) => (
            <Card key={article.id} to={`/faq/${article.id}`} className={styles.list}>
              <div className={styles.badges}>
                <Badge variant="available">{article.category}</Badge>
                {article.isSample && <Badge variant="neutral">Sample</Badge>}
              </div>
              <h2 className={styles.cardTitle}>{article.title}</h2>
              <p className={styles.meta}>{article.body.slice(0, 140)}…</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
