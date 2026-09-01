"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function AttachmentUpload({ orgSlug, taskId }: { orgSlug: string; taskId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/orgs/${orgSlug}/tasks/${taskId}/attachments`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Upload failed");
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="text-sm">
      <label className="inline-block cursor-pointer rounded-md border border-border-soft bg-surface px-3 py-1.5 text-xs font-medium hover:border-primary">
        {busy ? "Uploading…" : "Upload file (max 4 MB)"}
        <input ref={inputRef} type="file" onChange={onChange} disabled={busy} className="hidden" />
      </label>
      {error && <p className="mt-1 text-xs">{error}</p>}
    </div>
  );
}
