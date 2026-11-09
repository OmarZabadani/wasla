import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SimpleSelect from "@/components/SimpleSelect";
import TagInput from "@/components/TagInput";
import { useMeta } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Mode, OpportunityIn } from "@/lib/types";
import { cn } from "@/lib/utils";

export const EMPTY_OPP: OpportunityIn = {
  title: "", description: "", majors: [], required_skills: [], related_courses: [], tags: [],
  city: "Amman", mode: "onsite", duration_weeks: 8, seats: 2, status: "open",
};

export default function OpportunityDialog({
  open, onOpenChange, initial, onSubmit, pending,
}: { open: boolean; onOpenChange: (o: boolean) => void; initial: OpportunityIn; onSubmit: (d: OpportunityIn) => void; pending: boolean }) {
  const { t } = useT();
  const meta = useMeta();
  const [d, setD] = useState<OpportunityIn>(initial);
  const set = <K extends keyof OpportunityIn>(k: K, v: OpportunityIn[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggleMajor = (m: string) => set("majors", d.majors.includes(m) ? d.majors.filter((x) => x !== m) : [...d.majors, m]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="opportunity-dialog">
        <DialogHeader><DialogTitle>{initial.title ? t("Edit opportunity") : t("Post a training opportunity")}</DialogTitle></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit(d); }} id="opp-form">
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("Title")}</Label><Input required minLength={3} value={d.title} onChange={(e) => set("title", e.target.value)} data-testid="opp-title-input" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("Description")}</Label><Textarea value={d.description} onChange={(e) => set("description", e.target.value)} data-testid="opp-desc-input" /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Accepted majors")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {(meta.data?.majors ?? []).map((m) => (
                <button type="button" key={m} onClick={() => toggleMajor(m)} data-testid={`opp-major-${m.replaceAll(" ", "-").toLowerCase()}`}
                  className={cn("rounded-full border px-3 py-1 text-xs transition-colors", d.majors.includes(m) ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 hover:border-teal-300")}>{t(m)}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("Required skills")}</Label><TagInput value={d.required_skills} onChange={(v) => set("required_skills", v)} testId="opp-skills-input" /></div>
          <div className="space-y-1.5"><Label>{t("Related university courses")}</Label><TagInput value={d.related_courses} onChange={(v) => set("related_courses", v)} testId="opp-courses-input" /></div>
          <div className="space-y-1.5"><Label>{t("Interest tags")}</Label><TagInput value={d.tags} onChange={(v) => set("tags", v)} testId="opp-tags-input" /></div>
          <div className="space-y-1.5"><Label>{t("City")}</Label>
            <SimpleSelect value={d.city} onChange={(v) => set("city", v)} testId="opp-city-select" options={(meta.data?.cities ?? [d.city]).map((c) => ({ value: c, label: c }))} /></div>
          <div className="space-y-1.5"><Label>{t("Mode")}</Label>
            <SimpleSelect value={d.mode} onChange={(v) => set("mode", v as Mode)} testId="opp-mode-select" options={["onsite", "hybrid", "remote"].map((m) => ({ value: m, label: t(m) }))} /></div>
          <div className="space-y-1.5"><Label>{t("Duration (weeks)")}</Label><Input type="number" min={1} value={d.duration_weeks} onChange={(e) => set("duration_weeks", Number(e.target.value) || 1)} data-testid="opp-duration-input" /></div>
          <div className="space-y-1.5"><Label>{t("Seats")}</Label><Input type="number" min={1} value={d.seats} onChange={(e) => set("seats", Number(e.target.value) || 1)} data-testid="opp-seats-input" /></div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="opp-cancel-btn">{t("Cancel")}</Button>
          <Button type="submit" form="opp-form" disabled={pending} className="bg-teal-700 text-white hover:bg-teal-800" data-testid="opp-submit-btn">{pending ? t("Saving…") : t("Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
