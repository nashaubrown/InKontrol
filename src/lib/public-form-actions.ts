"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { submitPublicForm } from "@/lib/repos/phase3";
import { checkRateLimit } from "@/lib/rate-limit";

export async function submitPublicFormAction(publicId: string, formData: FormData) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`form:${ip}`, 10, 60_000)) {
    throw new Error("Too many submissions — try again in a minute");
  }

  const title = z.string().trim().min(1).max(300).parse(formData.get("title"));
  const description = z.string().max(10_000).catch("").parse(formData.get("description") ?? "");
  const fieldValues: { fieldId: string; value: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field_") && typeof value === "string" && value) {
      fieldValues.push({ fieldId: key.slice(6), value });
    }
  }
  await submitPublicForm(publicId, { title, description, fieldValues });
  redirect(`/f/${publicId}?done=1`);
}
