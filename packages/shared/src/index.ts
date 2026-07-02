import { z } from "zod";

/**
 * Placeholder contract for @ebook-reader/shared.
 *
 * This package is the single source of truth for the Zod schemas + inferred
 * types shared between apps/web and apps/api. Real schemas land in a later
 * brief; this stub only proves the workspace wires up and is importable.
 */
export const SUPPORTED_FORMATS = ["pdf", "epub"] as const;

export const formatSchema = z.enum(SUPPORTED_FORMATS);
export type Format = z.infer<typeof formatSchema>;
