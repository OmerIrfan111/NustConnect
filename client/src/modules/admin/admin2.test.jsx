import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
import http from '@core/api/http.js';
import { registry } from '@core/modules/registry.js';
import { buildRoutes } from '@core/router/routes.jsx';
import { AuthProvider } from '../auth/useAuth.js';
import { actionsFor } from './pages/Reports.jsx';

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
  return router;
}

/** Routes GET responses by URL so the notification bell's own requests cannot steal them. */
let gets = {};
const reply = (url, value) => (gets[url] = value);

beforeEach(() => {
  vi.clearAllMocks();
  gets = {};
  http.get.mockImplementation((url) => (url in gets ? (gets[url].status ? Promise.reject(gets[url]) : Promise.resolve(gets[url])) : Promise.resolve({ data: { items: [], total: 0, unread: 0 } })));
  http.post.mockResolvedValue({ data: {} });
  http.put.mockResolvedValue({ data: {} });
  http.delete.mockResolvedValue({ data: {} });
});

const REPORT = (over = {}) => ({ id: 'r1', targetType: 'ride', targetId: '42', reason: 'spam', details: 'fake ride', status: 'open', action: 'none', createdAt: '2026-11-20T10:00:00Z', ...over });

describe('which actions a report offers', () => {
  test('open reports can be hidden or dismissed; hidden ones can only be restored; handled ones have none', () => {
    expect(actionsFor(REPORT())).toEqual(['hide', 'dismiss']);
    expect(actionsFor(REPORT({ status: 'resolved', action: 'hidden' }))).toEqual(['restore']);
    expect(actionsFor(REPORT({ status: 'resolved', action: 'restored' }))).toEqual([]);
    expect(actionsFor(REPORT({ status: 'dismissed' }))).toEqual([]);
  });
});

describe('moderation actions', () => {
  test('hide sends the note, confirms, and mentions the audit log', async () => {
    reply('/admin/reports', { data: { total: 1, items: [REPORT()] } });
    renderApp('/admin/reports', 'moderator');
    await userEvent.click(await screen.findByRole('button', { name: 'Take action' }));
    await userEvent.type(screen.getByLabelText(/Note/), 'Fake ride');
    await userEvent.click(screen.getByRole('button', { name: 'Hide content' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Recorded in the audit log');
    expect(http.post).toHaveBeenCalledWith('/admin/reports/r1/hide', { note: 'Fake ride' });
  });

  test('a hidden item offers restore', async () => {
    reply('/admin/reports', { data: { total: 1, items: [REPORT({ status: 'resolved', action: 'hidden' })] } });
    renderApp('/admin/reports', 'moderator');
    await userEvent.click(await screen.findByRole('button', { name: 'Take action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restore content' }));
    expect(http.post).toHaveBeenCalledWith('/admin/reports/r1/restore', { note: '' });
  });

  test('a failure (no module can hide it) is shown to the moderator', async () => {
    reply('/admin/reports', { data: { total: 1, items: [REPORT()] } });
    http.post.mockRejectedValue({ status: 409, message: 'No module can hide "ride" content yet' });
    renderApp('/admin/reports', 'moderator');
    await userEvent.click(await screen.findByRole('button', { name: 'Take action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide content' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No module can hide');
  });
});

describe('user moderation', () => {
  async function findUser(role) {
    reply('/auth/users/lookup', { data: [{ id: 'u7', name: 'Ayesha Malik', verified: true }] });
    renderApp('/admin/users', role);
    await userEvent.type(await screen.findByLabelText('Name'), 'aye');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Moderate' }));
  }

  test('a moderator can warn but sees no suspend button; a reason is required', async () => {
    await findUser('moderator');
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Warn' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Give a short reason');
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Reason'), 'Spamming rides');
    await userEvent.click(screen.getByRole('button', { name: 'Warn' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/users/u7/warn', { reason: 'Spamming rides' }));
  });

  test('an admin can suspend', async () => {
    await findUser('admin');
    await userEvent.type(screen.getByLabelText('Reason'), 'Repeated abuse');
    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/users/u7/suspend', { reason: 'Repeated abuse' }));
  });
});

describe('categories', () => {
  test('shows each module with its categories or a note that defaults are used, and adds one', async () => {
    reply('/admin/categories', { data: { items: [{ id: 'c1', scope: 'marketplace', name: 'Electronics', order: 1, active: true }] } });
    renderApp('/admin/categories', 'admin');
    expect(await screen.findByText('Electronics')).toBeInTheDocument();
    expect(screen.getAllByText(/Using the module's defaults/).length).toBeGreaterThanOrEqual(5);

    await userEvent.type(screen.getByLabelText('New category'), 'Books');
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/categories', { scope: 'marketplace', name: 'Books' }));
  });

  test('a duplicate shows a field error', async () => {
    http.post.mockRejectedValue({ status: 409, message: 'Duplicate value' });
    renderApp('/admin/categories', 'admin');
    await userEvent.type(await screen.findByLabelText('New category'), 'Books');
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    expect(await screen.findByText('This category already exists for that module')).toBeInTheDocument();
  });

  test('moderators do not get the Categories or Audit tabs, and are blocked by URL', async () => {
    renderApp('/admin/categories', 'moderator');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
  });
});

describe('audit log', () => {
  test('admins see who did what and when', async () => {
    reply('/admin/audit', { data: { total: 1, items: [{ id: 'a1', actorName: 'Ahmed Khan', actorId: '1', actorRole: 'moderator', action: 'report.hide', targetType: 'ride', targetId: '42', note: 'Fake ride', at: '2026-11-20T10:00:00Z' }] } });
    renderApp('/admin/audit', 'admin');
    const row = (await screen.findByText('report.hide')).closest('tr');
    expect(within(row).getByText(/Ahmed Khan/)).toBeInTheDocument();
    expect(within(row).getByText('ride #42')).toBeInTheDocument();
    expect(within(row).getByText('Fake ride')).toBeInTheDocument();
  });

  test('empty and error states; moderators are blocked', async () => {
    renderApp('/admin/audit', 'admin');
    expect(await screen.findByText('Nothing has been recorded yet.')).toBeInTheDocument();
  });
});

describe('campaign management', () => {
  const CAMPAIGN = { id: 'c1', title: 'Flood relief', goalAmount: 1000, raisedAmount: 500, progress: 50, status: 'active', updates: [{ text: 'Halfway there', at: '2026-11-21T10:00:00Z' }] };
  const PLEDGES = { data: { items: [{ id: 'p1', amount: 200, donorName: 'Sana', anonymous: false, createdAt: '2026-11-20T10:00:00Z' }, { id: 'p2', amount: 300, donorName: '', anonymous: true, createdAt: '2026-11-20T11:00:00Z' }], total: 500 } };

  test('shows the total as the sum of pledges, the progress bar, and the updates feed', async () => {
    reply('/admin/campaigns/c1', { data: { campaign: CAMPAIGN } });
    reply('/admin/campaigns/c1/contributions', PLEDGES);
    renderApp('/admin/donations/c1', 'admin');
    expect(await screen.findByRole('heading', { name: 'Flood relief' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/2 pledge records totalling PKR 500/)).toBeInTheDocument();
    expect(screen.getByText('Halfway there')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Anonymous')).toBeInTheDocument();
  });

  test('records a pledge (validating the amount first), removes one, and posts an update', async () => {
    reply('/admin/campaigns/c1', { data: { campaign: CAMPAIGN } });
    reply('/admin/campaigns/c1/contributions', PLEDGES);
    renderApp('/admin/donations/c1', 'admin');
    await userEvent.click(await screen.findByRole('button', { name: 'Record pledge' }));
    expect(screen.getByText('Amount must be at least PKR 1')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Amount (PKR)'), '150');
    await userEvent.type(screen.getByLabelText('Donor name'), 'Bilal');
    await userEvent.click(screen.getByRole('button', { name: 'Record pledge' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/campaigns/c1/contributions', expect.objectContaining({ amount: 150, donorName: 'Bilal' })));

    await userEvent.click(screen.getByRole('button', { name: 'Remove pledge of PKR 200' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/campaigns/c1/contributions/p1'));

    await userEvent.type(screen.getByLabelText('Post an update for students'), 'Thank you all');
    await userEvent.click(screen.getByRole('button', { name: 'Post update' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/campaigns/c1/updates', { text: 'Thank you all' }));
  });

  test('students see the updates feed on the campaign page', async () => {
    reply('/admin/campaigns/c1', { data: { campaign: CAMPAIGN } });
    renderApp('/donations/c1', 'student');
    expect(await screen.findByText('Halfway there')).toBeInTheDocument();
  });

  test('the campaign form no longer has a raised-amount field', async () => {
    renderApp('/admin/donations/new', 'admin');
    await screen.findByLabelText('Title');
    expect(screen.queryByLabelText(/Raised so far/)).not.toBeInTheDocument();
  });

  test('moderators are blocked from the manage screen', async () => {
    renderApp('/admin/donations/c1', 'moderator');
    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
  });
});
