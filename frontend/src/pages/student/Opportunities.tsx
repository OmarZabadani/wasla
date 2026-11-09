import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { Disclaimer, EmptyState, StatusBadge } from "@/components/Bits";
import { FactorBars, ScoreRing, WhyScoreButton } from "@/components/Match";
import SimpleSelect from "@/components/SimpleSelect";
import { apiGet, apiPost } from "@/lib/api";
import { errMsg } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Application, Recommendation } from "@/lib/types";

export default function StudentOpportunities() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["recommendations"], queryFn: () => apiGet<Recommendation[]>("/student/recommendations") });
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const [target, setTarget] = useState<Recommendation | null>(null);
  const [note, setNote] = useState("");

  const list = useMemo(() => data.filter((r) => {
    const o = r.opportunity;
    const hay = `${o.title} ${o.company_name} ${o.required_skills.join(" ")}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!mode || o.mode === mode);
  }), [data, q, mode]);

  const apply = useMutation({
    mutationFn: () => apiPost<Application>("/student/applications", { opportunity_id: target!.opportunity.id, cover_note: note }),
    onSuccess: () => {
      toast.success(t("Application submitted"));
      setTarget(null); setNote("");
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (e) => toast.error(t(errMsg(e))),
  });

  return (
    <AppShell title={t("Recommended opportunities")} subtitle={t("Ranked by your match score. Open “Why this score?” to see exactly how each criterion contributed.")}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder={t("Search title, company or skill")} value={q} onChange={(e) => setQ(e.target.value)} data-testid="opps-search-input" />
        <SimpleSelect className="w-44" value={mode} onChange={setMode} testId="opps-mode-filter"
          options={[{ value: "", label: t("All modes") }, ...["onsite", "hybrid", "remote"].map((m) => ({ value: m, label: t(m) }))]} />
      </div>
      <div className="space-y-4">
        {!isLoading && list.length === 0 && <EmptyState text={t("No opportunities match your filters.")} testId="opps-empty" />}
        {list.map((r, i) => {
          const o = r.opportunity;
          const skillsF = r.match.factors.find((f) => f.key === "skills");
          return (
            <div key={o.id} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow duration-200 hover:shadow-md sm:grid-cols-[auto_1fr_auto]" data-testid={`opp-card-${o.id}`}>
              <div className="flex items-center gap-3 sm:flex-col">
                <span className="font-mono text-xs text-slate-400">#{i + 1}</span>
                <ScoreRing score={r.match.total} size={72} testId={`opp-score-${o.id}`} />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="text-xs font-semibold text-teal-700">{o.company_name}</div>
                <h3 className="font-heading text-lg font-bold text-slate-900">{o.title}</h3>
                <p className="line-clamp-2 text-sm text-slate-600">{o.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {o.city} · {t(o.mode)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {o.duration_weeks} {t("weeks")}</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3" /> {o.seats} {t("seats")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {o.required_skills.map((s) => (
                    <span key={s} className={skillsF?.matched.includes(s) ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800 ring-1 ring-emerald-200" : "rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"}>{s}</span>
                  ))}
                </div>
                <FactorBars match={r.match} />
                <WhyScoreButton match={r.match} title={o.title} testId={`opp-why-${o.id}`} />
              </div>
              <div className="flex items-start sm:justify-end">
                {r.application_status ? (
                  <StatusBadge status={r.application_status} testId={`opp-status-${o.id}`} />
                ) : (
                  <Button onClick={() => setTarget(r)} className="bg-teal-700 text-white hover:bg-teal-800" data-testid={`opp-apply-btn-${o.id}`}>{t("Apply")}</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Disclaimer className="mt-8" />

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent data-testid="apply-dialog">
          <DialogHeader>
            <DialogTitle>{t("Apply to")} {target?.opportunity.title}</DialogTitle>
            <DialogDescription>{target?.opportunity.company_name} · {t("Your match score")}: {target?.match.total}%</DialogDescription>
          </DialogHeader>
          <Textarea placeholder={t("Short note to the company (optional)")} value={note} onChange={(e) => setNote(e.target.value)} data-testid="apply-note-input" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} data-testid="apply-cancel-btn">{t("Cancel")}</Button>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending} className="bg-teal-700 text-white hover:bg-teal-800" data-testid="apply-confirm-btn">
              {apply.isPending ? t("Submitting…") : t("Submit application")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
