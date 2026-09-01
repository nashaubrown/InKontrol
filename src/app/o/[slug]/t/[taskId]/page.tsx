import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import * as tasks from "@/lib/repos/tasks";
import { listMembers } from "@/lib/repos/orgs";
import { STATUSES, PRIORITIES, fmtDate } from "@/lib/task-ui";
import {
  updateTaskFieldsAction,
  createSubtaskAction,
  deleteTaskAction,
  toggleAssigneeAction,
  setFieldValueAction,
  addDependencyAction,
  removeDependencyAction,
} from "@/lib/task-actions";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { AttachmentUpload } from "@/components/attachment-upload";
import { addCommentAction, deleteAttachmentAction } from "@/lib/collab-actions";
import * as collab from "@/lib/repos/collab";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ slug: string; taskId: string }>;
}) {
  const { slug, taskId } = await params;
  const ctx = await requireOrg(slug);
  const [task, members] = await Promise.all([tasks.getTask(ctx, taskId), listMembers(ctx)]);
  if (!task) notFound();
  const [comments, attachments, activity] = await Promise.all([
    collab.getComments(ctx, taskId),
    collab.getAttachmentsMeta(ctx, taskId),
    collab.getTaskActivity(ctx, taskId),
  ]);

  const update = updateTaskFieldsAction.bind(null, slug, taskId);

  return (
    <div className="animate-settle max-w-3xl">
      <p className="text-xs text-secondary">
        <Link href={`/o/${slug}/l/${task.listId}`} className="hover:text-primary">
          {task.list.space.name} / {task.list.name}
        </Link>
        {task.parentTask && (
          <>
            {" · subtask of "}
            <Link href={`/o/${slug}/t/${task.parentTask.id}`} className="hover:text-primary">
              {task.parentTask.title}
            </Link>
          </>
        )}
      </p>

      <form action={update} className="mt-2">
        <input
          name="title"
          defaultValue={task.title}
          className="w-full rounded-md border border-transparent bg-transparent text-2xl font-semibold tracking-tight outline-none focus:border-border-soft focus:bg-surface"
        />
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-xs text-secondary">Status</span>
            <AutoSubmitSelect
              name="status"
              defaultValue={task.status}
              options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              className="rounded-md border border-border-soft bg-surface px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-secondary">Priority</span>
            <AutoSubmitSelect
              name="priority"
              defaultValue={task.priority}
              options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
              className="rounded-md border border-border-soft bg-surface px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-secondary">Due</span>
            <input
              type="date"
              name="dueDate"
              defaultValue={fmtDate(task.dueDate)}
              className="rounded-md border border-border-soft bg-surface px-2 py-1"
            />
          </label>
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            Save
          </button>
        </div>
        <textarea
          name="description"
          defaultValue={task.description}
          placeholder="Add a description…"
          rows={5}
          className="mt-4 w-full rounded-md border border-border-soft bg-surface p-3 text-sm outline-none focus:border-primary"
        />
      </form>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Assignees</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((m) => {
            const assigned = task.assignees.some((a) => a.userId === m.userId);
            return (
              <form key={m.id} action={toggleAssigneeAction.bind(null, slug, taskId, m.userId, !assigned)}>
                <button
                  className={`rounded-full border px-3 py-1 text-xs ${
                    assigned
                      ? "border-primary bg-primary-light/40 font-medium"
                      : "border-border-soft bg-surface text-secondary hover:border-primary"
                  }`}
                >
                  {m.user.name ?? m.user.email}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {task.list.customFields.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Fields</h2>
          <div className="mt-2 space-y-2">
            {task.list.customFields.map((f) => {
              const value = task.fieldValues.find((v) => v.fieldId === f.id)?.value ?? "";
              return (
                <form
                  key={f.id}
                  action={setFieldValueAction.bind(null, slug, taskId, f.id)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-32 text-xs text-secondary">{f.name}</span>
                  {f.type === "SELECT" ? (
                    <AutoSubmitSelect
                      name="value"
                      defaultValue={value}
                      options={[{ value: "", label: "—" }, ...f.options.map((o) => ({ value: o, label: o }))]}
                      className="rounded-md border border-border-soft bg-surface px-2 py-1"
                    />
                  ) : f.type === "CHECKBOX" ? (
                    <AutoSubmitSelect
                      name="value"
                      defaultValue={value}
                      options={[
                        { value: "", label: "—" },
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      className="rounded-md border border-border-soft bg-surface px-2 py-1"
                    />
                  ) : (
                    <>
                      <input
                        name="value"
                        type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                        defaultValue={value}
                        className="rounded-md border border-border-soft bg-surface px-2 py-1"
                      />
                      <button className="text-xs text-primary hover:underline">Save</button>
                    </>
                  )}
                </form>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold">
          Subtasks ({task.subtasks.filter((s) => s.status === "DONE").length}/{task.subtasks.length})
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {task.subtasks.map((s) => (
            <li key={s.id}>
              <Link href={`/o/${slug}/t/${s.id}`} className="hover:text-primary">
                <span
                  className={`mr-2 inline-block h-2 w-2 rounded-full ${
                    STATUSES.find((x) => x.value === s.status)?.dot
                  }`}
                />
                <span className={s.status === "DONE" ? "text-secondary line-through" : ""}>{s.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <form action={createSubtaskAction.bind(null, slug, taskId)} className="mt-2 flex max-w-md gap-2">
          <input
            name="title"
            required
            placeholder="Add a subtask…"
            className="w-full rounded-md border border-border-soft bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            Add
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Dependencies</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {task.blockedBy.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="rounded bg-accent-warm/60 px-1.5 py-0.5 text-xs">waiting on</span>
              <Link href={`/o/${slug}/t/${d.blocker.id}`} className="hover:text-primary">
                {d.blocker.title}
              </Link>
              <form action={removeDependencyAction.bind(null, slug, taskId, d.id)}>
                <button className="text-xs text-secondary hover:text-ink">remove</button>
              </form>
            </li>
          ))}
          {task.blocking.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="rounded bg-primary-light/40 px-1.5 py-0.5 text-xs">blocks</span>
              <Link href={`/o/${slug}/t/${d.blocked.id}`} className="hover:text-primary">
                {d.blocked.title}
              </Link>
              <form action={removeDependencyAction.bind(null, slug, taskId, d.id)}>
                <button className="text-xs text-secondary hover:text-ink">remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addDependencyAction.bind(null, slug, taskId)} className="mt-2 flex max-w-md gap-2 text-sm">
          <select name="direction" className="rounded-md border border-border-soft bg-surface px-2 py-1.5">
            <option value="blocked_by">Waiting on</option>
            <option value="blocks">Blocks</option>
          </select>
          <input
            name="otherTaskId"
            required
            placeholder="Task ID (from its URL)"
            className="w-full rounded-md border border-border-soft bg-surface px-3 py-1.5 outline-none focus:border-primary"
          />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
            Add
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Attachments ({attachments.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <a
                href={`/api/orgs/${slug}/attachments/${a.id}`}
                className="text-primary hover:underline"
              >
                {a.fileName}
              </a>
              <span className="text-xs text-secondary">
                {(a.size / 1024).toFixed(0)} KB · {a.uploadedBy.name ?? a.uploadedBy.email}
              </span>
              <form action={deleteAttachmentAction.bind(null, slug, taskId, a.id)}>
                <button className="text-xs text-secondary hover:text-ink">remove</button>
              </form>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <AttachmentUpload orgSlug={slug} taskId={taskId} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Comments ({comments.length})</h2>
        <ul className="mt-2 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border-soft bg-surface px-4 py-3">
              <p className="text-xs text-secondary">
                <span className="font-medium text-ink">{c.author.name ?? c.author.email}</span>{" "}
                · {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
        <form action={addCommentAction.bind(null, slug, taskId)} className="mt-3">
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Write a comment… mention a teammate with @their name"
            className="w-full rounded-md border border-border-soft bg-surface p-3 text-sm outline-none focus:border-primary"
          />
          <button className="mt-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Comment
          </button>
        </form>
      </section>

      <section className="mt-8">
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Activity ({activity.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-secondary">
            {activity.map((e) => (
              <li key={e.id}>
                <span className="font-medium text-ink">{e.actor.name ?? e.actor.email}</span>{" "}
                {e.type.replaceAll("_", " ")}
                {e.detail && ` — ${e.detail}`} ·{" "}
                {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </li>
            ))}
          </ul>
        </details>
      </section>

      <form action={deleteTaskAction.bind(null, slug, taskId)} className="mt-10">
        <button className="rounded-md border border-border-soft px-3 py-1.5 text-xs text-secondary hover:bg-error/30 hover:text-ink">
          Delete task
        </button>
      </form>
    </div>
  );
}
