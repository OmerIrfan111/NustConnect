const mongoose = require('mongoose');

/**
 * Admin-managed categories for a module (for example marketplace: "Electronics", reviews: "Cafes").
 * A module reads GET /api/admin/categories?scope=<slug> and falls back to its own built-in defaults when the list is empty.
 */
const categorySchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    order: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'admin_categories' },
);

categorySchema.index({ scope: 1, name: 1 }, { unique: true });

categorySchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), scope: this.scope, name: this.name, order: this.order, active: this.active };
};

module.exports = mongoose.models.AdminCategory || mongoose.model('AdminCategory', categorySchema);
