import React from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { alertsApi } from "../api/alerts";
import { Badge } from "../components/ui/Badge";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Bell,
  User,
  LogOut,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

export const MainLayout = () => {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Poll or query alert count for notification indicator
  const { data: alertsData } = useQuery({
    queryKey: ["alerts-count"],
    queryFn: () => alertsApi.getAlerts(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const unreadAlertsCount = alertsData?.count || 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Deals Pipeline", href: "/deals", icon: Briefcase },
    { name: "Companies", href: "/companies", icon: Building2 },
    {
      name: "Alerts",
      href: "/alerts",
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : null,
    },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "Executive Dashboard";
    if (path.startsWith("/deals")) return "Sales & Deal Pipeline";
    if (path.startsWith("/companies")) return "Client & Company Directory";
    if (path.startsWith("/alerts")) return "Actionable Deal Alerts";
    if (path.startsWith("/profile")) return "User Profile & Security";
    return "Sales CRM";
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">Sales CRM</span>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-indigo-400">Enterprise</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </div>
                {item.badge ? (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow">
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || user?.email}
              </p>
              <div className="mt-0.5">
                <Badge variant={user?.role} className="text-[10px] py-0 px-1.5 uppercase">
                  {user?.role || "REP"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Alerts Indicator Button */}
            <Link
              to="/alerts"
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="View Alerts"
            >
              <Bell className="h-5 w-5" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
              )}
            </Link>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-64 bg-slate-900 h-full p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6 px-2">
                <TrendingUp className="h-6 w-6 text-indigo-400" />
                <span className="font-bold text-white">Sales CRM</span>
              </div>
              <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium",
                          isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-rose-500 text-white font-bold">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
