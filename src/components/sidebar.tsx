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
    <nav className="flex-1 overflow-y-auto px-3 py-3 text-sm">
      {workspaces.length === 0 && (
        <p className="px-1 text-xs text-secondary">No workspaces yet.</p>
      )}
      {workspaces.map((ws) => (
        <div key={ws.id} className="mb-4">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-secondary">
            {ws.name}
          </p>
          <div className="mt-1 space-y-1">
            {ws.spaces.length === 0 && (
              <p className="px-2 text-xs text-secondary">No spaces yet — add your first client below.</p>
            )}
            {ws.spaces.map((space) => (
              <div key={space.id} className="rounded-md px-2 py-1">
                <p className="font-medium">{space.name}</p>
                <div className="ml-3 mt-1 space-y-1 border-l border-border-soft pl-2">
                  {space.folders.map((folder) => (
                    <div key={folder.id}>
                      <p className="text-secondary">{folder.name}</p>
                      <div className="ml-3 border-l border-border-soft pl-2">
                        {folder.lists.map((list) => (
                          <p key={list.id}>{list.name}</p>
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
                    <p key={list.id}>{list.name}</p>
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
    <form action={action} className="mt-1 flex gap-1">
      <input
        name="name"
        required
        placeholder={`+ ${placeholder}`}
        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-secondary outline-none placeholder:text-secondary/70 focus:border-border-soft focus:bg-surface focus:text-ink"
      />
    </form>
  );
}
