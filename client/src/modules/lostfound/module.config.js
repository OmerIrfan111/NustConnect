import { PackageSearch } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('lostfound', title);

export default {
  slug: 'lostfound',
  title: 'Lost & Found',
  nav: [{ label: 'Lost & Found', path: '/lost-found', icon: PackageSearch, group: 'main', order: 70 }],
  routes: [
    { path: '/lost-found', component: P('Lost & Found'), title: 'Lost & Found' },
    { path: '/lost-found/new', component: P('Report an item'), title: 'Report an item' },
    { path: '/lost-found/:id', component: P('Item details'), title: 'Item' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  slots: {},
};
