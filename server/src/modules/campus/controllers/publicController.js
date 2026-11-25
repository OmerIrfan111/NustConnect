const Location = require('../models/Location');
const Guide = require('../models/Guide');
const { dbReady } = require('../db');

const { SAMPLE_LOCATIONS } = Location;
const { SAMPLE_GUIDES } = Guide;

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function filterSamples(rows, { category, q }) {
  const needle = String(q || '').trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!category || category === 'all' || r.category === category) &&
      (!needle || `${r.name} ${r.description || ''} ${r.landmark || ''}`.toLowerCase().includes(needle)),
  );
}

/**
 * GET /api/campus/locations: the campus-locations contract (docs/CONTRACTS.md §8), public and read-only.
 * Returns [{ id, name, category, lat, lng, ... }]. Falls back to labelled sample points when the database is down or empty.
 */
async function listLocations(req, res) {
  const { category, q } = req.query;
  if (dbReady(req)) {
    try {
      const filter = { hidden: { $ne: true } };
      if (category && category !== 'all') filter.category = String(category);
      if (q && String(q).trim()) filter.name = { $regex: escapeRe(String(q).trim()), $options: 'i' };
      const rows = await Location.find(filter).sort({ name: 1 }).limit(200);
      if (rows.length > 0 || category || q) return res.json(rows.map((r) => r.toPublic()));
    } catch {
      // fall through to the sample points
    }
  }
  return res.json(filterSamples(SAMPLE_LOCATIONS, { category, q }));
}

/** GET /api/campus/guides: the Freshie Guide articles, public. */
async function listGuides(req, res) {
  const { section } = req.query;
  if (dbReady(req)) {
    try {
      const filter = { hidden: { $ne: true } };
      if (section && section !== 'all') filter.section = String(section);
      const rows = await Guide.find(filter).sort({ order: 1 }).limit(100);
      if (rows.length > 0 || section) return res.json({ guides: rows.map((g) => g.toPublic()) });
    } catch {
      // fall through to the sample articles
    }
  }
  const guides = SAMPLE_GUIDES.filter((g) => !section || section === 'all' || g.section === section);
  return res.json({ guides });
}

module.exports = { listLocations, listGuides };
