import { useMemo, type ReactNode } from "react";
import type { LibraryBook, LibraryGroup } from "@ebook-reader/shared";

import { groupBooks } from "./grouping";
import type { GroupView } from "../lib/library-prefs";
import { ShelfView } from "./ShelfView";
import { StackIndex } from "./StackIndex";
import { GroupDetail } from "./GroupDetail";

/**
 * Owns the shared grouping logic for an active grouping and branches on the View
 * toggle (brief 21 step 5). Both views consume the identical `groupBooks` output
 * so they can never disagree on membership or order.
 *
 * - **Shelves**: one horizontal shelf per group.
 * - **Stacks**: the fanned-stack index, or — when `focusedGroup` (the `?g`
 *   param) names an existing group — that group's drilled `GroupDetail`. A `?g`
 *   that matches nothing (stale link, emptied group) degrades to the index.
 *
 * Drill-in navigation is a URL concern: `onFocusGroup`/`onClearFocus` set/clear
 * `?g` so browser Back and refresh behave, per the brief.
 */
export function GroupedGallery({
  books,
  groupBy,
  view,
  focusedGroup,
  onFocusGroup,
  onClearFocus,
  renderCover,
}: {
  books: LibraryBook[];
  groupBy: Exclude<LibraryGroup, "none">;
  view: GroupView;
  focusedGroup?: string;
  onFocusGroup: (groupKey: string) => void;
  onClearFocus: () => void;
  renderCover: (book: LibraryBook) => ReactNode;
}) {
  const groups = useMemo(() => groupBooks(books, groupBy), [books, groupBy]);

  if (view === "shelves") {
    return <ShelfView groups={groups} renderCover={renderCover} />;
  }

  const focused = focusedGroup != null ? groups.find((g) => g.key === focusedGroup) : undefined;
  if (focused) {
    return <GroupDetail group={focused} onBack={onClearFocus} renderCover={renderCover} />;
  }

  return <StackIndex groups={groups} onOpen={onFocusGroup} />;
}
