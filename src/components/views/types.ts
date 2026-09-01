import type { Task, TaskAssignee, CustomFieldValue } from "@prisma/client";

export type TaskItem = Task & {
  assignees: (TaskAssignee & { user: { id: string; name: string | null; email: string } })[];
  subtasks: Task[];
  fieldValues: CustomFieldValue[];
};
