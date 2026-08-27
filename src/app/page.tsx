import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/orgs");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="animate-settle w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">InKontrol</h1>
        <p className="mt-3 text-secondary">Run the work. Ship the content. One place.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Create your workspace
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-border-soft bg-surface px-4 py-2 text-sm font-medium hover:bg-canvas"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
