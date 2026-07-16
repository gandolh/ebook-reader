---
title: Add password protection to the platform
created: 2026-07-07
status: closed
tags: [auth, frontend]
---

# Add password protection to the platform

Gate the platform behind a single shared password, requested from the frontend.

## Context

One password for the whole platform — no per-user accounts. The frontend
prompts for it before granting access.

> Promoted to [briefs/done/09-platform-password.md](../briefs/done/09-platform-password.md)
> (2026-07-07). Design locked: API-enforced, localStorage persistence.

> Closed 2026-07-16 (owner): obsolete — D30 (2026-07-08) replaced the shared
> platform password with per-user operator-seeded accounts.
