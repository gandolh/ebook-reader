import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotePage, NoteSummary } from "@ebook-reader/shared";

import { createNote, deleteNote, fetchNote, fetchNotes, updateNote } from "./notes-api";

/**
 * React Query hooks for notes (brief 26). Mirrors the library hooks' shape:
 * one list query + mutations that invalidate it. The editor uses `useNote`
 * (single) + `useSaveNote` (debounced autosave PATCH).
 */

const NOTES_KEY = ["notes"] as const;

export function useNotesList() {
  return useQuery({ queryKey: NOTES_KEY, queryFn: fetchNotes });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ["note", id],
    queryFn: () => fetchNote(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => createNote(title),
    onSuccess: () => void qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: NoteSummary) => deleteNote(note.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

/**
 * Save a note's title/pages. Does NOT invalidate the single-note query (the
 * editor is the source of truth for the open note — refetching would clobber
 * in-flight edits); it refreshes the LIST so titles/timestamps stay current.
 */
export function useSaveNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: { title?: string; pages?: NotePage[] }) => updateNote(id, fields),
    onSuccess: () => void qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}
