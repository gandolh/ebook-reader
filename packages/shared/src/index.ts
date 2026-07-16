import { z } from "zod";

/**
 * @ebook-reader/shared — single source of truth for the convert contract +
 * file validation, imported by both apps/web and apps/api so they can't
 * drift (decisions.md D11).
 */

// --- Format enum (kept from the original scaffold; apps/web and apps/api
// import these directly, so the names/shape stay stable) -------------------
export const SUPPORTED_FORMATS = ["pdf", "epub"] as const;

export const formatSchema = z.enum(SUPPORTED_FORMATS);
export type Format = z.infer<typeof formatSchema>;

// --- File validation ---------------------------------------------------
export {
  PDF_MIME_TYPES,
  PDF_EXTENSIONS,
  EPUB_MIME_TYPES,
  EPUB_EXTENSIONS,
  pdfMimeSchema,
  epubMimeSchema,
  FILE_TYPES,
  fileTypeSchema,
  DEFAULT_MAX_UPLOAD_MB,
  BYTES_PER_MB,
  DEFAULT_MAX_UPLOAD_BYTES,
  maxUploadBytesFromMb,
  detectFileType,
  isFileSizeValid,
} from "./file-validation.js";
export type { PdfMimeType, EpubMimeType, FileType } from "./file-validation.js";

// --- Convert request ------------------------------------------------------
export { convertRequestSchema } from "./convert-request.js";
export type { ConvertRequest } from "./convert-request.js";

// --- Convert error ----------------------------------------------------
export {
  CONVERT_ERROR_CODES,
  convertErrorCodeSchema,
  convertErrorSchema,
} from "./convert-error.js";
export type { ConvertErrorCode, ConvertError } from "./convert-error.js";

// --- Library book contract (D24) ------------------------------------------
export {
  libraryBookSchema,
  libraryListSchema,
  updateProgressSchema,
  LIBRARY_SORTS,
  librarySortSchema,
  LIBRARY_GROUPS,
  libraryGroupSchema,
  BOOK_SOURCES,
  bookSourceSchema,
} from "./library-book.js";
export type {
  LibraryBook,
  UpdateProgressRequest,
  LibrarySort,
  LibraryGroup,
  BookSource,
} from "./library-book.js";

// --- Catalog contract (brief 22) ------------------------------------------
export {
  CATALOG_SORTS,
  catalogSortSchema,
  catalogSearchParamsSchema,
  catalogBookSchema,
  catalogSearchResponseSchema,
  importRequestSchema,
} from "./catalog.js";
export type {
  CatalogSort,
  CatalogSearchParams,
  CatalogBook,
  CatalogSearchResponse,
  ImportRequest,
} from "./catalog.js";

// --- Auth contract (brief 09) ----------------------------------------------
export {
  loginRequestSchema,
  loginResponseSchema,
  authStatusSchema,
} from "./auth.js";
export type { LoginRequest, LoginResponse, AuthStatus } from "./auth.js";
