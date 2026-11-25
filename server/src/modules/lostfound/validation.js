const { HttpError } = require('../../core/errors');
const { CATEGORIES, STATUSES } = require('./models/Item');

function cleanString(value, max = 200) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function validateCreateItem(body = {}) {
  const errors = {};
  const type = cleanString(body.type, 20).toLowerCase();
  if (!['lost', 'found'].includes(type)) errors.type = 'Type must be lost or found';

  const title = cleanString(body.title, 120);
  if (title.length < 3) errors.title = 'Title must be at least 3 characters';

  const description = cleanString(body.description, 2000);
  if (description.length < 10) errors.description = 'Description must be at least 10 characters';

  const category = cleanString(body.category || 'other', 40).toLowerCase();
  if (!CATEGORIES.includes(category)) errors.category = 'Invalid category';

  const location = cleanString(body.location, 160);
  if (location.length < 2) errors.location = 'Location is required';

  const rawDate = body.eventDate ? new Date(body.eventDate) : new Date();
  if (Number.isNaN(rawDate.getTime())) errors.eventDate = 'Valid date is required';

  const manualKeywords = cleanString(body.manualKeywords || '', 300);

  if (Object.keys(errors).length) {
    throw new HttpError(400, Object.values(errors)[0], errors);
  }

  return { type, title, description, category, location, eventDate: rawDate, manualKeywords };
}

function validateUpdateItem(body = {}) {
  const patch = {};
  const errors = {};

  if (body.title !== undefined) {
    const title = cleanString(body.title, 120);
    if (title.length < 3) errors.title = 'Title must be at least 3 characters';
    else patch.title = title;
  }
  if (body.description !== undefined) {
    const description = cleanString(body.description, 2000);
    if (description.length < 10) errors.description = 'Description must be at least 10 characters';
    else patch.description = description;
  }
  if (body.category !== undefined) {
    const category = cleanString(body.category, 40).toLowerCase();
    if (!CATEGORIES.includes(category)) errors.category = 'Invalid category';
    else patch.category = category;
  }
  if (body.location !== undefined) {
    const location = cleanString(body.location, 160);
    if (location.length < 2) errors.location = 'Location is required';
    else patch.location = location;
  }
  if (body.status !== undefined) {
    const status = cleanString(body.status, 20).toLowerCase();
    if (!STATUSES.includes(status)) errors.status = 'Invalid status';
    else patch.status = status;
  }
  if (body.manualKeywords !== undefined) {
    patch.manualKeywords = cleanString(body.manualKeywords, 300);
  }

  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], errors);
  if (Object.keys(patch).length === 0) throw new HttpError(400, 'Nothing to update');
  return patch;
}

function validateCreateClaim(body = {}) {
  const message = cleanString(body.message, 1000);
  if (message.length < 5) {
    throw new HttpError(400, 'Describe identifying details (at least 5 characters)', {
      message: 'Describe identifying details (at least 5 characters)',
    });
  }
  return { message };
}

function validateClaimDecision(body = {}) {
  const action = cleanString(body.action || body.status, 20).toLowerCase();
  if (!['approved', 'rejected', 'cancelled'].includes(action)) {
    throw new HttpError(400, 'Action must be approved, rejected, or cancelled');
  }
  const decisionNote = cleanString(body.decisionNote || body.note || '', 500);
  return { action, decisionNote };
}

module.exports = {
  validateCreateItem,
  validateUpdateItem,
  validateCreateClaim,
  validateClaimDecision,
};
