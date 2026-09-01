import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/repos/phase3";
import { submitPublicFormAction } from "@/lib/public-form-actions";

// Public intake form: no session required; the unguessable publicId is the
// capability. Submission is validated + rate-limited server-side.

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { publicId } = await params;
  const { done } = await searchParams;
  const form = await getPublicForm(publicId);
  if (!form) notFound();
  const accent = form.organization.brandColor ?? "#369AAC";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="animate-settle w-full max-w-md rounded-lg border border-border-soft bg-surface p-8">
        {form.organization.brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.organization.brandLogoUrl} alt="" className="h-7 object-contain" />
        ) : (
          <p className="text-lg font-semibold" style={{ color: accent }}>
            {form.organization.name}
          </p>
        )}
        <h1 className="mt-3 text-xl font-semibold tracking-tight">{form.name}</h1>

        {done ? (
          <p className="mt-4 rounded-md bg-success/30 px-3 py-2 text-sm">
            Thanks — your request is in. {form.organization.name} will pick it up from here.
          </p>
        ) : (
          <form action={submitPublicFormAction.bind(null, publicId)} className="mt-5 space-y-4 text-sm">
            <label className="block">
              <span className="font-medium">What do you need?</span>
              <input
                name="title"
                required
                maxLength={300}
                className="mt-1 w-full rounded-md border border-border-soft px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="font-medium">Details</span>
              <textarea
                name="description"
                rows={4}
                maxLength={10000}
                className="mt-1 w-full rounded-md border border-border-soft px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            {form.list.customFields.map((f) => (
              <label key={f.id} className="block">
                <span className="font-medium">{f.name}</span>
                {f.type === "SELECT" ? (
                  <select
                    name={`field_${f.id}`}
                    className="mt-1 w-full rounded-md border border-border-soft bg-surface px-3 py-2"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={`field_${f.id}`}
                    type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                    maxLength={2000}
                    className="mt-1 w-full rounded-md border border-border-soft px-3 py-2 outline-none focus:border-primary"
                  />
                )}
              </label>
            ))}
            <button
              className="w-full rounded-md px-4 py-2 font-medium text-white hover:opacity-90"
              style={{ background: accent }}
            >
              Send request
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
