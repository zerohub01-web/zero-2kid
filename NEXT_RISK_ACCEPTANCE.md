# Risk Acceptance — next@14.2.35 HIGH Advisory

Date: 2026-04-04
Advisory type: Request deserialization DoS / rewrite request smuggling
Current version: 14.2.35
Patched version: 15.x (deferred — major version breaking changes)

## Mitigating Factors

- Vercel edge network sits in front; malformed requests are filtered at CDN layer
- No user-controlled input is deserialized via the affected path in current routes
- App Router used throughout; affected middleware pattern is pages/-based
- [x] Confirm: no files exist in `apps/web/pages/` directory

## Accepted Risk Level

MEDIUM (downgraded from HIGH given mitigations above)

## Resolution Plan

- [ ] Upgrade to Next.js 15 in next sprint
- [ ] Target date: 2026-04-18
- [ ] GitHub issue created: "Next.js 15 upgrade — audit follow-up"

## Sign-off

Accepted by: Nishanth Raj S — ZeroOps
Date: 2026-04-04
