// Org-scoped repository layer for the workspace hierarchy.
// Every function takes an OrgContext (derived server-side from the session,
// never from client input) and runs inside withOrg() so Postgres RLS applies.

import { withOrg } from "@/lib/db";
import type { OrgContext } from "@/lib/tenant";

export function getHierarchy(ctx: OrgContext) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.workspace.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { position: "asc" },
      include: {
        spaces: {
          orderBy: { position: "asc" },
          include: {
            folders: {
              orderBy: { position: "asc" },
              include: { lists: { orderBy: { position: "asc" } } },
            },
            lists: { where: { folderId: null }, orderBy: { position: "asc" } },
          },
        },
      },
    })
  );
}

export function createWorkspace(ctx: OrgContext, name: string) {
  return withOrg(ctx.organizationId, (tx) =>
    tx.workspace.create({ data: { organizationId: ctx.organizationId, name } })
  );
}

export function createSpace(ctx: OrgContext, workspaceId: string, name: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    // parent lookup is itself org-scoped, so a foreign workspaceId 404s
    const ws = await tx.workspace.findFirst({
      where: { id: workspaceId, organizationId: ctx.organizationId },
    });
    if (!ws) throw new Error("Workspace not found");
    return tx.space.create({
      data: { organizationId: ctx.organizationId, workspaceId, name },
    });
  });
}

export function createFolder(ctx: OrgContext, spaceId: string, name: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    const space = await tx.space.findFirst({
      where: { id: spaceId, organizationId: ctx.organizationId },
    });
    if (!space) throw new Error("Space not found");
    return tx.folder.create({
      data: { organizationId: ctx.organizationId, spaceId, name },
    });
  });
}

export function createList(ctx: OrgContext, spaceId: string, name: string, folderId?: string) {
  return withOrg(ctx.organizationId, async (tx) => {
    const space = await tx.space.findFirst({
      where: { id: spaceId, organizationId: ctx.organizationId },
    });
    if (!space) throw new Error("Space not found");
    if (folderId) {
      const folder = await tx.folder.findFirst({
        where: { id: folderId, organizationId: ctx.organizationId, spaceId },
      });
      if (!folder) throw new Error("Folder not found");
    }
    return tx.list.create({
      data: { organizationId: ctx.organizationId, spaceId, folderId: folderId ?? null, name },
    });
  });
}
