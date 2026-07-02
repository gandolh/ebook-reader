import { getRouteApi } from "@tanstack/react-router";

const routeApi = getRouteApi("/read");

/**
 * `/read` — reader shell placeholder. Renders once a file has been picked on
 * `/` and (for EPUB) the read-vs-convert fork has been resolved (D1). The
 * `format` search param is the type-safe seam the PDF (brief 06) and EPUB
 * (brief 07) renderers hook into; no file is actually loaded client-side
 * yet (no persistence — D3 — so there's nothing to hydrate on a direct
 * visit).
 */
export function Read() {
  const { format } = routeApi.useSearch();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">Reader shell</h1>
      <p className="text-reader-fg/70">
        Placeholder for the PDF (react-pdf) / EPUB (react-reader) renderers behind the shared
        Kindle-style chrome. Lands in briefs 06/07.
      </p>
      <p className="text-sm text-reader-fg/60">
        Format: {format ?? "(none — nothing loaded yet, no persistence per D3)"}
      </p>
    </main>
  );
}
