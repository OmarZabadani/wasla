import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { EmptyState, StatCard, StatusBadge } from "@/components/Bits";
import OpportunityDialog, { EMPTY_OPP } from "@/components/OpportunityDialog";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { errMsg, fmtDate } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Application, Company, CompanyIn, Opportunity, OpportunityIn } from "@/lib/types";

function ProfileDialog({ company, open, onOpenChange }: { company: Company; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [d, setD] = useState<CompanyIn>({ company_name: company.company_name, industry: company.industry, city: company.city,
    description: company.description, website: company.website, size: company.size });
  const save = useMutation({
    mutationFn: () => apiPut<Company>("/company/profile", d),
    onSuccess: (c) => { qc.setQueryData(["company-profile"], c); toast.success(t("Profile saved")); onOpenChange(false); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const field = (k: keyof CompanyIn, label: string) => (
    <div className="space-y-1.5"><Label>{t(label)}</Label><Input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} data-testid={`company-${k}-input`} /></div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="company-profile-dialog">
        <DialogHeader><DialogTitle>{t("Company profile")}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("company_name", "Company name")}{field("industry", "Industry")}{field("city", "City")}{field("size", "Size")}
          <div className="sm:col-span-2">{field("website", "Website")}</div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("Description")}</Label><Textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} data-testid="company-description-input" /></div>
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-teal-700 text-white hover:bg-teal-800" data-testid="company-profile-save-btn">{t("Save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CompanyDashboard() {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const company = useQuery({ queryKey: ["company-profile"], queryFn: () => apiGet<Company>("/company/profile") });
  const opps = useQuery({ queryKey: ["company-opps"], queryFn: () => apiGet<Opportunity[]>("/company/opportunities") });
  const apps = useQuery({ queryKey: ["company-apps"], queryFn: () => apiGet<Application[]>("/company/applications") });
  const [editing, setEditing] = useState<Opportunity | "new" | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const inv = () => { qc.invalidateQueries({ queryKey: ["company-opps"] }); qc.invalidateQueries({ queryKey: ["company-apps"] }); };

  const save = useMutation({
    mutationFn: (d: OpportunityIn) => editing && editing !== "new" ? apiPut<Opportunity>(`/company/opportunities/${editing.id}`, d) : apiPost<Opportunity>("/company/opportunities", d),
    onSuccess: () => { toast.success(t("Opportunity saved")); setEditing(null); inv(); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const toggle = useMutation({
    mutationFn: (o: Opportunity) => apiPut<Opportunity>(`/company/opportunities/${o.id}`, { ...o, status: o.status === "open" ? "closed" : "open" }),
    onSuccess: inv,
    onError: (e) => toast.error(t(errMsg(e))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/company/opportunities/${id}`),
    onSuccess: () => { toast.success(t("Opportunity deleted")); inv(); },
    onError: (e) => toast.error(t(errMsg(e))),
  });

  const c = company.data;
  const approved = c?.approval_status === "approved";
  const appList = apps.data ?? [];

  return (
    <AppShell title={c?.company_name ?? t("Company")} subtitle={c ? `${c.industry} · ${c.city}` : undefined}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setProfileOpen(true)} disabled={!c} data-testid="company-edit-profile-btn">{t("Edit profile")}</Button>
          <Button onClick={() => setEditing("new")} disabled={!approved} className="gap-2 bg-teal-700 text-white hover:bg-teal-800" data-testid="company-post-opp-btn">
            <Plus className="size-4" /> {t("Post opportunity")}
          </Button>
        </div>
      }>
      {c && !approved && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" data-testid="company-pending-banner">
          {c.approval_status === "pending" ? t("Your company is awaiting university approval. You can post opportunities once approved.") : t("Your company registration was rejected by the university. Contact the field training office.")}
        </div>
      )}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("Opportunities")} value={opps.data?.length ?? 0} testId="company-stat-opps" />
        <StatCard label={t("Applications")} value={appList.length} testId="company-stat-apps" />
        <StatCard label={t("pending")} value={appList.filter((a) => a.status === "pending").length} testId="company-stat-pending" />
        <StatCard label={t("accepted")} value={appList.filter((a) => a.status === "accepted").length} testId="company-stat-accepted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-slate-900">{t("Your opportunities")}</h2>
          {opps.data?.length === 0 && <EmptyState text={t("No opportunities posted yet.")} testId="company-opps-empty" />}
          {(opps.data ?? []).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4" data-testid={`company-opp-${o.id}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-900">{o.title}</span><StatusBadge status={o.status} /></div>
                <div className="mt-1 text-xs text-slate-500">{o.city} · {t(o.mode)} · {o.required_skills.join(", ")}</div>
              </div>
              <Link to={`/company/opportunities/${o.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100" data-testid={`company-opp-applicants-${o.id}`}>
                <Users className="size-4" /> {o.applicants_count} {t("applicants")}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => toggle.mutate(o)} data-testid={`company-opp-toggle-${o.id}`}>{t(o.status === "open" ? "Close" : "Reopen")}</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(o)} data-testid={`company-opp-edit-${o.id}`} aria-label="edit"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(t("Delete this opportunity and its applications?"))) remove.mutate(o.id); }} data-testid={`company-opp-delete-${o.id}`} aria-label="delete">
                <Trash2 className="size-4 text-rose-600" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-slate-900">{t("Recent applications")}</h2>
          {appList.length === 0 && <EmptyState text={t("No applications yet.")} testId="company-apps-empty" />}
          {appList.slice(0, 8).map((a) => (
            <Link key={a.id} to={`/company/opportunities/${a.opportunity_id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-teal-300" data-testid={`company-recent-app-${a.id}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{a.student_name}</div>
                <div className="truncate text-xs text-slate-500">{a.opportunity_title} · {fmtDate(a.created_at, lang)}</div>
              </div>
              <span className="font-mono text-xs">{a.match_score}%</span>
              <StatusBadge status={a.status} />
            </Link>
          ))}
        </div>
      </div>

      {editing && (
        <OpportunityDialog open onOpenChange={(o) => !o && setEditing(null)} pending={save.isPending}
          initial={editing === "new" ? EMPTY_OPP : editing} onSubmit={(d) => save.mutate(d)} />
      )}
      {c && profileOpen && <ProfileDialog company={c} open={profileOpen} onOpenChange={setProfileOpen} />}
    </AppShell>
  );
}
