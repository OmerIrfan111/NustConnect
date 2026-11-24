/** Seed data for admin (A3). Run: npm run seed -- admin. Replaces only rows flagged `sample`. */
const Campaign = require('./models/Campaign');
const Contribution = require('./models/Contribution');

const SAMPLE = [
  { title: 'Flood relief fund', description: 'Sample campaign: supplies for flood-affected families.', goalAmount: 200000, pledges: [] },
  { title: 'Library book drive', description: 'Sample campaign: new textbooks for the central library.', goalAmount: 100000, pledges: [30000, 20000] },
  { title: 'Hostel winter blankets', description: 'Sample campaign: blankets for students in need.', goalAmount: 50000, status: 'closed', pledges: [25000, 25000] },
];

module.exports = async function seed() {
  const old = await Campaign.find({ sample: true }).lean();
  await Contribution.deleteMany({ sample: true });
  await Campaign.deleteMany({ sample: true });

  for (const { pledges, ...fields } of SAMPLE) {
    const campaign = await Campaign.create({ ...fields, sample: true });
    if (pledges.length) {
      await Contribution.insertMany(pledges.map((amount) => ({ campaignId: String(campaign._id), amount, anonymous: true, sample: true })));
      campaign.raisedAmount = pledges.reduce((a, b) => a + b, 0);
      await campaign.save();
    }
  }
  console.log(`[seed] admin: ${SAMPLE.length} sample campaigns (replaced ${old.length}), totals = sum of contributions`);
};
