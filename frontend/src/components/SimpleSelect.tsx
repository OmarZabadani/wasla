import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Option { value: string; label: string }

export default function SimpleSelect({
  value, onChange, options, placeholder = "—", testId, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  testId?: string;
  className?: string;
}) {
  const labelOf = (v: unknown) => options.find((o) => o.value === v)?.label ?? placeholder;
  return (
    <Select value={value} onValueChange={(v: string) => onChange(v)}>
      <SelectTrigger className={cn("w-full", className)} data-testid={testId}>
        <SelectValue>{(v: unknown) => (v ? labelOf(v) : placeholder)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || "__all"} value={o.value} data-testid={testId ? `${testId}-opt-${o.value || "all"}` : undefined}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
