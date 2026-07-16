/**
 * Shared swipe-to-turn-page gesture math (2026-07-16 UI review follow-up).
 * Both readers accept a horizontal swipe as a page turn; the DELIVERY differs —
 * the PDF reader listens on its own DOM container, while the EPUB reader must
 * use epub.js's relayed `touchstart`/`touchend` (touches inside the section
 * iframe never reach the app's own listeners) — so only the classification
 * lives here.
 *
 * A gesture counts as a page swipe when it is fast (a slow drag is text
 * selection), decisively horizontal (vertical intent is scrolling), and long
 * enough to be deliberate.
 */

/** Minimum horizontal travel (px) for a swipe to count. */
const MIN_DISTANCE_PX = 48;
/** Horizontal travel must beat vertical by this factor (diagonal = scroll). */
const HORIZONTAL_BIAS = 1.5;
/** Slower than this is a drag/selection, not a swipe. */
const MAX_DURATION_MS = 600;

/**
 * Classify a completed touch gesture. Returns the page action it maps to:
 * swiping left (content pushed left) reads forward → `"next"`; swiping right
 * goes back → `"prev"`; anything indecisive returns `null`.
 */
export function resolveSwipe(dx: number, dy: number, elapsedMs: number): "prev" | "next" | null {
  if (elapsedMs > MAX_DURATION_MS) return null;
  if (Math.abs(dx) < MIN_DISTANCE_PX) return null;
  if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_BIAS) return null;
  return dx < 0 ? "next" : "prev";
}

/** Left/right tap-zone width as a fraction of the reading pane (the Kindle/
 *  Kobo convention: outer ~30% flips, the middle toggles the chrome). */
const TAP_ZONE_FRACTION = 0.3;

/**
 * Classify a tap by its horizontal position within the reading pane
 * (0 = left edge, 1 = right edge): outer zones turn the page, the center
 * toggles the chrome. Touch screens only — pointer users have the flip
 * buttons and keyboard users the arrow keys.
 */
export function resolveTapZone(xFraction: number): "prev" | "next" | "toggle" {
  if (xFraction <= TAP_ZONE_FRACTION) return "prev";
  if (xFraction >= 1 - TAP_ZONE_FRACTION) return "next";
  return "toggle";
}
