import { Map as MapIcon, Receipt, Compass } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('campus', title);
const PublicP = (title) => placeholder('campus', title, { homeHref: '/', homeLabel: 'Back to Home' });

export default {
  slug: 'campus',
  title: 'Campus Map, Guide & Bill Splitting',
  nav: [
    { label: 'Campus Map', path: '/map', icon: MapIcon, group: 'main', order: 60 },
    { label: 'Bill Splitting', path: '/bills', icon: Receipt, group: 'main', order: 100 },
    { label: 'Freshie Guide', path: '/guide', icon: Compass, group: 'more', order: 250 },
  ],
  routes: [
    { path: '/bills', component: P('Bill Splitting'), title: 'Bill Splitting' },
    { path: '/bills/new', component: P('Create a Bill'), title: 'New bill' },
    { path: '/bills/:id', component: P('Bill details'), title: 'Bill' },
  ],
  publicRoutes: [
    { path: '/map', component: PublicP('Campus Map'), title: 'Campus Map' },
    { path: '/guide', component: PublicP('Freshie Guide'), title: 'Freshie Guide' },
  ],
  adminRoutes: [],
  slots: {},
};
