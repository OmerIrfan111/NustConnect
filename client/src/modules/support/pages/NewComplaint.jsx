import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import http from '@core/api/http.js';
import { Button, Card, Input, PageHeader } from '@core/ui';
import { COMPLAINT_CATEGORIES } from '../constants.js';
import styles from './Support.module.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function NewComplaint() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('electrical');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleFile(e) {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'Only JPEG, PNG, or WebP images are allowed.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: 'Photo must be 5 MB or smaller.' }));
      return;
    }
    setErrors((prev) => ({ ...prev, photo: '' }));
    setPhoto(file);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (title.trim().length < 4) errs.title = 'Title must be at least 4 characters.';
    if (location.trim().length < 2) errs.location = 'Location is required.';
    if (description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setErrors({});
    try {
      let res;
      if (photo) {
        const form = new FormData();
        form.append('category', category);
        form.append('title', title.trim());
        form.append('location', location.trim());
        form.append('description', description.trim());
        form.append('photo', photo);
        res = await http.post('/support/complaints', form, { headers: { 'Content-Type': undefined } });
      } else {
        res = await http.post('/support/complaints', {
          category,
          title: title.trim(),
          location: location.trim(),
          description: description.trim(),
        });
      }
      navigate(`/complaints/${res.data.complaint.id}`);
    } catch (err) {
      if (err?.details) setErrors(err.details);
      setSubmitError(err?.message || 'Could not submit complaint.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <Link to="/complaints" className={styles.backLink}>
        ← Back to My Complaints
      </Link>

      <PageHeader
        title="Submit a Facility Complaint"
        subtitle="Complaints are linked to your account for status updates and visible only to you and campus staff."
      />

      <Card>
        <form onSubmit={onSubmit} className={styles.form} noValidate>
          {submitError && (
            <p role="alert" className={styles.errorBox}>
              {submitError}
            </p>
          )}

          <Input label="Category" as="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {COMPLAINT_CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Input>

          <Input
            label="Complaint Title"
            placeholder="e.g. Broken projector in SEECS Room 204"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            required
          />

          <Input
            label="Campus Location"
            placeholder="e.g. Attar Hostel Block B, SEECS Lab 3"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            error={errors.location}
            required
          />

          <Input
            label="Details"
            as="textarea"
            rows={4}
            placeholder="Describe the issue clearly so maintenance staff can resolve it."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
            required
          />

          <div>
            <label htmlFor="cmp-photo" className={styles.meta}>
              Photo evidence (optional, JPEG/PNG/WebP up to 5 MB)
            </label>
            <input id="cmp-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
            {errors.photo && (
              <p role="alert" className={styles.errorBox}>
                {errors.photo}
              </p>
            )}
          </div>

          <div className={styles.actions}>
            <Button type="submit" loading={submitting}>
              Submit Complaint
            </Button>
            <Button to="/complaints" variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
