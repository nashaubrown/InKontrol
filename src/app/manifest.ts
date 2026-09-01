import type { MetadataRoute } from "next";

// PWA manifest (Phase 5.3): installable on phones — "check tasks and inbox on
// my phone" is most of what agencies need on mobile. Native apps deferred until
// customer demand is explicit.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InKontrol",
    short_name: "InKontrol",
    description: "Run the work. Ship the content. One place.",
    start_url: "/orgs",
    display: "standalone",
    background_color: "#F8FAFA",
    theme_color: "#369AAC",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
