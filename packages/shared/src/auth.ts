import { z } from "zod";

/**
 * Auth contract. Per-user accounts (username + password); the library itself is
 * shared across all users. Accounts are seeded by the operator — there is no
 * self-registration endpoint. Supersedes the single shared platform password
 * (brief 09): the wire now carries a `username` and login mints a per-user,
 * server-stored session token.
 */

/** Login request with username + password. */
export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Login response with session token and the resolved username. */
export const loginResponseSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** Auth status indicating if authentication is required. */
export const authStatusSchema = z.object({
  required: z.boolean(),
});

export type AuthStatus = z.infer<typeof authStatusSchema>;
