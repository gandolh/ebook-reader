import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  detectFileType,
  isFileSizeValid,
  librarySortSchema,
  updateProgressSchema,
  type FileType,
} from "@ebook-reader/shared";
import { LIBRARY_FILES_DIR, MAX_UPLOAD_BYTES, THUMBNAILS_DIR } from "./config.js";
import {
  deleteBook,
  getBook,
  getUserProgress,
  insertBook,
  listBooks,
  listBooksNeedingMetadata,
  listUserProgress,
  toLibraryBook,
  touchOpened,
  updateBookMetadata,
  upsertUserProgress,
} from "./db.js";
import { extractMeta } from "./extract.js";

/**
 * Library CRUD routes (decisions.md D24). The API owns storage: originals at
 * `library/<id>.<ext>`, cover thumbnails at `images/thumbnails/<id>.jpg`
 * (D25), metadata rows in SQLite. The wire shape never exposes on-disk paths.
 */

const CONTENT_TYPE: Record<FileType, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
};

function nowIso(): string {
  return new Date().toISOString();
}

function filePathFor(id: string, format: FileType): string {
  return join(LIBRARY_FILES_DIR, `${id}.${format}`);
}

function coverPathFor(id: string): string {
  return join(THUMBNAILS_DIR, `${id}.jpg`);
}

export function registerLibraryRoutes(app: FastifyInstance): void {
  // --- POST /library — upload + store + extract cover ------------------------
  app.post("/library", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file field found in upload." });
    }

    const format = detectFileType(data.filename, data.mimetype);
    if (format !== "pdf" && format !== "epub") {
      return reply.status(400).send({ error: "Upload must be a PDF or EPUB file." });
    }

    const id = randomUUID();
    const filePath = filePathFor(id, format);
    await mkdir(LIBRARY_FILES_DIR, { recursive: true });

    // Stream the upload to disk (mirrors the convert route's TOO_LARGE handling).
    await pipeline(data.file, createWriteStream(filePath));
    if (data.file.truncated) {
      await rm(filePath, { force: true });
      return reply.status(413).send({ error: "File exceeds the upload size limit." });
    }
    const { size } = await stat(filePath);
    if (!isFileSizeValid(size, MAX_UPLOAD_BYTES)) {
      await rm(filePath, { force: true });
      return reply.status(413).send({ error: "File exceeds the upload size limit." });
    }

    // Extract metadata + cover from the file we just wrote (best-effort).
    let coverPath: string | null = null;
    let meta;
    try {
      const bytes = await readFile(filePath);
      meta = await extractMeta(bytes, format, data.filename);
      if (meta.cover) {
        await mkdir(THUMBNAILS_DIR, { recursive: true });
        coverPath = coverPathFor(id);
        await writeFile(coverPath, meta.cover);
      }
    } catch (err) {
      request.log.warn({ err }, "cover/metadata extraction failed");
      meta = {
        title: data.filename,
        author: null,
        series: null,
        seriesIndex: null,
        subjects: [],
        cover: null,
      };
    }

    const now = nowIso();
    const row = {
      id,
      title: meta.title,
      author: meta.author,
      format,
      file_path: filePath,
      cover_path: coverPath,
      size_bytes: size,
      progress: 0,
      created_at: now,
      last_opened_at: null,
      series: meta.series,
      series_index: meta.seriesIndex,
      // Stored as a JSON array; never null on insert so it isn't mistaken for a
      // pre-column row by the metadata backfill (db.ts).
      subjects: JSON.stringify(meta.subjects),
      // Uploads are the default provenance (brief 22); imports set 'gutenberg'.
      source: "upload" as const,
      source_id: null,
    };
    insertBook(row);

    return reply.status(201).send(toLibraryBook(row));
  });

  // --- GET /library — the gallery list ---------------------------------------
  app.get("/library", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.authUser;
    if (!user) return reply.status(401).send({ error: "UNAUTHORIZED" });
    const sort = librarySortSchema.catch("recent").parse(
      (request.query as { sort?: string } | undefined)?.sort,
    );
    // Progress/locator are per-user; fetch this user's rows once and merge.
    const progressByBook = new Map(
      listUserProgress(user.id).map((p) => [p.book_id, p]),
    );
    return reply.send(
      listBooks(sort).map((row) =>
        toLibraryBook(row, progressByBook.get(row.id) ?? { progress: 0, locator: null }),
      ),
    );
  });

  // --- GET /library/:id/file — stream the original for the reader ------------
  app.get("/library/:id/file", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const row = getBook(id);
    if (!row) return reply.status(404).send({ error: "Book not found." });

    // Record the open (drives "recently opened" ordering) even on a cache hit.
    touchOpened(id, nowIso());

    // The stored bytes for an id never change — a re-upload gets a fresh id — so
    // the id doubles as a strong validator. `no-cache` makes the browser
    // revalidate on every open, but a matching If-None-Match short-circuits to a
    // 304 (no multi-MB re-download of the book) while the touch above still
    // runs. Without this the reader re-streams the whole file on every refresh.
    const etag = `"${id}"`;
    reply.header("Cache-Control", "private, no-cache").header("ETag", etag);
    if (request.headers["if-none-match"] === etag) {
      return reply.status(304).send();
    }

    reply
      .header("Content-Type", CONTENT_TYPE[row.format])
      .header("Content-Disposition", `inline; filename="${id}.${row.format}"`);
    return reply.send(createReadStream(row.file_path));
  });

  // --- GET /library/:id/cover — stream the thumbnail -------------------------
  app.get("/library/:id/cover", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const row = getBook(id);
    if (!row || !row.cover_path) {
      return reply.status(404).send({ error: "No cover for this book." });
    }
    reply.header("Content-Type", "image/jpeg").header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(createReadStream(row.cover_path));
  });

  // --- PATCH /library/:id/progress — save THIS user's progress + position ----
  app.patch("/library/:id/progress", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.authUser;
    if (!user) return reply.status(401).send({ error: "UNAUTHORIZED" });
    const { id } = request.params as { id: string };
    const row = getBook(id);
    if (!row) return reply.status(404).send({ error: "Book not found." });

    const parsed = updateProgressSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "progress must be a number in [0, 1]." });
    }
    upsertUserProgress(user.id, id, parsed.data.progress, parsed.data.locator ?? null, nowIso());
    return reply.send(toLibraryBook(row, getUserProgress(user.id, id)));
  });

  // --- DELETE /library/:id — remove row + file + thumbnail -------------------
  app.delete("/library/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const row = getBook(id);
    if (!row) return reply.status(404).send({ error: "Book not found." });

    deleteBook(id);
    await rm(row.file_path, { force: true });
    if (row.cover_path) await rm(row.cover_path, { force: true });
    return reply.status(204).send();
  });
}

/**
 * One-time metadata backfill (brief 21). Rows added before the series/subjects
 * columns existed have `subjects IS NULL`; re-run extraction against each stored
 * file and persist the new fields. Best-effort and idempotent:
 *
 * - A book whose file is missing/unreadable still gets `subjects=[]` (via
 *   `updateBookMetadata`) so it drops out of the "needs metadata" set and the
 *   backfill can't loop forever.
 * - Runs off the request path (fired from server startup, not awaited by any
 *   handler); a single row's failure never aborts the rest.
 */
export async function backfillLibraryMetadata(log: FastifyBaseLogger): Promise<void> {
  const pending = listBooksNeedingMetadata();
  if (pending.length === 0) return;
  log.info({ count: pending.length }, "library metadata backfill: starting");

  let updated = 0;
  for (const row of pending) {
    try {
      const bytes = await readFile(row.file_path);
      const meta = await extractMeta(bytes, row.format, row.file_path);
      updateBookMetadata(row.id, {
        series: meta.series,
        seriesIndex: meta.seriesIndex,
        subjects: meta.subjects,
        author: meta.author,
      });
      updated += 1;
    } catch (err) {
      // File gone or unreadable — write empty metadata so the sentinel clears
      // and this row isn't re-scanned on every startup.
      log.warn({ err, id: row.id }, "library metadata backfill: file unreadable, storing empty");
      updateBookMetadata(row.id, {
        series: null,
        seriesIndex: null,
        subjects: [],
        author: null,
      });
    }
  }
  log.info({ updated, total: pending.length }, "library metadata backfill: done");
}
