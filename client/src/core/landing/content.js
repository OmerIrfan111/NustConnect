import { Car, ShoppingBag, Star, Map as MapIcon, Briefcase, LifeBuoy, PackageSearch } from 'lucide-react';

/** Landing page copy and sample data (UI-01). Tone: 'teal' | 'amber' | 'navy'. */

export const HERO_SAMPLES = [
  { tone: 'teal', icon: Car, title: 'RideShare', meta: 'Islamabad F-10 → NUST H-12 · PKR 250' },
  { tone: 'amber', icon: ShoppingBag, title: 'Marketplace', meta: 'Scientific Calculator · PKR 2,500' },
  { tone: 'navy', icon: Star, title: 'Review Hub', meta: 'Campus Cafe · ★ 4.0 · Verified Student' },
];

export const SERVICES = [
  { tone: 'teal', icon: Car, title: 'RideShare', body: 'Search, post and request rides with verified students.', to: '/rides' },
  { tone: 'amber', icon: ShoppingBag, title: 'Marketplace', body: 'Buy, sell and exchange items within campus.', to: '/marketplace' },
  { tone: 'navy', icon: Star, title: 'Review Hub', body: 'Honest reviews of teachers, cafes, hostels and mess.', to: '/reviews' },
  { tone: 'teal', icon: MapIcon, title: 'Campus Map', body: 'Find facilities and use the Freshie Guide.', to: '/map' },
  { tone: 'amber', icon: Briefcase, title: 'Opportunities', body: 'Internships, alumni referrals and mentorship.', to: '/opportunities' },
  { tone: 'navy', icon: LifeBuoy, title: 'Student Support', body: 'Lost & Found, Help Box and Complaint Tracker.', to: '/help-box' },
];

export const POPULAR = [
  { tone: 'teal', icon: Car, title: 'Morning rides to H-12', to: '/rides' },
  { tone: 'amber', icon: ShoppingBag, title: 'Used books & electronics', to: '/marketplace' },
  { tone: 'navy', icon: Star, title: 'Top rated cafes', to: '/reviews' },
  { tone: 'teal', icon: PackageSearch, title: 'Lost & Found board', to: '/lost-found' },
];

export const STEPS = [
  { title: 'Register with your NUST email', body: 'Verified student access builds a trusted community.' },
  { title: 'Explore campus services', body: 'Rides, marketplace, reviews, maps and more.' },
  { title: 'Connect and collaborate', body: 'Plan trips, split bills and help fellow students.' },
];
