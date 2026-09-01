import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/api-auth";

// Public API v1 — tasks. Auth: Authorization: Bearer ik_...
// GET  /api/v1/tasks?status=TODO&listId=...   (read)
// POST /api/v1/tasks {listId, title, ...}     (read_write)

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const listId = req.nextUrl.searchParams.get("listId") ?? undefined;
  const parsed = z
    .object({
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
      listId: z.string().max(64).optional(),
    })
    .safeParse({ status, listId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });

  const tasks = await prisma.task.findMany({
    where: { organizationId: auth.organizationId, ...parsed.data },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      listId: true,
      parentTaskId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ data: tasks });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req.headers.get("authorization"), true);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      listId: z.string().max(64),
      title: z.string().trim().min(1).max(300),
      description: z.string().max(50_000).default(""),
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("NORMAL"),
      dueDate: z.string().datetime().optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const list = await prisma.list.findFirst({
    where: { id: parsed.data.listId, organizationId: auth.organizationId },
  });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // API-created tasks are attributed to the org owner.
  const owner = await prisma.membership.findFirst({
    where: { organizationId: auth.organizationId, role: "OWNER" },
  });
  if (!owner) return NextResponse.json({ error: "Organization has no owner" }, { status: 500 });

  const task = await prisma.task.create({
    data: {
      organizationId: auth.organizationId,
      listId: parsed.data.listId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      createdById: owner.userId,
    },
    select: { id: true, title: true, status: true, listId: true, createdAt: true },
  });
  return NextResponse.json({ data: task }, { status: 201 });
}
