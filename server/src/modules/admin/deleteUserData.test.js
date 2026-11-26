process.env.NODE_ENV = 'test';

jest.mock('./models/Report', () => {
  const calls = [];
  return { __calls: calls, REASONS: ['spam', 'other'], updateMany: async (q, patch) => calls.push([q, patch]) };
});

const manifest = require('./index');
const Report = require('./models/Report');

beforeEach(() => (Report.__calls.length = 0));

describe('delete my data (called by the auth module through the registry)', () => {
  test('anonymises the reporter on that user reports, keeping the reports for moderation', async () => {
    await manifest.deleteUserData('u1');
    expect(Report.__calls).toEqual([[{ reporterId: 'u1' }, { reporterId: 'deleted-user' }]]);
  });

  test('never runs an unfiltered update when no user id is given', async () => {
    await manifest.deleteUserData('');
    await manifest.deleteUserData(undefined);
    expect(Report.__calls).toEqual([]);
  });
});
