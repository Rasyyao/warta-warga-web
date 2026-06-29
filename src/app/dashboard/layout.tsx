"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [isSystemActive, setIsSystemActive] = useState(true);

  // Poll or fetch pending reports count periodically
  const updatePendingCount = () => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const pending = data.reports.filter(
            (r: any) => r.status_approval === "menunggu"
          ).length;
          setPendingReportsCount(pending);
        }
      })
      .catch((err) => console.error("Failed to fetch pending count for layout:", err));
  };

  useEffect(() => {
    updatePendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(updatePendingCount, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleLogout = () => {
    router.push("/login");
  };

  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return "Dashboard Ringkasan";
      case "/dashboard/reports":
        return "Aduan Warga Masuk";
      case "/dashboard/rag":
        return "Basis Pengetahuan (RAG)";
      case "/dashboard/logs":
        return "Log Hasil Chat WhatsApp";
      case "/dashboard/agents":
        return "Pengaturan Parameter Agent";
      default:
        return "Admin Dashboard";
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen bg-[#f8faf9] text-text-primary">
      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-black/[0.06] bg-white transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Compartment */}
        <div className="flex h-16 items-center gap-3 border-b border-black/[0.06] px-6">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-extrabold text-white">
            J
          </span>
          <span className="text-[15px] font-extrabold tracking-[-0.02em]">
            JagaWarga
          </span>
          <span className="h-4 w-px bg-black/[.08]" />
          <img
            src="/lks-nasional-logo.png"
            alt="LKS Nasional Logo"
            className="h-6 w-auto object-contain"
          />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          <Link
            href="/dashboard"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isActive("/dashboard")
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-black/[0.02] hover:text-text-primary"
            }`}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            Ringkasan
          </Link>

          <Link
            href="/dashboard/reports"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isActive("/dashboard/reports")
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-black/[0.02] hover:text-text-primary"
            }`}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Aduan Warga
            {pendingReportsCount > 0 && (
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-accent-red text-[10px] font-bold text-white animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/rag"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isActive("/dashboard/rag")
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-black/[0.02] hover:text-text-primary"
            }`}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            RAG Database
          </Link>

          <Link
            href="/dashboard/logs"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isActive("/dashboard/logs")
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-black/[0.02] hover:text-text-primary"
            }`}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Log Chat Bot
          </Link>

          {/* <Link
            href="/dashboard/agents"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isActive("/dashboard/agents")
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-black/[0.02] hover:text-text-primary"
            }`}
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Pengaturan Agent
          </Link> */}
        </nav>

        {/* User Pill / Logout */}
        <div className="border-t border-black/[0.06] p-4">
          <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-[#fcfdfc] p-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-text-primary">
                Admin JagaWarga
              </p>
              <p className="truncate text-[10px] text-text-muted">
                admin@jagawarga.id
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="grid size-8 place-items-center rounded-lg hover:bg-accent-red/10 hover:text-accent-red text-text-muted transition-all"
              title="Keluar"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Navbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/[0.06] bg-white/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="grid size-9 place-items-center rounded-xl hover:bg-black/[0.02] md:hidden border border-black/[0.08]"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-bold capitalize text-text-primary">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Light */}
            <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary sm:flex">
              <span
                className={`size-1.5 rounded-full ${
                  isSystemActive ? "bg-primary animate-pulse" : "bg-text-muted"
                }`}
              />
              Sistem Aktif
            </span>

            {/* Notification Bell */}
            <button className="relative grid size-9 place-items-center rounded-xl border border-black/[0.08] hover:bg-black/[0.02] transition-all">
              <svg className="size-4.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingReportsCount > 0 && (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-accent-red" />
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
