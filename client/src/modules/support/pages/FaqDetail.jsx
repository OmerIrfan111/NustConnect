import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import http from '@core/api/http.js';
import { Badge, Card, EmptyState, ErrorState, PageHeader, ReportButton, SampleDataBanner, Skeleton } from '@core/ui';
import { formatDateTime } from '../constants.js';
import styles from './Support.module.css';

export default function FaqDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get(`/support/faq/${id}`);
      setArticle(data.article);
    } catch (err) {
      setError(err?.message || 'Could not load FAQ article.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Skeleton rows={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!article) return <EmptyState title="FAQ article not found" />;

  return (
    <section className={styles.page}>
      <Link to="/faq" className={styles.backLink}>
        ← Back to FAQ &amp; Wiki
      </Link>

      <PageHeader
        title={article.title}
        subtitle={`Category: ${article.category}${article.updatedAt ? ` · Updated ${formatDateTime(article.updatedAt)}` : ''}`}
        actions={<ReportButton targetType="faq" targetId={article.id} />}
      />

      {article.isSample && <SampleDataBanner>Sample data: seeded FAQ article.</SampleDataBanner>}

      <Card className={styles.list}>
        <div className={styles.badges}>
          <Badge variant="available">{article.category}</Badge>
          {article.tags?.map((t) => (
            <Badge key={t} variant="neutral">
              #{t}
            </Badge>
          ))}
        </div>
        <p className={styles.body}>{article.body}</p>
      </Card>
    </section>
  );
}
