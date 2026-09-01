import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import * as tasks from "@/lib/repos/tasks";
import { createTaskAction, createCustomFieldAction } from "@/lib/task-actions";
import { createAutomationAction, deleteAutomationAction } from "@/lib/notify-actions";
import { listMembers } from "@/lib/repos/orgs";
import { withOrg } from "@/lib/db";
import { STATUSES, PRIORITIES } from "@/lib/task-ui";
import { ListView } from "@/components/views/list-view";
import { BoardView } from "@/components/views/board-view";
import { CalendarView } from "@/components/views/calendar-view";

const VIEWS = [
  { key: "list", label: "List" },
  { key: "board", label: "Board" },
  { key: "calendar", label: "Calendar" },
];

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; listId: string }>;
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const { slug, listId } = await params;
  const { view = "list", month } = await searchParams;
  const ctx = await requireOrg(slug);
  const list = await tasks.getList(ctx, listId);
  if (!list) notFound();
  const [items, members, rules] = await Promise.all([
    tasks.getTasksForList(ctx, listId),
    listMembers(ctx),
    withOrg(ctx.organizationId, (tx) =>
      tx.automationRule.findMany({
        where: { organizationId: ctx.organizationId, listId },
        orderBy: { createdAt: "asc" },
      })
    ),
  ]);

  return (
    <div className="animate-settle">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-secondary">
            {list.space.name}
            {list.folder ? ` / ${list.folder.name}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
        </div>
        <nav className="flex gap-1 rounded-md border border-border-soft bg-surface p-1 text-sm">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={`/o/${slug}/l/${listId}?view=${v.key}`}
              className={`rounded px-3 py-1 font-medium ${
                view === v.key ? "bg-primary text-white" : "text-secondary hover:text-ink"
              }`}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>

      <form action={createTaskAction.bind(null, slug, listId)} className="mt-4 flex max-w-xl gap-2">
        <input
          name="title"
          required
          placeholder="Add a task…"
          className="w-full rounded-md border border-border-soft bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          name="dueDate"
          type="date"
          className="rounded-md border border-border-soft bg-surface px-2 py-2 text-sm text-secondary"
        />
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Add
        </button>
      </form>

      <div className="mt-6">
        {view === "board" ? (
          <BoardView orgSlug={slug} tasks={items} />
        ) : view === "calendar" ? (
          <CalendarView orgSlug={slug} listId={listId} ctx={ctx} month={month} />
        ) : (
          <ListView orgSlug={slug} tasks={items} customFields={list.customFields} />
        )}
      </div>

      <details className="mt-10 max-w-2xl text-sm">
        <summary className="cursor-pointer text-secondary hover:text-ink">
          Automations ({rules.length})
        </summary>
        <div className="mt-2 rounded-lg border border-border-soft bg-surface p-4">
          {rules.length > 0 && (
            <ul className="mb-3 space-y-1">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-secondary">
                  <span>
                    <span className="font-medium text-ink">{r.name}</span>: when status becomes{" "}
                    {r.triggerValue.toLowerCase().replaceAll("_", " ")} →{" "}
                    {r.actionType === "set_priority"
                      ? `set priority ${r.actionValue.toLowerCase()}`
                      : `${r.actionType === "assign_user" ? "assign" : "notify"} ${
                          members.find((m) => m.userId === r.actionValue)?.user.name ?? "member"
                        }`}
                  </span>
                  <form action={deleteAutomationAction.bind(null, slug, listId, r.id)}>
                    <button className="text-xs text-secondary hover:text-ink">remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createAutomationAction.bind(null, slug, listId)} className="flex flex-wrap items-center gap-2">
            <input
              name="name"
              required
              placeholder="Rule name"
              className="rounded-md border border-border-soft px-2 py-1.5 outline-none focus:border-primary"
            />
            <span className="text-xs text-secondary">when status becomes</span>
            <select name="triggerValue" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select name="actionType" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
              <option value="notify_user">notify member (pick below)</option>
              <option value="assign_user">assign member (pick below)</option>
              <option value="set_priority">set priority (pick below)</option>
            </select>
            <select name="actionValue" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
              <optgroup label="Members">
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name ?? m.user.email}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Priorities">
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <button className="rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:opacity-90">
              Add rule
            </button>
          </form>
        </div>
      </details>

      <details className="mt-4 max-w-xl text-sm">
        <summary className="cursor-pointer text-secondary hover:text-ink">
          Custom fields ({list.customFields.length})
        </summary>
        <div className="mt-2 rounded-lg border border-border-soft bg-surface p-4">
          {list.customFields.length > 0 && (
            <ul className="mb-3 space-y-1 text-secondary">
              {list.customFields.map((f) => (
                <li key={f.id}>
                  {f.name} — {f.type.toLowerCase()}
                  {f.options.length > 0 && `: ${f.options.join(", ")}`}
                </li>
              ))}
            </ul>
          )}
          <form action={createCustomFieldAction.bind(null, slug, listId)} className="flex flex-wrap gap-2">
            <input
              name="name"
              required
              placeholder="Field name"
              className="rounded-md border border-border-soft px-2 py-1.5 outline-none focus:border-primary"
            />
            <select name="type" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
              <option value="DATE">Date</option>
              <option value="SELECT">Select</option>
              <option value="CHECKBOX">Checkbox</option>
            </select>
            <input
              name="options"
              placeholder="Options (comma-separated, for Select)"
              className="flex-1 rounded-md border border-border-soft px-2 py-1.5 outline-none focus:border-primary"
            />
            <button className="rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:opacity-90">
              Add field
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
