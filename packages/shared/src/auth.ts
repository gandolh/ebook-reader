import { z } from "zod";

/**
 * Auth contract for the shared platform password (brief 09).
 */

/** Login request with password. */
export const loginRequestSchema = z.object({
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Login response with auth token. */
export const loginResponseSchema = z.object({
  token: z.string().min(1),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** Auth status indicating if authentication is required. */
export const authStatusSchema = z.object({
  required: z.boolean(),
});

export type AuthStatus = z.infer<typeof authStatusSchema>;
