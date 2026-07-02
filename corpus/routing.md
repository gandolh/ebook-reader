# Routing — ebook-reader

Routing profile read by the `orchestrate` skill.

## Skills
- **Implement skill:** plan-split-dispatch
- **Review skill:** code-review
- **PR skill:** (none yet — local dev only)

## Intent table
| If the request is… | Route to… |
|---|---|
| capture an idea / follow-up | corpus-flow §1 (add todo) |
| build a brief / implement | plan-split-dispatch (or inline if 1–2 chunks) |
| "how does X work here" | corpus-flow §5 (query wiki) |
| ready to build a todo | corpus-flow §2 (promote to brief) |

## READ / SKIP / SKILLS
| Area | READ | SKIP | SKILLS |
|---|---|---|---|
| frontend (apps/web) | apps/web/src, wiki/reader.md | apps/api | frontend-design, impeccable |
| backend (apps/api) | apps/api/src, wiki/conversion.md | apps/web | — |
| shared contract | packages/shared, wiki/decisions.md | — | — |
