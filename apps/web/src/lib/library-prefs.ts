import { LIBRARY_GROUPS, type LibraryGroup } from "@ebook-reader/shared";

/**
 * Durable library UI preferences (brief 21), persisted to localStorage exactly
 * like the reader's paged⇄scroll toggle (D9-consistent — see
 * `store/reader-store.ts`): a single guarded key per preference, falling back to
 * the default in SSR / no-storage / corrupt-value environments.
 *
 * These are library-chrome concerns, not reader state, so they live here rather
 * than in the (in-memory, reader-focused) Zustand store — mirroring how the
 * gallery's `sort` is plain component state, not store state.
 */

/** Which metadata field the gallery groups by. Default "none" = today's flat gallery. */
const GROUP_BY_KEY = "library:groupBy";
/** Which view renders an active grouping. Default "shelves". */
const GROUP_VIEW_KEY = "library:groupView";

/** Shelves (horizontal shelves) vs Stacks (fanned index + drill-in). */
export type GroupView = "shelves" | "stacks";

export function readGroupByPref(): LibraryGroup {
  try {
    const value = localStorage.getItem(GROUP_BY_KEY);
    return (LIBRARY_GROUPS as readonly string[]).includes(value ?? "")
      ? (value as LibraryGroup)
      : "none";
  } catch {
    return "none";
  }
}

export function writeGroupByPref(group: LibraryGroup): void {
  try {
    localStorage.setItem(GROUP_BY_KEY, group);
  } catch {
    /* preference persistence is best-effort */
  }
}

export function readGroupViewPref(): GroupView {
  try {
    return localStorage.getItem(GROUP_VIEW_KEY) === "stacks" ? "stacks" : "shelves";
  } catch {
    return "shelves";
  }
}

export function writeGroupViewPref(view: GroupView): void {
  try {
    localStorage.setItem(GROUP_VIEW_KEY, view);
  } catch {
    /* preference persistence is best-effort */
  }
}
