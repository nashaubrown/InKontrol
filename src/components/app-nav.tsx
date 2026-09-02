"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

const ICONS = {
  home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />,
  chart: <path d="M4 20V10m6 10V4m6 16v-7m-13 7h17" />,
  inbox: <path d="M4 13h4l2 3h4l2-3h4M5 6h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />,
  calendar: <path d="M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  clock: <path d="M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
  users: <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m14-10a4 4 0 1 0-8 0m12 10v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75" />,
  target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-3.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />,
  form: <path d="M9 12h6m-6 4h6M9 8h1M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />,
  megaphone: <path d="M3 11v3a1 1 0 0 0 1 1h2l3 5h2v-5m-7-4 14-5v13l-14-4m7 0v0" />,
  spark: <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />,
  doc: <path d="M14 3v5h5M8 13h8m-8 4h5M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />,
  report: <path d="M8 17v-4m4 4v-7m4 7v-2M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  template: <path d="M4 5h16M4 5v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5M9 20V9m0 0h11" />,
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />,
  search: <path d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />,
  briefcase: <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-9 0h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3zM4 13h16" />,
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

export function AppNav({
  orgSlug,
  isGuest,
  unread,
}: {
  orgSlug: string;
  isGuest: boolean;
  unread: number;
}) {
  const pathname = usePathname();
  const base = `/o/${orgSlug}`;

  const groups: { title: string | null; items: Item[] }[] = isGuest
    ? [
        {
          title: null,
          items: [
            { href: base, label: "Overview", icon: "home" },
            { href: `${base}/inbox`, label: "Inbox", icon: "inbox", badge: unread },
            { href: `${base}/calendar`, label: "Calendar", icon: "calendar" },
            { href: `${base}/reports`, label: "Reports", icon: "report" },
            { href: `${base}/search`, label: "Search", icon: "search" },
          ],
        },
      ]
    : [
        {
          title: null,
          items: [
            { href: base, label: "Overview", icon: "home" },
            { href: `${base}/inbox`, label: "Inbox", icon: "inbox", badge: unread },
            { href: `${base}/search`, label: "Search", icon: "search" },
          ],
        },
        {
          title: "Work",
          items: [
            { href: `${base}/dashboard`, label: "Dashboard", icon: "chart" },
            { href: `${base}/calendar`, label: "Calendar", icon: "calendar" },
            { href: `${base}/time`, label: "Time", icon: "clock" },
            { href: `${base}/workload`, label: "Workload", icon: "briefcase" },
            { href: `${base}/goals`, label: "Goals", icon: "target" },
            { href: `${base}/forms`, label: "Forms", icon: "form" },
            { href: `${base}/docs`, label: "Docs", icon: "doc" },
          ],
        },
        {
          title: "Content",
          items: [
            { href: `${base}/social`, label: "Social", icon: "megaphone" },
            { href: `${base}/social/ai`, label: "AI assistant", icon: "spark" },
            { href: `${base}/marketing`, label: "Marketing", icon: "chart" },
            { href: `${base}/reports`, label: "Reports", icon: "report" },
          ],
        },
        {
          title: "Organization",
          items: [
            { href: `${base}/members`, label: "Members", icon: "users" },
            { href: `${base}/activity`, label: "Activity", icon: "activity" },
            { href: `${base}/templates`, label: "Templates", icon: "template" },
            { href: `${base}/settings`, label: "Settings", icon: "settings" },
          ],
        },
      ];

  function isActive(href: string) {
    if (href === base) return pathname === base;
    // Longest-match wins so /social/ai doesn't also light up /social
    const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    const matches = allHrefs.filter((h) => pathname === h || pathname.startsWith(h + "/"));
    const longest = matches.sort((a, b) => b.length - a.length)[0];
    return href === longest;
  }

  return (
    <nav className="px-3 py-3">
      {groups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "mt-5" : ""}>
          {group.title && (
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-secondary/80">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                      active
                        ? "bg-primary-light/30 font-medium text-primary"
                        : "text-ink/80 hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    <span className={active ? "text-primary" : "text-secondary"}>
                      <Icon name={item.icon} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
