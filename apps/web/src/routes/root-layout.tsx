import { Outlet } from "@tanstack/react-router";

import { AuthGate } from "../auth/LockScreen";
import { UpdateToast } from "../pwa/UpdateToast";

/**
 * Shared app shell. The library home owns its own header (`LibraryHeader` —
 * wordmark + theme toggle) and the readers are full-screen (`fixed inset-0`),
 * so the shell adds no chrome of its own. A nav here previously double-stamped
 * the "ebook-reader" wordmark on the home page.
 *
 * `AuthGate` wraps `<Outlet />` here (brief 09) rather than in `main.tsx`
 * because this is the root *route* component — every route (`/`, `/read`)
 * renders inside it, so gating here covers deep links too, and it's the
 * natural home for app-shell-level concerns (it already owns the shell div).
 */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-reader-bg text-reader-fg">
      <AuthGate>
        <Outlet />
      </AuthGate>
      {/* App-level, outside the auth gate: a new deploy should surface even on
          the lock screen so the app is never stuck on an old version. */}
      <UpdateToast />
    </div>
  );
}
