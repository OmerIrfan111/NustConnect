import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
import http from '@core/api/http.js';
import { AuthProvider, useAuth } from './useAuth.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Verify from './pages/Verify.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

const USER = { id: '1', name: 'Ahmed Khan', role: 'student', verified: true };
const PENDING = { ...USER, verified: false, email: 'a@students.nust.edu.pk' };
const FULL = {
  ...USER,
  email: 'a@students.nust.edu.pk',
  department: 'SEECS',
  batch: '2023',
  avatarUrl: '',
  phone: '',
  settings: { profileVisibility: 'verified', contactPreference: 'in-app', emailNotifications: true },
};

function renderAt(path, initialUser) {
  return render(
    <AuthProvider initialUser={initialUser}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dashboard" element={<p>DASHBOARD</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('verification gating (QA-2)', () => {
  function Probe() {
    const { user, isAuthenticated, pendingUser } = useAuth();
    return <p>{`auth=${isAuthenticated} user=${user ? user.name : 'none'} pending=${pendingUser ? pendingUser.name : 'none'}`}</p>;
  }

  test('an unverified account is not signed in and is exposed as pendingUser', () => {
    render(
      <AuthProvider initialUser={PENDING}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText('auth=false user=none pending=Ahmed Khan')).toBeInTheDocument();
  });

  test('a verified account is signed in', () => {
    render(
      <AuthProvider initialUser={USER}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText('auth=true user=Ahmed Khan pending=none')).toBeInTheDocument();
  });

  test('the login page sends an unverified account to /verify', () => {
    renderAt('/login', PENDING);
    expect(screen.getByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
  });

  test('registering a new (unverified) account lands on /verify, not the dashboard', async () => {
    http.post.mockResolvedValue({ data: { user: PENDING } });
    renderAt('/register', null);
    await userEvent.type(screen.getByLabelText('Full Name'), 'Ahmed Khan');
    await userEvent.type(screen.getByLabelText('NUST Email Address'), 'ahmed@students.nust.edu.pk');
    await userEvent.selectOptions(screen.getByLabelText('Department / School'), 'SEECS');
    await userEvent.selectOptions(screen.getByLabelText('Batch'), String(new Date().getFullYear() - 2));
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rdOK');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'Passw0rdOK');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.queryByText('DASHBOARD')).not.toBeInTheDocument();
  });
});

describe('Verify page', () => {
  test('the emailed link verifies once and shows success', async () => {
    http.post.mockResolvedValue({ data: { verified: true } });
    http.get.mockResolvedValue({ data: { user: USER } });
    renderAt('/verify?token=abc123abc123abc123abc123', null);
    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'abc123abc123abc123abc123' });
  });

  test('an invalid or expired link shows the server message', async () => {
    http.post.mockRejectedValue({ status: 400, message: 'This verification link is invalid or has expired' });
    renderAt('/verify?token=bad', null);
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired');
  });

  test('pending users can ask for a new email', async () => {
    http.post.mockResolvedValue({ data: { sent: true } });
    renderAt('/verify', PENDING);
    await userEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByText(/new link is on its way/)).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/auth/resend-verification');
  });
});

describe('Forgot / reset password', () => {
  test('requesting a link shows a neutral message', async () => {
    http.post.mockResolvedValue({ data: { ok: true } });
    renderAt('/forgot-password', null);
    await userEvent.type(screen.getByLabelText('NUST Email'), 'a@students.nust.edu.pk');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If that email is registered');
  });

  test('an invalid email is caught before calling the server', async () => {
    renderAt('/forgot-password', null);
    await userEvent.type(screen.getByLabelText('NUST Email'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
  });

  test('with a token it validates the new password, then saves it', async () => {
    http.post.mockResolvedValue({ data: { ok: true } });
    renderAt('/forgot-password?token=tok', null);
    await userEvent.type(screen.getByLabelText('New password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('New password'));
    await userEvent.clear(screen.getByLabelText('Confirm new password'));
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassw0rd1');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPassw0rd1');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/auth/reset-password', { token: 'tok', password: 'NewPassw0rd1', confirmPassword: 'NewPassw0rd1' });
  });

  test('a used or expired reset link shows the error and a way to request a new one', async () => {
    http.post.mockRejectedValue({ status: 400, message: 'This reset link is invalid, expired or already used' });
    renderAt('/forgot-password?token=tok', null);
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassw0rd1');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPassw0rd1');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already used');
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });
});

describe('Profile and Settings', () => {
  test('profile saves changes through the API and shows the verified badge', async () => {
    http.patch.mockResolvedValue({ data: { user: { ...FULL, name: 'Ahmed R. Khan' } } });
    renderAt('/profile', FULL);
    expect(screen.getByText('Verified Student')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Full name'));
    await userEvent.type(screen.getByLabelText('Full name'), 'Ahmed R. Khan');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved.');
    expect(http.patch).toHaveBeenCalledWith('/auth/profile', expect.objectContaining({ name: 'Ahmed R. Khan', department: 'SEECS' }));
  });

  test('profile blocks an empty name without calling the server', async () => {
    renderAt('/profile', FULL);
    await userEvent.clear(screen.getByLabelText('Full name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    expect(http.patch).not.toHaveBeenCalled();
  });

  test('settings: a phone preference needs a phone number', async () => {
    renderAt('/settings', FULL);
    await userEvent.selectOptions(screen.getByLabelText('How should people reach me'), 'phone');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.getByText(/Add a phone number/)).toBeInTheDocument();
    expect(http.patch).not.toHaveBeenCalled();
  });

  test('settings save privacy and contact preferences', async () => {
    http.patch.mockResolvedValue({ data: { user: FULL } });
    renderAt('/settings', FULL);
    await userEvent.selectOptions(screen.getByLabelText('Who can see my profile'), 'private');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Settings saved.');
    expect(http.patch).toHaveBeenCalledWith('/auth/settings', expect.objectContaining({ profileVisibility: 'private', contactPreference: 'in-app' }));
  });
});
