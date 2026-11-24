const mongoose = require('mongoose');
const Category = require('../models/Category');
const { HttpError } = require('../../../core/errors');
const { validateCategory } = require('../validation2');
const audit = require('../audit');

const isAdmin = (u) => u.role === 'admin';

/**
 * GET /categories?scope=marketplace. Modules call this and fall back to their own defaults when the list is empty.
 * Students and modules only get active categories; admins get all of them.
 */
async function list(req, res) {
  const query = {};
  if (typeof req.query.scope === 'string' && req.query.scope) query.scope = req.query.scope.toLowerCase();
  if (!isAdmin(req.user)) query.active = true;
  const items = await Category.find(query).sort({ order: 1, name: 1 }).limit(500);
  res.json({ items: items.map((c) => c.toPublic()) });
}

async function create(req, res) {
  const data = validateCategory(req.body);
  const c = await Category.create(data);
  await audit.record(req.user, 'category.create', { targetType: 'category', targetId: c._id, note: `${data.scope}: ${data.name}` });
  res.status(201).json({ category: c.toPublic() });
}

async function update(req, res) {
  const data = validateCategory(req.body, { partial: true });
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Category not found');
  const c = await Category.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
  if (!c) throw new HttpError(404, 'Category not found');
  await audit.record(req.user, 'category.update', { targetType: 'category', targetId: c._id, note: `${c.scope}: ${c.name}` });
  res.json({ category: c.toPublic() });
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Category not found');
  const c = await Category.findByIdAndDelete(req.params.id);
  if (!c) throw new HttpError(404, 'Category not found');
  await audit.record(req.user, 'category.delete', { targetType: 'category', targetId: c._id, note: `${c.scope}: ${c.name}` });
  res.status(204).end();
}

module.exports = { list, create, update, remove };
