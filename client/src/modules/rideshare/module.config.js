import { Car, CalendarDays } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('rideshare', title);

export default {
  slug: 'rideshare',
  title: 'RideShare & Trips',
  nav: [
    { label: 'RideShare', path: '/rides', icon: Car, group: 'main', order: 20 },
    { label: 'Trips & Meetups', path: '/trips', icon: CalendarDays, group: 'more', order: 200 },
  ],
  routes: [
    { path: '/rides', component: P('Find a Ride'), title: 'Find a Ride' },
    { path: '/rides/new', component: P('Post a Ride'), title: 'Post a Ride' },
    { path: '/rides/:id', component: P('Ride Details'), title: 'Ride Details' },
    { path: '/rides/:id/confirmation', component: P('Ride Request Confirmation'), title: 'Request sent' },
    { path: '/trips', component: P('Trips & Meetups'), title: 'Trips & Meetups' },
    { path: '/trips/:id', component: P('Trip details'), title: 'Trip' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  slots: {},
};
