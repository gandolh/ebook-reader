import { Outlet } from "@tanstack/react-router";

/**
 * Shared app shell. Just a minimal nav + outlet for now — the reader chrome
 * (toolbar, TOC drawer, theme picker) is format-specific and lands in
 * briefs 06/07 (wiki/reader.md).
 */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-reader-bg text-reader-fg">
      <nav className="flex gap-4 border-b border-reader-border px-4 py-3 text-sm">
        <a href="/" className="font-semibold">
          ebook-reader
        </a>
      </nav>
      <Outlet />
    </div>
  );
}
