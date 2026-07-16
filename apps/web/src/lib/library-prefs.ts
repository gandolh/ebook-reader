import { LIBRARY_GROUPS, MEDIA_KINDS, type LibraryGroup, type MediaKind } from "@ebook-reader/shared";

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
/** Which media kind narrows the gallery (brief 23c). Default "all" = every kind. */
const TYPE_FILTER_KEY = "library:typeFilter";

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

/**
 * The gallery's media-type filter (brief 23c step 6): "all" (every kind, the
 * unfiltered default) or a single `MediaKind` narrowing the gallery to Books /
 * Music / Videos. Applied in `home.tsx` **before** grouping, so grouping/
 * shelves/stacks operate on the already-filtered set.
 */
export type LibraryTypeFilter = "all" | MediaKind;

export function readTypeFilterPref(): LibraryTypeFilter {
  try {
    const value = localStorage.getItem(TYPE_FILTER_KEY);
    if (value === "all") return "all";
    return (MEDIA_KINDS as readonly string[]).includes(value ?? "")
      ? (value as MediaKind)
      : "all";
  } catch {
    return "all";
  }
}

export function writeTypeFilterPref(filter: LibraryTypeFilter): void {
  try {
    localStorage.setItem(TYPE_FILTER_KEY, filter);
  } catch {
    /* preference persistence is best-effort */
  }
}
