import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GeneratedBadge } from "@/components/Bits";
import { ScoreRing, WhyScoreButton } from "@/components/Match";
import SimpleSelect from "@/components/SimpleSelect";
import { apiGet } from "@/lib/api";
import { useMeta } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Opportunity, StudentProfile, StudentSearchResult } from "@/lib/types";
import { StudentSheet } from "@/pages/company/OpportunityApplicants";

export default function CompanySearch() {
  const { t } = useT();
  const meta = useMeta();
  const [major, setMajor] = useState("");
  const [skill, setSkill] = useState("");
  const [city, setCity] = useState("");
  const [oppId, setOppId] = useState("");
  const [view, setView] = useState<StudentProfile | null>(null);
  const opps = useQuery({ queryKey: ["company-opps"], queryFn: () => apiGet<Opportunity[]>("/company/opportunities") });
  const params = new URLSearchParams({ major, skill: skill.trim(), city, opportunity_id: oppId }).toString();
  const { data = [], isFetching } = useQuery({ queryKey: ["student-search", params], queryFn: () => apiGet<StudentSearchResult[]>(`/company/students/search?${params}`) });

  return (
    <AppShell title={t("Find students")} subtitle={t("Search by specialization, skills and location. Pick one of your opportunities to rank students by match score.")}>
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5"><Label>{t("Major")}</Label>
          <SimpleSelect value={major} onChange={setMajor} testId="search-major-select" options={[{ value: "", label: t("All majors") }, ...(meta.data?.majors ?? []).map((m) => ({ value: m, label: t(m) }))]} /></div>
        <div className="space-y-1.5"><Label>{t("Skill")}</Label><Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Python" data-testid="search-skill-input" /></div>
        <div className="space-y-1.5"><Label>{t("City")}</Label>
          <SimpleSelect value={city} onChange={setCity} testId="search-city-select" options={[{ value: "", label: t("All cities") }, ...(meta.data?.cities ?? []).map((c) => ({ value: c, label: c }))]} /></div>
        <div className="space-y-1.5"><Label>{t("Rank against opportunity")}</Label>
          <SimpleSelect value={oppId} onChange={setOppId} testId="search-opp-select" options={[{ value: "", label: t("None (sort by GPA)") }, ...(opps.data ?? []).map((o) => ({ value: o.id, label: o.title }))]} /></div>
      </div>
      <div className="mb-3 text-sm text-slate-500" data-testid="search-result-count">{isFetching ? t("Searching…") : `${data.length} ${t("students found")}`}</div>
      {!isFetching && data.length === 0 && <EmptyState text={t("No students match these filters.")} testId="search-empty" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map(({ student: s, match }) => (
          <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow duration-200 hover:shadow-md" data-testid={`search-student-${s.id}`}>
            <div className="flex items-start gap-3">
              {match && <ScoreRing score={match.total} size={56} />}
              <div className="min-w-0 flex-1">
                <button className="font-semibold text-slate-900 hover:text-teal-700 hover:underline" onClick={() => setView(s)} data-testid={`search-view-${s.id}`}>{s.name}</button>
                <div className="text-xs text-slate-500">{t(s.major)} · GPA {s.gpa.toFixed(2)}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3" /> {s.city}</div>
              </div>
              {s.generated && <GeneratedBadge />}
            </div>
            <div className="flex flex-wrap gap-1">{s.skills.slice(0, 6).map((sk) => <span key={sk.name} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">{sk.name}</span>)}</div>
            {match && <WhyScoreButton match={match} title={s.name} testId={`search-why-${s.id}`} />}
          </div>
        ))}
      </div>
      <StudentSheet student={view} onClose={() => setView(null)} />
    </AppShell>
  );
}
