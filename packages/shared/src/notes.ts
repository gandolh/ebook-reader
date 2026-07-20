import { z } from "zod";

/**
 * Notes contract (brief 26) — the shape of a paged note with vector ink +
 * typed text boxes, shared by apps/web and apps/api so they can't drift (D11).
 *
 * Coordinate convention (resolution-independent so a note drawn on a phone
 * renders identically on a monitor): every position is normalized to the page
 * box where width = 1 and height = `PAGE_ASPECT`. Stroke `size` and text `size`
 * are fractions of the page width. The editor multiplies by the page's actual
 * pixel width at render time.
 */

/** Portrait page aspect (height / width) — roughly A-series paper. */
export const PAGE_ASPECT = 1.414;

/** v1 ink tools (grilled): a solid pen and a translucent highlighter. */
export const NOTE_TOOLS = ["pen", "highlighter"] as const;
export const noteToolSchema = z.enum(NOTE_TOOLS);
export type NoteTool = z.infer<typeof noteToolSchema>;

/**
 * Page background ruling (v1 follow-up): plain paper, horizontal ruled lines, or
 * a square grid. Drawn behind the ink in normalized page space so it scales with
 * the sheet. `blank` is the default, so notes stored before this field parse
 * cleanly (the `.default` on `notePageSchema.template` fills it in).
 */
export const PAGE_TEMPLATES = ["blank", "ruled", "grid"] as const;
export const pageTemplateSchema = z.enum(PAGE_TEMPLATES);
export type PageTemplate = z.infer<typeof pageTemplateSchema>;

/** One sampled input point: [x, y, pressure] — x/y normalized (see convention). */
export const strokePointSchema = z.tuple([z.number(), z.number(), z.number()]);
export type StrokePoint = z.infer<typeof strokePointSchema>;

export const strokeSchema = z.object({
  tool: noteToolSchema,
  /** CSS color string (a token-derived hex from the editor palette). */
  color: z.string(),
  /** Nib width as a fraction of page width. */
  size: z.number().positive(),
  points: z.array(strokePointSchema),
});
export type Stroke = z.infer<typeof strokeSchema>;

export const textBoxSchema = z.object({
  id: z.string(),
  /** Top-left, normalized. */
  x: z.number(),
  y: z.number(),
  /** Width as a fraction of page width. */
  w: z.number(),
  text: z.string(),
  /** Font size as a fraction of page width. */
  size: z.number().positive(),
});
export type TextBox = z.infer<typeof textBoxSchema>;

export const notePageSchema = z.object({
  strokes: z.array(strokeSchema),
  texts: z.array(textBoxSchema),
  /**
   * Background ruling drawn behind the ink. `.default` (not `.optional`) so the
   * parsed shape always carries a value — notes stored before this field read
   * back as "blank", and the editor never has to branch on `undefined`.
   */
  template: pageTemplateSchema.default("blank"),
});
export type NotePage = z.infer<typeof notePageSchema>;

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  pages: z.array(notePageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

/** Lightweight row for the notes list (no page contents). */
export const noteSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  pageCount: z.number().int().nonnegative(),
});
export type NoteSummary = z.infer<typeof noteSummarySchema>;

export const noteListSchema = z.array(noteSummarySchema);

/** `POST /notes` body — optional title (defaults server-side). */
export const createNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});
export type CreateNoteRequest = z.infer<typeof createNoteSchema>;

/** `PATCH /notes/:id` body — title and/or full page set. */
export const updateNoteSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    pages: z.array(notePageSchema).optional(),
  })
  .refine((v) => v.title !== undefined || v.pages !== undefined, {
    message: "Nothing to update",
  });
export type UpdateNoteRequest = z.infer<typeof updateNoteSchema>;
