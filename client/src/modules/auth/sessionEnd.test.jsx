import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
import { AuthProvider, useAuth } from './useAuth.js';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';

const USER = {
  id: '1',
  name: 'Ahmed Khan',
  email: 'a@students.nust.edu.pk',
  role: 'student',
  verified: true,
  department: 'SEECS',
  batch: '2023',
  alumniStatus: 'none',
  settings: {},
};

/**
 * The session can end while an account page is still mounted (delete my data, sign out, a password changed elsewhere).
 * The page must render nothing in that moment, not crash on `user.something`.
 */
describe.each([
  ['Settings', Settings],
  ['Profile', Profile],
])('%s when the session ends under it', (_name, Page) => {
  test('does not throw', async () => {
    let endSession;
    const Probe = () => {
      const { setUser } = useAuth();
      endSession = () => setUser(null);
      return null;
    };
    render(
      <AuthProvider initialUser={USER}>
        <MemoryRouter>
          <Probe />
          <Page />
          <p>still here</p>
        </MemoryRouter>
      </AuthProvider>,
    );
    await act(async () => endSession());
    expect(screen.getByText('still here')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
