/** campus (C3) server manifest: BASE STUB. Owner replaces this; keep `slug` and `router`. See docs/CONTRACTS.md §1, §8. */
const express = require('express');

const router = express.Router();
router.get('/ping', (req, res) => res.json({ ok: true, slug: 'campus' }));

// Campus locations contract (§8). Stub: 5 sample points around NUST H-12 (sample data).
const SAMPLE_LOCATIONS = [
  { id: 'sample-loc-1', name: 'Main Gate', category: 'gate', lat: 33.6425, lng: 72.9902 },
  { id: 'sample-loc-2', name: 'Central Library', category: 'academic', lat: 33.6431, lng: 72.9916 },
  { id: 'sample-loc-3', name: 'SEECS', category: 'academic', lat: 33.6419, lng: 72.9931 },
  { id: 'sample-loc-4', name: 'Concordia Food Court', category: 'food', lat: 33.6437, lng: 72.9894 },
  { id: 'sample-loc-5', name: 'Boys Hostel Block', category: 'hostel', lat: 33.6445, lng: 72.9945 },
];

router.get('/locations', (req, res) => res.json(SAMPLE_LOCATIONS));

module.exports = { slug: 'campus', router };
