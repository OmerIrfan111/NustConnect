import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import http from '@core/api/http.js';
import { registry } from '@core/modules/registry.js';
import { buildRoutes } from '@core/router/routes.jsx';
import { AuthProvider } from '../auth/useAuth.js';
import { progressPercent, pkr } from './format.js';
import ProgressBar from './components/ProgressBar.jsx';

const user = (role) => ({ id: '1', name: 'Ahmed Khan', role, verified: true });

function renderApp(path, role) {
  const router = createMemoryRouter(buildRoutes(registry), { initialEntries: [path] });
  render(
    <AuthProvider initialUser={user(role)}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const CAMPAIGN = (over = {}) => ({
  id: 'c1', title: 'Flood relief', description: 'Help', goalAmount: 1000, raisedAmount: 500, progress: 50, status: 'active', sample: true, ...over,
});

/**
 * Route mocks by URL, so other modules' top-bar widgets (for example the notification bell, which also calls
 * http.get) cannot consume a response meant for the page under test.
 */
let routes = {};
const reply = (url, value) => (routes[url] = value);

beforeEach(() => {
  vi.clearAllMocks();
  routes = {};
  http.get.mockImplementation((url) => {
    if (url in routes) {
      const v = routes[url];
      return v instanceof Error || v?.status ? Promise.reject(v) : Promise.resolve(v);
    }
    return Promise.resolve({ data: { items: [], total: 0, unread: 0 } });
  });
});

describe('progress math', () => {
  test.each([
    [0, 1000, 0],
    [500, 1000, 50],
    [1000, 1000, 100],
    [2500, 1000, 100],
    [10, 0, 0],
  ])('%i of %i is %i %%', (raised, goal, pct) => {
    expect(progressPercent(raised, goal)).toBe(pct);
  });

  test('the bar exposes the percentage and sets its width', () => {
    for (const [raised, pct] of [[0, 0], [500, 50], [1000, 100]]) {
      const { unmount } = render(<ProgressBar raised={raised} goal={1000} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', String(pct));
      expect(bar.firstChild).toHaveStyle({ width: `${pct}%` });
      unmount();
    }
  });

  test('PKR formatting', () => expect(pkr(2500)).toBe('PKR 2,500'));
});

describe('role gating (QA-1)', () => {
  test('a student on /admin sees the 403 page, and no admin API call is made', async () => {
    renderApp('/admin', 'student');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
    expect(http.get).not.toHaveBeenCalledWith('/admin/reports', expect.anything());
  });

  test('a moderator gets the admin layout with moderation but without the Donations tab', async () => {
    renderApp('/admin/reports', 'moderator');
    expect(await screen.findByRole('heading', { name: 'Moderation queue' })).toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Admin sections' });
    expect(tabs).toHaveTextContent('Moderation');
    expect(tabs).toHaveTextContent('Users');
    expect(tabs).not.toHaveTextContent('Donations');
  });

  test('a moderator on the campaign form gets 403', async () => {
    renderApp('/admin/donations/new', 'moderator');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
  });

  test('an admin sees every tab', async () => {
    renderApp('/admin', 'admin');
    const tabs = await screen.findByRole('navigation', { name: 'Admin sections' });
    for (const t of ['Overview', 'Moderation', 'Users', 'Donations']) expect(tabs).toHaveTextContent(t);
  });
});

describe('moderation queue', () => {
  test('lists reports with loading, empty and error states', async () => {
    reply('/admin/reports', {
      data: { total: 1, items: [{ id: 'r1', targetType: 'ride', targetId: '42', reason: 'spam', details: 'fake', status: 'open', createdAt: '2026-11-20T10:00:00Z' }] },
    });
    renderApp('/admin/reports', 'moderator');
    expect(await screen.findByText('ride #42')).toBeInTheDocument();
    expect(screen.getByText('spam')).toBeInTheDocument();

    reply('/admin/reports', { data: { items: [], total: 0 } });
    await userEvent.click(screen.getByRole('tab', { name: 'Resolved' }));
    expect(await screen.findByText('No reports here.')).toBeInTheDocument();

    reply('/admin/reports', { status: 500, message: 'Server down' });
    await userEvent.click(screen.getByRole('tab', { name: 'Open' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
  });
});

describe('users lookup', () => {
  test('searches through the lookup contract and shows only name, verified and id', async () => {
    renderApp('/admin/users', 'moderator');
    reply('/auth/users/lookup', { data: [{ id: 'u1', name: 'Ayesha Malik', verified: true }] });
    await userEvent.type(await screen.findByLabelText('Name'), 'aye');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Ayesha Malik')).toBeInTheDocument();
    expect(http.get).toHaveBeenLastCalledWith('/auth/users/lookup', { params: { q: 'aye' } });
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  test('a one-letter search is rejected without calling the server', async () => {
    renderApp('/admin/users', 'moderator');
    await userEvent.type(await screen.findByLabelText('Name'), 'a');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 2');
    expect(http.get).not.toHaveBeenCalledWith('/auth/users/lookup', expect.anything());
  });
});

describe('donations', () => {
  test('students see campaigns with progress and a sample-data label', async () => {
    reply('/admin/campaigns', { data: { items: [CAMPAIGN()] } });
    renderApp('/donations', 'student');
    expect(await screen.findByText('Flood relief')).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('PKR 500 raised of PKR 1,000')).toBeInTheDocument();
  });

  test('empty state for students', async () => {
    renderApp('/donations', 'student');
    expect(await screen.findByText('No campaigns are running right now.')).toBeInTheDocument();
  });

  test('detail page shows 100 % when fully funded', async () => {
    reply('/admin/campaigns/c1', { data: { campaign: CAMPAIGN({ raisedAmount: 1000, progress: 100, status: 'closed' }) } });
    renderApp('/donations/c1', 'student');
    expect(await screen.findByRole('heading', { name: 'Flood relief' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  test('admin creates a campaign; invalid input is blocked in the form first', async () => {
    http.post.mockResolvedValue({ data: { campaign: CAMPAIGN() } });
    renderApp('/admin/donations/new', 'admin');
    await userEvent.click(await screen.findByRole('button', { name: 'Save campaign' }));
    expect(screen.getByText('Title must be at least 3 characters')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Title'), 'Flood relief');
    await userEvent.type(screen.getByLabelText('Goal (PKR)'), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Save campaign' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    expect(http.post.mock.calls[0][0]).toBe('/admin/campaigns');
    expect(http.post.mock.calls[0][1]).toMatchObject({ title: 'Flood relief', goalAmount: 1000, status: 'active' });
    expect(http.post.mock.calls[0][1]).not.toHaveProperty('raisedAmount');
  });
});
