import { Outlet } from "@tanstack/react-router";

/**
 * Shared app shell. The library home owns its own header (`LibraryHeader` —
 * wordmark + theme toggle) and the readers are full-screen (`fixed inset-0`),
 * so the shell adds no chrome of its own. A nav here previously double-stamped
 * the "ebook-reader" wordmark on the home page.
 */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-reader-bg text-reader-fg">
      <Outlet />
    </div>
  );
}
