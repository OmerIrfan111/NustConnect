import { useCallback, useEffect, useState } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import http from '@core/api/http.js';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, SampleDataBanner, Skeleton } from '@core/ui';
import { HELPBOX_CATEGORIES, formatDateTime } from '../constants.js';
import styles from './Support.module.css';

export default function HelpBox() {
  const [category, setCategory] = useState('academics');
  const [question, setQuestion] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedMsg, setSubmittedMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [answered, setAnswered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadAnswered = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await http.get('/support/helpbox/answered');
      setAnswered(Array.isArray(data?.entries) ? data.entries : []);
    } catch (err) {
      setLoadError(err?.message || 'Could not load answered questions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnswered();
  }, [loadAnswered]);

  async function onSubmit(e) {
    e.preventDefault();
    if (question.trim().length < 8) {
      setFormError('Please write at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setSubmittedMsg('');
    try {
      await http.post('/support/helpbox', { category, question: question.trim() });
      setQuestion('');
      setSubmittedMsg('Your question was submitted anonymously. No user ID or identifying metadata was stored.');
    } catch (err) {
      setFormError(err?.message || 'Could not submit your question.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title="Anonymous Help Box"
        subtitle="Ask sensitive campus, academic, or wellbeing questions safely without attaching your identity."
        actions={
          <Button to="/faq" variant="outline">
            Browse Public FAQ
          </Button>
        }
      />

      <div className={styles.privacyBanner} role="note">
        <strong>Strict anonymity guarantee:</strong> Help Box submissions store <strong>no user ID, email, or IP address</strong> in
        the database. This is completely separate from the Complaint Tracker.
      </div>

      <Card>
        <form onSubmit={onSubmit} className={styles.form} noValidate>
          {submittedMsg && (
            <p role="status" className={styles.successBox}>
              {submittedMsg}
            </p>
          )}
          <Input label="Topic" as="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {HELPBOX_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Input>
          <Input
            label="Your Question (Anonymous)"
            as="textarea"
            rows={4}
            placeholder="Ask anything without sharing personal details..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            error={formError}
            required
          />
          <div>
            <Button type="submit" loading={submitting}>
              Send Anonymously
            </Button>
          </div>
        </form>
      </Card>

      <div className={styles.list}>
        <h2 className={styles.sectionTitle}>Recently Answered Questions</h2>
        {answered.some((a) => a.isSample) && (
          <SampleDataBanner>Sample data: seeded Help Box Q&amp;A examples are labelled below.</SampleDataBanner>
        )}
        {loading ? (
          <Skeleton rows={3} />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadAnswered} />
        ) : answered.length === 0 ? (
          <EmptyState icon={MessageCircleQuestion} title="No answered questions yet" />
        ) : (
          answered.map((item) => (
            <Card key={item.id} className={styles.list}>
              <div className={styles.badges}>
                <Badge variant="available">{item.category}</Badge>
                {item.isSample && <Badge variant="neutral">Sample</Badge>}
                {item.answeredAt && <span className={styles.meta}>Answered {formatDateTime(item.answeredAt)}</span>}
              </div>
              <h3 className={styles.cardTitle}>{item.question}</h3>
              <p className={styles.body}>{item.answer}</p>
              {item.publishedFaqId && (
                <div>
                  <Button to={`/faq/${item.publishedFaqId}`} variant="outline" size="sm">
                    Read in FAQ
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
