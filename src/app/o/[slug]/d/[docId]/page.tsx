import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import { getDoc } from "@/lib/repos/collab";
import { deleteDocAction } from "@/lib/collab-actions";
import { DocEditor } from "@/components/doc-editor";

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string; docId: string }>;
}) {
  const { slug, docId } = await params;
  const ctx = await requireOrg(slug);
  const doc = await getDoc(ctx, docId);
  if (!doc) notFound();

  return (
    <div className="animate-settle max-w-3xl">
      <DocEditor orgSlug={slug} docId={docId} initialTitle={doc.title} initialContent={doc.content} />
      <form action={deleteDocAction.bind(null, slug, docId)} className="mt-8">
        <button className="rounded-md border border-border-soft px-3 py-1.5 text-xs text-secondary hover:bg-error/30 hover:text-ink">
          Delete doc
        </button>
      </form>
    </div>
  );
}
