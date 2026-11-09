import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "@/components/AppShell";
import { EmptyState, StatCard, StatusBadge } from "@/components/Bits";
import { apiGet } from "@/lib/api";
import { fmtDate } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Application } from "@/lib/types";

export default function StudentApplications() {
  const { t, lang } = useT();
  const { data = [], isLoading } = useQuery({ queryKey: ["my-applications"], queryFn: () => apiGet<Application[]>("/student/applications") });
  const count = (s: string) => data.filter((a) => a.status === s).length;

  return (
    <AppShell title={t("My applications")} subtitle={t("Track the status of every training application.")}>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label={t("pending")} value={count("pending")} testId="apps-count-pending" />
        <StatCard label={t("accepted")} value={count("accepted")} testId="apps-count-accepted" />
        <StatCard label={t("rejected")} value={count("rejected")} testId="apps-count-rejected" />
      </div>
      {!isLoading && data.length === 0 ? (
        <EmptyState text={t("You haven't applied yet. Explore your recommendations to get started.")} testId="apps-empty" />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Opportunity")}</TableHead>
                <TableHead>{t("Company")}</TableHead>
                <TableHead>{t("Match")}</TableHead>
                <TableHead>{t("Applied")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Evaluation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id} data-testid={`app-row-${a.id}`}>
                  <TableCell className="font-medium">{a.opportunity_title}</TableCell>
                  <TableCell>{a.company_name}</TableCell>
                  <TableCell className="font-mono">{a.match_score}%</TableCell>
                  <TableCell>{fmtDate(a.created_at, lang)}</TableCell>
                  <TableCell><StatusBadge status={a.status} testId={`app-status-${a.id}`} /></TableCell>
                  <TableCell>
                    {a.evaluation ? (
                      <span className="inline-flex items-center gap-1 text-sm" title={a.evaluation.comments}>
                        <Star className="size-3.5 fill-amber-400 text-amber-400" /> {a.evaluation.score}/100
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
