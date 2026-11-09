import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

export default function TagInput({
  value, onChange, placeholder, testId,
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; testId: string }) {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
            {v}
            <button type="button" aria-label={`remove ${v}`} data-testid={`${testId}-remove-${v}`} onClick={() => onChange(value.filter((x) => x !== v))}
              className="rounded-full text-teal-600 transition-colors hover:text-teal-900">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add}
        placeholder={placeholder ?? t("Type and press Enter")} data-testid={testId} />
    </div>
  );
}
