import Link from "next/link";
import type { CustomField } from "@prisma/client";
import { STATUSES, PRIORITIES, fmtDate } from "@/lib/task-ui";
import { setTaskStatusAction } from "@/lib/task-actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import type { TaskItem } from "./types";

export function ListView({
  orgSlug,
  tasks,
  customFields,
}: {
  orgSlug: string;
  tasks: TaskItem[];
  customFields: CustomField[];
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border-soft bg-surface p-6 text-sm text-secondary">
        No tasks yet. Add the first one above.
      </div>
    );
  }
  const shownFields = customFields.slice(0, 3);
  return (
    <div className="overflow-x-auto rounded-lg border border-border-soft bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-xs text-secondary">
            <th className="px-4 py-2 font-medium">Task</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Priority</th>
            <th className="px-3 py-2 font-medium">Due</th>
            <th className="px-3 py-2 font-medium">Assignees</th>
            {shownFields.map((f) => (
              <th key={f.id} className="px-3 py-2 font-medium">
                {f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const status = STATUSES.find((s) => s.value === t.status);
            const priority = PRIORITIES.find((p) => p.value === t.priority);
            const overdue = t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < new Date();
            return (
              <tr key={t.id} className="border-b border-border-soft last:border-0 hover:bg-canvas">
                <td className="px-4 py-2">
                  <Link href={`/o/${orgSlug}/t/${t.id}`} className="font-medium hover:text-primary">
                    {t.title}
                  </Link>
                  {t.subtasks.length > 0 && (
                    <span className="ml-2 text-xs text-secondary">
                      {t.subtasks.filter((s) => s.status === "DONE").length}/{t.subtasks.length}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await setTaskStatusAction(orgSlug, t.id, String(fd.get("status")));
                    }}
                  >
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={t.status}
                      options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                    />
                  </form>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${priority?.className}`}>
                    {priority?.label}
                  </span>
                </td>
                <td className={`px-3 py-2 text-xs ${overdue ? "font-medium text-ink" : "text-secondary"}`}>
                  {fmtDate(t.dueDate)}
                  {overdue && <span className="ml-1 rounded bg-error/40 px-1">overdue</span>}
                </td>
                <td className="px-3 py-2 text-xs text-secondary">
                  {t.assignees.map((a) => a.user.name ?? a.user.email).join(", ")}
                </td>
                {shownFields.map((f) => (
                  <td key={f.id} className="px-3 py-2 text-xs text-secondary">
                    {t.fieldValues.find((v) => v.fieldId === f.id)?.value ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
