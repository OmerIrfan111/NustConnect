import { ShoppingBag, Users } from 'lucide-react';
import { placeholder } from '@core/pages/Placeholder.jsx';

const P = (title) => placeholder('marketplace', title);

export default {
  slug: 'marketplace',
  title: 'Marketplace & SkillSwap',
  nav: [
    { label: 'Marketplace', path: '/marketplace', icon: ShoppingBag, group: 'main', order: 30 },
    { label: 'SkillSwap', path: '/skillswap', icon: Users, group: 'more', order: 210 },
  ],
  routes: [
    { path: '/marketplace', component: P('Student Marketplace'), title: 'Marketplace' },
    { path: '/marketplace/new', component: P('Post an Item'), title: 'Post an Item' },
    { path: '/marketplace/:id', component: P('Product Details'), title: 'Product Details' },
    { path: '/skillswap', component: P('SkillSwap & Team Finder'), title: 'SkillSwap' },
  ],
  publicRoutes: [],
  adminRoutes: [],
  slots: {},
};
