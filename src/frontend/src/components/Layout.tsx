import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Server,
  ShieldCheck,
  Upload,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/sections", label: "Sections", icon: Building2 },
  { path: "/computers", label: "Computers", icon: Monitor },
  { path: "/standby", label: "Standby Systems", icon: Server },
  { path: "/complaints", label: "Complaints", icon: AlertTriangle },
  { path: "/import", label: "Data Import", icon: Upload },
  { path: "/stock", label: "Stock Data", icon: Database },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin, isLoggedIn, isAuthorized, role, userEmail, logout } =
    useAdmin();
  const { clear: clearIIIdentity } = useInternetIdentity();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Monitor className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-sidebar-foreground leading-tight truncate">
              HW System Manager
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              IT Infrastructure
            </p>
          </div>
          <button
            type="button"
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5 px-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active =
                path === "/"
                  ? currentPath === "/"
                  : currentPath.startsWith(path);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    data-ocid={`nav.${label.toLowerCase().replace(/\s+/g, "-")}.link`}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                    {active && (
                      <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {/* Role badge */}
          {isLoggedIn && (
            <div className="flex flex-col gap-1 px-3 py-2 rounded-md bg-sidebar-accent/60 mb-2">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-sidebar-primary flex-shrink-0" />
                ) : isAuthorized ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isAdmin
                      ? "text-sidebar-primary"
                      : isAuthorized
                        ? "text-green-400"
                        : "text-blue-400",
                  )}
                >
                  {isAdmin
                    ? "Admin Mode"
                    : isAuthorized
                      ? "Authorized User"
                      : "User Mode"}
                </span>
              </div>
              {!isAdmin && userEmail && (
                <p className="text-[10px] text-sidebar-foreground/50 truncate pl-5">
                  {userEmail}
                </p>
              )}
            </div>
          )}

          {isLoggedIn ? (
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                logout();
                clearIIIdentity();
              }}
              data-ocid="nav.logout.button"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          ) : (
            <div className="space-y-1">
              <Link
                to="/login"
                data-ocid="nav.user-login.link"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                  currentPath === "/login"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <User className="w-3.5 h-3.5" />
                User Login
              </Link>
              <Link
                to="/admin"
                data-ocid="nav.admin-login.link"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                  currentPath === "/admin"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Login
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-sm text-foreground/80 hidden sm:block">
              {navItems.find((n) =>
                n.path === "/"
                  ? currentPath === "/"
                  : currentPath.startsWith(n.path),
              )?.label ?? "Hardware System Manager"}
            </h1>
          </div>
          {isAdmin && (
            <Badge className="bg-primary/10 text-primary border border-primary/20 hidden sm:flex">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          {!isAdmin && role === "user" && isAuthorized && (
            <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 hidden sm:flex">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Authorized
            </Badge>
          )}
          {!isAdmin && role === "user" && !isAuthorized && (
            <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 hidden sm:flex">
              <User className="w-3 h-3 mr-1" />
              User
            </Badge>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/30 px-6 py-3 flex-shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
