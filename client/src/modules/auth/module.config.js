import { lazy } from 'react';
import { Settings } from 'lucide-react';

export default {
  slug: 'auth',
  title: 'Auth & Profiles',
  nav: [{ label: 'Settings', path: '/settings', icon: Settings, group: 'main', order: 120 }],
  routes: [
    { path: '/profile', component: lazy(() => import('./pages/Profile.jsx')), title: 'Profile' },
    { path: '/settings', component: lazy(() => import('./pages/Settings.jsx')), title: 'Settings' },
  ],
  publicRoutes: [
    // 'bare' = no visitor nav or footer: the split-screen pages from UI-06 / UI-07.
    { path: '/login', component: lazy(() => import('./pages/Login.jsx')), title: 'Login', layout: 'bare' },
    { path: '/register', component: lazy(() => import('./pages/Register.jsx')), title: 'Register', layout: 'bare' },
    { path: '/verify', component: lazy(() => import('./pages/Verify.jsx')), title: 'Verify email', layout: 'bare' },
    { path: '/forgot-password', component: lazy(() => import('./pages/ForgotPassword.jsx')), title: 'Forgot password', layout: 'bare' },
  ],
  adminRoutes: [],
  slots: {},
};
