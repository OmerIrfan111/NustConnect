import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import http from '@core/api/http.js';
import { AuthProvider } from '../auth/useAuth.js';
import Dashboard from './pages/Dashboard.jsx';
import NotificationBell from './components/NotificationBell.jsx';

const USER = { id: '1', name: 'Ahmed Khan', role: 'student', verified: true };

function renderApp(ui) {
  return render(
    <AuthProvider initialUser={USER}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/opportunities/1" element={<p>OPPORTUNITY ONE</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

/** Routes GET responses by URL (and lets a test change them later). */
let gets = {};
const reply = (url, value) => (gets[url] = value);
beforeEach(() => {
  vi.clearAllMocks();
  gets = {};
  http.get.mockImplementation((url) => {
    const v = gets[url];
    if (v === undefined) return Promise.resolve({ data: { items: [], total: 0, unread: 0 } });
    return v.status ? Promise.reject(v) : Promise.resolve(v);
  });
  http.post.mockResolvedValue({ data: {} });
});
afterEach(() => vi.useRealTimers());

describe('recommended opportunities widget', () => {
  test('shows real opportunities from the reviews provider, unlabelled, with working links', async () => {
    reply('/dashboard/recommended', { data: { items: [{ id: '1', title: 'Software Intern', snippet: 'Systems Ltd', url: '/opportunities/1' }] } });
    renderApp(<Dashboard />);
    const link = await screen.findByRole('link', { name: /Software Intern/ });
    expect(link).toHaveAttribute('href', '/opportunities/1');
    const section = screen.getByRole('heading', { name: 'Recommended opportunities' }).closest('section');
    expect(within(section).queryByText('Sample data')).not.toBeInTheDocument();
  });

  test('empty or failed responses fall back to labelled sample opportunities', async () => {
    reply('/dashboard/recommended', { status: 500, message: 'down' });
    renderApp(<Dashboard />);
    const section = screen.getByRole('heading', { name: 'Recommended opportunities' }).closest('section');
    await waitFor(() => expect(within(section).getByText('Sample data')).toBeInTheDocument());
    expect(within(section).getAllByRole('link').length).toBeGreaterThan(0);
  });

  test('widgets show a busy placeholder while loading, then settle', async () => {
    let release;
    http.get.mockImplementation(() => new Promise((r) => (release = r)));
    renderApp(<Dashboard />);
    const section = screen.getByRole('heading', { name: 'Recommended opportunities' }).closest('section');
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByLabelText('Loading').length).toBe(4); // one per stat card
    await act(async () => release({ data: {} }));
    await waitFor(() => expect(section).toHaveAttribute('aria-busy', 'false'));
  });

  test('live stats and recent activity are unlabelled; the rest stay labelled', async () => {
    reply('/dashboard/summary', {
      data: { stats: [{ module: 'rideshare', label: 'Active Rides', value: 4 }], recent: [{ module: 'rideshare', text: 'Seat accepted', url: '/rides/1', at: new Date().toISOString() }] },
    });
    renderApp(<Dashboard />);
    expect(await screen.findByText('Seat accepted')).toBeInTheDocument();
    const stat = screen.getByText('Active Rides').closest('a');
    expect(within(stat).getByText('4')).toBeInTheDocument();
    const recent = screen.getByRole('heading', { name: 'Recent activity' }).closest('section');
    expect(within(recent).queryByText('Sample data')).not.toBeInTheDocument();
  });
});

describe('notification bell polling', () => {
  test('refreshes the unread count on an interval and announces new notifications', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    reply('/dashboard/notifications', { data: { items: [], total: 0, unread: 0 } });
    reply('/dashboard/notifications/unread-count', { data: { unread: 0 } });
    renderApp(<NotificationBell pollMs={1000} />);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();

    reply('/dashboard/notifications/unread-count', { data: { unread: 2 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(await screen.findByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 new notifications');

    reply('/dashboard/notifications/unread-count', { data: { unread: 3 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(screen.getByRole('status')).toHaveTextContent('1 new notification');
  });

  test('a failed poll is silent and the next one recovers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    reply('/dashboard/notifications', { data: { items: [], total: 0, unread: 0 } });
    reply('/dashboard/notifications/unread-count', { status: 500, message: 'x' });
    renderApp(<NotificationBell pollMs={1000} />);
    await screen.findByRole('button', { name: 'Notifications' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    reply('/dashboard/notifications/unread-count', { data: { unread: 1 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(await screen.findByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });

  test('polling is paused while the tab is hidden', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    reply('/dashboard/notifications', { data: { items: [], total: 0, unread: 0 } });
    reply('/dashboard/notifications/unread-count', { data: { unread: 5 } });
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    renderApp(<NotificationBell pollMs={1000} />);
    await screen.findByRole('button', { name: 'Notifications' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(http.get).not.toHaveBeenCalledWith('/dashboard/notifications/unread-count');

    hidden.mockReturnValue('visible'); // coming back to the tab refreshes straight away
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByRole('button', { name: 'Notifications, 5 unread' })).toBeInTheDocument();
    hidden.mockRestore();
  });
});

describe('bell keyboard accessibility', () => {
  test('Escape closes the panel and returns focus to the bell', async () => {
    reply('/dashboard/notifications', { data: { items: [], total: 0, unread: 0 } });
    renderApp(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notifications' });
    await userEvent.click(bell);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
    expect(bell).toHaveAttribute('aria-expanded', 'false');
  });
});
