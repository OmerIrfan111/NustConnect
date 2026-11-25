const { HttpError } = require('../../core/errors');
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } = require('./models/Complaint');
const { HELPBOX_CATEGORIES } = require('./models/HelpBox');
const { FAQ_CATEGORIES } = require('./models/Faq');

const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);

function validateComplaintCreate(body = {}) {
  const errors = {};
  const title = clean(body.title, 140);
  if (title.length < 4) errors.title = 'Title must be at least 4 characters';

  const description = clean(body.description, 2000);
  if (description.length < 10) errors.description = 'Description must be at least 10 characters';

  const location = clean(body.location, 160);
  if (location.length < 2) errors.location = 'Location is required';

  const category = clean(body.category || 'other', 40).toLowerCase();
  if (!COMPLAINT_CATEGORIES.includes(category)) errors.category = 'Invalid complaint category';

  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], errors);
  return { title, description, location, category };
}

function validateComplaintTransition(body = {}) {
  const status = clean(body.status, 30).toLowerCase();
  if (!COMPLAINT_STATUSES.includes(status)) {
    throw new HttpError(400, 'Invalid complaint status');
  }
  const note = clean(body.note || '', 500);
  const assignedTo = clean(body.assignedTo || '', 120);
  return { status, note, assignedTo };
}

function validateHelpBoxSubmit(body = {}) {
  const errors = {};
  const question = clean(body.question, 1500);
  if (question.length < 8) errors.question = 'Question must be at least 8 characters';

  const category = clean(body.category || 'other', 40).toLowerCase();
  if (!HELPBOX_CATEGORIES.includes(category)) errors.category = 'Invalid help box category';

  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], errors);
  return { category, question };
}

function validateHelpBoxAnswer(body = {}) {
  const answer = clean(body.answer, 3000);
  if (answer.length < 5) throw new HttpError(400, 'Answer must be at least 5 characters', { answer: 'Answer is too short' });
  const publishAsFaq = Boolean(body.publishAsFaq);
  const faqTitle = clean(body.faqTitle || '', 180);
  const faqCategory = clean(body.faqCategory || 'general', 40).toLowerCase();
  if (publishAsFaq && !FAQ_CATEGORIES.includes(faqCategory)) {
    throw new HttpError(400, 'Invalid FAQ category');
  }
  return { answer, publishAsFaq, faqTitle, faqCategory };
}

function validateFaq(body = {}, partial = false) {
  const errors = {};
  const out = {};

  if (!partial || body.title !== undefined) {
    const title = clean(body.title, 180);
    if (title.length < 4) errors.title = 'FAQ title must be at least 4 characters';
    else out.title = title;
  }
  if (!partial || body.body !== undefined) {
    const text = clean(body.body, 6000);
    if (text.length < 10) errors.body = 'FAQ body must be at least 10 characters';
    else out.body = text;
  }
  if (!partial || body.category !== undefined) {
    const category = clean(body.category || 'general', 40).toLowerCase();
    if (!FAQ_CATEGORIES.includes(category)) errors.category = 'Invalid FAQ category';
    else out.category = category;
  }
  if (body.tags !== undefined) {
    const rawTags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',');
    out.tags = rawTags.map((t) => clean(t, 40).toLowerCase()).filter(Boolean).slice(0, 8);
  }

  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], errors);
  if (partial && Object.keys(out).length === 0) throw new HttpError(400, 'Nothing to update');
  return out;
}

module.exports = {
  validateComplaintCreate,
  validateComplaintTransition,
  validateHelpBoxSubmit,
  validateHelpBoxAnswer,
  validateFaq,
};
