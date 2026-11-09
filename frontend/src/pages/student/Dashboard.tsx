import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { Disclaimer, GeneratedBadge, StatCard } from "@/components/Bits";
import { FactorBars, ScoreRing, WhyScoreButton } from "@/components/Match";
import { apiGet } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { Application, CV, GapReport, Recommendation, StudentProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const { t, lang } = useT();
  const profile = useQuery({ queryKey: ["student-profile"], queryFn: () => apiGet<StudentProfile>("/student/profile") });
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: () => apiGet<Recommendation[]>("/student/recommendations") });
  const apps = useQuery({ queryKey: ["my-applications"], queryFn: () => apiGet<Application[]>("/student/applications") });
  const gaps = useQuery({ queryKey: ["gaps"], queryFn: () => apiGet<GapReport[]>("/student/gaps") });
  const cv = useQuery({ queryKey: ["cv"], queryFn: () => apiGet<CV | null>("/student/cv") });

  const p = profile.data;
  const best = [...(gaps.data ?? [])].sort((a, b) => b.readiness - a.readiness)[0];
  const appList = apps.data ?? [];

  return (
    <AppShell title={p ? t("Welcome, {name}", { name: p.name.split(" ")[0] }) : t("Dashboard")} subtitle={t("Your field-training journey at a glance.")}>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#13324a] to-teal-800 p-7 text-white" data-testid="dashboard-profile-card">
            <div className="flex flex-wrap items-center gap-2 text-sm text-teal-200">
              {p?.major && <span>{t(p.major)}</span>} {p?.generated && <GeneratedBadge />}
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">{t("Profile completeness")}</div>
                <div className="mt-1 font-heading text-4xl font-bold" data-testid="dashboard-completeness">{p?.completeness ?? 0}%</div>
              </div>
              <div className="text-end">
                <div className="text-xs uppercase tracking-wider text-slate-400">GPA</div>
                <div className="mt-1 font-heading text-4xl font-bold" data-testid="dashboard-gpa">{p?.gpa?.toFixed(2) ?? "—"}</div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-400 transition-[width] duration-700" style={{ width: `${p?.completeness ?? 0}%` }} /></div>
            <Link to="/student/profile" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-200 hover:text-white" data-testid="dashboard-edit-profile-link">
              {t("Complete your academic profile")} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-900">{t("Top matches for you")}</h2>
              <Link to="/student/opportunities" className="text-sm font-semibold text-teal-700 hover:underline" data-testid="dashboard-all-recs-link">{t("See all")}</Link>
            </div>
            <div className="space-y-3">
              {(recs.data ?? []).slice(0, 3).map((r) => (
                <div key={r.opportunity.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4" data-testid={`dashboard-rec-${r.opportunity.id}`}>
                  <ScoreRing score={r.match.total} size={56} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="font-semibold text-slate-900">{r.opportunity.title}</div>
                    <div className="text-xs text-slate-500">{r.opportunity.company_name} · {r.opportunity.city}</div>
                    <FactorBars match={r.match} />
                  </div>
                  <WhyScoreButton match={r.match} title={r.opportunity.title} testId={`dashboard-why-${r.opportunity.id}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label={t("Applications")} value={appList.length} testId="stat-applications" />
            <StatCard label={t("Accepted")} value={appList.filter((a) => a.status === "accepted").length} testId="stat-accepted" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="dashboard-growth-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><GraduationCap className="size-4 text-amber-600" /> {t("Development opportunities")}</div>
            {best && (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  {t("Closest track")}: <b>{lang === "ar" ? best.track_name_ar : best.track_name}</b> · {best.readiness}% {t("ready")}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {t("Opportunities to develop your profile")}: {best.gaps.slice(0, 2).map((g) => g.name).join(t(", then "))}
                </p>
              </>
            )}
            <Link to="/student/growth" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")} data-testid="dashboard-growth-link">{t("Explore tracks")}</Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="dashboard-cv-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText className="size-4 text-blue-600" /> {t("AI CV")}</div>
            <p className="mt-2 text-sm text-slate-600">
              {cv.data ? (cv.data.approved ? t("Your CV is approved and ready.") : t("Draft generated — review and approve it.")) : t("Generate a professional CV from your profile.")}
            </p>
            <Link to="/student/cv" className={cn(buttonVariants({ size: "sm" }), "mt-4 bg-teal-700 text-white hover:bg-teal-800")} data-testid="dashboard-cv-link">
              {cv.data ? t("Open CV") : t("Generate CV")}
            </Link>
          </div>
          <Disclaimer />
        </div>
      </div>
    </AppShell>
  );
}
