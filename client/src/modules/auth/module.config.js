import { Settings } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';
import LoginPlaceholder from './pages/LoginPlaceholder.jsx';

const P = (title) => placeholder('auth', title, { homeHref: '/', homeLabel: 'Back to Home' });

export default {
  slug: 'auth',
  title: 'Auth & Profiles',
  nav: [{ label: 'Settings', path: '/settings', icon: Settings, group: 'main', order: 120 }],
  routes: [
    { path: '/profile', component: placeholder('auth', 'My Profile'), title: 'Profile' },
    { path: '/settings', component: placeholder('auth', 'Settings'), title: 'Settings' },
  ],
  publicRoutes: [
    { path: '/login', component: LoginPlaceholder, title: 'Login', layout: 'visitor' },
    { path: '/register', component: P('Register'), title: 'Register', layout: 'visitor' },
    { path: '/verify', component: P('Verify your email'), title: 'Verify email', layout: 'visitor' },
    { path: '/forgot-password', component: P('Forgot password'), title: 'Forgot password', layout: 'visitor' },
  ],
  adminRoutes: [],
  slots: {},
};
