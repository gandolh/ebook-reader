/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /**
   * Base URL of the Fastify API (decisions.md D14 — CORS + explicit base URL,
   * no Vite proxy). Required: `vite.config.ts` throws if it's unset, so it is
   * always defined at build/runtime.
   */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
