import { useCallback, useEffect, useRef } from "react";

import { useReaderStore } from "../../store/reader-store";

/**
 * Kindle-style auto-hiding chrome (wiki/reader.md). Shared by both readers.
 *
 * Behavior:
 * - Chrome hides after `idleMs` of no pointer/keyboard activity.
 * - Any mouse move, tap, key press, or scroll reveals it and restarts the timer.
 * - While a chrome hold is active (`chromeHoldCount > 0` — pointer over the
 *   toolbar, or a popover/drawer/search panel open) the timer never hides it;
 *   it re-arms instead, so the chrome can't fade out from under the user.
 * - Visibility is stored in Zustand (`chromeVisible`) so any component can read
 *   it and the format-adaptive toolbar can animate itself.
 *
 * Listens on `window`, which covers the PDF reader fully. The EPUB renderer
 * lives in an iframe whose events do NOT bubble to the parent window — the
 * EPUB reader must forward the rendition's DOM events into the returned
 * `reveal` callback (epub.js re-emits `mousemove`/`click`/`keydown` on the
 * rendition).
 *
 * Returns a stable `reveal` function.
 */
export function useAutoHideChrome(options: { idleMs?: number; enabled?: boolean } = {}) {
  const { idleMs = 3000, enabled = true } = options;

  const setChromeVisible = useReaderStore((s) => s.setChromeVisible);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(
    function schedule() {
      clearTimer();
      timerRef.current = setTimeout(() => {
        // A hold (toolbar hover, open popover/drawer) blocks hiding; try again
        // after another idle period rather than hiding mid-interaction.
        if (useReaderStore.getState().chromeHoldCount > 0) {
          schedule();
          return;
        }
        setChromeVisible(false);
      }, idleMs);
    },
    [clearTimer, idleMs, setChromeVisible],
  );

  const reveal = useCallback(() => {
    if (!enabledRef.current) return;
    setChromeVisible(true);
    scheduleHide();
  }, [scheduleHide, setChromeVisible]);

  useEffect(() => {
    if (!enabled) return;

    // Reveal + arm the idle timer on any reading interaction.
    window.addEventListener("mousemove", reveal, { passive: true });
    window.addEventListener("pointerdown", reveal, { passive: true });
    window.addEventListener("keydown", reveal);
    window.addEventListener("scroll", reveal, { passive: true, capture: true });

    // Start visible, then begin the idle countdown.
    reveal();

    return () => {
      clearTimer();
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("pointerdown", reveal);
      window.removeEventListener("keydown", reveal);
      window.removeEventListener("scroll", reveal, { capture: true } as EventListenerOptions);
    };
  }, [enabled, reveal, clearTimer]);

  return reveal;
}

/**
 * Hold the chrome visible while `active` (e.g. while a popover/drawer is open).
 * Balanced acquire/release; safe under StrictMode double-invocation.
 */
export function useChromeHold(active: boolean) {
  const acquire = useReaderStore((s) => s.acquireChromeHold);
  const release = useReaderStore((s) => s.releaseChromeHold);

  useEffect(() => {
    if (!active) return;
    acquire();
    return release;
  }, [active, acquire, release]);
}
