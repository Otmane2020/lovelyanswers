"use client";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Megaphone, Layers, Image as ImageIcon, Users,
  BarChart3, Sparkles, FolderOpen, Settings, CreditCard, Bell,
  ChevronLeft, ChevronRight, Search, Tag, FileBarChart
} from "lucide-react";

const nav = [
  { to: "/adsflow", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/adsflow/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/adsflow/ad-sets", icon: Layers, label: "Ad Sets" },
  { to: "/adsflow/ads", icon: ImageIcon, label: "Ads" },
  { to: "/adsflow/audiences", icon: Users, label: "Audiences" },
  { to: "/adsflow/pixel", icon: Tag, label: "Pixel & Tracking" },
  { to: "/adsflow/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/adsflow/reports", icon: FileBarChart, label: "Reports" },
  { to: "/adsflow/optimizer", icon: Sparkles, label: "AI Optimizer" },
  { to: "/adsflow/creatives", icon: FolderOpen, label: "Creative Library" },
  { to: "/adsflow/settings", icon: Settings, label: "Settings" },
  { to: "/adsflow/billing", icon: CreditCard, label: "Billing" },
];

export default function AdsFlowLayout({ children, title, accountName, onSync, syncing }: { children: ReactNode; title?: string; accountName?: string | null; onSync?: () => void; syncing?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#1a1a1a] border-r border-white/5 flex flex-col transition-all duration-200 ${collapsed ? "w-[68px]" : "w-[240px]"}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold">A</div>
              <span className="font-semibold tracking-tight">AdsFlow</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="h-7 w-7 rounded-md hover:bg-white/5 flex items-center justify-center text-[#9ca3af]"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.to || (item.to !== "/adsflow" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                    : "text-[#9ca3af] hover:bg-white/5 hover:text-[#f1f1f1] border border-transparent"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        {!collapsed && (
          <div className="p-3 border-t border-white/5">
            <div className="rounded-xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/20 p-3">
              <div className="text-xs font-semibold text-indigo-200">AdsFlow Pro</div>
              <div className="text-[11px] text-[#9ca3af] mt-1">Unlock AI optimization & unlimited campaigns.</div>
              <button className="mt-2 w-full text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white py-1.5">Upgrade</button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className={`${collapsed ? "ml-[68px]" : "ml-[240px]"} transition-all duration-200`}>
        {/* Topbar */}
        <header className="h-16 bg-[#0f0f0f]/80 backdrop-blur border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm text-[#9ca3af] w-72">
              <Search className="h-4 w-4" />
              <input className="bg-transparent outline-none flex-1 text-[#f1f1f1] placeholder:text-[#9ca3af]" placeholder="Search campaigns, ads…" />
            </div>
            {onSync && (
              <button onClick={onSync} disabled={syncing} className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-medium flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full bg-white ${syncing ? "animate-pulse" : ""}`} /> {syncing ? "Syncing…" : "Sync Meta"}
              </button>
            )}
            <button className="h-9 px-3 rounded-lg bg-[#1a1a1a] border border-white/5 text-sm flex items-center gap-2 hover:bg-white/5">
              <span className={`h-2 w-2 rounded-full ${accountName ? "bg-emerald-400" : "bg-zinc-500"}`} /> {accountName || "No account"}
            </button>
            <button className="h-9 w-9 rounded-lg bg-[#1a1a1a] border border-white/5 hover:bg-white/5 flex items-center justify-center relative">
              <Bell className="h-4 w-4 text-[#9ca3af]" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center text-sm font-semibold">O</div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-[#1a1a1a] ${className}`}>{children}</div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    paused: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
    ended: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-md border capitalize ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}
