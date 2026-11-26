import { lazy } from 'react';
import { PackageSearch } from 'lucide-react';

const LostFoundBoard = lazy(() => import('./pages/LostFoundBoard.jsx'));
const PostLostFound = lazy(() => import('./pages/PostLostFound.jsx'));
const LostFoundDetail = lazy(() => import('./pages/LostFoundDetail.jsx'));

export default {
  slug: 'lostfound',
  title: 'Lost & Found',
  nav: [{ label: 'Lost & Found', path: '/lost-found', icon: PackageSearch, group: 'main', order: 70 }],
  routes: [
    { path: '/lost-found', component: LostFoundBoard, title: 'Lost & Found' },
    { path: '/lost-found/new', component: PostLostFound, title: 'Post Lost or Found Item' },
    { path: '/lost-found/:id', component: LostFoundDetail, title: 'Item Details' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  slots: {},
};
