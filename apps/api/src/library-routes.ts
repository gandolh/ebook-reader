import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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
  insertBook,
  listBooks,
  setProgress,
  toLibraryBook,
  touchOpened,
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
      meta = { title: data.filename, author: null, cover: null };
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
    };
    insertBook(row);

    return reply.status(201).send(toLibraryBook(row));
  });

  // --- GET /library — the gallery list ---------------------------------------
  app.get("/library", async (request: FastifyRequest, reply: FastifyReply) => {
    const sort = librarySortSchema.catch("recent").parse(
      (request.query as { sort?: string } | undefined)?.sort,
    );
    return reply.send(listBooks(sort).map(toLibraryBook));
  });

  // --- GET /library/:id/file — stream the original for the reader ------------
  app.get("/library/:id/file", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const row = getBook(id);
    if (!row) return reply.status(404).send({ error: "Book not found." });

    touchOpened(id, nowIso());
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

  // --- PATCH /library/:id/progress -------------------------------------------
  app.patch("/library/:id/progress", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const row = getBook(id);
    if (!row) return reply.status(404).send({ error: "Book not found." });

    const parsed = updateProgressSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "progress must be a number in [0, 1]." });
    }
    setProgress(id, parsed.data.progress, nowIso());
    return reply.send(toLibraryBook(getBook(id)!));
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
