import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { z } from "zod";
import { formatSchema } from "@ebook-reader/shared";

import { RootLayout } from "./routes/root-layout";
import { Home } from "./routes/home";
import { Read } from "./routes/read";

/**
 * Code-based route tree (no file-based plugin — keeps the shell dependency-
 * light; see brief 04). Two routes for now: `/` (home/upload) and `/read`
 * (reader shell). Both later briefs (05 uploader, 06/07 readers) extend
 * these components, not this tree shape.
 */
const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

// `format` is optional + type-safe (validated against the shared Zod enum)
// so `/read` can be deep-linked once brief 05 wires the uploader to it.
const readSearchSchema = z.object({
  format: formatSchema.optional(),
  // The library book id being read (D24). Encoded in the URL so a refresh /
  // direct visit can re-fetch the file from the library instead of losing it
  // (the `File` itself lives only in memory). Absent for dev-sample loads.
  book: z.string().optional(),
  // Dev-only, opt-in flag: when `?dev=1` and running the dev server, `/read`
  // loads a bundled sample PDF so the reader is testable without the uploader
  // (brief 06). Gated by `import.meta.env.DEV` — no effect in production.
  dev: z.coerce.boolean().optional(),
});

const readRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/read",
  validateSearch: readSearchSchema,
  component: Read,
});

const routeTree = rootRoute.addChildren([homeRoute, readRoute]);

// `basepath` matches Vite's `base` (import.meta.env.BASE_URL) so client-side
// routing stays under the deploy sub-path (e.g. /ebook-reader/). It's "/" in dev,
// which TanStack treats as no prefix.
export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
