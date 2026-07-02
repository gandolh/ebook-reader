/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Fastify API (decisions.md D14 — CORS + explicit base URL, no Vite proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
