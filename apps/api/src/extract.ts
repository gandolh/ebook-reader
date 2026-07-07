import { basename, posix } from "node:path";
import AdmZip from "adm-zip";
import sharp from "sharp";
import { pdf } from "pdf-to-img";
import type { FileType } from "@ebook-reader/shared";

/**
 * Server-side metadata + cover extraction (decisions.md D26).
 *
 * - EPUB: it's a ZIP. Read `META-INF/container.xml` → the OPF (package) doc →
 *   `<dc:title>` / `<dc:creator>` for metadata, and the manifest's cover image
 *   for the thumbnail (EPUB3 `properties="cover-image"`, else EPUB2
 *   `<meta name="cover">` → manifest id).
 * - PDF: render page 1 to a raster via `pdf-to-img` (bundled pdfjs + canvas,
 *   no system deps), and read the doc's Info `Title`.
 *
 * Every path is best-effort: extraction never throws to the caller — a book
 * with no cover/metadata still gets stored (title falls back to the filename,
 * author to null, cover to null → the UI shows a typographic fallback tile).
 */

/** Cover thumbnail geometry — 2:3 portrait (design.md: book covers are 2:3). */
const COVER_WIDTH = 400;
const COVER_HEIGHT = 600;
const COVER_QUALITY = 78;

export interface ExtractedMeta {
  title: string;
  author: string | null;
  /** JPEG thumbnail bytes, or null if no cover could be produced. */
  cover: Buffer | null;
}

/** Normalize any cover image buffer to a 2:3 JPEG thumbnail. */
async function toThumbnail(image: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(image)
      .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover", position: "top" })
      .jpeg({ quality: COVER_QUALITY })
      .toBuffer();
  } catch {
    return null; // corrupt/unsupported image → typographic fallback in UI
  }
}

/** Strip XML tags/entities from a captured text node. */
function decodeXmlText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function firstMatch(source: string, re: RegExp): string | null {
  const m = re.exec(source);
  return m?.[1] ? decodeXmlText(m[1]) : null;
}

// --- EPUB --------------------------------------------------------------------

function findOpfPath(zip: AdmZip): string | null {
  const container = zip.getEntry("META-INF/container.xml");
  if (!container) return null;
  const xml = container.getData().toString("utf8");
  return firstMatch(xml, /<rootfile[^>]*full-path="([^"]+)"/i);
}

/** Resolve a manifest href (relative to the OPF) to a zip entry path. */
function resolveHref(opfPath: string, href: string): string {
  const dir = posix.dirname(opfPath);
  const joined = dir === "." ? href : posix.join(dir, href);
  // Zip entries use forward slashes and no leading "./".
  return joined.replace(/^\.\//, "");
}

function findCoverHref(opf: string): string | null {
  // EPUB3: manifest item with properties="cover-image".
  const epub3 = /<item\b[^>]*\bproperties="[^"]*\bcover-image\b[^"]*"[^>]*>/i.exec(opf);
  if (epub3) {
    const href = /\bhref="([^"]+)"/i.exec(epub3[0]);
    if (href?.[1]) return href[1];
  }
  // EPUB2: <meta name="cover" content="<manifest-id>"> → item by id.
  const coverId = firstMatch(opf, /<meta\b[^>]*\bname="cover"[^>]*\bcontent="([^"]+)"/i);
  if (coverId) {
    const escaped = coverId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const item = new RegExp(`<item\\b[^>]*\\bid="${escaped}"[^>]*>`, "i").exec(opf);
    const href = item ? /\bhref="([^"]+)"/i.exec(item[0]) : null;
    if (href?.[1]) return href[1];
  }
  // Fallback: first image item in the manifest.
  const anyImage = /<item\b[^>]*\bmedia-type="image\/[^"]+"[^>]*>/i.exec(opf);
  if (anyImage) {
    const href = /\bhref="([^"]+)"/i.exec(anyImage[0]);
    if (href?.[1]) return href[1];
  }
  return null;
}

async function extractEpub(fileBytes: Buffer, fallbackTitle: string): Promise<ExtractedMeta> {
  let title = fallbackTitle;
  let author: string | null = null;
  let cover: Buffer | null = null;

  try {
    const zip = new AdmZip(fileBytes);
    const opfPath = findOpfPath(zip);
    if (opfPath) {
      const opfEntry = zip.getEntry(opfPath);
      const opf = opfEntry ? opfEntry.getData().toString("utf8") : "";
      title = firstMatch(opf, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i) ?? fallbackTitle;
      author = firstMatch(opf, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);

      const coverHref = findCoverHref(opf);
      if (coverHref) {
        const entry = zip.getEntry(resolveHref(opfPath, decodeURIComponent(coverHref)));
        if (entry) cover = await toThumbnail(entry.getData());
      }
    }
  } catch {
    // fall through with whatever we have
  }

  return { title, author, cover };
}

// --- PDF ---------------------------------------------------------------------

async function extractPdf(fileBytes: Buffer, fallbackTitle: string): Promise<ExtractedMeta> {
  let title = fallbackTitle;
  let cover: Buffer | null = null;

  try {
    // `pdf-to-img` wants a Uint8Array/Buffer; it exposes flat Info metadata
    // and lazy per-page rasters (bundled pdfjs + canvas, no system deps).
    const doc = await pdf(fileBytes, { scale: 1.5 });
    try {
      const infoTitle = doc.metadata?.Title;
      if (typeof infoTitle === "string" && infoTitle.trim()) {
        title = infoTitle.trim();
      }
      const page1 = await doc.getPage(1);
      cover = await toThumbnail(page1);
    } finally {
      await doc.destroy();
    }
  } catch {
    // fall through — PDF still stored, no cover
  }

  return { title, author: null, cover };
}

// --- entry -------------------------------------------------------------------

/** Extract title/author/cover for a stored book. Never throws. */
export async function extractMeta(
  fileBytes: Buffer,
  format: FileType,
  originalName: string,
): Promise<ExtractedMeta> {
  const fallbackTitle = basename(originalName).replace(/\.(epub|pdf)$/i, "").trim() || originalName;
  return format === "epub"
    ? extractEpub(fileBytes, fallbackTitle)
    : extractPdf(fileBytes, fallbackTitle);
}
