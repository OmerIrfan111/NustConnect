import { MessageCircleQuestion, ClipboardList, BookOpen } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('support', title);

export default {
  slug: 'support',
  title: 'Complaints, Help Box & FAQ',
  nav: [
    { label: 'Help Box', path: '/help-box', icon: MessageCircleQuestion, group: 'main', order: 80 },
    { label: 'Complaints', path: '/complaints', icon: ClipboardList, group: 'main', order: 90 },
    { label: 'FAQ', path: '/faq', icon: BookOpen, group: 'more', order: 240 },
  ],
  routes: [
    { path: '/complaints', component: P('My Complaints'), title: 'Complaints' },
    { path: '/complaints/new', component: P('Submit a Complaint'), title: 'New complaint' },
    { path: '/complaints/:id', component: P('Complaint details'), title: 'Complaint' },
    { path: '/help-box', component: P('Anonymous Help Box'), title: 'Help Box' },
  ],
  publicRoutes: [
    { path: '/faq', component: placeholder('support', 'FAQ & Wiki', { homeHref: '/', homeLabel: 'Back to Home' }), title: 'FAQ' },
    { path: '/faq/:id', component: placeholder('support', 'FAQ article', { homeHref: '/', homeLabel: 'Back to Home' }), title: 'FAQ' },
  ],
  adminRoutes: [],
  slots: {},
};
