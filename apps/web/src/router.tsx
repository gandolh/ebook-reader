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
});

const readRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/read",
  validateSearch: readSearchSchema,
  component: Read,
});

const routeTree = rootRoute.addChildren([homeRoute, readRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
