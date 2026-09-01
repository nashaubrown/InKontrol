// Apply pending Prisma migrations and RLS policies at build time when a database
// is configured. Lets the first Vercel build succeed before DATABASE_URL is set.
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

if (process.env.DATABASE_URL) {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  // RLS policy files are idempotent; 002_app_role.sql is admin-only and excluded.
  const rlsDir = join(process.cwd(), "prisma", "rls");
  const files = readdirSync(rlsDir)
    .filter((f) => /_rls.*\.sql$/.test(f) || f === "001_rls.sql")
    .sort();
  for (const f of files) {
    console.log(`Applying RLS policies: ${f}`);
    execSync(`npx prisma db execute --schema prisma/schema.prisma --file ${join(rlsDir, f)}`, {
      stdio: "inherit",
    });
  }
} else {
  console.log("DATABASE_URL not set — skipping prisma migrate deploy");
}
