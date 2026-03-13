import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminProvider } from "./contexts/AdminContext";

import AdminLogin from "./pages/AdminLogin";
import Complaints from "./pages/Complaints";
import Computers from "./pages/Computers";
// Pages
import Dashboard from "./pages/Dashboard";
import OtherDevices from "./pages/OtherDevices";
import StandbySystems from "./pages/StandbySystems";
import StockData from "./pages/StockData";
import UserLogin from "./pages/UserLogin";

// Root route with layout
const rootRoute = createRootRoute({
  component: () => (
    <AdminProvider>
      <Layout>
        <Outlet />
      </Layout>
      <Toaster position="top-right" richColors />
    </AdminProvider>
  ),
});

// Layout route for protected pages (no path segment)
const protectedLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedRoute,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/",
  component: Dashboard,
});

const computersRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/computers",
  component: Computers,
});

const standbyRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/standby",
  component: StandbySystems,
});

const complaintsRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/complaints",
  component: Complaints,
});

const stockRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/stock",
  component: StockData,
});

const otherDevicesRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: "/other-devices",
  component: OtherDevices,
});

// Public routes remain as direct children of rootRoute
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLogin,
});

const userLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: UserLogin,
});

const routeTree = rootRoute.addChildren([
  protectedLayout.addChildren([
    indexRoute,
    computersRoute,
    standbyRoute,
    complaintsRoute,
    stockRoute,
    otherDevicesRoute,
  ]),
  adminRoute,
  userLoginRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
