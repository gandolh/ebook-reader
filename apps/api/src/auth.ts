import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  authStatusSchema,
  loginRequestSchema,
  loginResponseSchema,
} from "@ebook-reader/shared";
import { APP_PASSWORD } from "./config.js";

/**
 * Platform-password auth (brief 09). A single shared password gates the whole
 * API. The token is stateless: `sha256hex(APP_PASSWORD)`. Clients present it as
 * `Authorization: Bearer <token>` or `?token=<token>` (cover <img> tags can't
 * send headers). When APP_PASSWORD is unset the guard is a no-op — the API is
 * open — and /auth/status reports `required: false`.
 */

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Expected token, or null when auth is disabled (no password configured). */
const EXPECTED_TOKEN = APP_PASSWORD ? sha256Hex(APP_PASSWORD) : null;

/**
 * Constant-time string compare. Both sides are hashed to a fixed 32-byte digest
 * first so `timingSafeEqual` never sees unequal-length buffers (which throws)
 * and no length information leaks from the comparison.
 */
function tokensMatch(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Pull the bearer token from the header, falling back to the `token` query param. */
function presentedToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const query = request.query as { token?: unknown } | undefined;
  // `fast-querystring` parses repeated keys (`?token=a&token=b`) into an
  // array; only a single string value is ever a valid token, so treat
  // anything else (array, object, etc.) as absent rather than passing it to
  // createHash() and crashing the guard into a 500.
  if (typeof query?.token === "string" && query.token) return query.token;
  return null;
}

/** Routes reachable without a token: auth endpoints, health, and CORS preflight. */
function isAllowlisted(request: FastifyRequest): boolean {
  if (request.method === "OPTIONS") return true;
  const path = request.url.split("?", 1)[0];
  if (request.method === "POST" && path === "/auth/login") return true;
  if (request.method === "GET" && path === "/auth/status") return true;
  if (request.method === "GET" && path === "/health") return true;
  return false;
}

/**
 * App-wide `onRequest` guard. Must be registered BEFORE the routes. When auth
 * is disabled everything passes through; otherwise every non-allowlisted route
 * requires a valid token.
 */
export function registerAuthGuard(app: FastifyInstance): void {
  if (!EXPECTED_TOKEN) return; // auth disabled — no-op guard
  const expected = EXPECTED_TOKEN;

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (isAllowlisted(request)) return;
    const token = presentedToken(request);
    if (!token || !tokensMatch(token, expected)) {
      return reply.status(401).send({ error: "UNAUTHORIZED" });
    }
  });
}

/**
 * Auth endpoints. `/auth/status` is always reachable so the web app can decide
 * whether to show the login screen. `/auth/login` trades the password for a
 * token; when auth is disabled it returns 503 (the web app won't call it once
 * `required` is false).
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.get("/auth/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(authStatusSchema.parse({ required: EXPECTED_TOKEN !== null }));
  });

  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!EXPECTED_TOKEN) {
      return reply.status(503).send({ error: "AUTH_DISABLED" });
    }
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_REQUEST" });
    }
    const candidate = sha256Hex(parsed.data.password);
    if (!tokensMatch(candidate, EXPECTED_TOKEN)) {
      return reply.status(401).send({ error: "UNAUTHORIZED" });
    }
    return reply.send(loginResponseSchema.parse({ token: EXPECTED_TOKEN }));
  });
}

/** True when a platform password is configured. Used for the startup warning. */
export const isAuthEnabled = EXPECTED_TOKEN !== null;
