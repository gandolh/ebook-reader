import { useCallback, useEffect } from "react";

import { useReaderStore } from "../../store/reader-store";

/**
 * Reader chrome visibility (wiki/reader.md). Auto-hide was **removed** — the
 * user wants the top and bottom bars always shown — so this no longer runs an
 * idle timer or listens for activity. It simply guarantees the chrome is
 * visible on mount and returns a stable no-op `reveal`, so existing call sites
 * (both readers; the EPUB iframe event forwarder) keep working unchanged.
 *
 * Kept as a hook (rather than deleted) so timed hiding can be reintroduced in
 * one place if it's ever wanted again.
 */
export function useAutoHideChrome(
  _options: { idleMs?: number; enabled?: boolean } = {},
): () => void {
  const setChromeVisible = useReaderStore((s) => s.setChromeVisible);

  useEffect(() => {
    setChromeVisible(true);
  }, [setChromeVisible]);

  return useCallback(() => {}, []);
}

/**
 * Previously held the chrome open while a surface (popover/drawer/search) was
 * active so the idle timer couldn't fade it away. With auto-hide gone there's
 * nothing to hold, so this is a no-op kept only to preserve its call sites.
 */
export function useChromeHold(_active: boolean): void {
  /* no-op — chrome never hides */
}
