import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BookOpen, Wrench } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScoreRing } from "@/components/Match";
import { apiGet } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { GapReport } from "@/lib/types";
import { cn } from "@/lib/utils";

const IMP = { high: "bg-rose-50 text-rose-700", medium: "bg-amber-50 text-amber-700", low: "bg-slate-100 text-slate-600" };

export default function StudentGrowth() {
  const { t, lang } = useT();
  const { data = [] } = useQuery({ queryKey: ["gaps"], queryFn: () => apiGet<GapReport[]>("/student/gaps") });
  const [sel, setSel] = useState<string | null>(null);
  const report = data.find((r) => r.track_key === sel) ?? [...data].sort((a, b) => b.readiness - a.readiness)[0];
  const name = (r: GapReport) => (lang === "ar" ? r.track_name_ar : r.track_name);

  return (
    <AppShell title={t("Development opportunities")} subtitle={t("Compare your profile with the ideal profile of each career track and see what to develop next.")}>
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-900" data-testid="growth-phase-note">
        {t("Phase 1: rule-based comparison and ranking against a defined ideal profile — no machine learning yet.")}
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {data.map((r) => (
            <button key={r.track_key} onClick={() => setSel(r.track_key)} data-testid={`track-btn-${r.track_key}`}
              className={cn("w-full rounded-xl border bg-white p-4 text-start transition-colors", report?.track_key === r.track_key ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200 hover:border-slate-300")}>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900"><span>{name(r)}</span><span className="font-mono">{r.readiness}%</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-[width] duration-500" style={{ width: `${r.readiness}%` }} /></div>
            </button>
          ))}
        </div>

        {report && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6" data-testid="growth-summary">
              <ScoreRing score={report.readiness} size={84} testId="growth-readiness" />
              <div className="flex-1">
                <h2 className="font-heading text-2xl font-bold text-slate-900">{name(report)}</h2>
                <p className="mt-1 text-sm text-slate-700" data-testid="growth-headline">
                  {report.gaps.length
                    ? `${t("Opportunities to develop your profile")}: ${report.gaps.slice(0, 2).map((g) => (g.status === "strengthen" ? `${t("strengthening")} ${g.name}` : g.name)).join(t(", then "))}.`
                    : t("Your profile already covers this track's ideal profile.")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {report.strengths.map((s) => <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">✓ {s}</span>)}
                </div>
              </div>
            </div>
            <ol className="space-y-3">
              {report.gaps.map((g, i) => (
                <motion.li key={g.name + g.kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4" data-testid={`gap-item-${i}`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0F172A] font-mono text-sm font-bold text-white">{g.rank}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {g.kind === "skill" ? <Wrench className="size-4 text-violet-600" /> : <BookOpen className="size-4 text-blue-600" />}
                      <span className="font-semibold text-slate-900">{g.name}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", IMP[g.importance])}>{t(g.importance)}</span>
                      <span className="text-xs text-slate-500">{t(g.status === "missing" ? "To develop" : "To strengthen")}</span>
                    </div>
                    <p className="text-sm text-slate-600">{lang === "ar" ? g.suggestion_ar : g.suggestion}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </AppShell>
  );
}
