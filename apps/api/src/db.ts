import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import type { BookSource, FileType, LibraryBook, LibrarySort, MediaKind } from "@ebook-reader/shared";
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
  /** Series name, or null when the file carries none (brief 21). */
  series: string | null;
  /** Position within `series`, or null when unknown (brief 21). */
  series_index: number | null;
  /**
   * JSON-encoded `string[]` of subject/genre tags (brief 21), or null for a row
   * that predates the column and hasn't been backfilled yet — the backfill uses
   * `subjects IS NULL` as its "needs re-scan" sentinel, so a scanned-but-empty
   * book stores `'[]'`, never null.
   */
  subjects: string | null;
  /**
   * Provenance (brief 22): "upload" for user uploads, "gutenberg" for catalog
   * imports. Column has `DEFAULT 'upload'` so existing rows and the upload path
   * are correct without a backfill.
   */
  source: BookSource;
  /** Upstream id within `source` (the Gutenberg id for imports), else null. */
  source_id: string | null;
  /**
   * Media kind (brief 23), derived from `format` at upload: "book" for pdf/epub,
   * "audio" for mp3, "video" for mp4/webm. Column has `DEFAULT 'book'` so
   * pre-media rows migrate to books with no backfill.
   */
  kind: MediaKind;
  /** Playback length in seconds for audio/video, or null (books / unknown). */
  duration_seconds: number | null;
}

/**
 * A user account. Accounts are operator-seeded (no self-registration); the
 * library is shared across all of them, so there is no per-book ownership.
 */
export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

/** The identity attached to an authenticated request. */
export interface SessionUser {
  id: string;
  username: string;
}

/** A raw notes row (brief 26); `data` is JSON-encoded `NotePage[]`. */
export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  data: string;
  created_at: string;
  updated_at: string;
}

/**
 * One user's reading state for one book. Progress + resume position are
 * per-user (the library is shared, the place you're at is not).
 */
export interface UserProgressRow {
  book_id: string;
  /** 0..1, drives the cover progress bar. */
  progress: number;
  /** Opaque resume position: PDF page number (string) or EPUB CFI; null if unset. */
  locator: string | null;
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

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT    PRIMARY KEY,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
  );

  -- Opaque login sessions: a random token maps to a user. Rows are removed
  -- (ON DELETE CASCADE) if the user is ever deleted.
  CREATE TABLE IF NOT EXISTS sessions (
    token         TEXT    PRIMARY KEY,
    user_id       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TEXT    NOT NULL
  );

  -- Per-user reading state (progress + exact resume position). One row per
  -- (user, book); the book itself is shared. Cascades away with the user or
  -- the book.
  CREATE TABLE IF NOT EXISTS reading_progress (
    user_id       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id       TEXT    NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    progress      REAL    NOT NULL DEFAULT 0,
    locator       TEXT,
    updated_at    TEXT    NOT NULL,
    PRIMARY KEY (user_id, book_id)
  );
`);
// Per-user notes (brief 26): a paged notebook with vector ink + text boxes,
// stored as JSON in `data`. Per-user like reading_progress; cascades with the
// user. Kept in its own statement so the books schema block stays focused.
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT NOT NULL PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS notes_user_updated
    ON notes(user_id, updated_at DESC);
`);

// Enforce the sessions→users foreign key (off by default in SQLite).
db.pragma("foreign_keys = ON");

/**
 * Idempotent column adds for the `books` table (brief 21). SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, so guard each with `pragma table_info`. New
 * columns default to NULL on existing rows; the startup backfill fills them
 * (`subjects IS NULL` is the sentinel — see `listBooksNeedingMetadata`).
 */
function ensureBookColumns(): void {
  const existing = new Set(
    (db.pragma("table_info(books)") as { name: string }[]).map((c) => c.name),
  );
  const additions: Record<string, string> = {
    series: "TEXT",
    series_index: "REAL",
    subjects: "TEXT",
    // Provenance (brief 22). NOT NULL DEFAULT is legal in SQLite's ADD COLUMN
    // because it supplies a value for every existing row, so uploads keep
    // source='upload' with no backfill.
    source: "TEXT NOT NULL DEFAULT 'upload'",
    source_id: "TEXT",
    // Media (brief 23). NOT NULL DEFAULT 'book' migrates existing rows to books
    // with no backfill; duration is null for books and unknown-duration media.
    kind: "TEXT NOT NULL DEFAULT 'book'",
    duration_seconds: "REAL",
  };
  for (const [name, type] of Object.entries(additions)) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE books ADD COLUMN ${name} ${type}`);
    }
  }
}
ensureBookColumns();

const statements = {
  insert: db.prepare<BookRow>(`
    INSERT INTO books (id, title, author, format, file_path, cover_path,
                       size_bytes, progress, created_at, last_opened_at,
                       series, series_index, subjects, source, source_id,
                       kind, duration_seconds)
    VALUES (@id, @title, @author, @format, @file_path, @cover_path,
            @size_bytes, @progress, @created_at, @last_opened_at,
            @series, @series_index, @subjects, @source, @source_id,
            @kind, @duration_seconds)
  `),
  getById: db.prepare<[string]>("SELECT * FROM books WHERE id = ?"),
  listRecent: db.prepare(
    "SELECT * FROM books ORDER BY COALESCE(last_opened_at, created_at) DESC",
  ),
  listByTitle: db.prepare("SELECT * FROM books ORDER BY title COLLATE NOCASE ASC"),
  listByAuthor: db.prepare(
    "SELECT * FROM books ORDER BY author COLLATE NOCASE ASC, title COLLATE NOCASE ASC",
  ),
  touchOpened: db.prepare<[string, string]>(
    "UPDATE books SET last_opened_at = ? WHERE id = ?",
  ),
  remove: db.prepare<[string]>("DELETE FROM books WHERE id = ?"),

  // --- Metadata backfill (brief 21) ----------------------------------------
  // Rows added before the series/subjects columns existed have subjects=NULL.
  listNeedingMetadata: db.prepare("SELECT * FROM books WHERE subjects IS NULL"),
  // Rows that claim a cover, for the startup reconcile that nulls the path when
  // the thumbnail file is actually gone (stale absolute paths from another box).
  listWithCover: db.prepare("SELECT * FROM books WHERE cover_path IS NOT NULL"),
  clearCoverPath: db.prepare<[string]>("UPDATE books SET cover_path = NULL WHERE id = ?"),
  // COALESCE on author lets a re-scan fill a previously-null author (PDFs) but
  // never clobber one already stored. `subjects` is set to a JSON array (never
  // null) so the row drops out of `listNeedingMetadata` and can't loop.
  updateMetadata: db.prepare<[string | null, number | null, string, string | null, string]>(`
    UPDATE books
       SET series = ?, series_index = ?, subjects = ?,
           author = COALESCE(author, ?)
     WHERE id = ?
  `),

  // --- Users ---------------------------------------------------------------
  getUserByName: db.prepare<[string]>("SELECT * FROM users WHERE username = ?"),
  upsertUser: db.prepare<UserRow>(`
    INSERT INTO users (id, username, password_hash, created_at)
    VALUES (@id, @username, @password_hash, @created_at)
    ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
  `),

  // --- Sessions ------------------------------------------------------------
  createSession: db.prepare<[string, string, string]>(
    "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
  ),
  sessionUser: db.prepare<[string]>(
    `SELECT u.id AS id, u.username AS username
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
  ),
  deleteSession: db.prepare<[string]>("DELETE FROM sessions WHERE token = ?"),

  // --- Per-user reading progress -------------------------------------------
  listUserProgress: db.prepare<[string]>(
    "SELECT book_id, progress, locator FROM reading_progress WHERE user_id = ?",
  ),
  getUserProgress: db.prepare<[string, string]>(
    "SELECT book_id, progress, locator FROM reading_progress WHERE user_id = ? AND book_id = ?",
  ),
  // COALESCE keeps a previously-saved locator when a progress-only update sends
  // null, so a bar refresh can't wipe the resume position.
  upsertUserProgress: db.prepare<[string, string, number, string | null, string]>(`
    INSERT INTO reading_progress (user_id, book_id, progress, locator, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      progress = excluded.progress,
      locator = COALESCE(excluded.locator, reading_progress.locator),
      updated_at = excluded.updated_at
  `),
};

/**
 * Map a DB row to the wire shape (strips on-disk paths; D25). Progress + the
 * resume locator are per-user, so they're passed in (from the caller's
 * `reading_progress` lookup); absent = the user hasn't opened this book yet.
 */
export function toLibraryBook(
  row: BookRow,
  progress: Pick<UserProgressRow, "progress" | "locator"> = { progress: 0, locator: null },
): LibraryBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    format: row.format,
    series: row.series,
    seriesIndex: row.series_index,
    subjects: parseSubjects(row.subjects),
    hasCover: row.cover_path !== null,
    sizeBytes: row.size_bytes,
    progress: progress.progress,
    locator: progress.locator,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at,
    source: row.source,
    sourceId: row.source_id,
    kind: row.kind,
    durationSeconds: row.duration_seconds,
  };
}

/** Decode the JSON `subjects` column to a `string[]` (empty on null/garbage). */
function parseSubjects(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
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

export function touchOpened(id: string, now: string): void {
  statements.touchOpened.run(now, id);
}

export function deleteBook(id: string): void {
  statements.remove.run(id);
}

/**
 * Books whose metadata predates the series/subjects columns (subjects IS NULL),
 * for the one-time startup backfill (brief 21).
 */
export function listBooksNeedingMetadata(): BookRow[] {
  return statements.listNeedingMetadata.all() as BookRow[];
}

/** Books whose row records a cover path, for the startup cover reconcile. */
export function listBooksWithCover(): BookRow[] {
  return statements.listWithCover.all() as BookRow[];
}

/**
 * Drop a book's `cover_path` (→ NULL) when its thumbnail file has gone missing,
 * so `hasCover` reports false on the wire and the client stops requesting a
 * cover that will only 404 (see `reconcileMissingCovers`).
 */
export function clearBookCover(id: string): void {
  statements.clearCoverPath.run(id);
}

/**
 * Persist re-scanned series/subject metadata for one book (backfill or a future
 * re-index). `subjects` is a `string[]` stored as JSON; `author` fills a
 * previously-null author without overwriting an existing one (COALESCE).
 */
export function updateBookMetadata(
  id: string,
  meta: { series: string | null; seriesIndex: number | null; subjects: string[]; author: string | null },
): void {
  statements.updateMetadata.run(
    meta.series,
    meta.seriesIndex,
    JSON.stringify(meta.subjects),
    meta.author,
    id,
  );
}

// --- Users & sessions --------------------------------------------------------

export function getUserByName(username: string): UserRow | undefined {
  return statements.getUserByName.get(username) as UserRow | undefined;
}

/**
 * Insert a user, or update the password of an existing one (matched by
 * username). Used by the operator seed script; re-running it is idempotent.
 */
export function upsertUser(row: UserRow): void {
  statements.upsertUser.run(row);
}

export function createSession(token: string, userId: string, now: string): void {
  statements.createSession.run(token, userId, now);
}

/** Resolve a session token to its user, or undefined if the token is unknown. */
export function getSessionUser(token: string): SessionUser | undefined {
  return statements.sessionUser.get(token) as SessionUser | undefined;
}

export function deleteSession(token: string): void {
  statements.deleteSession.run(token);
}

// --- Per-user reading progress -----------------------------------------------

/** All of a user's reading-progress rows (for merging into the library list). */
export function listUserProgress(userId: string): UserProgressRow[] {
  return statements.listUserProgress.all(userId) as UserProgressRow[];
}

/** One user's progress for one book, or undefined if they haven't opened it. */
export function getUserProgress(userId: string, bookId: string): UserProgressRow | undefined {
  return statements.getUserProgress.get(userId, bookId) as UserProgressRow | undefined;
}

/**
 * Save a user's progress + resume position for a book. A null `locator` leaves
 * any previously-saved position intact (see the COALESCE in the statement).
 */
export function upsertUserProgress(
  userId: string,
  bookId: string,
  progress: number,
  locator: string | null,
  now: string,
): void {
  statements.upsertUserProgress.run(userId, bookId, progress, locator, now);
}

// --- Notes (brief 26) --------------------------------------------------------

const noteStatements = {
  listByUser: db.prepare<[string]>(
    "SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
  ),
  getByUser: db.prepare<[string, string]>(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
  ),
  insert: db.prepare<NoteRow>(`
    INSERT INTO notes (id, user_id, title, data, created_at, updated_at)
    VALUES (@id, @user_id, @title, @data, @created_at, @updated_at)
  `),
  // Only the owner's row is touched; COALESCE lets a title-only or data-only
  // PATCH leave the other column intact.
  update: db.prepare<[string | null, string | null, string, string, string]>(`
    UPDATE notes
       SET title = COALESCE(?, title),
           data  = COALESCE(?, data),
           updated_at = ?
     WHERE id = ? AND user_id = ?
  `),
  remove: db.prepare<[string, string]>("DELETE FROM notes WHERE id = ? AND user_id = ?"),
};

/** All of a user's notes, most-recently-updated first. */
export function listNotes(userId: string): NoteRow[] {
  return noteStatements.listByUser.all(userId) as NoteRow[];
}

/** One note, only if it belongs to `userId` (else undefined → the route 404s). */
export function getNote(userId: string, id: string): NoteRow | undefined {
  return noteStatements.getByUser.get(id, userId) as NoteRow | undefined;
}

export function insertNote(row: NoteRow): void {
  noteStatements.insert.run(row);
}

/**
 * Update a note's title and/or page data (both optional; null leaves the column
 * unchanged). Returns whether a row was actually updated (false = not the
 * owner / unknown id), so the route can 404.
 */
export function updateNote(
  userId: string,
  id: string,
  fields: { title?: string; data?: string },
  now: string,
): boolean {
  const info = noteStatements.update.run(
    fields.title ?? null,
    fields.data ?? null,
    now,
    id,
    userId,
  );
  return info.changes > 0;
}

/** Delete a note if it belongs to `userId`; returns whether a row was removed. */
export function deleteNote(userId: string, id: string): boolean {
  return noteStatements.remove.run(id, userId).changes > 0;
}
