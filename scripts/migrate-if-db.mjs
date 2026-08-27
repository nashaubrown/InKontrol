// Apply pending Prisma migrations at build time when a database is configured.
// Lets the first Vercel build succeed before DATABASE_URL is set.
import { execSync } from "node:child_process";

if (process.env.DATABASE_URL) {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("DATABASE_URL not set — skipping prisma migrate deploy");
}
