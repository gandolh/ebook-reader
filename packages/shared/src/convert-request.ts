import { z } from "zod";
import { EPUB_EXTENSIONS, EPUB_MIME_TYPES } from "./file-validation.js";

/**
 * Shape of the multipart `/convert` payload the API expects (D4/conversion.md
 * — EPUB-only input, converted server-side via Calibre to PDF). This schema
 * validates the metadata extracted from the multipart upload (filename +
 * mimetype); the raw file bytes/stream are handled separately by
 * `@fastify/multipart` and are not part of this schema.
 */
export const convertRequestSchema = z.object({
  filename: z.string().refine(
    (name) => {
      const lower = name.toLowerCase();
      return EPUB_EXTENSIONS.some((ext) => lower.endsWith(ext));
    },
    { message: "filename must end with .epub" },
  ),
  mimetype: z.enum(EPUB_MIME_TYPES),
});

export type ConvertRequest = z.infer<typeof convertRequestSchema>;
