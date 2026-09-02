import Link from "next/link";
import {
  createWorkspaceAction,
  createSpaceAction,
  createFolderAction,
  createListAction,
} from "@/lib/actions";

type List = { id: string; name: string };
type Folder = { id: string; name: string; lists: List[] };
type Space = { id: string; name: string; folders: Folder[]; lists: List[] };
type Workspace = { id: string; name: string; spaces: Space[] };

function ListLink({ orgSlug, list }: { orgSlug: string; list: List }) {
  return (
    <Link
      href={`/o/${orgSlug}/l/${list.id}`}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-ink/80 hover:bg-canvas hover:text-ink"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 shrink-0 text-secondary">
        <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeLinecap="round" />
      </svg>
      <span className="truncate">{list.name}</span>
    </Link>
  );
}

export function Sidebar({
  orgSlug,
  workspaces,
  canManage,
}: {
  orgSlug: string;
  workspaces: Workspace[];
  canManage: boolean;
}) {
  return (
    <nav className="px-3 pb-4">
      {workspaces.length === 0 && (
        <p className="px-2 text-xs text-secondary">No workspaces yet.</p>
      )}
      {workspaces.map((ws) => (
        <div key={ws.id} className="mb-3">
          {workspaces.length > 1 && (
            <p className="px-2 py-1 text-[11px] font-medium text-secondary">{ws.name}</p>
          )}
          <div className="space-y-1">
            {ws.spaces.length === 0 && (
              <p className="px-2 text-xs text-secondary">No spaces yet — add your first client below.</p>
            )}
            {ws.spaces.map((space) => (
              <div key={space.id}>
                <p className="flex items-center gap-2 px-2 py-1 text-[13px] font-semibold">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary-light/40 text-[10px] font-semibold text-primary">
                    {space.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{space.name}</span>
                </p>
                <div className="ml-4 border-l border-border-soft pl-1.5">
                  {space.folders.map((folder) => (
                    <div key={folder.id} className="mt-0.5">
                      <p className="flex items-center gap-2 px-2 py-1 text-[12px] font-medium text-secondary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 shrink-0">
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />
                        </svg>
                        <span className="truncate">{folder.name}</span>
                      </p>
                      <div className="ml-4 border-l border-border-soft pl-1.5">
                        {folder.lists.map((list) => (
                          <ListLink key={list.id} orgSlug={orgSlug} list={list} />
                        ))}
                        {canManage && (
                          <InlineCreate
                            action={createListAction.bind(null, orgSlug, space.id, folder.id)}
                            placeholder="New list"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {space.lists.map((list) => (
                    <ListLink key={list.id} orgSlug={orgSlug} list={list} />
                  ))}
                  {canManage && (
                    <>
                      <InlineCreate
                        action={createListAction.bind(null, orgSlug, space.id, null)}
                        placeholder="New list"
                      />
                      <InlineCreate
                        action={createFolderAction.bind(null, orgSlug, space.id)}
                        placeholder="New folder"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
            {canManage && (
              <InlineCreate
                action={createSpaceAction.bind(null, orgSlug, ws.id)}
                placeholder="New space"
              />
            )}
          </div>
        </div>
      ))}
      {canManage && (
        <InlineCreate action={createWorkspaceAction.bind(null, orgSlug)} placeholder="New workspace" />
      )}
    </nav>
  );
}

function InlineCreate({
  action,
  placeholder,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
}) {
  return (
    <form action={action} className="mt-0.5">
      <input
        name="name"
        required
        placeholder={`+ ${placeholder}`}
        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[12px] text-secondary outline-none transition-colors placeholder:text-secondary/60 hover:bg-canvas focus:border-border-soft focus:bg-surface focus:text-ink"
      />
    </form>
  );
}
