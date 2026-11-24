import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../modules/auth/useAuth.js';
import { registry } from './modules/registry.js';
import { buildRoutes } from './router/routes.jsx';

const router = createBrowserRouter(buildRoutes(registry));

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
