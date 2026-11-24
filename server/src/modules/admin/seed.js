/** Seed data for admin (A3). Run: npm run seed -- admin. Replaces only rows flagged `sample`. */
const Campaign = require('./models/Campaign');

const SAMPLE_CAMPAIGNS = [
  { title: 'Flood relief fund', description: 'Sample campaign: supplies for flood-affected families.', goalAmount: 200000, raisedAmount: 0 },
  { title: 'Library book drive', description: 'Sample campaign: new textbooks for the central library.', goalAmount: 100000, raisedAmount: 50000 },
  { title: 'Hostel winter blankets', description: 'Sample campaign: blankets for students in need.', goalAmount: 50000, raisedAmount: 50000, status: 'closed' },
];

module.exports = async function seed() {
  await Campaign.deleteMany({ sample: true });
  await Campaign.insertMany(SAMPLE_CAMPAIGNS.map((c) => ({ ...c, sample: true })));
  console.log(`[seed] admin: ${SAMPLE_CAMPAIGNS.length} sample campaigns`);
};
