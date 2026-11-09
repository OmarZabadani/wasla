import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import type { AppStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Disclaimer({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <div className={cn("flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900", className)}
      data-testid="data-disclaimer">
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p>
        {t("Sample data is generated from templates. Recommendations currently use a transparent weighted formula — not a trained ML model. The AI becomes truly data-driven only after learning from real admission decisions.")}
      </p>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  approved: "bg-emerald-100 text-emerald-800",
  open: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-700",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status, testId }: { status: AppStatus | string; testId?: string }) {
  const { t } = useT();
  return (
    <Badge className={cn("border-0 capitalize", STATUS_STYLE[status] ?? "bg-slate-100 text-slate-700")} data-testid={testId}>
      {t(status)}
    </Badge>
  );
}

export function GeneratedBadge() {
  const { t } = useT();
  return (
    <Badge variant="outline" className="border-dashed border-amber-400 text-[10px] text-amber-700" data-testid="generated-badge">
      {t("Generated sample")}
    </Badge>
  );
}

export function StatCard({ label, value, hint, testId }: { label: string; value: string | number; hint?: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]" data-testid={testId}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ text, testId }: { text: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500" data-testid={testId}>
      {text}
    </div>
  );
}
