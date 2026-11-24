import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@core/api/http.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import http from '@core/api/http.js';
import { AuthProvider, useAuth } from './useAuth.js';
import Login from './pages/Login.jsx';
import Register, { validate } from './pages/Register.jsx';
import { safeNext } from './safeNext.js';

const USER = { id: '1', name: 'Ahmed Khan', email: 'a@students.nust.edu.pk', role: 'student', verified: true };

function renderAt(path, ui, initialUser) {
  return render(
    <AuthProvider initialUser={initialUser}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<p>DASHBOARD</p>} />
          <Route path="/rides" element={<p>RIDES</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('safeNext', () => {
  test('allows same-site paths only', () => {
    expect(safeNext('/rides?x=1')).toBe('/rides?x=1');
    expect(safeNext('//evil.com')).toBe('/dashboard');
    expect(safeNext('https://evil.com')).toBe('/dashboard');
    expect(safeNext('/\\evil.com')).toBe('/dashboard');
    expect(safeNext(null)).toBe('/dashboard');
  });
});

describe('Login', () => {
  test('shows validation errors without calling the server', async () => {
    renderAt('/login', null, null);
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
  });

  test('signs in and goes to the ?next target', async () => {
    http.post.mockResolvedValue({ data: { user: USER } });
    renderAt('/login?next=/rides', null, null);
    await userEvent.type(screen.getByLabelText('NUST Email'), 'a@students.nust.edu.pk');
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rdOK');
    await userEvent.click(screen.getByLabelText('Remember Me'));
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText('RIDES')).toBeInTheDocument();
    expect(http.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@students.nust.edu.pk', password: 'Passw0rdOK', remember: true,
    });
  });

  test('a wrong password shows the server message', async () => {
    http.post.mockRejectedValue({ status: 401, message: 'Incorrect email or password' });
    renderAt('/login', null, null);
    await userEvent.type(screen.getByLabelText('NUST Email'), 'a@students.nust.edu.pk');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
  });

  test('a signed-in user is sent past the login page', () => {
    renderAt('/login', null, USER);
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });
});

describe('Register', () => {
  test('validate() catches every field, including non-NUST email', () => {
    const errs = validate({
      name: '', email: 'a@gmail.com', department: '', batch: '23', password: 'abc', confirmPassword: 'x', acceptTerms: false,
    });
    expect(Object.keys(errs).sort()).toEqual(
      ['acceptTerms', 'batch', 'confirmPassword', 'department', 'email', 'name', 'password'],
    );
  });

  test('submits a valid form and lands on the dashboard', async () => {
    http.post.mockResolvedValue({ data: { user: USER } });
    renderAt('/register', null, null);
    await userEvent.type(screen.getByLabelText('Full Name'), 'Ahmed Khan');
    await userEvent.type(screen.getByLabelText('NUST Email Address'), 'ahmed@students.nust.edu.pk');
    await userEvent.selectOptions(screen.getByLabelText('Department / School'), 'SEECS');
    await userEvent.selectOptions(screen.getByLabelText('Batch'), String(new Date().getFullYear() - 2));
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rdOK');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'Passw0rdOK');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
    expect(http.post.mock.calls[0][0]).toBe('/auth/register');
  });

  test('server field errors (duplicate email) appear on the field', async () => {
    http.post.mockRejectedValue({ status: 409, message: 'exists', details: { email: 'Email already registered' } });
    renderAt('/register', null, null);
    await userEvent.type(screen.getByLabelText('Full Name'), 'Ahmed Khan');
    await userEvent.type(screen.getByLabelText('NUST Email Address'), 'ahmed@students.nust.edu.pk');
    await userEvent.selectOptions(screen.getByLabelText('Department / School'), 'SEECS');
    await userEvent.selectOptions(screen.getByLabelText('Batch'), String(new Date().getFullYear() - 2));
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rdOK');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'Passw0rdOK');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
  });
});

describe('AuthProvider session check', () => {
  function Who() {
    const { user, isAuthenticated } = useAuth();
    return <p>{isAuthenticated ? user.name : 'guest'}</p>;
  }

  test('a refresh restores the session from /auth/me before rendering children', async () => {
    http.get.mockResolvedValue({ data: { user: USER } });
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    );
    expect(screen.queryByText('guest')).not.toBeInTheDocument(); // not shown while checking
    expect(await screen.findByText('Ahmed Khan')).toBeInTheDocument();
  });

  test('401 from /auth/me means guest', async () => {
    http.get.mockRejectedValue({ status: 401, message: 'Authentication required' });
    render(
      <AuthProvider>
        <Who />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());
  });
});
