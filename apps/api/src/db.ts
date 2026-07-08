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
// Enforce the sessions→users foreign key (off by default in SQLite).
db.pragma("foreign_keys = ON");

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
  touchOpened: db.prepare<[string, string]>(
    "UPDATE books SET last_opened_at = ? WHERE id = ?",
  ),
  remove: db.prepare<[string]>("DELETE FROM books WHERE id = ?"),

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
    hasCover: row.cover_path !== null,
    sizeBytes: row.size_bytes,
    progress: progress.progress,
    locator: progress.locator,
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

export function touchOpened(id: string, now: string): void {
  statements.touchOpened.run(now, id);
}

export function deleteBook(id: string): void {
  statements.remove.run(id);
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
