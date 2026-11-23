import { LayoutDashboard, Bell } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

export default {
  slug: 'dashboard',
  title: 'Dashboard, Notifications & Search',
  nav: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'main', order: 10 },
    { label: 'Notifications', path: '/notifications', icon: Bell, group: 'main', order: 110 },
  ],
  routes: [
    { path: '/dashboard', component: placeholder('dashboard', 'Student Dashboard', { homeHref: '/', homeLabel: 'Back to Home' }), title: 'Dashboard' },
    { path: '/notifications', component: placeholder('dashboard', 'Notifications'), title: 'Notifications' },
    { path: '/search', component: placeholder('dashboard', 'Search results'), title: 'Search' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  // A2 replaces these with the real NotificationBell and GlobalSearchBar:
  // slots: { topbarSearch: GlobalSearchBar, topbarNotifications: NotificationBell },
  slots: {},
};
