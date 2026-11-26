const Item = require('./models/Item');

const SAMPLE_ITEMS = [
  {
    type: 'found',
    title: 'Casio fx-991EX Scientific Calculator',
    description: 'Found on a desk in SEECS Room 204 after the afternoon Signals lecture.',
    category: 'electronics',
    location: 'SEECS Block, NUST H-12',
    eventDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'open',
    ownerId: 'sample-user-1',
    ownerName: 'Ayesha Malik',
    ownerVerified: true,
    ocrStatus: 'manual',
    manualKeywords: 'casio calculator seecs 991ex',
    ocrKeywords: ['casio', 'calculator', 'seecs', '991ex'],
    isSample: true,
  },
  {
    type: 'lost',
    title: 'Black Casio Scientific Calculator',
    description: 'Left my black Casio calculator in SEECS 2nd floor classroom during lab.',
    category: 'electronics',
    location: 'SEECS',
    eventDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'open',
    ownerId: 'sample-user-2',
    ownerName: 'Bilal Raza',
    ownerVerified: true,
    ocrStatus: 'manual',
    manualKeywords: 'casio calculator seecs black',
    ocrKeywords: ['casio', 'calculator', 'seecs', 'black'],
    isSample: true,
  },
  {
    type: 'found',
    title: 'NUST Student ID Card (Name masked)',
    description: 'Picked up near Central Library entrance steps. Handed over to security desk; message with details to claim.',
    category: 'id_card',
    location: 'Central Library',
    eventDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'open',
    ownerId: 'sample-user-1',
    ownerName: 'Ayesha Malik',
    ownerVerified: true,
    ocrStatus: 'completed',
    ocrTextMasked: 'NATIONAL UNIVERSITY OF SCIENCES AND TECHNOLOGY ID [REDACTED]',
    ocrKeywords: ['library', 'seecs', 'undergraduate'],
    manualKeywords: 'library id card',
    isSample: true,
  },
  {
    type: 'lost',
    title: 'Silver Keychain with Hostel Room Key',
    description: 'Dropped a silver keychain with two keys and a blue lanyard near Concordia 1.',
    category: 'keys',
    location: 'Concordia 1 Food Court',
    eventDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    status: 'open',
    ownerId: 'sample-user-3',
    ownerName: 'Hamza Sheikh',
    ownerVerified: false,
    ocrStatus: 'none',
    manualKeywords: 'keychain blue lanyard concordia',
    isSample: true,
  },
];

async function seed() {
  const existing = await Item.countDocuments({ isSample: true });
  if (existing > 0) {
    console.log(`[seed:lostfound] ${existing} sample items already present, skipping`);
    return;
  }
  await Item.insertMany(SAMPLE_ITEMS);
  console.log(`[seed:lostfound] inserted ${SAMPLE_ITEMS.length} sample items`);
}

module.exports = seed;
module.exports.SAMPLE_ITEMS = SAMPLE_ITEMS;
