import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { GeneratedBadge } from "@/components/Bits";
import SimpleSelect from "@/components/SimpleSelect";
import TagInput from "@/components/TagInput";
import { apiGet, apiPut } from "@/lib/api";
import { GRADES, errMsg, useMeta } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Question, StudentProfile, StudentProfileIn } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const rowKey = () => crypto.randomUUID();

function Row({ children, onRemove, testId }: { children: React.ReactNode; onRemove: () => void; testId: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid flex-1 gap-2 sm:grid-cols-12">{children}</div>
      <Button variant="ghost" size="icon-sm" onClick={onRemove} data-testid={testId} aria-label="remove"><Trash2 className="size-4 text-rose-600" /></Button>
    </div>
  );
}

function Editor({ initial }: { initial: StudentProfile }) {
  const { t } = useT();
  const qc = useQueryClient();
  const meta = useMeta();
  const [d, setD] = useState<StudentProfileIn>({
    phone: initial.phone, university_id: initial.university_id, major: initial.major, year_level: initial.year_level,
    city: initial.city, bio: initial.bio, languages: initial.languages, courses: initial.courses,
    external_courses: initial.external_courses, skills: initial.skills, projects: initial.projects, interests: initial.interests,
  });
  type ListKey = "courses" | "external_courses" | "skills" | "projects" | "languages";
  const [keys, setKeys] = useState<Record<ListKey, string[]>>(() => ({
    courses: initial.courses.map(rowKey), external_courses: initial.external_courses.map(rowKey),
    skills: initial.skills.map(rowKey), projects: initial.projects.map(rowKey), languages: initial.languages.map(rowKey),
  }));
  const set = <K extends keyof StudentProfileIn>(k: K, v: StudentProfileIn[K]) => setD((p) => ({ ...p, [k]: v }));
  const add = <K extends ListKey>(k: K, item: StudentProfileIn[K][number]) => {
    setKeys((ks) => ({ ...ks, [k]: [...ks[k], rowKey()] }));
    setD((p) => ({ ...p, [k]: [...(p[k] as StudentProfileIn[K][number][]), item] }));
  };
  const upd = <K extends "courses" | "external_courses" | "skills" | "projects" | "languages">(k: K, i: number, patch: Partial<StudentProfileIn[K][number]>) =>
    setD((p) => ({ ...p, [k]: (p[k] as StudentProfileIn[K][number][]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const del = (k: ListKey, i: number) => {
    setKeys((ks) => ({ ...ks, [k]: ks[k].filter((_, j) => j !== i) }));
    setD((p) => ({ ...p, [k]: (p[k] as unknown[]).filter((_, j) => j !== i) }));
  };

  const save = useMutation({
    mutationFn: () => apiPut<StudentProfile>("/student/profile", d),
    onSuccess: (p) => {
      qc.setQueryData(["student-profile"], p);
      ["recommendations", "gaps"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t("Profile saved"));
    },
    onError: (e) => toast.error(t(errMsg(e))),
  });

  const questions = useQuery({ queryKey: ["questions"], queryFn: () => apiGet<Question[]>("/questions") });
  const [answers, setAnswers] = useState<Record<string, string>>(initial.answers);
  const saveAnswers = useMutation({
    mutationFn: () => apiPut<StudentProfile>("/student/answers", { answers }),
    onSuccess: (p) => { qc.setQueryData(["student-profile"], p); qc.invalidateQueries({ queryKey: ["recommendations"] }); toast.success(t("Answers saved")); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const { lang } = useT();

  const saveBtn = (
    <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 bg-teal-700 text-white hover:bg-teal-800" data-testid="profile-save-btn">
      <Save className="size-4" /> {save.isPending ? t("Saving…") : t("Save profile")}
    </Button>
  );
  const addBtn = (label: string, onClick: () => void, testId: string) => (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={onClick} data-testid={testId}><Plus className="size-4" /> {t(label)}</Button>
  );

  return (
    <AppShell title={t("Academic profile")} subtitle={t("The more complete your profile, the more accurate your match scores and CV.")} actions={saveBtn}>
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>{initial.name} · {initial.email}</span> {initial.generated && <GeneratedBadge />}
        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-semibold text-teal-800" data-testid="profile-gpa">GPA {initial.gpa.toFixed(2)}</span>
      </div>
      <Tabs defaultValue="personal">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          {[["personal", "Personal"], ["courses", "Courses & grades"], ["external", "External courses"], ["skills", "Skills"], ["projects", "Projects"], ["interests", "Interests"], ["questions", "AI profiling questions"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} data-testid={`profile-tab-${v}`}>{t(l)}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="personal">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>{t("Major")}</Label>
              <SimpleSelect value={d.major} onChange={(v) => set("major", v)} testId="profile-major-select" options={(meta.data?.majors ?? []).map((m) => ({ value: m, label: t(m) }))} /></div>
            <div className="space-y-1.5"><Label>{t("University ID")}</Label><Input value={d.university_id} onChange={(e) => set("university_id", e.target.value)} data-testid="profile-uid-input" /></div>
            <div className="space-y-1.5"><Label>{t("Phone")}</Label><Input value={d.phone} onChange={(e) => set("phone", e.target.value)} data-testid="profile-phone-input" /></div>
            <div className="space-y-1.5"><Label>{t("Academic year")}</Label>
              <SimpleSelect value={String(d.year_level)} onChange={(v) => set("year_level", Number(v))} testId="profile-year-select" options={["1", "2", "3", "4", "5"].map((y) => ({ value: y, label: y }))} /></div>
            <div className="space-y-1.5"><Label>{t("City of residence")}</Label>
              <SimpleSelect value={d.city} onChange={(v) => set("city", v)} testId="profile-city-select" options={(meta.data?.cities ?? []).map((c) => ({ value: c, label: c }))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>{t("Short bio")}</Label><Textarea value={d.bio} onChange={(e) => set("bio", e.target.value)} data-testid="profile-bio-input" /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("Languages")}</Label>
              {d.languages.map((l, i) => (
                <Row key={keys.languages[i]} onRemove={() => del("languages", i)} testId={`language-remove-${i}`}>
                  <Input className="sm:col-span-6" placeholder={t("Language")} value={l.name} onChange={(e) => upd("languages", i, { name: e.target.value })} data-testid={`language-name-${i}`} />
                  <Input className="sm:col-span-6" placeholder={t("Level")} value={l.level} onChange={(e) => upd("languages", i, { level: e.target.value })} data-testid={`language-level-${i}`} />
                </Row>
              ))}
              {addBtn("Add language", () => add("languages", { name: "", level: "" }), "language-add-btn")}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-2">
          {d.courses.map((c, i) => (
            <Row key={keys.courses[i]} onRemove={() => del("courses", i)} testId={`course-remove-${i}`}>
              <Input className="sm:col-span-2" placeholder={t("Code")} value={c.code} onChange={(e) => upd("courses", i, { code: e.target.value })} data-testid={`course-code-${i}`} />
              <Input className="sm:col-span-6" placeholder={t("Course name")} value={c.name} onChange={(e) => upd("courses", i, { name: e.target.value })} data-testid={`course-name-${i}`} />
              <div className="sm:col-span-2"><SimpleSelect value={c.grade} onChange={(v) => upd("courses", i, { grade: v })} testId={`course-grade-${i}`} options={GRADES.map((g) => ({ value: g, label: g }))} /></div>
              <Input className="sm:col-span-2" type="number" min={1} max={6} value={c.credit_hours} onChange={(e) => upd("courses", i, { credit_hours: Number(e.target.value) || 3 })} data-testid={`course-hours-${i}`} />
            </Row>
          ))}
          {addBtn("Add course", () => add("courses", { code: "", name: "", grade: "B", credit_hours: 3 }), "course-add-btn")}
        </TabsContent>

        <TabsContent value="external" className="space-y-2">
          {d.external_courses.map((c, i) => (
            <Row key={keys.external_courses[i]} onRemove={() => del("external_courses", i)} testId={`external-remove-${i}`}>
              <Input className="sm:col-span-5" placeholder={t("Course / certificate title")} value={c.title} onChange={(e) => upd("external_courses", i, { title: e.target.value })} data-testid={`external-title-${i}`} />
              <Input className="sm:col-span-4" placeholder={t("Provider")} value={c.provider} onChange={(e) => upd("external_courses", i, { provider: e.target.value })} data-testid={`external-provider-${i}`} />
              <Input className="sm:col-span-3" placeholder={t("Year")} value={c.year} onChange={(e) => upd("external_courses", i, { year: e.target.value })} data-testid={`external-year-${i}`} />
              <div className="sm:col-span-12"><TagInput value={c.skills} onChange={(v) => upd("external_courses", i, { skills: v })} placeholder={t("Skills covered (Enter to add)")} testId={`external-skills-${i}`} /></div>
            </Row>
          ))}
          {addBtn("Add external course", () => add("external_courses", { title: "", provider: "", year: "", skills: [] }), "external-add-btn")}
        </TabsContent>

        <TabsContent value="skills" className="space-y-2">
          {d.skills.map((s, i) => (
            <Row key={keys.skills[i]} onRemove={() => del("skills", i)} testId={`skill-remove-${i}`}>
              <Input className="sm:col-span-8" placeholder={t("Skill")} value={s.name} onChange={(e) => upd("skills", i, { name: e.target.value })} data-testid={`skill-name-${i}`} />
              <div className="flex gap-1 sm:col-span-4">
                {LEVELS.map((l) => (
                  <button key={l} type="button" onClick={() => upd("skills", i, { level: l })} data-testid={`skill-level-${i}-${l}`}
                    className={cn("flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors", s.level === l ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                    {t(l)}
                  </button>
                ))}
              </div>
            </Row>
          ))}
          {addBtn("Add skill", () => add("skills", { name: "", level: "intermediate" }), "skill-add-btn")}
        </TabsContent>

        <TabsContent value="projects" className="space-y-2">
          {d.projects.map((p, i) => (
            <Row key={keys.projects[i]} onRemove={() => del("projects", i)} testId={`project-remove-${i}`}>
              <Input className="sm:col-span-6" placeholder={t("Project title")} value={p.title} onChange={(e) => upd("projects", i, { title: e.target.value })} data-testid={`project-title-${i}`} />
              <Input className="sm:col-span-6" placeholder={t("Link (optional)")} value={p.link} onChange={(e) => upd("projects", i, { link: e.target.value })} data-testid={`project-link-${i}`} />
              <Textarea className="sm:col-span-12" placeholder={t("Description")} value={p.description} onChange={(e) => upd("projects", i, { description: e.target.value })} data-testid={`project-desc-${i}`} />
              <div className="sm:col-span-12"><TagInput value={p.tech} onChange={(v) => upd("projects", i, { tech: v })} placeholder={t("Technologies (Enter to add)")} testId={`project-tech-${i}`} /></div>
            </Row>
          ))}
          {addBtn("Add project", () => add("projects", { title: "", description: "", tech: [], link: "" }), "project-add-btn")}
        </TabsContent>

        <TabsContent value="interests">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <Label>{t("Interests (e.g. backend, data, security, ai, fintech)")}</Label>
            <div className="mt-2"><TagInput value={d.interests} onChange={(v) => set("interests", v)} testId="profile-interests-input" /></div>
          </div>
        </TabsContent>

        <TabsContent value="questions">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("These questions fill in what your courses don't say. Your answers feed the 10% interests criterion.")}</p>
            {(questions.data ?? []).map((q) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`question-${q.id}`}>
                <div className="font-semibold text-slate-900">{lang === "ar" && q.text_ar ? q.text_ar : q.text}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <button key={o.value} type="button" onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))} data-testid={`question-${q.id}-opt-${o.value}`}
                      className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", answers[q.id] === o.value ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 text-slate-700 hover:border-teal-300")}>
                      {lang === "ar" && o.label_ar ? o.label_ar : o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={() => saveAnswers.mutate()} disabled={saveAnswers.isPending} className="bg-teal-700 text-white hover:bg-teal-800" data-testid="answers-save-btn">
              {t("Save answers")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

export default function StudentProfilePage() {
  const { t } = useT();
  const { data } = useQuery({ queryKey: ["student-profile"], queryFn: () => apiGet<StudentProfile>("/student/profile") });
  if (!data) return <AppShell title={t("Academic profile")}><div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" /></AppShell>;
  return <Editor initial={data} />;
}
