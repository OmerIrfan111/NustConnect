import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./leaveApp.js', () => ({ leaveApp: vi.fn() }));
import http from '@core/api/http.js';
import { leaveApp } from './leaveApp.js';
import { AuthProvider } from './useAuth.js';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import AlumniRequests from './pages/AlumniRequests.jsx';

const BASE = {
  id: '1', name: 'Ahmed Khan', email: 'a@students.nust.edu.pk', role: 'student', verified: true, department: 'SEECS', batch: '2023',
  avatarUrl: '', phone: '', alumniStatus: 'none',
  settings: { profileVisibility: 'verified', contactPreference: 'in-app', emailNotifications: true },
};

function renderAt(path, user) {
  return render(
    <AuthProvider initialUser={user}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/alumni" element={<AlumniRequests />} />
          <Route path="/" element={<p>HOME</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('alumni verification section', () => {
  test('a student can request alumni status, with the year validated first', async () => {
    http.post.mockResolvedValue({ data: { user: { ...BASE, alumniStatus: 'pending' } } });
    renderAt('/settings', BASE);
    await userEvent.click(screen.getByRole('button', { name: 'Request alumni status' }));
    expect(screen.getByText(/Enter your graduation year/)).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Graduation year'), String(new Date().getFullYear() - 1));
    await userEvent.click(screen.getByRole('button', { name: 'Request alumni status' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/auth/alumni-request', { gradYear: String(new Date().getFullYear() - 1), note: '' }));
    expect(await screen.findByText(/waiting for an administrator/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request alumni status' })).not.toBeInTheDocument();
  });

  test('shows the status for pending / approved / rejected, and a new request is possible after a rejection', () => {
    const { unmount } = renderAt('/settings', { ...BASE, alumniStatus: 'pending' });
    expect(screen.getByText(/waiting for an administrator/)).toBeInTheDocument();
    unmount();
    const second = renderAt('/settings', { ...BASE, role: 'alumni', alumniStatus: 'approved' });
    expect(screen.getByText('You are verified as alumni.')).toBeInTheDocument();
    second.unmount();
    renderAt('/settings', { ...BASE, alumniStatus: 'rejected' });
    expect(screen.getByText(/was not approved/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request alumni status' })).toBeInTheDocument();
  });

  test('moderators and admins do not see the section', () => {
    renderAt('/settings', { ...BASE, role: 'moderator' });
    expect(screen.queryByText('Alumni verification')).not.toBeInTheDocument();
  });
});

describe('delete my data', () => {
  test('is hidden behind a button, needs the password and an explicit confirmation, then reloads the home page', async () => {
    http.delete.mockResolvedValue({ data: { deleted: true } });
    renderAt('/settings', BASE);
    expect(screen.queryByLabelText('Confirm with your password')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));

    await userEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your password');
    await userEvent.type(screen.getByLabelText('Confirm with your password'), 'Passw0rdOK');
    await userEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Tick the box');
    expect(http.delete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('checkbox', { name: /I understand/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/auth/me', { data: { password: 'Passw0rdOK' } }));
    await waitFor(() => expect(leaveApp).toHaveBeenCalledTimes(1));
  });

  test('a wrong password shows the server message and keeps the account', async () => {
    http.delete.mockRejectedValue({ status: 403, message: 'Incorrect password', details: { password: 'Incorrect password' } });
    renderAt('/settings', BASE);
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));
    await userEvent.type(screen.getByLabelText('Confirm with your password'), 'nope');
    await userEvent.click(screen.getByRole('checkbox', { name: /I understand/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password');
    expect(leaveApp).not.toHaveBeenCalled();
  });

  test('cancel closes the form again', async () => {
    renderAt('/settings', BASE);
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Delete my account…' })).toBeInTheDocument();
  });
});

describe('login lockout message', () => {
  test('the lock message from the server is shown to the user', async () => {
    http.post.mockRejectedValue({ status: 429, message: 'Too many failed attempts. Try again in 15 minutes.' });
    renderAt('/login', null);
    await userEvent.type(screen.getByLabelText('NUST Email'), 'a@students.nust.edu.pk');
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rdOK');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 15 minutes');
  });
});

describe('admin: alumni requests', () => {
  const ITEM = { id: 'u9', name: 'Bilal Raza', department: 'SMME', batch: '2019', gradYear: '2023', note: 'BE Mechanical', status: 'pending' };

  test('lists pending requests without contact details and approves one', async () => {
    http.get.mockResolvedValueOnce({ data: { items: [ITEM] } }).mockResolvedValue({ data: { items: [] } });
    http.post.mockResolvedValue({ data: {} });
    renderAt('/admin/alumni', { ...BASE, role: 'admin' });
    expect(await screen.findByText('Bilal Raza')).toBeInTheDocument();
    expect(screen.getByText(/SMME · Batch 2019 · Graduated 2023/)).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/auth/alumni-requests/u9/approve'));
    expect(await screen.findByText('No pending requests.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Bilal Raza: approved.');
  });

  test('reject, error and retry', async () => {
    http.get.mockRejectedValueOnce({ status: 500, message: 'Server down' }).mockResolvedValue({ data: { items: [ITEM] } });
    renderAt('/admin/alumni', { ...BASE, role: 'admin' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    http.post.mockResolvedValue({ data: {} });
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/auth/alumni-requests/u9/reject'));
  });
});
