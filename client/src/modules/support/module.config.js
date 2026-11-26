import { lazy } from 'react';
import { MessageCircleQuestion, ClipboardList, BookOpen } from 'lucide-react';

const ComplaintsList = lazy(() => import('./pages/ComplaintsList.jsx'));
const NewComplaint = lazy(() => import('./pages/NewComplaint.jsx'));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail.jsx'));
const HelpBox = lazy(() => import('./pages/HelpBox.jsx'));
const FaqList = lazy(() => import('./pages/FaqList.jsx'));
const FaqDetail = lazy(() => import('./pages/FaqDetail.jsx'));
const AdminSupport = lazy(() => import('./pages/AdminSupport.jsx'));

export default {
  slug: 'support',
  title: 'Complaints, Help Box & FAQ',
  nav: [
    { label: 'Help Box', path: '/help-box', icon: MessageCircleQuestion, group: 'main', order: 80 },
    { label: 'Complaints', path: '/complaints', icon: ClipboardList, group: 'main', order: 90 },
    { label: 'FAQ', path: '/faq', icon: BookOpen, group: 'more', order: 240 },
  ],
  routes: [
    { path: '/complaints', component: ComplaintsList, title: 'My Complaints' },
    { path: '/complaints/new', component: NewComplaint, title: 'Submit a Complaint' },
    { path: '/complaints/:id', component: ComplaintDetail, title: 'Complaint Details' },
    { path: '/help-box', component: HelpBox, title: 'Anonymous Help Box' },
  ],
  publicRoutes: [
    { path: '/faq', component: FaqList, title: 'Campus FAQ & Wiki' },
    { path: '/faq/:id', component: FaqDetail, title: 'FAQ Article' },
  ],
  adminRoutes: [
    { label: 'Complaints & Help Box', path: '/admin/support', component: AdminSupport, roles: ['moderator', 'admin'], title: 'Support Queue' },
  ],
  slots: {},
};
