import { lazy } from 'react';
import { Settings } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('auth', title, { homeHref: '/', homeLabel: 'Back to Home' });

export default {
  slug: 'auth',
  title: 'Auth & Profiles',
  nav: [{ label: 'Settings', path: '/settings', icon: Settings, group: 'main', order: 120 }],
  routes: [
    { path: '/profile', component: placeholder('auth', 'My Profile'), title: 'Profile' }, // Phase 2
    { path: '/settings', component: placeholder('auth', 'Settings'), title: 'Settings' }, // Phase 2
  ],
  publicRoutes: [
    // 'bare' = no visitor nav or footer: the split-screen login / register from UI-06 / UI-07.
    { path: '/login', component: lazy(() => import('./pages/Login.jsx')), title: 'Login', layout: 'bare' },
    { path: '/register', component: lazy(() => import('./pages/Register.jsx')), title: 'Register', layout: 'bare' },
    { path: '/verify', component: P('Verify your email'), title: 'Verify email', layout: 'visitor' }, // Phase 2
    { path: '/forgot-password', component: P('Forgot password'), title: 'Forgot password', layout: 'visitor' }, // Phase 2
  ],
  adminRoutes: [],
  slots: {},
};
