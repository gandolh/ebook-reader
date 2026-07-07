import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import type { FileType, LibraryBook, LibrarySort } from "@ebook-reader/shared";
import { DATA_DIR, DB_PATH } from "./config.js";

/**
 * SQLite-backed library store (decisions.md D24). Synchronous
 * `better-sqlite3` — simplest for a single-user local API; no connection pool,
 * no async ceremony. One `books` table; image/file bytes live on disk (D25),
 * this table stores only paths + metadata.
 */

/** The raw DB row (server-side; includes on-disk paths that never hit the wire). */
export interface BookRow {
  id: string;
  title: string;
  author: string | null;
  format: FileType;
  file_path: string;
  cover_path: string | null;
  size_bytes: number;
  progress: number;
  created_at: string;
  last_opened_at: string | null;
}

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id            TEXT    PRIMARY KEY,
    title         TEXT    NOT NULL,
    author        TEXT,
    format        TEXT    NOT NULL,
    file_path     TEXT    NOT NULL,
    cover_path    TEXT,
    size_bytes    INTEGER NOT NULL,
    progress      REAL    NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL,
    last_opened_at TEXT
  );
`);

const statements = {
  insert: db.prepare<BookRow>(`
    INSERT INTO books (id, title, author, format, file_path, cover_path,
                       size_bytes, progress, created_at, last_opened_at)
    VALUES (@id, @title, @author, @format, @file_path, @cover_path,
            @size_bytes, @progress, @created_at, @last_opened_at)
  `),
  getById: db.prepare<[string]>("SELECT * FROM books WHERE id = ?"),
  listRecent: db.prepare(
    "SELECT * FROM books ORDER BY COALESCE(last_opened_at, created_at) DESC",
  ),
  listByTitle: db.prepare("SELECT * FROM books ORDER BY title COLLATE NOCASE ASC"),
  listByAuthor: db.prepare(
    "SELECT * FROM books ORDER BY author COLLATE NOCASE ASC, title COLLATE NOCASE ASC",
  ),
  setProgress: db.prepare<[number, string, string]>(
    "UPDATE books SET progress = ?, last_opened_at = ? WHERE id = ?",
  ),
  touchOpened: db.prepare<[string, string]>(
    "UPDATE books SET last_opened_at = ? WHERE id = ?",
  ),
  remove: db.prepare<[string]>("DELETE FROM books WHERE id = ?"),
};

/** Map a DB row to the wire shape (strips on-disk paths; D25). */
export function toLibraryBook(row: BookRow): LibraryBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    format: row.format,
    hasCover: row.cover_path !== null,
    sizeBytes: row.size_bytes,
    progress: row.progress,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at,
  };
}

export function insertBook(row: BookRow): void {
  statements.insert.run(row);
}

export function getBook(id: string): BookRow | undefined {
  return statements.getById.get(id) as BookRow | undefined;
}

export function listBooks(sort: LibrarySort): BookRow[] {
  const stmt =
    sort === "title"
      ? statements.listByTitle
      : sort === "author"
        ? statements.listByAuthor
        : statements.listRecent;
  return stmt.all() as BookRow[];
}

export function setProgress(id: string, progress: number, now: string): void {
  statements.setProgress.run(progress, now, id);
}

export function touchOpened(id: string, now: string): void {
  statements.touchOpened.run(now, id);
}

export function deleteBook(id: string): void {
  statements.remove.run(id);
}
