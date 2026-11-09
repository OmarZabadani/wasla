import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Printer, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { errMsg, fmtDate } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { CV } from "@/lib/types";
import { cn } from "@/lib/utils";

const H = {
  en: { summary: "Professional Summary", objective: "Career Objective", education: "Education", courses: "Relevant Courses & Grades",
    skills: "Skills", external: "External Courses & Certificates", projects: "Projects", languages: "Languages", interests: "Interests", year: "Year", gpa: "GPA" },
  ar: { summary: "الملخص المهني", objective: "الهدف المهني", education: "التعليم", courses: "المواد الدراسية والعلامات",
    skills: "المهارات", external: "الدورات والشهادات الخارجية", projects: "المشاريع", languages: "اللغات", interests: "الاهتمامات", year: "السنة", gpa: "المعدل" },
};

function CVPaper({ cv }: { cv: CV }) {
  const c = cv.content;
  const h = H[cv.lang];
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-6">
      <h3 className="border-b-2 border-teal-700 pb-1 font-heading text-sm font-bold uppercase tracking-wider text-teal-800">{title}</h3>
      <div className="mt-2.5 text-[13px] leading-relaxed text-slate-800">{children}</div>
    </section>
  );
  return (
    <div id="cv-print" dir={cv.lang === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-[820px] bg-white p-10 shadow-xl ring-1 ring-slate-200 sm:p-14" data-testid="cv-paper">
      <header className="border-b border-slate-200 pb-5">
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900" data-testid="cv-name">{c.name}</h2>
        <p className="mt-1 text-sm font-semibold text-teal-700">{c.major} · {c.university}</p>
        <p className="mt-2 text-xs text-slate-600">{[c.email, c.phone, c.city].filter(Boolean).join("  ·  ")}</p>
      </header>
      <Sec title={h.summary}><p data-testid="cv-summary">{c.summary}</p></Sec>
      <Sec title={h.objective}><p data-testid="cv-objective">{c.objective}</p></Sec>
      <Sec title={h.education}>
        <div className="flex justify-between"><b>{c.university}</b><span>{h.gpa}: {c.gpa.toFixed(2)} / 4.00</span></div>
        <div>{c.major} · {h.year} {c.year_level}</div>
      </Sec>
      {c.courses.length > 0 && (
        <Sec title={h.courses}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            {c.courses.map((x) => <div key={x.name} className="flex justify-between"><span>{x.name}</span><b>{x.grade}</b></div>)}
          </div>
        </Sec>
      )}
      {c.skills.length > 0 && <Sec title={h.skills}><p>{c.skills.map((s) => s.name).join(" · ")}</p></Sec>}
      {c.external_courses.length > 0 && (
        <Sec title={h.external}>
          <ul className="space-y-1">{c.external_courses.map((e) => <li key={e.title}><b>{e.title}</b>{e.provider && ` — ${e.provider}`}{e.year && ` (${e.year})`}</li>)}</ul>
        </Sec>
      )}
      {c.projects.length > 0 && (
        <Sec title={h.projects}>
          <ul className="space-y-2">{c.projects.map((p) => (
            <li key={p.title}><b>{p.title}</b>{p.tech.length > 0 && <span className="text-slate-500"> · {p.tech.join(", ")}</span>}<div>{p.description}</div></li>
          ))}</ul>
        </Sec>
      )}
      <div className="grid grid-cols-2 gap-8">
        {c.languages.length > 0 && <Sec title={h.languages}><p>{c.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(" · ")}</p></Sec>}
        {c.interests.length > 0 && <Sec title={h.interests}><p>{c.interests.join(" · ")}</p></Sec>}
      </div>
    </div>
  );
}

function CVEditor({ cv }: { cv: CV }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [summary, setSummary] = useState(cv.content.summary);
  const [objective, setObjective] = useState(cv.content.objective);
  const [approved, setApproved] = useState(cv.approved);
  const save = useMutation({
    mutationFn: () => apiPut<CV>("/student/cv", { summary, objective, approved }),
    onSuccess: (d) => { qc.setQueryData(["cv"], d); toast.success(t("CV saved")); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm font-semibold text-slate-900">{t("Review the draft")}</div>
      <p className="text-xs text-slate-500">{t("AI text is a draft. Check every line — you must approve your CV before sharing it.")}</p>
      <div className="space-y-1.5"><Label>{t("Professional summary")}</Label><Textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} dir="auto" data-testid="cv-summary-input" /></div>
      <div className="space-y-1.5"><Label>{t("Career objective")}</Label><Textarea rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} dir="auto" data-testid="cv-objective-input" /></div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={approved} onCheckedChange={(v: boolean) => setApproved(v)} data-testid="cv-approve-checkbox" /> {t("I reviewed and approve this CV")}
      </label>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-teal-700 text-white hover:bg-teal-800" data-testid="cv-save-btn">{t("Save changes")}</Button>
    </div>
  );
}

export default function StudentCV() {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const { data: cv, isLoading } = useQuery({ queryKey: ["cv"], queryFn: () => apiGet<CV | null>("/student/cv") });
  const [cvLang, setCvLang] = useState<"en" | "ar">(lang);
  const gen = useMutation({
    mutationFn: () => apiPost<CV>(`/student/cv/generate?lang=${cvLang}`),
    onSuccess: (d) => { qc.setQueryData(["cv"], d); toast.success(d.ai_generated ? t("CV generated with AI") : t("CV generated from template (AI unavailable)")); },
    onError: (e) => toast.error(t(errMsg(e))),
  });

  const controls = (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div className="flex rounded-lg bg-slate-100 p-1">
        {(["en", "ar"] as const).map((l) => (
          <button key={l} onClick={() => setCvLang(l)} data-testid={`cv-lang-${l}`}
            className={cn("rounded-md px-3 py-1 text-xs font-semibold transition-colors", cvLang === l ? "bg-white shadow-sm" : "text-slate-500")}>{l === "en" ? "English" : "العربية"}</button>
        ))}
      </div>
      <Button onClick={() => gen.mutate()} disabled={gen.isPending} className="gap-2 bg-teal-700 text-white hover:bg-teal-800" data-testid="cv-generate-btn">
        {cv ? <RefreshCw className={cn("size-4", gen.isPending && "animate-spin")} /> : <Sparkles className="size-4" />}
        {gen.isPending ? t("Generating…") : cv ? t("Regenerate") : t("Generate CV")}
      </Button>
      {cv && <Button variant="outline" className="gap-2" onClick={() => window.print()} data-testid="cv-print-btn"><Printer className="size-4" /> {t("Print / PDF")}</Button>}
    </div>
  );

  return (
    <AppShell title={t("AI CV")} subtitle={t("Built from your profile using a structured template, with AI-assisted wording (Claude Sonnet 4.5).")} actions={controls}>
      {!isLoading && !cv && !gen.isPending && (
        <div className="rounded-3xl border border-dashed border-teal-300 bg-teal-50/50 p-12 text-center" data-testid="cv-empty">
          <Sparkles className="mx-auto size-8 text-teal-600" />
          <p className="mt-3 font-heading text-lg font-semibold text-slate-900">{t("No CV yet")}</p>
          <p className="mt-1 text-sm text-slate-600">{t("Choose a language and press Generate CV. It takes about 10–20 seconds.")}</p>
        </div>
      )}
      {gen.isPending && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" data-testid="cv-generating" />}
      {cv && !gen.isPending && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <CVPaper cv={cv} />
          <div className="space-y-4 print:hidden">
            <div className="flex flex-wrap gap-2">
              <Badge className={cn("border-0", cv.ai_generated ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700")} data-testid="cv-source-badge">
                {cv.ai_generated ? t("AI-assisted") : t("Template only")}
              </Badge>
              {cv.approved && <Badge className="gap-1 border-0 bg-emerald-100 text-emerald-800" data-testid="cv-approved-badge"><CheckCircle2 className="size-3" /> {t("Approved")}</Badge>}
              <span className="text-xs text-slate-500">{fmtDate(cv.generated_at, lang)}</span>
            </div>
            <CVEditor key={cv.id + cv.generated_at} cv={cv} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
