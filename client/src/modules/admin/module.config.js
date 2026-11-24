import { HeartHandshake, Shield } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

export default {
  slug: 'admin',
  title: 'Admin, Moderation & Donations',
  nav: [
    { label: 'Donations', path: '/donations', icon: HeartHandshake, group: 'more', order: 230 },
    { label: 'Admin', path: '/admin', icon: Shield, group: 'more', order: 290, roles: ['admin', 'moderator'] },
  ],
  routes: [
    { path: '/donations', component: placeholder('admin', 'Donation campaigns'), title: 'Donations' },
    { path: '/donations/:id', component: placeholder('admin', 'Campaign details'), title: 'Campaign' },
  ],
  publicRoutes: [],
  adminRoutes: [{ label: 'Overview', path: '/admin', component: placeholder('admin', 'Admin overview') }],
  // A3 provides the admin layout that lists every module's adminRoutes:
  // slots: { adminLayout: AdminLayout },
  slots: {},
};
