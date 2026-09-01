// Project templates (Phase 1.5): built-ins plus agency-created templates
// saved from an existing space and reused per client.

import type { TaskPriority } from "@prisma/client";
import { withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";

export type TemplateStructure = {
  folders?: { name: string; lists: TemplateList[] }[];
  lists?: TemplateList[];
};
type TemplateList = { name: string; tasks?: { title: string; priority?: TaskPriority }[] };

export const BUILT_IN_TEMPLATES: {
  key: string;
  name: string;
  description: string;
  structure: TemplateStructure;
}[] = [
  {
    key: "client-onboarding",
    name: "Client onboarding",
    description: "From signed contract to kickoff in one checklist.",
    structure: {
      lists: [
        {
          name: "Onboarding",
          tasks: [
            { title: "Send welcome pack and portal invite", priority: "HIGH" },
            { title: "Collect brand assets and access credentials", priority: "HIGH" },
            { title: "Kickoff call scheduled", priority: "NORMAL" },
            { title: "Define success metrics with client", priority: "NORMAL" },
            { title: "Set up reporting cadence", priority: "LOW" },
          ],
        },
      ],
    },
  },
  {
    key: "monthly-content",
    name: "Monthly content production",
    description: "Plan, produce, approve, publish — every month.",
    structure: {
      lists: [
        {
          name: "Content pipeline",
          tasks: [
            { title: "Content calendar drafted", priority: "HIGH" },
            { title: "Copy written", priority: "NORMAL" },
            { title: "Design/visuals produced", priority: "NORMAL" },
            { title: "Client approval", priority: "HIGH" },
            { title: "Scheduled and published", priority: "NORMAL" },
            { title: "Performance recap sent", priority: "LOW" },
          ],
        },
      ],
    },
  },
  {
    key: "website-launch",
    name: "Website launch",
    description: "A standard site build from brief to go-live.",
    structure: {
      folders: [
        {
          name: "Build",
          lists: [
            {
              name: "Design",
              tasks: [
                { title: "Wireframes approved", priority: "HIGH" },
                { title: "Visual design approved", priority: "HIGH" },
              ],
            },
            {
              name: "Development",
              tasks: [
                { title: "Pages implemented", priority: "NORMAL" },
                { title: "Content entered", priority: "NORMAL" },
                { title: "QA pass", priority: "HIGH" },
              ],
            },
          ],
        },
      ],
      lists: [
        {
          name: "Launch",
          tasks: [
            { title: "DNS + SSL configured", priority: "URGENT" },
            { title: "Analytics installed", priority: "NORMAL" },
            { title: "Go-live announcement", priority: "LOW" },
          ],
        },
      ],
    },
  },
];

export function listTemplates(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.template.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, createdAt: true },
    })
  );
}

/** Snapshot an existing space (folders, lists, task titles) as a reusable template. */
export function saveSpaceAsTemplate(ctx: OrgContext, spaceId: string, name: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    const space = await tx.space.findFirst({
      where: { id: spaceId, organizationId: ctx.organizationId },
      include: {
        folders: {
          orderBy: { position: "asc" },
          include: {
            lists: {
              orderBy: { position: "asc" },
              include: { tasks: { where: { parentTaskId: null }, orderBy: { position: "asc" } } },
            },
          },
        },
        lists: {
          where: { folderId: null },
          orderBy: { position: "asc" },
          include: { tasks: { where: { parentTaskId: null }, orderBy: { position: "asc" } } },
        },
      },
    });
    if (!space) throw new Error("Space not found");
    const structure: TemplateStructure = {
      folders: space.folders.map((f) => ({
        name: f.name,
        lists: f.lists.map((l) => ({
          name: l.name,
          tasks: l.tasks.map((t) => ({ title: t.title, priority: t.priority })),
        })),
      })),
      lists: space.lists.map((l) => ({
        name: l.name,
        tasks: l.tasks.map((t) => ({ title: t.title, priority: t.priority })),
      })),
    };
    return tx.template.create({
      data: {
        organizationId: ctx.organizationId,
        name,
        description: `Saved from space "${space.name}"`,
        structure: structure as never,
        createdById: ctx.userId,
      },
    });
  });
}

/** Create a new space (e.g. per new client) from a built-in or custom template. */
export function createSpaceFromTemplate(
  ctx: OrgContext,
  workspaceId: string,
  spaceName: string,
  template: TemplateStructure
) {
  return withOrg(ctx.organizationId, async (tx) => {
    const ws = await tx.workspace.findFirst({
      where: { id: workspaceId, organizationId: ctx.organizationId },
    });
    if (!ws) throw new Error("Workspace not found");
    const space = await tx.space.create({
      data: { organizationId: ctx.organizationId, workspaceId, name: spaceName },
    });

    async function createList(listTpl: TemplateList, folderId: string | null) {
      const list = await tx.list.create({
        data: {
          organizationId: ctx.organizationId,
          spaceId: space.id,
          folderId,
          name: listTpl.name,
        },
      });
      let pos = 0;
      for (const t of listTpl.tasks ?? []) {
        await tx.task.create({
          data: {
            organizationId: ctx.organizationId,
            listId: list.id,
            title: String(t.title).slice(0, 300),
            priority: t.priority ?? "NORMAL",
            position: pos++,
            createdById: ctx.userId,
          },
        });
      }
    }

    for (const folderTpl of template.folders ?? []) {
      const folder = await tx.folder.create({
        data: { organizationId: ctx.organizationId, spaceId: space.id, name: folderTpl.name },
      });
      for (const listTpl of folderTpl.lists) await createList(listTpl, folder.id);
    }
    for (const listTpl of template.lists ?? []) await createList(listTpl, null);
    return space;
  });
}

export function getTemplateStructure(ctx: OrgContext, templateId: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.template.findFirst({
      where: { id: templateId, organizationId: ctx.organizationId },
    })
  );
}
