import { lazy } from 'react';
import { Map as MapIcon, Receipt, Compass } from 'lucide-react';

const CampusMap = lazy(() => import('./pages/CampusMap.jsx'));
const FreshieGuide = lazy(() => import('./pages/FreshieGuide.jsx'));
const BillsList = lazy(() => import('./pages/BillsList.jsx'));
const NewBill = lazy(() => import('./pages/NewBill.jsx'));
const BillDetail = lazy(() => import('./pages/BillDetail.jsx'));

export default {
  slug: 'campus',
  title: 'Campus Map, Guide & Bill Splitting',
  nav: [
    { label: 'Campus Map', path: '/map', icon: MapIcon, group: 'main', order: 60 },
    { label: 'Bill Splitting', path: '/bills', icon: Receipt, group: 'main', order: 100 },
    { label: 'Freshie Guide', path: '/guide', icon: Compass, group: 'more', order: 250 },
  ],
  routes: [
    { path: '/bills', component: BillsList, title: 'Bill Splitting' },
    { path: '/bills/new', component: NewBill, title: 'New bill' },
    { path: '/bills/:id', component: BillDetail, title: 'Bill' },
  ],
  // Guests may open the map and the guide without logging in.
  publicRoutes: [
    { path: '/map', component: CampusMap, title: 'Campus Map' },
    { path: '/guide', component: FreshieGuide, title: 'Freshie Guide' },
  ],
  adminRoutes: [],
  slots: {},
};
