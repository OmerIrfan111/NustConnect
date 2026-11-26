import { useCallback, useEffect, useState } from 'react';
import http from '@core/api/http.js';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton, Tabs } from '@core/ui';
import { COMPLAINT_STATUS_LABELS, FAQ_CATEGORIES, formatDateTime } from '../constants.js';
import styles from './Support.module.css';

const ADMIN_TABS = [
  { value: 'complaints', label: 'Facility Complaints' },
  { value: 'helpbox', label: 'Anonymous Help Box' },
  { value: 'faq', label: 'FAQ Editor' },
];

export default function AdminSupport() {
  const [tab, setTab] = useState('complaints');
  const [complaints, setComplaints] = useState([]);
  const [helpbox, setHelpbox] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Help box answer state
  const [answeringId, setAnsweringId] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [publishAsFaq, setPublishAsFaq] = useState(true);
  const [faqTitle, setFaqTitle] = useState('');

  // New FAQ state
  const [newFaqTitle, setNewFaqTitle] = useState('');
  const [newFaqCat, setNewFaqCat] = useState('general');
  const [newFaqBody, setNewFaqBody] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, hRes, fRes] = await Promise.all([
        http.get('/support/complaints', { params: { scope: 'staff' } }),
        http.get('/support/helpbox'),
        http.get('/support/faq'),
      ]);
      setComplaints(cRes.data?.complaints || []);
      setHelpbox(hRes.data?.entries || []);
      setFaqs(fRes.data?.articles || []);
    } catch (err) {
      setError(err?.message || 'Could not load staff support queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function submitAnswer(entry) {
    if (answerText.trim().length < 5) return;
    await http.post(`/support/helpbox/${entry.id}/answer`, {
      answer: answerText.trim(),
      publishAsFaq,
      faqTitle: faqTitle.trim() || entry.question.slice(0, 120),
      faqCategory: 'general',
    });
    setAnsweringId(null);
    setAnswerText('');
    setFaqTitle('');
    await loadAll();
  }

  async function createFaq(e) {
    e.preventDefault();
    if (newFaqTitle.trim().length < 4 || newFaqBody.trim().length < 10) return;
    await http.post('/support/faq', {
      title: newFaqTitle.trim(),
      category: newFaqCat,
      body: newFaqBody.trim(),
    });
    setNewFaqTitle('');
    setNewFaqBody('');
    await loadAll();
  }

  async function deleteFaq(id) {
    await http.delete(`/support/faq/${id}`);
    await loadAll();
  }

  return (
    <section className={styles.page}>
      <PageHeader title="Support &amp; Moderation Queue" subtitle="Manage facility complaints, anonymous help-box questions, and FAQ articles." />
      <Tabs items={ADMIN_TABS} value={tab} onChange={setTab} label="Support management tabs" />

      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAll} />
      ) : tab === 'complaints' ? (
        complaints.length === 0 ? (
          <EmptyState title="No complaints in queue" />
        ) : (
          <div className={styles.list}>
            {complaints.map((c) => (
              <Card key={c.id} className={styles.list}>
                <div className={styles.cardHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>{c.title}</h2>
                    <p className={styles.meta}>
                      {c.ownerName} · {c.location} · {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <Badge variant={c.status === 'resolved' ? 'available' : 'new'}>
                    {COMPLAINT_STATUS_LABELS[c.status] || c.status}
                  </Badge>
                </div>
                <p className={styles.body}>{c.description}</p>
                <div className={styles.actions}>
                  <Button to={`/complaints/${c.id}`} variant="outline" size="sm">
                    Open &amp; Update Status
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'helpbox' ? (
        helpbox.length === 0 ? (
          <EmptyState title="No anonymous questions in queue" />
        ) : (
          <div className={styles.list}>
            {helpbox.map((h) => (
              <Card key={h.id} className={styles.list}>
                <div className={styles.cardHeader}>
                  <Badge variant={h.status === 'answered' ? 'available' : 'new'}>{h.status}</Badge>
                  <span className={styles.meta}>Anonymous · {h.category}</span>
                </div>
                <p className={styles.body}>{h.question}</p>
                {h.answer && <p className={styles.meta}>Answer: {h.answer}</p>}
                {h.status === 'open' && (
                  <div className={styles.actions}>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAnsweringId(h.id);
                        setFaqTitle(h.question.slice(0, 100));
                      }}
                    >
                      Answer Question
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await http.post(`/support/helpbox/${h.id}/dismiss`);
                        await loadAll();
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
                {answeringId === h.id && (
                  <div className={styles.form}>
                    <Input label="Response" as="textarea" rows={3} value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
                    <label className={styles.meta}>
                      <input type="checkbox" checked={publishAsFaq} onChange={(e) => setPublishAsFaq(e.target.checked)} /> Publish anonymously as FAQ article
                    </label>
                    {publishAsFaq && <Input label="FAQ Title" value={faqTitle} onChange={(e) => setFaqTitle(e.target.value)} />}
                    <div className={styles.actions}>
                      <Button size="sm" onClick={() => submitAnswer(h)}>
                        Save Answer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setAnsweringId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className={styles.list}>
          <Card>
            <h2 className={styles.sectionTitle}>Create FAQ Article</h2>
            <form onSubmit={createFaq} className={styles.form}>
              <Input label="Title" value={newFaqTitle} onChange={(e) => setNewFaqTitle(e.target.value)} required />
              <Input label="Category" as="select" value={newFaqCat} onChange={(e) => setNewFaqCat(e.target.value)}>
                {FAQ_CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Input>
              <Input label="Article Content" as="textarea" rows={4} value={newFaqBody} onChange={(e) => setNewFaqBody(e.target.value)} required />
              <div>
                <Button type="submit">Publish FAQ Article</Button>
              </div>
            </form>
          </Card>

          {faqs.map((f) => (
            <Card key={f.id} className={styles.list}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <Badge variant="available">{f.category}</Badge>
              </div>
              <p className={styles.body}>{f.body}</p>
              <div className={styles.actions}>
                <Button variant="outline" size="sm" onClick={() => deleteFaq(f.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
