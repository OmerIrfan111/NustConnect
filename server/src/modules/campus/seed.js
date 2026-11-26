const Location = require('./models/Location');
const Guide = require('./models/Guide');
const Bill = require('./models/Bill');

const strip = ({ id: _id, directionsUrl: _url, ...rest }) => rest;

// Approximate points around NUST H-12 (sample data, not surveyed coordinates).
const EXTRA_LOCATIONS = [
  { name: 'NUST Business School (NBS)', category: 'academic', lat: 33.6441, lng: 72.9925, description: 'Business school with seminar halls and the executive lounge.', landmark: 'Near Concordia 1', isSample: true },
  { name: 'Admin Block', category: 'admin', lat: 33.6428, lng: 72.9909, description: 'Rector secretariat, admissions and student affairs.', landmark: 'Straight ahead from the Main Gate', isSample: true },
  { name: 'Sports Complex', category: 'sports', lat: 33.6452, lng: 72.9921, description: 'Gym, courts and the cricket ground.', landmark: 'Behind the hostel road', isSample: true },
  { name: 'Campus Medical Centre', category: 'medical', lat: 33.6423, lng: 72.9937, description: 'Clinic with a pharmacy and emergency desk.', landmark: 'Opposite SEECS parking', isSample: true },
  { name: 'Girls Hostel Block', category: 'hostel', lat: 33.6449, lng: 72.9903, description: 'Female student residences with a mess hall.', landmark: 'West residential sector', isSample: true },
];

const BILL_USERS = [
  { userId: 'demo-ahmed-khan', name: 'Ahmed Khan', verified: true },
  { userId: 'sample-user-1', name: 'Ayesha Malik', verified: true },
  { userId: 'sample-user-2', name: 'Bilal Raza', verified: true },
];

async function seed() {
  if ((await Location.countDocuments({ isSample: true })) === 0) {
    const docs = [...Location.SAMPLE_LOCATIONS.map(strip), ...EXTRA_LOCATIONS];
    await Location.insertMany(docs);
    console.log(`[seed:campus] inserted ${docs.length} sample locations`);
  }
  if ((await Guide.countDocuments({ isSample: true })) === 0) {
    await Guide.insertMany(Guide.SAMPLE_GUIDES.map(strip));
    console.log(`[seed:campus] inserted ${Guide.SAMPLE_GUIDES.length} sample guide articles`);
  }
  if ((await Bill.countDocuments({ isSample: true })) === 0) {
    // 3,000 split three ways = 1,000 each. Ahmed paid, so his share is settled.
    await Bill.create({
      title: 'Murree trip: cabin booking (sample)',
      description: 'Sample bill so the Bill Splitting screens have something to show.',
      totalCents: 300000,
      splitMethod: 'equal',
      creatorId: BILL_USERS[0].userId,
      creatorName: BILL_USERS[0].name,
      participants: BILL_USERS.map((u, i) => ({ ...u, owedCents: 100000, paidCents: i === 0 ? 100000 : 0, settledAt: i === 0 ? new Date() : null })),
      isSample: true,
    });
    console.log('[seed:campus] inserted 1 sample bill');
  }
}

module.exports = seed;
