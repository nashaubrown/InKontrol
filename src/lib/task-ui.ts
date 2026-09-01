import type { TaskPriority, TaskStatus } from "@prisma/client";

export const STATUSES: { value: TaskStatus; label: string; dot: string }[] = [
  { value: "TODO", label: "To do", dot: "bg-border-soft" },
  { value: "IN_PROGRESS", label: "In progress", dot: "bg-primary-light" },
  { value: "IN_REVIEW", label: "In review", dot: "bg-accent-warm" },
  { value: "DONE", label: "Done", dot: "bg-success" },
];

export const PRIORITIES: { value: TaskPriority; label: string; className: string }[] = [
  { value: "URGENT", label: "Urgent", className: "bg-error/40" },
  { value: "HIGH", label: "High", className: "bg-accent-warm/60" },
  { value: "NORMAL", label: "Normal", className: "bg-primary-light/40" },
  { value: "LOW", label: "Low", className: "bg-border-soft/60" },
];

export function statusLabel(s: TaskStatus) {
  return STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function fmtDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
