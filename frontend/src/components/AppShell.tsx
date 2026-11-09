import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Bell, BarChart3, Briefcase, FileText, GraduationCap, Languages, LayoutDashboard, LogOut, Menu, Search, Sparkles,
  UserRound, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { roleHome, useMe } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { endSession } from "@/lib/session";
import type { Notification, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: Record<Role, { to: string; label: string; icon: typeof Bell; end?: boolean }[]> = {
  student: [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/student/profile", label: "Academic profile", icon: UserRound },
    { to: "/student/opportunities", label: "Recommendations", icon: Sparkles },
    { to: "/student/applications", label: "My applications", icon: ClipboardList },
    { to: "/student/cv", label: "AI CV", icon: FileText },
    { to: "/student/growth", label: "Development", icon: GraduationCap },
  ],
  company: [
    { to: "/company", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/company/search", label: "Find students", icon: Search },
  ],
  admin: [{ to: "/admin", label: "University admin", icon: BarChart3, end: true }],
};

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" data-testid="logo-link">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 font-heading text-lg font-extrabold text-white shadow-lg shadow-teal-900/20">
        و
      </span>
      <span className="leading-tight">
        <span className={cn("block font-heading text-lg font-bold tracking-tight", light ? "text-white" : "text-slate-900")}>Wasla</span>
        <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.18em]", light ? "text-teal-300" : "text-teal-700")}>ASPU · وصلة</span>
      </span>
    </Link>
  );
}

export function LangToggle({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useT();
  return (
    <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")} data-testid="lang-toggle-btn"
      className={cn("gap-1.5 font-semibold", dark && "text-slate-200 hover:bg-white/10 hover:text-white")}>
      <Languages className="size-4" /> {lang === "en" ? "العربية" : "English"}
    </Button>
  );
}

function NotificationBell() {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ["notifications"], queryFn: () => apiGet<Notification[]>("/notifications"), refetchInterval: 30_000,
  });
  const unread = data.filter((n) => !n.read).length;
  const readOne = useMutation({
    mutationFn: (id: string) => apiPatch<Notification>(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: () => apiPost("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <Popover>
      <PopoverTrigger className="relative grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        data-testid="notifications-bell" aria-label={t("Notifications")}>
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
            data-testid="notifications-unread-count">{unread}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-heading text-sm font-semibold">{t("Notifications")}</span>
          <button className="text-xs font-medium text-teal-700 hover:underline" onClick={() => readAll.mutate()} data-testid="notifications-read-all">
            {t("Mark all read")}
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {data.length === 0 && <p className="p-6 text-center text-sm text-slate-500">{t("No notifications yet")}</p>}
          {data.slice(0, 12).map((n) => (
            <button key={n.id} data-testid={`notification-item-${n.id}`}
              onClick={() => { readOne.mutate(n.id); if (n.link) navigate(n.link); }}
              className={cn("block w-full border-b px-4 py-3 text-start transition-colors last:border-0 hover:bg-slate-50", !n.read && "bg-teal-50/50")}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {!n.read && <span className="size-1.5 rounded-full bg-teal-600" />} {n.title}
              </div>
              <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
              <p className="mt-1 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString(lang === "ar" ? "ar-JO" : "en-GB")}</p>
            </button>
          ))}
        </div>
        <Link to="/notifications" className="block border-t px-4 py-2.5 text-center text-xs font-semibold text-teal-700 hover:bg-slate-50" data-testid="notifications-view-all">
          {t("View all")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function SideNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const { t } = useT();
  return (
    <nav className="space-y-1">
      {NAV[role].map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} data-testid={`nav-${item.to.replaceAll("/", "-").slice(1)}`}
          className={({ isActive }) => cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
          )}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="nav-indicator" className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-teal-400" />}
              <item.icon className="size-4" /> {t(item.label)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const { t } = useT();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const role = me?.user.role ?? "student";
  const roleLabel = { student: "Student", company: "Company", admin: "University admin" }[role];

  const sidebar = (
    <div className="flex h-full flex-col gap-8 bg-[#0F172A] p-5">
      <Logo light />
      <SideNav role={role} onNavigate={() => setOpen(false)} />
      <div className="mt-auto space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-sm font-semibold text-white" data-testid="shell-user-name">{me?.user.name}</div>
        <div className="text-xs text-teal-300">{t(roleLabel)}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => endSession("/login")} data-testid="logout-btn">
          <LogOut className="size-4" /> {t("Sign out")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-8">
          <button className="grid size-9 place-items-center rounded-lg hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} data-testid="mobile-menu-btn" aria-label="menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <LangToggle />
          <NotificationBell />
        </header>
        <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" data-testid="page-title">{title}</h1>
              {subtitle && <p className="mt-1.5 max-w-2xl text-slate-600">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export function RequireRole({ role, children }: { role: Role | "any"; children: ReactNode }) {
  const { data, isLoading, isError } = useMe();
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <div className="size-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }
  if (isError || !data) return <Navigate to="/login" replace />;
  if (role !== "any" && data.user.role !== role) return <Navigate to={roleHome(data.user.role)} replace />;
  return <>{children}</>;
}

export { Briefcase };
