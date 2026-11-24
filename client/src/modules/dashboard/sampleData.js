/**
 * SAMPLE DATA for the dashboard widgets (Phase 1). Phase 2 replaces stats and recent activity with each module's
 * `summaryProvider`, falling back to this when a module has none. Always shown with a "Sample data" label.
 */
import { Briefcase, Car, LifeBuoy, MapPin, ShoppingBag, Star } from 'lucide-react';

export const SAMPLE_STATS = [
  { label: 'Active Rides', value: 3, to: '/rides' },
  { label: 'Marketplace Listings', value: 12, to: '/marketplace' },
  { label: 'Saved Reviews', value: 5, to: '/reviews' },
  { label: 'Upcoming Events', value: 2, to: '/trips' },
];

export const QUICK_ACCESS = [
  { title: 'RideShare', to: '/rides', icon: Car },
  { title: 'Marketplace', to: '/marketplace', icon: ShoppingBag },
  { title: 'Review Hub', to: '/reviews', icon: Star },
  { title: 'Campus Map', to: '/map', icon: MapPin },
  { title: 'Opportunities', to: '/opportunities', icon: Briefcase },
  { title: 'Student Support', to: '/complaints', icon: LifeBuoy },
];

export const SAMPLE_ACTIVITY = [
  { id: 1, text: 'You requested a seat: Islamabad F-10 to NUST H-12, 8:00 AM', to: '/rides', at: '2 hours ago' },
  { id: 2, text: 'New listing: Arduino Mega kit, PKR 2,500', to: '/marketplace', at: 'Yesterday' },
  { id: 3, text: 'A review you saved got a new comment: Concordia Cafe', to: '/reviews', at: 'Yesterday' },
  { id: 4, text: 'Your complaint "Broken light in hostel corridor" is under review', to: '/complaints', at: '2 days ago' },
];

export const SAMPLE_OPPORTUNITIES = [
  { id: 1, title: 'Software Engineering Intern', meta: 'Systems Ltd · Deadline 30 Nov', to: '/opportunities' },
  { id: 2, title: 'Referral: Data Analyst', meta: 'Alumni network · Deadline 5 Dec', to: '/opportunities' },
  { id: 3, title: 'Embedded Systems Intern', meta: 'NESCOM · Deadline 12 Dec', to: '/opportunities' },
];
