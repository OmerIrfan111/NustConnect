import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import RootLayout from './RootLayout.jsx';
import { AdaptiveLayout, RequireAuth, RequireRole } from './guards.jsx';
import AppShell from '../layouts/AppShell.jsx';
import VisitorLayout from '../layouts/VisitorLayout.jsx';
import Landing from '../landing/Landing.jsx';
import About from '../pages/About.jsx';
import Contact from '../pages/Contact.jsx';
import Privacy from '../pages/Privacy.jsx';
import NotFound from '../pages/NotFound.jsx';
import PageLoading from '../pages/PageLoading.jsx';
import { DEFAULT_ADMIN_ROLES } from '../modules/registry.js';

const withSuspense = (Component) => (
  <Suspense fallback={<PageLoading />}>
    <Component />
  </Suspense>
);

/** Turn a manifest route into a React Router route object. */
const toRoute = (r) => ({
  path: r.path,
  element: r.roles ? <RequireRole roles={r.roles}>{withSuspense(r.component)}</RequireRole> : withSuspense(r.component),
  handle: { title: r.title ?? r.label, module: r.module },
});

/** Base-3 (core/ui) may add DevUiPage.jsx; it is mounted at /dev/ui in development only. */
const devUi = import.meta.glob('../ui/DevUiPage.jsx');
const devUiLoader = Object.values(devUi)[0];

/**
 * Build the route tree from a registry. Exported for tests.
 * Order of precedence is handled by React Router's ranking (static segments beat :params).
 */
export function buildRoutes(registry) {
  const publicByLayout = (layout) =>
    registry.publicRoutes.filter((r) => (r.layout ?? 'adaptive') === layout).map(toRoute);

  const AdminLayout = registry.slots.adminLayout ?? Outlet;

  const children = [
    {
      element: <VisitorLayout />,
      children: [
        { index: true, element: <Landing />, handle: { title: null } },
        { path: 'about', element: <About />, handle: { title: 'About' } },
        { path: 'contact', element: <Contact />, handle: { title: 'Contact' } },
        { path: 'privacy', element: <Privacy />, handle: { title: 'Privacy Policy' } },
        ...publicByLayout('visitor'),
      ],
    },
    ...publicByLayout('bare'),
    { element: <AdaptiveLayout />, children: publicByLayout('adaptive') },
    {
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      children: [
        ...registry.routes.map(toRoute),
        {
          element: (
            <RequireRole roles={DEFAULT_ADMIN_ROLES}>
              <AdminLayout />
            </RequireRole>
          ),
          children: registry.adminRoutes.map(toRoute),
        },
      ],
    },
  ];

  if (import.meta.env.DEV && devUiLoader) {
    const DevUi = lazy(devUiLoader);
    children.push({ path: 'dev/ui', element: withSuspense(DevUi), handle: { title: 'UI kit' } });
  }

  children.push({
    path: '*',
    element: (
      <VisitorLayout>
        <NotFound />
      </VisitorLayout>
    ),
    handle: { title: 'Page not found' },
  });

  return [{ path: '/', element: <RootLayout />, children }];
}
