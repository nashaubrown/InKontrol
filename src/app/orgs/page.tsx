import Link from "next/link";
import { requireUser } from "@/lib/tenant";
import { listUserOrgs } from "@/lib/repos/orgs";
import { signOutAction } from "@/lib/actions";
import { CreateOrgForm } from "@/components/create-org-form";

export default async function OrgsPage() {
  const { userId } = await requireUser();
  const memberships = await listUserOrgs(userId);

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="animate-settle">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-primary">InKontrol</h1>
          <form action={signOutAction}>
            <button className="text-sm text-secondary hover:text-ink">Sign out</button>
          </form>
        </div>

        <h2 className="mt-10 text-lg font-semibold">Your organizations</h2>
        {memberships.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">
            No organization yet. Create one to get your first workspace.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/o/${m.organization.slug}`}
                  className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-3 hover:border-primary"
                >
                  <span className="font-medium">{m.organization.name}</span>
                  <span className="text-xs text-secondary">{m.role.toLowerCase()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 rounded-lg border border-border-soft bg-surface p-4">
          <h3 className="text-sm font-medium">New organization</h3>
          <CreateOrgForm />
        </div>
      </div>
    </main>
  );
}
