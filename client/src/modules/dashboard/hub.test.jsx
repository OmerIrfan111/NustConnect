import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import http from '@core/api/http.js';
import { AuthProvider } from '../auth/useAuth.js';
import Dashboard, { mergeStats } from './pages/Dashboard.jsx';
import Search from './pages/Search.jsx';

const USER = { id: '1', name: 'Ahmed Khan', role: 'student', verified: true };

function renderAt(path, ui) {
  return render(
    <AuthProvider initialUser={USER}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={ui} />
          <Route path="/search" element={ui} />
          <Route path="/rides/1" element={<p>RIDE ONE</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('mergeStats', () => {
  test('live values replace sample ones case-insensitively; the rest stay labelled sample', () => {
    const merged = mergeStats([{ module: 'rideshare', label: 'active rides', value: 9 }]);
    const rides = merged.find((s) => s.label === 'Active Rides');
    expect(rides).toMatchObject({ value: 9, sample: false });
    expect(merged.filter((s) => s.sample)).toHaveLength(3);
    expect(merged).toHaveLength(4);
  });

  test('no live data at all means four sample stats', () => {
    expect(mergeStats().every((s) => s.sample)).toBe(true);
  });
});

describe('Dashboard with summaries', () => {
  test('shows live stats and recent activity from the providers, without the sample label on live parts', async () => {
    http.get.mockResolvedValue({
      data: {
        stats: [{ module: 'rideshare', label: 'Active Rides', value: 7 }],
        recent: [{ module: 'rideshare', text: 'Seat accepted for Murree', url: '/rides/1', at: new Date().toISOString() }],
        skipped: [],
      },
    });
    renderAt('/dashboard', <Dashboard />);
    expect(await screen.findByText('Seat accepted for Murree')).toBeInTheDocument();
    const stat = screen.getByText('Active Rides').closest('a');
    expect(within(stat).getByText('7')).toBeInTheDocument();
    expect(within(stat).queryByText('Sample data')).not.toBeInTheDocument();
    // the other three stats and the opportunities widget are still sample data
    expect(screen.getAllByText('Sample data')).toHaveLength(4);
  });

  test('falls back to sample widgets when the summary fails', async () => {
    http.get.mockRejectedValue({ status: 500, message: 'x' });
    renderAt('/dashboard', <Dashboard />);
    expect(await screen.findByRole('heading', { name: 'Welcome back, Ahmed' })).toBeInTheDocument();
    expect(screen.getAllByText('Sample data').length).toBeGreaterThanOrEqual(6);
  });
});

describe('Search page', () => {
  const RESULT = {
    q: 'arduino',
    total: 3,
    types: ['item', 'ride'],
    skipped: ['reviews'],
    groups: [
      { module: 'marketplace', results: [{ id: '9', title: 'Arduino kit', snippet: 'Mega 2560', type: 'item', url: '/marketplace/9' }] },
      { module: 'rideshare', results: [{ id: '1', title: 'Ride to Arduino lab', snippet: '', type: 'ride', url: '/rides/1' }] },
    ],
  };

  test('shows results grouped by module with links, and notes modules that were skipped', async () => {
    http.get.mockResolvedValue({ data: RESULT });
    renderAt('/search?q=arduino', <Search />);
    expect(await screen.findByRole('heading', { name: 'Marketplace 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'RideShare 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ride to Arduino lab/ })).toHaveAttribute('href', '/rides/1');
    expect(screen.getByText(/could not be loaded: Review Hub/)).toBeInTheDocument();
    expect(http.get).toHaveBeenCalledWith('/dashboard/search', { params: { q: 'arduino' } });
  });

  test('picking a type chip re-queries with that type', async () => {
    http.get.mockResolvedValue({ data: RESULT });
    renderAt('/search?q=arduino', <Search />);
    await userEvent.click(await screen.findByRole('button', { name: 'ride' }));
    expect(http.get).toHaveBeenLastCalledWith('/dashboard/search', { params: { q: 'arduino', type: 'ride' } });
  });

  test('empty, short-query and error states', async () => {
    renderAt('/search?q=a', <Search />);
    expect(screen.getByText(/at least 2 characters/)).toBeInTheDocument();
    expect(http.get).not.toHaveBeenCalled();
  });

  test('no results shows an empty state', async () => {
    http.get.mockResolvedValue({ data: { q: 'zzz', total: 0, types: [], groups: [], skipped: [] } });
    renderAt('/search?q=zzz', <Search />);
    expect(await screen.findByText(/No results for/)).toBeInTheDocument();
  });

  test('an error shows a retry that works', async () => {
    http.get.mockRejectedValueOnce({ status: 500, message: 'Search is down' });
    renderAt('/search?q=wallet', <Search />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Search is down');
    http.get.mockResolvedValue({ data: { q: 'wallet', total: 0, types: [], groups: [], skipped: [] } });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/No results for/)).toBeInTheDocument();
  });
});
