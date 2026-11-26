import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import http from '@core/api/http.js';
import { registry } from '@core/modules/registry.js';
import { buildRoutes } from '@core/router/routes.jsx';
import { AuthProvider } from '../auth/useAuth.js';

// These tests render the full app shell; under a busy machine the default 1 s wait is too tight.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

const user = (role) => ({ id: '1', name: 'Ahmed Khan', role, verified: true });

function renderApp(path, role) {
  const router = createMemoryRouter(buildRoutes(registry), { initialEntries: [path] });
  render(
    <AuthProvider initialUser={user(role)}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

let gets = {};
const reply = (url, value) => (gets[url] = value);
const lastCall = (url) => [...http.get.mock.calls].reverse().find(([u]) => u === url);

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

const REPORT = { id: 'r1', targetType: 'ride', targetId: '42', reason: 'spam', details: 'fake', status: 'open', action: 'none', createdAt: '2026-11-20T10:00:00Z' };

describe('moderation queue search and filters', () => {
  test('sends the search, reason and type filters only when applied, and can clear them', async () => {
    reply('/admin/reports', { data: { total: 1, items: [REPORT] } });
    renderApp('/admin/reports', 'moderator');
    await screen.findByText('ride #42');
    expect(lastCall('/admin/reports')[1].params).toEqual({ status: 'open', page: 1, limit: 20 });

    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'fake');
    expect(lastCall('/admin/reports')[1].params).not.toHaveProperty('q'); // typing alone does not query
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'spam');
    await userEvent.selectOptions(screen.getByLabelText('Content type'), 'ride');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(lastCall('/admin/reports')[1].params).toEqual({ status: 'open', page: 1, limit: 20, q: 'fake', reason: 'spam', type: 'ride' }));

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(lastCall('/admin/reports')[1].params).toEqual({ status: 'open', page: 1, limit: 20 }));
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('');
  });

  test('an empty filtered result says so, and an applied filter resets to page 1', async () => {
    reply('/admin/reports', { data: { total: 45, items: [REPORT] } });
    renderApp('/admin/reports', 'moderator');
    await screen.findByText('ride #42');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(lastCall('/admin/reports')[1].params.page).toBe(2));

    reply('/admin/reports', { data: { total: 0, items: [] } });
    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No reports match these filters.')).toBeInTheDocument();
    expect(lastCall('/admin/reports')[1].params.page).toBe(1);
  });

  test('the queue shows nothing about who reported', async () => {
    reply('/admin/reports', { data: { total: 1, items: [REPORT] } });
    renderApp('/admin/reports', 'moderator');
    await screen.findByText('ride #42');
    expect(screen.queryByRole('columnheader', { name: /reporter/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText(/reporter/i)).not.toBeInTheDocument();
  });
});

describe('users: verified filter', () => {
  test('hides unverified users from the results when ticked', async () => {
    reply('/auth/users/lookup', { data: [{ id: 'u1', name: 'Ayesha Malik', verified: true }, { id: 'u2', name: 'Hamza Sheikh', verified: false }] });
    renderApp('/admin/users', 'moderator');
    await userEvent.type(await screen.findByLabelText('Name'), 'ha');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Hamza Sheikh')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Verified only'));
    expect(screen.queryByText('Hamza Sheikh')).not.toBeInTheDocument();
    expect(screen.getByText('Ayesha Malik')).toBeInTheDocument();
  });
});

describe('analytics page', () => {
  const DATA = {
    modules: [{ module: 'rideshare', label: 'Active Rides', value: 1234 }, { module: 'marketplace', label: 'Marketplace Listings', value: 56 }],
    skipped: ['reviews'],
    moduleCount: 9,
    platform: { reportsOpen: 3, reportsResolved: 8, reportsDismissed: 2, campaigns: 4, campaignsActive: 2, pledgedTotal: 150000, auditEntries: 20 },
  };

  test('shows platform and per-module figures, formatted, and notes modules with no figures', async () => {
    reply('/admin/analytics', { data: DATA });
    renderApp('/admin/analytics', 'admin');
    expect(await screen.findByText('1,234')).toBeInTheDocument();
    expect(screen.getByText(/RideShare · Active Rides/)).toBeInTheDocument();
    expect(screen.getByText('PKR 150,000')).toBeInTheDocument();
    expect(screen.getByText('2 of 4')).toBeInTheDocument();
    expect(screen.getByText(/Not available from: Review Hub/)).toBeInTheDocument();
    expect(screen.getByText(/No names, emails or activity of individual students/)).toBeInTheDocument();
  });

  test('empty, error and retry states', async () => {
    reply('/admin/analytics', { data: { ...DATA, modules: [], skipped: [] } });
    const first = render(<div />);
    first.unmount();
    renderApp('/admin/analytics', 'admin');
    expect(await screen.findByText('No module has reported usage figures yet.')).toBeInTheDocument();
  });

  test('an error offers retry', async () => {
    reply('/admin/analytics', { status: 500, message: 'Server down' });
    renderApp('/admin/analytics', 'admin');
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
    reply('/admin/analytics', { data: DATA });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('1,234')).toBeInTheDocument();
  });

  test('moderators and students are blocked by URL; only admins see the Analytics tab', async () => {
    renderApp('/admin/analytics', 'moderator');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
  });

  test('the admin tab bar includes Analytics for admins', async () => {
    reply('/admin/analytics', { data: DATA });
    renderApp('/admin', 'admin');
    const tabs = await screen.findByRole('navigation', { name: 'Admin sections' });
    expect(within(tabs).getByRole('link', { name: 'Analytics' })).toBeInTheDocument();
  });
});
