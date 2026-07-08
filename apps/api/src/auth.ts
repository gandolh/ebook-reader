import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  authStatusSchema,
  loginRequestSchema,
  loginResponseSchema,
} from "@ebook-reader/shared";
import {
  createSession,
  deleteSession,
  getSessionUser,
  getUserByName,
  type SessionUser,
} from "./db.js";
import { verifyPassword } from "./password.js";

/**
 * Per-user auth. Accounts are operator-seeded (no self-registration — see
 * scripts/seed.ts); the library is shared across all users. Login trades a
 * username + password for an opaque, server-stored session token
 * (`sessions` table). Clients present it as `Authorization: Bearer <token>` or
 * `?token=<token>` (cover <img> tags can't send headers). Auth is always on.
 *
 * Supersedes the single shared platform password (brief 09): the token is no
 * longer derived from a static password but is a random per-session secret, so
 * a session can be revoked and a request can be attributed to a user.
 */

// Make `request.authUser` available to route handlers after the guard runs.
declare module "fastify" {
  interface FastifyRequest {
    authUser?: SessionUser;
  }
}

/** Mint a fresh, high-entropy session token. */
function newSessionToken(): string {
  return randomBytes(32).toString("hex");
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
  // anything else (array, object, etc.) as absent.
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
 * App-wide `onRequest` guard. Must be registered BEFORE the routes. Every
 * non-allowlisted request must present a token that resolves to a live session;
 * the resolved user is attached as `request.authUser`.
 */
export function registerAuthGuard(app: FastifyInstance): void {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (isAllowlisted(request)) return;
    const token = presentedToken(request);
    const user = token ? getSessionUser(token) : undefined;
    if (!user) {
      return reply.status(401).send({ error: "UNAUTHORIZED" });
    }
    request.authUser = user;
  });
}

/**
 * Auth endpoints. `/auth/status` is always reachable so the web app can decide
 * whether to show the login screen (always required now). `/auth/login` trades
 * username + password for a session token. `/auth/logout` revokes the caller's
 * session.
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.get("/auth/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(authStatusSchema.parse({ required: true }));
  });

  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_REQUEST" });
    }
    const { username, password } = parsed.data;
    const user = getUserByName(username);
    // Verify against the found user, or a throwaway hash when the username is
    // unknown, so response timing doesn't reveal whether the username exists.
    const ok = user
      ? verifyPassword(password, user.password_hash)
      : (verifyPassword(password, DUMMY_HASH), false);
    if (!user || !ok) {
      return reply.status(401).send({ error: "UNAUTHORIZED" });
    }

    const token = newSessionToken();
    createSession(token, user.id, new Date().toISOString());
    return reply.send(loginResponseSchema.parse({ token, username: user.username }));
  });

  app.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = presentedToken(request);
    if (token) deleteSession(token);
    return reply.status(204).send();
  });
}

// A fixed valid `saltHex:hashHex` used only to spend ~equal CPU on the
// unknown-username path (see login). Not a real credential.
const DUMMY_HASH =
  "00000000000000000000000000000000:" +
  "0000000000000000000000000000000000000000000000000000000000000000" +
  "0000000000000000000000000000000000000000000000000000000000000000";
