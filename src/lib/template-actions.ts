"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import * as templates from "@/lib/repos/templates";

const nameSchema = z.string().trim().min(1).max(120);
const idSchema = z.string().min(1).max(64);

export async function saveSpaceAsTemplateAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const spaceId = idSchema.parse(formData.get("spaceId"));
  const name = nameSchema.parse(formData.get("name"));
  await templates.saveSpaceAsTemplate(ctx, spaceId, name);
  revalidatePath(`/o/${orgSlug}/templates`);
}

export async function createSpaceFromTemplateAction(orgSlug: string, formData: FormData) {
  const ctx = await requireOrg(orgSlug);
  const workspaceId = idSchema.parse(formData.get("workspaceId"));
  const spaceName = nameSchema.parse(formData.get("spaceName"));
  const source = z.string().min(1).max(80).parse(formData.get("template"));

  let structure: templates.TemplateStructure | undefined;
  if (source.startsWith("builtin:")) {
    structure = templates.BUILT_IN_TEMPLATES.find((t) => t.key === source.slice(8))?.structure;
  } else {
    const tpl = await templates.getTemplateStructure(ctx, source);
    structure = (tpl?.structure ?? undefined) as templates.TemplateStructure | undefined;
  }
  if (!structure) throw new Error("Template not found");
  const space = await templates.createSpaceFromTemplate(ctx, workspaceId, spaceName, structure);
  revalidatePath(`/o/${orgSlug}`);
  redirect(`/o/${orgSlug}?created=${space.id}`);
}
