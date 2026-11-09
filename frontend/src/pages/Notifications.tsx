import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Bits";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { errMsg, useMe } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Company, CompanyEmailPrefs, EmailPrefs, Notification, StudentProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL_LABEL: Record<string, string> = {
  sent: "Emailed", queued: "Email sending", failed: "Email failed", off: "Email off", skipped: "Sample account — no email",
};

function EmailPrefsCard() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data: p } = useQuery({ queryKey: ["student-profile"], queryFn: () => apiGet<StudentProfile>("/student/profile") });
  const save = useMutation({
    mutationFn: (prefs: EmailPrefs) => apiPut<StudentProfile>("/student/email-prefs", prefs),
    onSuccess: (sp) => { qc.setQueryData(["student-profile"], sp); toast.success(t("Email preferences saved")); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  if (!p) return null;
  const prefs = p.email_prefs;
  const rows: [keyof EmailPrefs, string, string][] = [
    ["status_updates", "Application status updates", "When a company accepts, rejects or re-opens your application."],
    ["new_opportunities", "New matching opportunities", "When a company posts an opportunity in your major with a match score of 60% or more."],
    ["weekly_digest", "Weekly digest", "Every Sunday at 9:00 (Amman): your top 3 new matches and one development opportunity."],
  ];
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5" data-testid="email-prefs-card">
      <div className="flex items-center gap-2 font-heading font-semibold text-slate-900"><Mail className="size-4 text-teal-700" /> {t("Email alerts")}</div>
      <p className="mt-1 text-xs text-slate-500">{t("Sent to")} <b>{p.email}</b>. {t("In-app notifications always stay on.")}</p>
      {p.generated && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800" data-testid="email-prefs-sample-note">{t("This is a generated sample account with a made-up address, so no real emails are sent to it.")}</p>}
      <div className="mt-4 space-y-3">
        {rows.map(([k, label, hint]) => (
          <label key={k} className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={prefs[k]} disabled={save.isPending} onCheckedChange={(v: boolean) => save.mutate({ ...prefs, [k]: v })} data-testid={`email-pref-${k}`} />
            <span><span className="block text-sm font-medium text-slate-900">{t(label)}</span><span className="block text-xs text-slate-500">{t(hint)}</span></span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CompanyEmailPrefsCard() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data: c } = useQuery({ queryKey: ["company-profile"], queryFn: () => apiGet<Company>("/company/profile") });
  const { data: me } = useMe();
  const save = useMutation({
    mutationFn: (prefs: CompanyEmailPrefs) => apiPut<Company>("/company/email-prefs", prefs),
    onSuccess: (co) => { qc.setQueryData(["company-profile"], co); toast.success(t("Email preferences saved")); },
    onError: (e) => toast.error(t(errMsg(e))),
  });
  if (!c) return null;
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5" data-testid="company-email-prefs-card">
      <div className="flex items-center gap-2 font-heading font-semibold text-slate-900"><Mail className="size-4 text-teal-700" /> {t("Email alerts")}</div>
      <p className="mt-1 text-xs text-slate-500">{t("Sent to")} <b>{me?.user.email}</b>. {t("In-app notifications always stay on.")}</p>
      {c.generated && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800" data-testid="company-email-prefs-sample-note">{t("This is a generated sample account with a made-up address, so no real emails are sent to it.")}</p>}
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <Checkbox checked={c.email_prefs.new_applications} disabled={save.isPending}
          onCheckedChange={(v: boolean) => save.mutate({ new_applications: v })} data-testid="email-pref-new_applications" />
        <span><span className="block text-sm font-medium text-slate-900">{t("New applications")}</span>
          <span className="block text-xs text-slate-500">{t("When a student applies to one of your opportunities, with their match score.")}</span></span>
      </label>
    </div>
  );
}

export default function Notifications() {
  const { t, lang } = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data = [], isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => apiGet<Notification[]>("/notifications") });
  const inv = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const readOne = useMutation({ mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`), onSuccess: inv });
  const readAll = useMutation({ mutationFn: () => apiPost("/notifications/read-all"), onSuccess: inv });

  return (
    <AppShell title={t("Notifications")} subtitle={t("Application updates and new opportunities.")}
      actions={<Button variant="outline" onClick={() => readAll.mutate()} data-testid="notifications-page-read-all">{t("Mark all read")}</Button>}>
      {me?.user.role === "student" && <EmailPrefsCard />}
      {me?.user.role === "company" && <CompanyEmailPrefsCard />}
      <div className="space-y-2">
        {!isLoading && data.length === 0 && <EmptyState text={t("No notifications yet")} testId="notifications-empty" />}
        {data.map((n) => (
          <button key={n.id} onClick={() => { readOne.mutate(n.id); if (n.link) navigate(n.link); }} data-testid={`notifications-row-${n.id}`}
            className={cn("flex w-full items-start gap-4 rounded-xl border bg-white p-4 text-start transition-colors hover:border-teal-300",
              !n.read && "border-teal-200 bg-teal-50/40")}>
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-slate-300" : "bg-teal-600")} />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{n.title}</div>
              <p className="text-sm text-slate-600">{n.body}</p>
              {n.email_status && (
                <span className={cn("mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
                  n.email_status === "sent" ? "bg-emerald-50 text-emerald-800" : n.email_status === "failed" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600")}
                  data-testid={`notification-email-status-${n.id}`}>
                  <Mail className="size-3" /> {t(EMAIL_LABEL[n.email_status])}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString(lang === "ar" ? "ar-JO" : "en-GB")}</span>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
