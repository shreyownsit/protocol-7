# Authentication

**Requirement:** Complete account lifecycle authentication over stateless JWT access tokens with server-side rotating refresh tokens. Anonymous sessions are supported with token-scoped session buckets (assumption A3).

**Why:** The frontend is an SPA (no cookie auth surface needed); JWT-in-header eliminates CSRF from cookie semantics while refresh tokens stay server-controlled for revocation.

## 1. Credential Storage

Passwords hashed with **argon2id**: memory=65536 KiB, iterations=3, parallelism=4, hash length=32 bytes, salt auto-generated per password. Library: `argon2-cffi`. Verification via `PasswordHasher.verify`; rehash-on-parameter-change enabled. **Never log the password field, the hash, or verification results beyond "failed" counts.**

## 2. Token Strategy

| Token | Storage | TTL | Rotation |
|---|---|---|---|
| Access token | Client memory (`frontend/authentication.md` storage rules) | 15 min (`JWT_ACCESS_TTL_SECONDS`) | Silent reissue via refresh |
| Refresh token | Server: `refresh_tokens` table + Redis revocation set | 7 days (`JWT_REFRESH_TTL_DAYS`) | Rotating single-use |

Access token claims: `sub` (user id), `email`, `exp`, `iat`, `jti`, `type=access`. Refresh token claims: `sub`, `jti`, `type=refresh`, `exp`. JWT algorithm HS256 signed with `JWT_SECRET`.

**Refresh rotation:** `POST /api/v1/auth/refresh` accepts a refresh token → validates signature + expiry + not-revoked → issues new access+refresh pair → **marks the old refresh token revoked** (DB row `revoked_at` + Redis revocation set TTL 7 days) → returns the new pair. A replayed old refresh token triggers forced logout of the whole token family (security event in `audit_events`).

## 3. Endpoints (full schemas in `api.md`)

| Method | Path | Auth | Behavior |
|---|---|---|---|
| POST | `/auth/register` | none | email (validated format + uniqueness), display_name, password (policy ≥12 chars, letter+digits). Creates user (unverified if email verification on) → 201 with access+refresh pair. Emits `audit_events` `user.registered`. |
| POST | `/auth/login` | none | email+password → argon2 verify → on success issue pair + `user.logged_in` audit; on failure increment failure counter (IP + email keyed, Redis, 5 failures → 30 min lockout `AUTH_ACCOUNT_LOCKED`). Rate limited 10/min/IP (`AUTH_RATE_LIMITED`). |
| POST | `/auth/logout` | access | Revokes current refresh family + access jti into short-lived Redis deny set (15 min). 204. |
| POST | `/auth/refresh` | refresh token body | Rotation per §2. |
| POST | `/auth/password-reset/request` | none | Validates email exists → issues reset token (64-char random, stored hashed like a password, TTL 1 h) → returns 202 **always** (no email enumeration). Rate limit 3/hour/email. |
| POST | `/auth/password-reset/redeem` | reset token | Validates TTL + not-used → argon2 rehash → single-use token marked used → returns new access+refresh pair. `AUTH_INVALID_CREDENTIALS` for bad/expired tokens. |
| GET | `/users/me` | access | Returns user profile + preferences. |
| PATCH | `/users/me` | access | display_name, password change (requires current password), preference language. |
| POST | `/auth/email-verify/{token}` | none | If verification enabled in env; otherwise a no-op stub returning 200. |

## 4. Auth Middleware Contract

`app.api.dependencies.require_auth`: extracts `Authorization: Bearer <token>`, validates signature/expiry/type claim, looks up user, raises `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_INVALID` (typed exceptions). A second dependency `require_auth_or_anonymous` supports anonymous session routes (authorization.md).

## 5. Brute-Force and Rate Protection Summary

Login: 10 req/min/IP, 5 failures → 30 min lockout keyed on email, progressive delay after 3 failures. Password reset: 3 req/hour/email, no enumeration. Register: 5 req/hour/IP. All implemented via Redis counters with TTLs (`caching.md` namespaces `ratelimit:*`).

## 6. Failure Modes

- `AUTH_INVALID_CREDENTIALS` (401) — bad credentials or reset token.
- `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_INVALID` (401) — access token problems.
- `AUTH_RATE_LIMITED` (429), `AUTH_ACCOUNT_LOCKED` (423).
- `AUTH_PASSWORD_TOO_WEAK` (422) — policy failure with `details`.
- `AUTH_EMAIL_NOT_VERIFIED` (403) — only when verification enforced.

## Security

- argon2id params per §1; secret key rotation = deploy new `JWT_SECRET` with forced re-login (documented in runbook).
- Reset tokens stored hashed; the raw token is only ever in the reset email/URL.
- No password hints anywhere in errors.
- Refresh token replay detection per §2.

## Testing

Unit: argon2 round-trip + rehash detection; JWT encode/decode + expiry math; refresh rotation sequence (old token replay → family revocation). Integration: full register→login→refresh→logout→replay chain against test DB + Redis; rate limit and lockout counters; reset redemption single-use. Fixture: synthetic user factory (never real credentials).
