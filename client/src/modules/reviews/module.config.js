import { Star, Briefcase, GraduationCap } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('reviews', title);

export default {
  slug: 'reviews',
  title: 'Review Hub & Opportunities',
  nav: [
    { label: 'Review Hub', path: '/reviews', icon: Star, group: 'main', order: 40 },
    { label: 'Opportunities', path: '/opportunities', icon: Briefcase, group: 'main', order: 50 },
    { label: 'Alumni', path: '/alumni', icon: GraduationCap, group: 'more', order: 220 },
  ],
  routes: [
    { path: '/reviews', component: P('Campus Review Hub'), title: 'Review Hub' },
    { path: '/reviews/new', component: P('Write a Review'), title: 'Write a Review' },
    { path: '/reviews/confirmation', component: P('Review Confirmation'), title: 'Review submitted' },
    { path: '/reviews/:id', component: P('Review details'), title: 'Review' },
    { path: '/opportunities', component: P('Opportunities'), title: 'Opportunities' },
    { path: '/alumni', component: P('Alumni Directory'), title: 'Alumni' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  slots: {},
};
