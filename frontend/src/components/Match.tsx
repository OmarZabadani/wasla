import { useState } from "react";
import { motion } from "motion/react";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import type { FactorKey, MatchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export const FACTOR_META: Record<FactorKey, { label: string; color: string }> = {
  major: { label: "Major / specialization", color: "#0D9488" },
  courses: { label: "University courses & grades", color: "#2563EB" },
  skills: { label: "Skill match", color: "#7C3AED" },
  external: { label: "External courses & certificates", color: "#EA580C" },
  interests: { label: "Interests & questionnaire", color: "#0891B2" },
  location: { label: "Location", color: "#059669" },
};

const INFO: Record<string, string> = {
  exact: "Exact major match",
  related: "Related computing major (partial credit)",
  none: "Major not in the accepted list",
  same_city: "Same city",
  same_region: "Same region (nearby)",
  distant: "Different region",
  remote: "Remote opportunity",
};

export function scoreTone(score: number) {
  if (score >= 75) return { ring: "#0D9488", bg: "bg-emerald-50", text: "text-emerald-800" };
  if (score >= 50) return { ring: "#2563EB", bg: "bg-blue-50", text: "text-blue-800" };
  return { ring: "#D97706", bg: "bg-amber-50", text: "text-amber-800" };
}

export function ScoreRing({ score, size = 64, testId }: { score: number; size?: number; testId?: string }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid={testId}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={5} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={tone.ring} strokeWidth={5} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-heading text-sm font-bold text-slate-900">
        {Math.round(score)}%
      </span>
    </div>
  );
}

export function FactorBars({ match }: { match: MatchResult }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
      {match.factors.map((f) => (
        <div key={f.key} style={{ width: `${f.points}%`, background: FACTOR_META[f.key].color }} />
      ))}
    </div>
  );
}

export function BreakdownList({ match }: { match: MatchResult }) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      {match.factors.map((f, i) => (
        <div key={f.key} className="space-y-1.5" data-testid={`factor-${f.key}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900">
              {t(FACTOR_META[f.key].label)} <span className="text-slate-500">· {f.weight}%</span>
            </span>
            <span className="font-mono text-xs text-slate-600">
              {f.score}% → <b className="text-slate-900">{f.points}</b> / {f.weight}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div className="h-full rounded-full" style={{ background: FACTOR_META[f.key].color }}
              initial={{ width: 0 }} animate={{ width: `${f.score}%` }} transition={{ delay: i * 0.06, duration: 0.5 }} />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            <span className="text-slate-500">{t(INFO[f.info] ?? f.info)}</span>
            {f.matched.map((m) => (
              <span key={m} className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800">✓ {m}</span>
            ))}
            {f.missing.map((m) => (
              <span key={m} className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">+ {m}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WhyScoreButton({ match, title, testId }: { match: MatchResult; title: string; testId: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={testId}
        className={cn("inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline-offset-4 transition-colors hover:text-teal-900 hover:underline")}>
        <Info className="size-3.5" /> {t("Why this score?")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="match-breakdown-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ScoreRing score={match.total} size={52} /> <span>{title}</span>
            </DialogTitle>
            <DialogDescription>
              {t("Transparent weighted formula: each criterion's score × its weight = points. Total = sum of points.")}
            </DialogDescription>
          </DialogHeader>
          <BreakdownList match={match} />
          <p className="text-xs text-slate-500">{t("✓ = matched · + = would raise the score")}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
