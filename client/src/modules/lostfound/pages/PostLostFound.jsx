import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import http from '@core/api/http.js';
import { Button, Card, Input, PageHeader, Tabs } from '@core/ui';
import { CATEGORIES } from '../constants.js';
import styles from './PostLostFound.module.css';

const TYPE_TABS = [
  { value: 'lost', label: 'I Lost Something' },
  { value: 'found', label: 'I Found Something' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

export default function PostLostFound() {
  const navigate = useNavigate();
  const [type, setType] = useState('lost');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('electronics');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [manualKeywords, setManualKeywords] = useState('');
  const [files, setFiles] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e) {
    const picked = Array.from(e.target.files || []);
    if (picked.length > 3) {
      setFieldErrors((prev) => ({ ...prev, photos: 'Select up to 3 images only.' }));
      return;
    }
    for (const f of picked) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setFieldErrors((prev) => ({ ...prev, photos: 'Only JPEG, PNG, or WebP images are allowed.' }));
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, photos: `Each image must be ${MAX_MB} MB or smaller.` }));
        return;
      }
    }
    setFieldErrors((prev) => ({ ...prev, photos: '' }));
    setFiles(picked);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (title.trim().length < 3) errs.title = 'Title must be at least 3 characters.';
    if (location.trim().length < 2) errs.location = 'Location is required.';
    if (description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setFieldErrors({});
    try {
      let res;
      if (files.length > 0) {
        const form = new FormData();
        form.append('type', type);
        form.append('title', title.trim());
        form.append('category', category);
        form.append('location', location.trim());
        form.append('eventDate', eventDate);
        form.append('description', description.trim());
        if (manualKeywords.trim()) form.append('manualKeywords', manualKeywords.trim());
        for (const f of files) form.append('photos', f);
        res = await http.post('/lostfound/items', form, { headers: { 'Content-Type': undefined } });
      } else {
        res = await http.post('/lostfound/items', {
          type,
          title: title.trim(),
          category,
          location: location.trim(),
          eventDate,
          description: description.trim(),
          manualKeywords: manualKeywords.trim(),
        });
      }
      navigate(`/lost-found/${res.data.item.id}`);
    } catch (err) {
      if (err?.details) setFieldErrors(err.details);
      setSubmitError(err?.message || 'Could not post item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <Link to="/lost-found" className={styles.backLink}>
        ← Back to Lost &amp; Found
      </Link>

      <PageHeader
        title="Post Lost or Found Item"
        subtitle="Provide clear location and identifying details without exposing sensitive personal numbers."
      />

      <Card>
        <form onSubmit={onSubmit} className={styles.form} noValidate>
          <Tabs items={TYPE_TABS} value={type} onChange={setType} label="Report type" />

          {submitError && (
            <p role="alert" className={styles.errorBox}>
              {submitError}
            </p>
          )}

          <Input
            label="Item Title"
            placeholder="e.g. Casio Scientific Calculator"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            required
          />

          <div className={styles.row}>
            <Input label="Category" as="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Input>

            <Input
              label="Date Lost / Found"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              error={fieldErrors.eventDate}
            />
          </div>

          <Input
            label="Campus Location"
            placeholder="e.g. SEECS Room 204, Central Library, Concordia 1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            error={fieldErrors.location}
            required
          />

          <Input
            label="Description"
            as="textarea"
            rows={4}
            placeholder="Colour, brand, condition, or where it can be collected."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
            required
          />

          <Input
            label="Keywords for matching (optional / OCR fallback)"
            placeholder="e.g. blue cover, sticker, seecs"
            hint="Used if image text extraction is unavailable or skipped."
            value={manualKeywords}
            onChange={(e) => setManualKeywords(e.target.value)}
          />

          <div>
            <label htmlFor="lf-photos" className={styles.fileLabel}>
              Photos (optional, up to 3 JPEG/PNG/WebP images, max {MAX_MB} MB each)
            </label>
            <input
              id="lf-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            {files.length > 0 && <p className={styles.fileHint}>{files.length} image(s) selected</p>}
            {fieldErrors.photos && (
              <p role="alert" className={styles.errorBox}>
                {fieldErrors.photos}
              </p>
            )}
          </div>

          <p className={styles.privacyNote}>
            <strong>Privacy safeguard:</strong> Uploaded found-item photos undergo server-side OCR solely for matching. CNICs,
            student ID numbers, phone numbers, and emails are automatically masked and never displayed or returned by the API.
          </p>

          <div className={styles.actions}>
            <Button type="submit" loading={submitting}>
              Publish Post
            </Button>
            <Button to="/lost-found" variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
