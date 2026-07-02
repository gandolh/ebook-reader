import { createWriteStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  convertRequestSchema,
  detectFileType,
  isFileSizeValid,
  type ConvertError,
  type ConvertErrorCode,
} from "@ebook-reader/shared";
import { runEbookConvert } from "./calibre.js";
import { CONVERT_TIMEOUT_MS, MAX_UPLOAD_BYTES } from "./config.js";
import { createTempWorkspace, pdfFilenameFor } from "./temp-files.js";

const HTTP_STATUS: Record<ConvertErrorCode, number> = {
  INVALID_FILE: 400,
  TOO_LARGE: 413,
  TIMEOUT: 504,
  CONVERT_FAILED: 500,
  CALIBRE_MISSING: 500,
};

function fail(
  reply: FastifyReply,
  code: ConvertErrorCode,
  message: string,
): FastifyReply {
  const body: ConvertError = { code, error: message };
  return reply.status(HTTP_STATUS[code]).send(body);
}

export function registerConvertRoute(app: FastifyInstance): void {
  app.post("/convert", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return fail(reply, "INVALID_FILE", "No file field found in upload.");
    }

    // Validate metadata (filename ends with .epub + EPUB MIME) via the shared
    // schema, then double-check with the shared detector (D13: ext/MIME only).
    const meta = convertRequestSchema.safeParse({
      filename: data.filename,
      mimetype: data.mimetype,
    });
    if (!meta.success) {
      return fail(reply, "INVALID_FILE", "Upload must be an EPUB file.");
    }
    if (detectFileType(data.filename, data.mimetype) !== "epub") {
      return fail(reply, "INVALID_FILE", "Upload must be an EPUB file.");
    }

    const workspace = await createTempWorkspace();
    try {
      // Stream the upload to disk. @fastify/multipart truncates at the byte
      // limit and flags `file.truncated`; treat that (or an over-limit final
      // size) as TOO_LARGE.
      await pipeline(data.file, createWriteStream(workspace.inputPath));

      if (data.file.truncated) {
        return fail(reply, "TOO_LARGE", "File exceeds the upload size limit.");
      }
      const { size } = await stat(workspace.inputPath);
      if (!isFileSizeValid(size, MAX_UPLOAD_BYTES)) {
        return fail(reply, "TOO_LARGE", "File exceeds the upload size limit.");
      }

      const outcome = await runEbookConvert(
        workspace.inputPath,
        workspace.outputPath,
        CONVERT_TIMEOUT_MS,
      );

      switch (outcome.kind) {
        case "missing":
          return fail(
            reply,
            "CALIBRE_MISSING",
            "Calibre (ebook-convert) is not installed on the server.",
          );
        case "timeout":
          return fail(
            reply,
            "TIMEOUT",
            "Conversion timed out and was cancelled.",
          );
        case "failed":
          request.log.warn(
            { code: outcome.code, stderr: outcome.stderr },
            "ebook-convert failed",
          );
          return fail(reply, "CONVERT_FAILED", "Failed to convert the EPUB.");
        case "ok":
          break;
      }

      // Buffer the PDF, then dispose temp files before the response leaves —
      // nothing is kept or served after this call (D3 / brief step 4). We read
      // it fully (rather than streaming the fd) so `finally` can safely delete
      // the temp dir without racing an open handle.
      const pdf = await readFile(workspace.outputPath);

      reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `attachment; filename="${pdfFilenameFor(data.filename)}"`,
        );
      return reply.send(pdf);
    } finally {
      await workspace.dispose();
    }
  });
}
