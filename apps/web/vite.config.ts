import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The single .env lives at the repo root (shared with the API), so point Vite's
// env loading there instead of the default per-app dir.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Prefix "" loads every var (VITE_* and BASE_PATH) from the root .env.
  const env = loadEnv(mode, REPO_ROOT, "");

  // Required var: fail the dev server / build fast rather than baking in an
  // undefined API base URL. Mirrors the API's config.ts contract.
  if (!env.VITE_API_URL) {
    throw new Error(
      "Missing required env var VITE_API_URL. Copy .env.example to .env at the repo root and set it.",
    );
  }

  return {
    // Served under a sub-path in production (e.g. /ebook-reader/). The deploy
    // tool injects BASE_PATH at build time; defaults to "/" for local dev/preview.
    base: env.BASE_PATH ?? "/",
    envDir: REPO_ROOT,
    plugins: [react(), tailwindcss()],
  };
});
