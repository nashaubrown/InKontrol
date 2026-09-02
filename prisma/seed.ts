// Demo/stress seed: creates (or recreates) a "Demo Agency" organization with
// role accounts and a heavy, realistic dataset across every feature.
//
//   npm run seed                      # uses DATABASE_URL from the environment
//   SEED_PASSWORD=... npm run seed    # override the shared test password
//
// Re-running deletes and rebuilds the demo org (cascade) — your other orgs are untouched.

import { PrismaClient, type TaskStatus, type TaskPriority, type SocialPlatform, type PostStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const ORG_SLUG = "demo-agency";
const PASSWORD = process.env.SEED_PASSWORD ?? "InKontrol-Demo-2026!";
const DAY = 24 * 3600 * 1000;

// Deterministic PRNG so re-seeds look the same.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);
const chance = (p: number) => rand() < p;

const USERS = [
  { email: "owner@demo.test", name: "Nadia Owner", role: "OWNER" },
  { email: "admin@demo.test", name: "Ahmed Admin", role: "ADMIN" },
  { email: "maya@demo.test", name: "Maya Designer", role: "MEMBER" },
  { email: "ravi@demo.test", name: "Ravi Developer", role: "MEMBER" },
  { email: "sara@demo.test", name: "Sara Copywriter", role: "MEMBER" },
  { email: "client@demo.test", name: "Ibrahim (Client)", role: "GUEST" },
] as const;

const CLIENTS = [
  "Bluewave Resorts", "Hulhumalé Fitness", "Coral Café", "Island Dental", "Atoll Logistics",
  "Sunset Villas", "Malé Motors", "Lagoon Spa", "Reef Divers", "Northstar Realty",
];
const FOLDERS = ["Campaigns", "Website"];
const LIST_NAMES = ["Content calendar", "Design requests", "Dev backlog", "Client approvals"];
const TASK_VERBS = ["Draft", "Design", "Review", "Publish", "Schedule", "Fix", "Write", "Prepare", "Update", "Approve"];
const TASK_OBJECTS = [
  "Instagram carousel", "homepage hero", "monthly report", "landing page copy", "email newsletter",
  "product photoshoot brief", "Google Business listing", "Reel script", "promo banner", "pricing page",
  "testimonial video", "SEO audit", "brand guidelines", "checkout bug", "contact form", "blog post",
];
const STATUSES: TaskStatus[] = ["TODO", "TODO", "TODO", "IN_PROGRESS", "IN_PROGRESS", "IN_REVIEW", "DONE", "DONE", "DONE"];
const PRIORITIES: TaskPriority[] = ["LOW", "NORMAL", "NORMAL", "NORMAL", "HIGH", "HIGH", "URGENT"];
const COMMENTS = [
  "Client asked for a warmer tone on this one.",
  "Draft attached — @Maya Designer can you take a look?",
  "Blocked until we get the logo files.",
  "Approved from our side, ready to go.",
  "Moving the deadline to Friday, @Ravi Developer heads up.",
  "Can we add the new pricing before this goes out?",
  "Looks good. Small typo in the second paragraph.",
  "Client loved it. Let's reuse this format next month.",
];
const PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "X", "TIKTOK", "YOUTUBE"];
const POST_TEXTS = [
  "New week, new goals. Here's what our team is shipping for clients this week 👇",
  "Behind the scenes at the Bluewave Resorts photoshoot. Golden hour did the work for us.",
  "3 things every small business gets wrong on Instagram (and how to fix them).",
  "We just launched a new website for Island Dental — faster, cleaner, mobile-first.",
  "Client spotlight: Coral Café doubled weekend bookings in 6 weeks. Case study in bio.",
  "Reminder: consistency beats virality. Post weekly, measure monthly.",
  "Our summer content calendar template is free this week. Link in bio.",
  "Hiring: a part-time video editor who loves short-form. DM us.",
];

async function main() {
  console.log("Seeding Demo Agency…");
  const existing = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
    console.log("  removed previous demo org");
  }

  // ---- Users ----
  const passwordHash = await hash(PASSWORD, 12);
  const users: Record<string, { id: string; name: string; email: string }> = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name, passwordHash },
      update: { name: u.name, passwordHash },
    });
    users[u.email] = user;
  }
  const staff = USERS.filter((u) => u.role !== "GUEST").map((u) => users[u.email]);
  const owner = users["owner@demo.test"];

  // ---- Org + memberships ----
  const org = await prisma.organization.create({
    data: {
      name: "Demo Agency",
      slug: ORG_SLUG,
      brandColor: "#2F7F8C",
      brandVoice: "Direct and warm. Short sentences. No emojis in captions for LinkedIn. Speak to small business owners in the Maldives.",
      memberships: {
        create: USERS.map((u) => ({
          userId: users[u.email].id,
          role: u.role,
          onboardedAt: u.role === "GUEST" ? null : new Date(),
        })),
      },
      subscription: { create: { plan: "PRO", status: "active" } },
    },
  });
  const O = org.id;
  console.log("  org + 6 users");

  // ---- Hierarchy ----
  const workspace = await prisma.workspace.create({ data: { organizationId: O, name: "Clients" } });
  const spaceIds: string[] = [];
  const listIds: string[] = [];
  const listFieldIds: Record<string, { status: string; hours: string }> = {};
  for (const [si, clientName] of CLIENTS.entries()) {
    const space = await prisma.space.create({
      data: { organizationId: O, workspaceId: workspace.id, name: clientName, position: si },
    });
    spaceIds.push(space.id);
    const folders = [];
    for (const [fi, fname] of FOLDERS.entries()) {
      folders.push(
        await prisma.folder.create({
          data: { organizationId: O, spaceId: space.id, name: fname, position: fi },
        })
      );
    }
    for (const [li, lname] of LIST_NAMES.entries()) {
      const list = await prisma.list.create({
        data: {
          organizationId: O,
          spaceId: space.id,
          folderId: li < 2 ? folders[li].id : null,
          name: lname,
          position: li,
        },
      });
      listIds.push(list.id);
      const statusField = await prisma.customField.create({
        data: {
          organizationId: O,
          listId: list.id,
          name: "Client status",
          type: "SELECT",
          options: ["Waiting on client", "Approved", "Revisions requested"],
        },
      });
      const hoursField = await prisma.customField.create({
        data: { organizationId: O, listId: list.id, name: "Estimated hours", type: "NUMBER" },
      });
      listFieldIds[list.id] = { status: statusField.id, hours: hoursField.id };
    }
  }
  console.log(`  ${spaceIds.length} spaces, ${listIds.length} lists`);

  // Guest: scoped to the first two clients
  await prisma.guestAccess.createMany({
    data: spaceIds.slice(0, 2).map((spaceId) => ({
      organizationId: O,
      userId: users["client@demo.test"].id,
      spaceId,
    })),
  });

  // ---- Tasks (~500) ----
  const taskIds: { id: string; listId: string; status: TaskStatus; title: string }[] = [];
  for (const listId of listIds) {
    const count = int(10, 15);
    for (let i = 0; i < count; i++) {
      const status = pick(STATUSES);
      const title = `${pick(TASK_VERBS)} ${pick(TASK_OBJECTS)}`;
      const created = daysFromNow(-int(1, 60));
      const task = await prisma.task.create({
        data: {
          organizationId: O,
          listId,
          title,
          description: chance(0.6)
            ? `Context: ${title.toLowerCase()} for the client's ${pick(["Q3 push", "launch", "seasonal campaign", "rebrand"])}.\n\nDeliverable: ${pick(["1 asset", "3 variants", "final copy", "staging link"])}.`
            : "",
          status,
          priority: pick(PRIORITIES),
          dueDate: chance(0.8) ? daysFromNow(int(-20, 45)) : null,
          position: i,
          createdById: pick(staff).id,
          createdAt: created,
          updatedAt: status === "DONE" ? new Date(created.getTime() + int(1, 10) * DAY) : created,
        },
      });
      taskIds.push({ id: task.id, listId, status, title });

      // assignees (1-2)
      const assignees = new Set<string>([pick(staff).id]);
      if (chance(0.3)) assignees.add(pick(staff).id);
      await prisma.taskAssignee.createMany({
        data: [...assignees].map((userId) => ({ organizationId: O, taskId: task.id, userId })),
        skipDuplicates: true,
      });

      // custom field values
      const f = listFieldIds[listId];
      await prisma.customFieldValue.createMany({
        data: [
          { organizationId: O, taskId: task.id, fieldId: f.status, value: pick(["Waiting on client", "Approved", "Revisions requested", ""]) },
          { organizationId: O, taskId: task.id, fieldId: f.hours, value: String(int(1, 16)) },
        ],
      });

      // subtasks (25%)
      if (chance(0.25)) {
        const n = int(2, 4);
        await prisma.task.createMany({
          data: Array.from({ length: n }, (_, k) => ({
            organizationId: O,
            listId,
            parentTaskId: task.id,
            title: `${pick(["Gather", "Outline", "Build", "QA", "Send"])} ${pick(["assets", "copy", "draft", "final"])}`,
            status: status === "DONE" ? ("DONE" as TaskStatus) : pick(STATUSES),
            position: k,
            createdById: owner.id,
          })),
        });
      }

      // comments (35%)
      if (chance(0.35)) {
        const n = int(1, 3);
        for (let c = 0; c < n; c++) {
          const author = pick(staff);
          const body = pick(COMMENTS);
          await prisma.comment.create({
            data: {
              organizationId: O,
              taskId: task.id,
              authorId: author.id,
              body,
              createdAt: new Date(created.getTime() + c * DAY + int(1, 20) * 3600 * 1000),
            },
          });
          await prisma.activityLogEntry.create({
            data: { organizationId: O, taskId: task.id, actorId: author.id, type: "comment", detail: body.slice(0, 120) },
          });
        }
      }
      await prisma.activityLogEntry.create({
        data: { organizationId: O, taskId: task.id, actorId: owner.id, type: "created_task", detail: title, createdAt: created },
      });
    }
  }
  console.log(`  ${taskIds.length} top-level tasks (+ subtasks, comments, fields)`);

  // dependencies: ~40 within the same list
  const byList = new Map<string, typeof taskIds>();
  for (const t of taskIds) byList.set(t.listId, [...(byList.get(t.listId) ?? []), t]);
  const deps: { organizationId: string; blockerId: string; blockedId: string }[] = [];
  for (const tasks of byList.values()) {
    if (tasks.length < 2) continue;
    const a = pick(tasks), b = pick(tasks);
    if (a.id !== b.id) deps.push({ organizationId: O, blockerId: a.id, blockedId: b.id });
  }
  await prisma.taskDependency.createMany({ data: deps, skipDuplicates: true });

  // ---- Time entries (~200) ----
  const timeRows = [];
  for (let i = 0; i < 200; i++) {
    const t = pick(taskIds);
    const start = daysFromNow(-int(0, 30));
    start.setUTCHours(int(8, 17), 0, 0, 0);
    timeRows.push({
      organizationId: O,
      taskId: t.id,
      userId: pick(staff).id,
      startedAt: start,
      endedAt: new Date(start.getTime() + int(15, 180) * 60_000),
      billable: chance(0.8),
      note: pick(["", "", "call with client", "revisions", "research", "build"]),
    });
  }
  await prisma.timeEntry.createMany({ data: timeRows });

  // ---- Goals ----
  for (const [i, title] of [
    "Retain every client this quarter",
    "Ship 40 client posts per month",
    "Cut approval turnaround to 2 days",
    "Launch 3 client websites by Q4",
    "Grow Bluewave's Instagram to 10k followers",
  ].entries()) {
    const goal = await prisma.goal.create({
      data: {
        organizationId: O,
        title,
        spaceId: i === 4 ? spaceIds[0] : null,
        targetDate: daysFromNow(int(30, 120)),
        createdById: owner.id,
      },
    });
    await prisma.keyResult.createMany({
      data: [
        { organizationId: O, goalId: goal.id, title: "Manual KR", type: "manual", currentValue: int(10, 80), targetValue: 100 },
        { organizationId: O, goalId: goal.id, title: `${LIST_NAMES[i % 4]} completion`, type: "task_linked", linkedListId: listIds[i * 4 + (i % 4)] },
      ],
    });
  }

  // ---- Forms, templates, docs, automations ----
  await prisma.form.createMany({
    data: [0, 5, 9].map((i) => ({
      organizationId: O,
      listId: listIds[i * 4 + 1],
      name: `${CLIENTS[i]} — design request`,
      createdById: owner.id,
    })),
  });
  await prisma.template.create({
    data: {
      organizationId: O,
      name: "Standard client kickoff",
      description: "Saved from Bluewave Resorts",
      structure: { lists: [{ name: "Onboarding", tasks: [{ title: "Kickoff call" }, { title: "Collect brand assets" }] }] },
      createdById: owner.id,
    },
  });
  for (const [i, title] of ["Brand guidelines — Bluewave", "Q3 content strategy", "Website launch checklist", "Meeting notes 2026-08-20", "Client onboarding playbook"].entries()) {
    await prisma.doc.create({
      data: {
        organizationId: O,
        title,
        spaceId: i < 2 ? spaceIds[i] : null,
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] },
            { type: "paragraph", content: [{ type: "text", text: "This is seeded demo content. Edit freely." }] },
            { type: "bulletList", content: [1, 2, 3].map((n) => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Point ${n}` }] }] })) },
          ],
        },
        createdById: owner.id,
      },
    });
  }
  await prisma.automationRule.createMany({
    data: [
      { organizationId: O, listId: listIds[3], name: "Notify Ahmed on approval", triggerType: "status_becomes", triggerValue: "IN_REVIEW", actionType: "notify_user", actionValue: users["admin@demo.test"].id },
      { organizationId: O, listId: listIds[0], name: "Urgent when done late", triggerType: "status_becomes", triggerValue: "DONE", actionType: "set_priority", actionValue: "LOW" },
      { organizationId: O, listId: listIds[2], name: "Assign Ravi to review", triggerType: "status_becomes", triggerValue: "IN_REVIEW", actionType: "assign_user", actionValue: users["ravi@demo.test"].id },
    ],
  });

  // ---- Social ----
  const accounts = [];
  for (const [i, platform] of PLATFORMS.entries()) {
    const account = await prisma.socialAccount.create({
      data: {
        organizationId: O,
        platform,
        handle: i < 3 ? "bluewaveresorts" : "demoagency",
        displayName: i < 3 ? "Bluewave Resorts" : "Demo Agency",
        isDemo: true,
        createdById: owner.id,
      },
    });
    accounts.push(account);
    let followers = int(800, 12000);
    const snaps = [];
    for (let d = 30; d >= 0; d--) {
      followers += int(-5, 45);
      snaps.push({
        organizationId: O,
        socialAccountId: account.id,
        date: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - d)),
        followers,
        engagementRate: Math.round((1.5 + rand() * 4) * 100) / 100,
        reach: Math.floor(followers * (0.2 + rand() * 0.4)),
        impressions: Math.floor(followers * (0.5 + rand() * 1.2)),
      });
    }
    await prisma.accountAnalyticsSnapshot.createMany({ data: snaps });
  }
  const postStatuses: PostStatus[] = ["DRAFT", "PENDING_APPROVAL", "SCHEDULED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "FAILED"];
  for (let i = 0; i < 60; i++) {
    const status = pick(postStatuses);
    const targetsAccounts = [...new Set([pick(accounts), pick(accounts)])];
    const when =
      status === "PUBLISHED" || status === "FAILED" ? daysFromNow(-int(0, 28)) : status === "SCHEDULED" ? daysFromNow(int(1, 21)) : null;
    if (when) when.setUTCHours(int(8, 20), pick([0, 15, 30, 45]), 0, 0);
    const post = await prisma.socialPost.create({
      data: {
        organizationId: O,
        content: pick(POST_TEXTS),
        status,
        linkedTaskId: chance(0.3) ? pick(taskIds).id : null,
        createdById: pick(staff).id,
        targets: {
          create: targetsAccounts.map((a) => ({
            organizationId: O,
            socialAccountId: a.id,
            scheduledAt: when,
            publishedAt: status === "PUBLISHED" ? when : null,
            status,
            externalId: status === "PUBLISHED" ? `demo_${a.id.slice(-6)}_${i}` : null,
            errorMessage: status === "FAILED" ? "Simulated platform error: media too large" : null,
            contentOverride: chance(0.2) ? "Shorter caption for this platform." : null,
          })),
        },
      },
      include: { targets: true },
    });
    if (status === "PUBLISHED") {
      for (const t of post.targets) {
        const impressions = int(500, 40000);
        await prisma.postAnalytics.create({
          data: {
            organizationId: O,
            postTargetId: t.id,
            impressions,
            likes: Math.floor(impressions * (0.03 + rand() * 0.05)),
            comments: Math.floor(impressions * (0.002 + rand() * 0.006)),
            shares: Math.floor(impressions * (0.004 + rand() * 0.008)),
            clicks: Math.floor(impressions * (0.01 + rand() * 0.02)),
          },
        });
      }
    }
  }
  for (const handle of ["islandbreeze", "maldivesmedia", "atollcreative", "sunrisestudio"]) {
    const comp = await prisma.competitorProfile.create({
      data: { organizationId: O, platform: "INSTAGRAM", handle },
    });
    let f = int(2000, 30000);
    for (let d = 4; d >= 0; d--) {
      f += int(0, 300);
      await prisma.competitorSnapshot.create({
        data: { organizationId: O, competitorId: comp.id, date: daysFromNow(-d * 7), followers: f, engagementRate: Math.round((1 + rand() * 3) * 100) / 100 },
      });
    }
  }
  for (const kw of ["maldives resort marketing", "malé web design", "social media agency maldives", "dental clinic hulhumalé", "dive center marketing", "café instagram tips", "real estate maldives", "fitness studio branding"]) {
    const k = await prisma.trackedKeyword.create({
      data: { organizationId: O, keyword: kw, targetUrl: "https://demoagency.example.com/" + kw.split(" ")[0] },
    });
    let pos = int(8, 40);
    for (let d = 3; d >= 0; d--) {
      pos = Math.max(1, pos + int(-4, 2));
      await prisma.keywordRankSnapshot.create({ data: { organizationId: O, keywordId: k.id, date: daysFromNow(-d * 7), position: pos } });
    }
  }
  console.log("  social: 6 accounts, 60 posts, 4 competitors, 8 keywords");

  // ---- Notifications for the owner + API key + webhook ----
  await prisma.notification.createMany({
    data: [
      { organizationId: O, userId: owner.id, type: "task_assigned", title: "You were assigned: Draft monthly report", linkPath: `/o/${ORG_SLUG}/t/${taskIds[0].id}` },
      { organizationId: O, userId: owner.id, type: "comment_mention", title: "You were mentioned on: Design homepage hero", body: "Can you sign off on this?", linkPath: `/o/${ORG_SLUG}/t/${taskIds[1].id}` },
      { organizationId: O, userId: owner.id, type: "automation", title: "A post is waiting for approval", linkPath: `/o/${ORG_SLUG}/social/posts`, readAt: new Date() },
    ],
  });
  const rawKey = "ik_demo_readonly_key_do_not_use_in_prod";
  await prisma.apiKey.create({
    data: {
      organizationId: O,
      name: "Demo read-only key",
      keyHash: createHash("sha256").update(rawKey).digest("hex"),
      prefix: rawKey.slice(0, 8),
      scope: "read",
      createdById: owner.id,
    },
  });

  console.log("\nDone. Sign in at /sign-in with any of:");
  for (const u of USERS) console.log(`  ${u.email.padEnd(20)} ${u.role.padEnd(7)} password: ${PASSWORD}`);
  console.log(`\nDemo API key (read-only): ${rawKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
