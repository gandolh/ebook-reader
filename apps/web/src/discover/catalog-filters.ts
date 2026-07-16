/**
 * The curated topic + language options for `/discover`'s filter row (brief
 * 22b: "keep the topic + language filters simple"). Plain, small, hand-picked
 * lists rather than fetching Gutendex's full subject/bookshelf taxonomy.
 */

/** Gutendex `topic` values worth surfacing as quick filters. */
export const CATALOG_TOPICS = [
  "Fiction",
  "Science fiction",
  "Mystery",
  "Philosophy",
  "History",
  "Poetry",
  "Children",
] as const;

/** A handful of common ISO 639-1 codes Gutendex catalogs in volume. `en` is the default. */
export const CATALOG_LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
];

export const DEFAULT_CATALOG_LANGUAGE = "en";
