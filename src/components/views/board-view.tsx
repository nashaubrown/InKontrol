"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import type { TaskStatus } from "@prisma/client";
import { STATUSES, PRIORITIES, fmtDate } from "@/lib/task-ui";
import { setTaskStatusAction } from "@/lib/task-actions";
import type { TaskItem } from "./types";

export function BoardView({ orgSlug, tasks }: { orgSlug: string; tasks: TaskItem[] }) {
  const [, startTransition] = useTransition();
  const [optimisticTasks, moveTask] = useOptimistic(
    tasks,
    (state, { id, status }: { id: string; status: TaskStatus }) =>
      state.map((t) => (t.id === id ? { ...t, status } : t))
  );

  function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    startTransition(async () => {
      moveTask({ id, status });
      await setTaskStatusAction(orgSlug, id, status);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STATUSES.map((col) => {
        const colTasks = optimisticTasks.filter((t) => t.status === col.value);
        return (
          <div
            key={col.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.value)}
            className="rounded-lg border border-border-soft bg-canvas p-2"
          >
            <div className="flex items-center gap-2 px-2 py-1">
              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-secondary">{colTasks.length}</span>
            </div>
            <div className="mt-1 space-y-2">
              {colTasks.map((t) => {
                const priority = PRIORITIES.find((p) => p.value === t.priority);
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                    className="cursor-grab rounded-md border border-border-soft bg-surface p-3 shadow-sm active:cursor-grabbing"
                  >
                    <Link
                      href={`/o/${orgSlug}/t/${t.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {t.title}
                    </Link>
                    <div className="mt-2 flex items-center gap-2 text-xs text-secondary">
                      <span className={`rounded px-1.5 py-0.5 ${priority?.className}`}>
                        {priority?.label}
                      </span>
                      {t.dueDate && <span>{fmtDate(new Date(t.dueDate))}</span>}
                      {t.assignees.length > 0 && (
                        <span>
                          {t.assignees
                            .map((a) => (a.user.name ?? a.user.email).split(" ")[0])
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-secondary">Drop tasks here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
