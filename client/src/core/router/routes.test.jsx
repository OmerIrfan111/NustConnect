import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, DEMO_USER } from '../../modules/auth/useAuth.js';
import { registry } from '../modules/registry.js';
import { buildRoutes } from './routes.jsx';

function renderAt(path, user = null) {
  const router = createMemoryRouter(buildRoutes(registry), { initialEntries: [path] });
  render(
    <AuthProvider initialUser={user}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

describe('routing', () => {
  it('renders the landing page for guests', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /one campus/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  it('redirects guests from protected routes to /login?next=', async () => {
    const router = renderAt('/rides');
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Frides');
  });

  it('shows the module placeholder inside the AppShell when signed in', async () => {
    renderAt('/rides', DEMO_USER);
    expect(await screen.findByRole('heading', { name: 'Find a Ride' })).toBeInTheDocument();
    expect(screen.getByText('module/rideshare')).toBeInTheDocument();
    const sidebar = screen.getByRole('navigation', { name: 'Modules' });
    expect(sidebar).toHaveTextContent('Bill Splitting');
    expect(sidebar).not.toHaveTextContent('Admin');
  });

  it('opens public module routes (map) for guests in the visitor shell', async () => {
    renderAt('/map');
    expect(await screen.findByRole('heading', { name: 'Campus Map' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Modules' })).not.toBeInTheDocument();
  });

  it('blocks students from admin routes with a 403', async () => {
    renderAt('/admin', DEMO_USER);
    expect(await screen.findByText('403')).toBeInTheDocument();
  });

  it('lets admins into admin routes and shows the Admin nav item', async () => {
    renderAt('/admin', { ...DEMO_USER, role: 'admin' });
    expect(await screen.findByRole('heading', { name: 'Admin overview' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Modules' })).toHaveTextContent('Admin');
  });

  it('renders a 404 for unknown paths', async () => {
    renderAt('/definitely-not-a-page');
    expect(await screen.findByText('404')).toBeInTheDocument();
  });
});
