import { requireOrg } from "@/lib/tenant";
import { getHierarchy } from "@/lib/repos/hierarchy";

export default async function OrgOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrg(slug);
  const workspaces = await getHierarchy(ctx);
  const spaceCount = workspaces.reduce((n, ws) => n + ws.spaces.length, 0);
  const listCount = workspaces.reduce(
    (n, ws) =>
      n +
      ws.spaces.reduce(
        (m, s) => m + s.lists.length + s.folders.reduce((k, f) => k + f.lists.length, 0),
        0
      ),
    0
  );

  return (
    <div className="animate-settle max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{ctx.orgName}</h1>
      {spaceCount === 0 ? (
        <div className="mt-6 rounded-lg border border-border-soft bg-surface p-6">
          <h2 className="font-semibold">Set up your first client</h2>
          <p className="mt-2 text-sm text-secondary">
            Use the sidebar to add a space for each client, folders for their projects, and
            lists for the work inside them. Tasks arrive in the next release.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-secondary">
          {spaceCount} {spaceCount === 1 ? "space" : "spaces"}, {listCount}{" "}
          {listCount === 1 ? "list" : "lists"}. Tasks arrive in the next release.
        </p>
      )}
    </div>
  );
}
