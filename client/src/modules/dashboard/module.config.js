import { lazy } from 'react';
import { LayoutDashboard, Bell } from 'lucide-react';
import GlobalSearchBar from './components/GlobalSearchBar.jsx';
import NotificationBell from './components/NotificationBell.jsx';

export default {
  slug: 'dashboard',
  title: 'Dashboard, Notifications & Search',
  nav: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'main', order: 10 },
    { label: 'Notifications', path: '/notifications', icon: Bell, group: 'main', order: 110 },
  ],
  routes: [
    { path: '/dashboard', component: lazy(() => import('./pages/Dashboard.jsx')), title: 'Dashboard' },
    { path: '/notifications', component: lazy(() => import('./pages/Notifications.jsx')), title: 'Notifications' },
    { path: '/search', component: lazy(() => import('./pages/Search.jsx')), title: 'Search' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  slots: { topbarSearch: GlobalSearchBar, topbarNotifications: NotificationBell },
};
