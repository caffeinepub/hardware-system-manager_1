import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import { AdminProvider } from "./contexts/AdminContext";

import AMCParts from "./pages/AMCParts";
import AdminLogin from "./pages/AdminLogin";
import Complaints from "./pages/Complaints";
import Computers from "./pages/Computers";
// Pages
import Dashboard from "./pages/Dashboard";
import MaintenanceCharts from "./pages/MaintenanceCharts";
import Sections from "./pages/Sections";
import StandbySystems from "./pages/StandbySystems";
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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const sectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sections",
  component: Sections,
});

const computersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/computers",
  component: Computers,
});

const standbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/standby",
  component: StandbySystems,
});

const complaintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/complaints",
  component: Complaints,
});

const amcPartsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/amc-parts",
  component: AMCParts,
});

const chartsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/charts",
  component: MaintenanceCharts,
});

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
  indexRoute,
  sectionsRoute,
  computersRoute,
  standbyRoute,
  complaintsRoute,
  amcPartsRoute,
  chartsRoute,
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
