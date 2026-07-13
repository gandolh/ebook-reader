import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { queryClient } from "./lib/query-client";
import { router } from "./router";

// Self-hosted fonts (wiki/design.md — no Google CDN, D14). Playfair Display
// (display/headlines), Source Serif 4 (reading body), Inter (UI labels).
// Only the latin + latin-ext subsets are imported (per-subset entrypoints,
// not the full family CSS) — this app is English-first, so the
// cyrillic/cyrillic-ext/greek/greek-ext/vietnamese subsets @fontsource
// ships per weight are unnecessary payload and are intentionally skipped.
import "@fontsource/playfair-display/latin-600.css";
import "@fontsource/playfair-display/latin-ext-600.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/playfair-display/latin-ext-700.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-ext-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-600.css";
import "./styles/globals.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
