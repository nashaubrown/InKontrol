"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { requireUser, requireOrg } from "@/lib/tenant";
import * as orgs from "@/lib/repos/orgs";
import * as hierarchy from "@/lib/repos/hierarchy";

const nameSchema = z.string().trim().min(1, "Name is required").max(120);
const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);

export type ActionState = { error?: string } | undefined;

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ name: nameSchema, email: emailSchema, password: passwordSchema })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { error: "An account with that email already exists" };

  await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash: await hash(password, 12) },
  });
  await signIn("credentials", { email, password, redirectTo: "/orgs" });
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/orgs",
    });
  } catch (err) {
    // next-auth throws a redirect on success; rethrow it
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { error: "Wrong email or password, or too many attempts. Try again in a few minutes." };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function createOrgAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requireUser();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const org = await orgs.createOrganization(userId, parsed.data);
  redirect(`/o/${org.slug}`);
}

export async function createWorkspaceAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const name = nameSchema.parse(formData.get("name"));
  await hierarchy.createWorkspace(ctx, name);
  revalidatePath(`/o/${orgSlug}`);
}

export async function createSpaceAction(orgSlug: string, workspaceId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const name = nameSchema.parse(formData.get("name"));
  await hierarchy.createSpace(ctx, workspaceId, name);
  revalidatePath(`/o/${orgSlug}`);
}

export async function createFolderAction(orgSlug: string, spaceId: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const name = nameSchema.parse(formData.get("name"));
  await hierarchy.createFolder(ctx, spaceId, name);
  revalidatePath(`/o/${orgSlug}`);
}

export async function createListAction(
  orgSlug: string,
  spaceId: string,
  folderId: string | null,
  formData: FormData
) {
  const ctx = await requireOrg(orgSlug);
  const name = nameSchema.parse(formData.get("name"));
  await hierarchy.createList(ctx, spaceId, name, folderId ?? undefined);
  revalidatePath(`/o/${orgSlug}`);
}

export async function createInviteAction(
  orgSlug: string,
  _prev: (ActionState & { inviteUrl?: string }) | undefined,
  formData: FormData
): Promise<(ActionState & { inviteUrl?: string }) | undefined> {
  const ctx = await requireOrg(orgSlug);
  const parsed = z
    .object({ email: emailSchema, role: z.enum(["ADMIN", "MEMBER"]) })
    .safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const token = await orgs.createInvite(ctx, parsed.data.email, parsed.data.role as Role);
    const base = process.env.APP_URL ?? "http://localhost:3000";
    revalidatePath(`/o/${orgSlug}/members`);
    return { inviteUrl: `${base}/invite/${token}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create invite" };
  }
}

export async function acceptInviteAction(token: string) {
  const { userId, email } = await requireUser();
  if (!email) redirect("/sign-in");
  const org = await orgs.acceptInvite(userId, email, token);
  redirect(`/o/${org.slug}`);
}
