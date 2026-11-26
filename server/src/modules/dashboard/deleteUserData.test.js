process.env.NODE_ENV = 'test';

jest.mock('./models/Notification', () => {
  const calls = [];
  return { __calls: calls, deleteMany: async (q) => (calls.push(q), { deletedCount: 2 }) };
});

const manifest = require('./index');
const Notification = require('./models/Notification');

beforeEach(() => (Notification.__calls.length = 0));

describe('delete my data (called by the auth module through the registry)', () => {
  test('removes every notification of that user', async () => {
    await manifest.deleteUserData('u1');
    expect(Notification.__calls).toEqual([{ userId: 'u1' }]);
  });

  test('never runs an unfiltered delete when no user id is given', async () => {
    await manifest.deleteUserData('');
    await manifest.deleteUserData(undefined);
    expect(Notification.__calls).toEqual([]);
  });
});
