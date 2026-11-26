const mongoose = require('mongoose');

const LOCATION_CATEGORIES = ['gate', 'academic', 'food', 'hostel', 'admin', 'sports', 'medical', 'other'];

// Default 5 NUST H-12 locations matching CONTRACTS.md §8 and core.test.js
const SAMPLE_LOCATIONS = [
  {
    id: 'sample-loc-1',
    name: 'Main Gate',
    category: 'gate',
    lat: 33.6425,
    lng: 72.9902,
    description: 'Primary NUST H-12 entrance (Gate 1) with shuttle stop and visitor check-in.',
    landmark: 'Kashmir Highway / Srinagar Highway side',
    isSample: true,
  },
  {
    id: 'sample-loc-2',
    name: 'Central Library',
    category: 'academic',
    lat: 33.6431,
    lng: 72.9916,
    description: 'Main campus library with quiet reading halls, group study rooms, and digital lab.',
    landmark: 'Opposite Main Office lawn',
    isSample: true,
  },
  {
    id: 'sample-loc-3',
    name: 'SEECS',
    category: 'academic',
    lat: 33.6419,
    lng: 72.9931,
    description: 'School of Electrical Engineering & Computer Science.',
    landmark: 'Adjacent to SMME and IAEC',
    isSample: true,
  },
  {
    id: 'sample-loc-4',
    name: 'Concordia Food Court',
    category: 'food',
    lat: 33.6437,
    lng: 72.9894,
    description: 'Popular student dining hub (C1) with cafes, tuck shop, and seating.',
    landmark: 'Near Central Library and NBS',
    isSample: true,
  },
  {
    id: 'sample-loc-5',
    name: 'Boys Hostel Block',
    category: 'hostel',
    lat: 33.6445,
    lng: 72.9945,
    description: 'Student residential hostels (Attar, Ghazali, Razi, Hajveri) and mess halls.',
    landmark: 'North-east residential sector',
    isSample: true,
  },
];

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: LOCATION_CATEGORIES, default: 'other', index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    landmark: { type: String, default: '', trim: true, maxlength: 200 },
    hidden: { type: Boolean, default: false, index: true },
    isSample: { type: Boolean, default: false },
  },
  { collection: 'campus_locations', timestamps: true },
);

locationSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    category: this.category,
    lat: this.lat,
    lng: this.lng,
    description: this.description || '',
    landmark: this.landmark || '',
    directionsUrl: `https://www.openstreetmap.org/?mlat=${this.lat}&mlon=${this.lng}#map=17/${this.lat}/${this.lng}`,
    isSample: Boolean(this.isSample),
  };
};

module.exports = mongoose.models.CampusLocation || mongoose.model('CampusLocation', locationSchema);
module.exports.LOCATION_CATEGORIES = LOCATION_CATEGORIES;
module.exports.SAMPLE_LOCATIONS = SAMPLE_LOCATIONS.map((loc) => ({
  ...loc,
  directionsUrl: `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=17/${loc.lat}/${loc.lng}`,
}));
