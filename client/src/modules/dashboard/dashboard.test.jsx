import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import http from '@core/api/http.js';
import { AuthProvider } from '../auth/useAuth.js';
import Dashboard from './pages/Dashboard.jsx';
import Notifications from './pages/Notifications.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import GlobalSearchBar from './components/GlobalSearchBar.jsx';
import { timeAgo } from './timeAgo.js';

const USER = { id: '1', name: 'Ahmed Khan', role: 'student', verified: true };
const N1 = { id: 'n1', title: 'Seat accepted', body: 'Driver accepted', link: '/rides/9', read: false, createdAt: new Date().toISOString() };
const N2 = { id: 'n2', title: 'Old news', body: '', link: '', read: true, createdAt: new Date().toISOString() };

function renderApp(ui, path = '/') {
  return render(
    <AuthProvider initialUser={USER}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/rides/9" element={<p>RIDE NINE</p>} />
          <Route path="/search" element={<p>SEARCH PAGE</p>} />
          <Route path="/notifications" element={<p>ALL NOTIFICATIONS</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockResolvedValue({ data: { items: [N1, N2], total: 2, unread: 1, page: 1, limit: 20 } });
  http.post.mockResolvedValue({ data: {} });
});

describe('Dashboard', () => {
  test('greets by first name, shows 4 stats, 6 quick-access cards, and labels sample data', async () => {
    renderApp(<Dashboard />);
    await waitFor(() => expect(screen.getAllByText('Sample data').length).toBeGreaterThanOrEqual(4)); // widgets settle to labelled samples
    expect(screen.getByRole('heading', { name: 'Welcome back, Ahmed' })).toBeInTheDocument();
    for (const label of ['Active Rides', 'Marketplace Listings', 'Saved Reviews', 'Upcoming Events']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    const quick = within(screen.getByRole('region', { name: 'Quick access' }));
    expect(quick.getAllByRole('link')).toHaveLength(6);
    expect(screen.getAllByText('Sample data').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recommended opportunities' })).toBeInTheDocument();
  });
});

describe('NotificationBell', () => {
  test('shows the unread badge and lists items when opened', async () => {
    renderApp(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await userEvent.click(bell);
    expect(await screen.findByText('Seat accepted')).toBeInTheDocument();
  });

  test('clicking a notification marks it read and follows its deep link', async () => {
    renderApp(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await userEvent.click(await screen.findByText('Seat accepted'));
    expect(await screen.findByText('RIDE NINE')).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/dashboard/notifications/n1/read');
  });

  test('mark all read clears the badge', async () => {
    renderApp(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all read' }));
    expect(http.post).toHaveBeenCalledWith('/dashboard/notifications/read-all');
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  test('a failed load shows an error in the panel, not a crash', async () => {
    http.get.mockRejectedValue({ status: 500, message: 'x' });
    renderApp(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('Could not load notifications.')).toBeInTheDocument();
  });
});

describe('GlobalSearchBar', () => {
  test('submits to /search?q=', async () => {
    renderApp(<GlobalSearchBar />);
    await userEvent.type(screen.getByRole('searchbox'), 'ride{Enter}');
    expect(await screen.findByText('SEARCH PAGE')).toBeInTheDocument();
  });
});

describe('Notifications page', () => {
  test('lists notifications, filters to unread, and handles empty and error states', async () => {
    renderApp(<Notifications />);
    expect(await screen.findByText('Seat accepted')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Unread/ }));
    await waitFor(() => expect(http.get).toHaveBeenLastCalledWith('/dashboard/notifications', { params: { filter: 'unread', page: 1, limit: 20 } }));

    http.get.mockResolvedValue({ data: { items: [], total: 0, unread: 0 } });
    await userEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();

    http.get.mockRejectedValue({ status: 500, message: 'x' });
    await userEvent.click(screen.getByRole('tab', { name: 'Unread' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load notifications.');
  });
});

describe('timeAgo', () => {
  test('formats relative times', () => {
    const now = Date.UTC(2026, 10, 24, 12);
    expect(timeAgo(now - 5000, now)).toBe('just now');
    expect(timeAgo(now - 5 * 60000, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 3600000, now)).toBe('3 h ago');
    expect(timeAgo(now - 2 * 86400000, now)).toBe('2 d ago');
    expect(timeAgo('garbage', now)).toBe('');
  });
});
