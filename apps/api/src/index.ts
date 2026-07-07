import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { isCalibreAvailable } from "./calibre.js";
import {
  registerAuthGuard,
  registerAuthRoutes,
  isAuthEnabled,
} from "./auth.js";
import {
  CONVERT_TIMEOUT_MS,
  HOST,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  PORT,
} from "./config.js";
import { registerConvertRoute } from "./convert-route.js";
import { registerLibraryRoutes } from "./library-routes.js";

const app = Fastify({
  logger: {
    serializers: {
      // Cover-image <img> tags carry the platform-password token as ?token=
      // (a static credential) — it must never reach logs in plaintext.
      req(request) {
        return {
          method: request.method,
          url: request.url.replace(/([?&]token=)[^&]*/g, "$1[redacted]"),
          host: request.headers?.host,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort,
        };
      },
    },
  },
});

// Permissive CORS — single-user tool, web talks cross-origin via VITE_API_URL
// (decisions.md D14; no Vite proxy). Enumerate methods so the library routes'
// PATCH/DELETE (with a JSON body → preflighted) aren't blocked; the default
// allowlist omits PATCH.
await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});

// 50MB (from MAX_UPLOAD_MB) upload ceiling (D15). @fastify/multipart truncates
// past this; the route inspects `file.truncated` and returns TOO_LARGE.
await app.register(multipart, {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

// Platform-password guard (brief 09). Registered app-wide BEFORE the routes so
// every non-allowlisted request is gated. No-op when APP_PASSWORD is unset.
registerAuthGuard(app);

app.get("/health", async () => {
  return { status: "ok" };
});

registerAuthRoutes(app);
registerConvertRoute(app);
registerLibraryRoutes(app);

/**
 * Startup probe for `ebook-convert` (brief step 2). Missing Calibre is NOT
 * fatal — the server still boots and the /convert route returns a structured
 * CALIBRE_MISSING error at request time — but we log a loud warning so it's
 * obvious the machine can't actually convert.
 */
async function checkCalibre(): Promise<void> {
  const available = await isCalibreAvailable();
  if (available) {
    app.log.info("Calibre `ebook-convert` found on PATH — conversion enabled.");
    return;
  }
  app.log.warn(
    "============================================================\n" +
      "  WARNING: `ebook-convert` (Calibre) was NOT found on PATH.\n" +
      "  EPUB->PDF conversion will fail with CALIBRE_MISSING.\n" +
      "  Install Calibre and ensure `ebook-convert` is on PATH.\n" +
      "  See decisions.md D5.\n" +
      "============================================================",
  );
}

/**
 * Startup check for the platform password (brief 09). Auth is opt-in: when
 * APP_PASSWORD is unset the API is wide open, so we log a loud warning box
 * mirroring the Calibre probe above.
 */
function checkAppPassword(): void {
  if (isAuthEnabled) {
    app.log.info("APP_PASSWORD is set — platform password auth enabled.");
    return;
  }
  app.log.warn(
    "============================================================\n" +
      "  WARNING: APP_PASSWORD is not set.\n" +
      "  The API is OPEN — anyone can reach the library.\n" +
      "  Set APP_PASSWORD to enable the platform password.\n" +
      "============================================================",
  );
}

async function start(): Promise<void> {
  try {
    await checkCalibre();
    checkAppPassword();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(
      { maxUploadMb: MAX_UPLOAD_MB, convertTimeoutMs: CONVERT_TIMEOUT_MS },
      "API ready",
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
