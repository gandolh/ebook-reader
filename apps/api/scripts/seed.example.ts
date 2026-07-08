import { randomUUID } from "node:crypto";
import { getUserByName, upsertUser } from "../src/db.js";
import { hashPassword } from "../src/password.js";

/**
 * Account seed TEMPLATE. Copy to `seed.ts` (gitignored) and put the real
 * usernames + passwords there, then run:
 *
 *   npm run seed -w @ebook-reader/api
 *
 * There is no self-registration; this script is the only way accounts are
 * created. It is idempotent — re-running updates the password of an existing
 * username rather than erroring, and preserves that user's id/created_at.
 */

const SEED_USERS: Array<{ username: string; password: string }> = [
  { username: "alice", password: "change-me" },
  { username: "bob", password: "change-me" },
];

for (const { username, password } of SEED_USERS) {
  const existing = getUserByName(username);
  upsertUser({
    id: existing?.id ?? randomUUID(),
    username,
    password_hash: hashPassword(password),
    created_at: existing?.created_at ?? new Date().toISOString(),
  });
  console.log(`${existing ? "updated" : "created"} user: ${username}`);
}
