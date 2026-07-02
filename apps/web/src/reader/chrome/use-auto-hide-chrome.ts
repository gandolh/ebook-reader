import { useEffect, useRef } from "react";

import { useReaderStore } from "../../store/reader-store";

/**
 * Kindle-style auto-hiding chrome (wiki/reader.md). Shared by both readers.
 *
 * Behavior:
 * - Chrome hides after `idleMs` of no pointer/keyboard activity.
 * - Any mouse move, tap, key press, or scroll reveals it and restarts the timer.
 * - Visibility is stored in Zustand (`chromeVisible`) so any component can read
 *   it and the format-adaptive toolbar can animate itself.
 *
 * This is format-agnostic on purpose: it listens on `window`, not on the PDF
 * canvas, so the EPUB reader (brief 07) gets the same behavior for free.
 */
export function useAutoHideChrome(options: { idleMs?: number; enabled?: boolean } = {}) {
  const { idleMs = 3000, enabled = true } = options;

  const setChromeVisible = useReaderStore((s) => s.setChromeVisible);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleHide = () => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        setChromeVisible(false);
      }, idleMs);
    };

    const reveal = () => {
      setChromeVisible(true);
      scheduleHide();
    };

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
  }, [enabled, idleMs, setChromeVisible]);
}
