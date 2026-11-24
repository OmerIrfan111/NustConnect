import { lazy } from 'react';
import { HeartHandshake, Shield } from 'lucide-react';
import AdminLayout from './components/AdminLayout.jsx';

const Overview = lazy(() => import('./pages/Overview.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const CampaignsAdmin = lazy(() => import('./pages/CampaignsAdmin.jsx'));
const CampaignForm = lazy(() => import('./pages/CampaignForm.jsx'));
const CampaignManage = lazy(() => import('./pages/CampaignManage.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const AuditLog = lazy(() => import('./pages/AuditLog.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Donations = lazy(() => import('./pages/Donations.jsx'));
const DonationDetail = lazy(() => import('./pages/DonationDetail.jsx'));

export default {
  slug: 'admin',
  title: 'Admin, Moderation & Donations',
  nav: [
    { label: 'Donations', path: '/donations', icon: HeartHandshake, group: 'more', order: 230 },
    { label: 'Admin', path: '/admin', icon: Shield, group: 'more', order: 290, roles: ['admin', 'moderator'] },
  ],
  routes: [
    { path: '/donations', component: Donations, title: 'Donations' },
    { path: '/donations/:id', component: DonationDetail, title: 'Campaign' },
  ],
  publicRoutes: [],
  // Routes with a `label` appear in the admin tab bar. Core wraps all of them in a moderator/admin role guard.
  adminRoutes: [
    { label: 'Overview', path: '/admin', component: Overview, title: 'Admin' },
    { label: 'Moderation', path: '/admin/reports', component: Reports, title: 'Moderation queue' },
    { label: 'Users', path: '/admin/users', component: Users, title: 'Users' },
    { label: 'Categories', path: '/admin/categories', component: Categories, title: 'Categories', roles: ['admin'] },
    { label: 'Donations', path: '/admin/donations', component: CampaignsAdmin, title: 'Campaigns', roles: ['admin'] },
    { label: 'Analytics', path: '/admin/analytics', component: Analytics, title: 'Analytics', roles: ['admin'] },
    { label: 'Audit log', path: '/admin/audit', component: AuditLog, title: 'Audit log', roles: ['admin'] },
    { path: '/admin/donations/:id', component: CampaignManage, title: 'Manage campaign', roles: ['admin'] },
    { path: '/admin/donations/new', component: CampaignForm, title: 'New campaign', roles: ['admin'] },
    { path: '/admin/donations/:id/edit', component: CampaignForm, title: 'Edit campaign', roles: ['admin'] },
  ],
  slots: { adminLayout: AdminLayout },
};
