import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GeneratedBadge, StatusBadge } from "@/components/Bits";
import { ScoreRing, WhyScoreButton } from "@/components/Match";
import { apiGet, apiPatch, apiPut } from "@/lib/api";
import { errMsg } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Applicant, AppStatus, Application, Opportunity, StudentProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StudentSheet({ student, onClose }: { student: StudentProfile | null; onClose: () => void }) {
  const { t } = useT();
  return (
    <Sheet open={!!student} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" data-testid="student-sheet">
        {student && (
          <>
            <SheetHeader>
              <SheetTitle className="font-heading text-xl">{student.name}</SheetTitle>
              <p className="text-sm text-slate-600">{t(student.major)} · {student.city} · GPA {student.gpa.toFixed(2)}</p>
              {student.generated && <GeneratedBadge />}
            </SheetHeader>
            <div className="space-y-5 px-4 pb-8 text-sm">
              {student.bio && <p className="text-slate-700">{student.bio}</p>}
              <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Courses & grades")}</div>
                <div className="grid grid-cols-2 gap-1">{student.courses.map((c) => <div key={c.name} className="flex justify-between rounded bg-slate-50 px-2 py-1"><span>{c.name}</span><b>{c.grade}</b></div>)}</div></div>
              <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Skills")}</div>
                <div className="flex flex-wrap gap-1">{student.skills.map((s) => <span key={s.name} className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-800">{s.name} · {t(s.level)}</span>)}</div></div>
              {student.external_courses.length > 0 && <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("External courses")}</div>
                <ul className="list-disc ps-5">{student.external_courses.map((e) => <li key={e.title}>{e.title} — {e.provider}</li>)}</ul></div>}
              {student.projects.length > 0 && <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Projects")}</div>
                <ul className="space-y-1">{student.projects.map((p) => <li key={p.title}><b>{p.title}</b> · {p.tech.join(", ")}</li>)}</ul></div>}
              <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Contact")}</div><p>{student.email} · {student.phone}</p></div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function CompanyOpportunity() {
  const { id = "" } = useParams();
  const { t } = useT();
  const qc = useQueryClient();
  const opp = useQuery({ queryKey: ["company-opp", id], queryFn: () => apiGet<Opportunity>(`/company/opportunities/${id}`) });
  const list = useQuery({ queryKey: ["applicants", id], queryFn: () => apiGet<Applicant[]>(`/company/opportunities/${id}/applicants`) });
  const [view, setView] = useState<StudentProfile | null>(null);
  const [evalApp, setEvalApp] = useState<Application | null>(null);
  const [score, setScore] = useState(80);
  const [comments, setComments] = useState("");
  const inv = () => { qc.invalidateQueries({ queryKey: ["applicants", id] }); qc.invalidateQueries({ queryKey: ["company-apps"] }); };

  const status = useMutation({
    mutationFn: ({ appId, s }: { appId: string; s: AppStatus }) => apiPatch<Application>(`/company/applications/${appId}/status`, { status: s }),
    onSuccess: (a) => { toast.success(`${t("Status updated")}: ${t(a.status)}`); inv(); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const evaluate = useMutation({
    mutationFn: () => apiPut<Application>(`/company/applications/${evalApp!.id}/evaluation`, { score, comments }),
    onSuccess: () => { toast.success(t("Evaluation saved")); setEvalApp(null); inv(); },
    onError: (e) => toast.error(t(errMsg(e))),
  });

  return (
    <AppShell title={opp.data?.title ?? t("Applicants")} subtitle={t("Applicants ranked by match score. Every score is explainable.")}
      actions={<Link to="/company" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline" data-testid="back-to-company"><ArrowLeft className="size-4 rtl:rotate-180" /> {t("Back")}</Link>}>
      {list.data?.length === 0 && <EmptyState text={t("No applicants yet.")} testId="applicants-empty" />}
      <div className="space-y-3">
        {(list.data ?? []).map(({ application: a, student: s, match }, i) => (
          <div key={a.id} className="grid items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[auto_1fr_auto]" data-testid={`applicant-${a.id}`}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-400">#{i + 1}</span>
              <ScoreRing score={match.total} size={60} testId={`applicant-score-${a.id}`} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <button className="font-semibold text-slate-900 hover:text-teal-700 hover:underline" onClick={() => setView(s)} data-testid={`applicant-view-${a.id}`}>{s.name}</button>
                <StatusBadge status={a.status} testId={`applicant-status-${a.id}`} />
                {s.generated && <GeneratedBadge />}
              </div>
              <div className="text-xs text-slate-500">{t(s.major)} · {s.city} · GPA {s.gpa.toFixed(2)}</div>
              {a.cover_note && <p className="line-clamp-1 text-xs italic text-slate-600">“{a.cover_note}”</p>}
              <WhyScoreButton match={match} title={s.name} testId={`applicant-why-${a.id}`} />
              {a.evaluation && <div className="inline-flex items-center gap-1 text-xs text-slate-700"><Star className="size-3 fill-amber-400 text-amber-400" /> {a.evaluation.score}/100</div>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["accepted", "rejected", "pending"] as const).map((st) => (
                <Button key={st} size="sm" variant="outline" disabled={a.status === st || status.isPending} onClick={() => status.mutate({ appId: a.id, s: st })}
                  className={cn(st === "accepted" && "border-emerald-300 text-emerald-800 hover:bg-emerald-50", st === "rejected" && "border-rose-300 text-rose-700 hover:bg-rose-50")}
                  data-testid={`applicant-set-${st}-${a.id}`}>
                  {t(st === "accepted" ? "Accept" : st === "rejected" ? "Reject" : "Reset")}
                </Button>
              ))}
              {a.status === "accepted" && (
                <Button size="sm" className="gap-1 bg-amber-500 text-white hover:bg-amber-600" data-testid={`applicant-evaluate-${a.id}`}
                  onClick={() => { setEvalApp(a); setScore(a.evaluation?.score ?? 80); setComments(a.evaluation?.comments ?? ""); }}>
                  <Star className="size-3.5" /> {t("Evaluate")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <StudentSheet student={view} onClose={() => setView(null)} />
      <Dialog open={!!evalApp} onOpenChange={(o) => !o && setEvalApp(null)}>
        <DialogContent data-testid="evaluation-dialog">
          <DialogHeader><DialogTitle>{t("Trainee evaluation")} · {evalApp?.student_name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5"><Label>{t("Score (0–100)")}</Label><Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value))))} data-testid="evaluation-score-input" /></div>
          <div className="space-y-1.5"><Label>{t("Comments")}</Label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} data-testid="evaluation-comments-input" /></div>
          <DialogFooter><Button onClick={() => evaluate.mutate()} disabled={evaluate.isPending} className="bg-teal-700 text-white hover:bg-teal-800" data-testid="evaluation-save-btn">{t("Save evaluation")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
