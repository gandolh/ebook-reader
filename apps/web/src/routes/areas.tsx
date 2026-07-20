import { LibraryArea } from "../library/LibraryArea";

/**
 * The three per-type area routes (Atrium IA, brief 25). Each is a thin wrapper
 * that hands its `kind` to the shared `LibraryArea`; the route tree (router.tsx)
 * gives each the same `?g` search schema for the Stacks drill-in.
 */
export function BooksArea() {
  return <LibraryArea kind="book" />;
}

export function MusicArea() {
  return <LibraryArea kind="audio" />;
}

export function VideosArea() {
  return <LibraryArea kind="video" />;
}
