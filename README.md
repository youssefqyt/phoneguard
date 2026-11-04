# PhoneGuard

**An advanced digital-wellbeing and parental-control platform.**
Track screen time, enforce app limits, run focus sessions, reward good habits and manage a family's devices from one place.

PhoneGuard is a full-stack monorepo:

| Layer | Stack | Location |
| --- | --- | --- |
| API | NestJS 11 · Prisma 6 · PostgreSQL 16 · Redis | [`backend/`](backend) |
| Mobile app | React Native 0.88 · TypeScript · Zustand · React Query · React Navigation 7 | [`mobile/`](mobile) |
| Infra | Docker Compose (Postgres, Redis, API) | [`docker-compose.yml`](docker-compose.yml) |

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
  - [1. Start the databases](#1-start-the-databases)
  - [2. Run the API](#2-run-the-api)
  - [3. Run the mobile app](#3-run-the-mobile-app)
- [Demo accounts](#demo-accounts)
- [API reference](#api-reference)
- [Data model](#data-model)
- [How enforcement works](#how-enforcement-works)
- [Platform capabilities and limits](#platform-capabilities-and-limits)
- [Testing](#testing)
- [Deployment](#deployment)
- [Configuration reference](#configuration-reference)
- [Roadmap](#roadmap)
- [Legal and ethical notes](#legal-and-ethical-notes)

---

## What it does

| Capability | Description |
| --- | --- |
| **Screen-time dashboard** | Daily and weekly screen time, pickups, unlocks, notification counts, per-app and per-category breakdowns, and a 7-day trend. |
| **App limits** | Per-app or per-category daily allowances (e.g. *Instagram: 30 min/day*). The API keeps a live `used / limit` counter per device per day. |
| **Blocklists** | Hard-block a set of packages outright. |
| **Schedules & bedtime** | Time-of-day windows (school hours, curfew, bedtime) with per-weekday rules, including windows that cross midnight. |
| **Focus sessions** | Timed deep-work sessions that block distracting apps, auto-complete when the timer expires, and award points on completion. |
| **Parental controls** | Households with owner / parent / child / viewer roles, invite codes, device pairing codes, and guardian-only management of rules and rewards. |
| **Rewards & gamification** | A points ledger, a reward catalogue (extra screen time, app unlocks, privileges), redemption requests and guardian approval. Points are refunded automatically if a request is denied. |
| **Notifications** | In-app notification feed plus Expo push delivery to registered devices. |

---

## Architecture

```
┌──────────────────────────┐          ┌─────────────────────────────┐
│      React Native app     │          │        NestJS API            │
│                          │          │                              │
│  ┌────────────────────┐  │  HTTPS   │  ┌────────────────────────┐  │
│  │ Screens / UI       │  │ ───────► │  │ Controllers (REST)     │  │
│  └────────────────────┘  │          │  └───────────┬────────────┘  │
│  ┌────────────────────┐  │          │  ┌───────────▼────────────┐  │
│  │ React Query cache  │  │          │  │ Services (domain logic)│  │
│  └────────────────────┘  │          │  └───────────┬────────────┘  │
│  ┌────────────────────┐  │          │  ┌───────────▼────────────┐  │
│  │ Zustand stores     │  │          │  │ Prisma ORM             │  │
│  └────────────────────┘  │          │  └───────────┬────────────┘  │
│  ┌────────────────────┐  │          │              │               │
│  │ Native usage/block │  │          │  ┌───────────▼────────────┐  │
│  │ modules (Android)  │  │          │  │ PostgreSQL  ·  Redis   │  │
│  └────────────────────┘  │          │  └────────────────────────┘  │
└──────────────────────────┘          └─────────────────────────────┘
```

**Design decisions**

- **Telemetry is idempotent.** The device posts a whole day of per-app usage to `POST /usage/ingest`; re-sending the same day overwrites the previous values (upsert on `deviceId + packageName + date`). Sync can therefore be retried safely.
- **The server owns limit arithmetic.** On every ingest the API recomputes `LimitProgress` for each matching rule. Clients read a ready-made `used / remaining` figure rather than recomputing policy locally — one source of truth for a parent dashboard and a child device.
- **Policy is a pull, not a push.** Devices fetch `GET /rules/effective/:deviceId`, a single bundle containing every enabled rule plus current progress.
- **Roles are enforced centrally.** A global `JwtAuthGuard` (with an `@Public()` escape hatch) and a `RolesGuard` protect every route; household membership is checked by a single shared `HouseholdAccessService`.
- **Refresh tokens rotate.** Each refresh revokes the presented token and issues a new pair; every token carries a unique `jti` so tokens are never byte-identical.

---

## Repository layout

```
phoneguard/
├── backend/                      # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma         # Data model
│   │   ├── migrations/           # SQL migrations
│   │   └── seed.ts               # Demo data (family, 14 days of usage)
│   ├── scripts/smoke.mjs         # End-to-end API smoke test (33 checks)
│   ├── src/
│   │   ├── main.ts               # Bootstrap: helmet, CORS, Swagger, pipes
│   │   ├── app.module.ts
│   │   ├── config/               # Typed configuration
│   │   ├── common/               # Guards, filters, decorators, utils, services
│   │   ├── prisma/               # PrismaService (global module)
│   │   └── modules/
│   │       ├── auth/             # Register, login, refresh rotation, logout
│   │       ├── users/
│   │       ├── households/       # Family groups, members, invite codes
│   │       ├── devices/          # Registration, pairing, heartbeat
│   │       ├── usage/            # Telemetry ingest + analytics
│   │       ├── rules/            # Limits, blocklists, schedules
│   │       ├── focus/            # Focus sessions + points
│   │       ├── rewards/          # Catalogue, points ledger, redemptions
│   │       └── notifications/    # Feed + Expo push
│   ├── Dockerfile
│   └── package.json
├── mobile/                       # React Native app
│   ├── android/                  # Kotlin modules + AccessibilityService
│   ├── ios/                      # Swift module (Screen Time stubs)
│   ├── __tests__/                # Jest unit + component tests
│   └── src/
│       ├── api/                  # Typed client + React Query hooks
│       ├── components/           # Reusable UI
│       ├── hooks/                # Shared hooks (device selection)
│       ├── native/               # Native module bridge (usage, blocking)
│       ├── navigation/           # Auth + tab navigators
│       ├── screens/              # Feature screens
│       ├── store/                # Zustand stores
│       ├── theme/                # Design tokens
│       └── utils/                # Formatting + storage helpers
├── docker-compose.yml
└── README.md
```

---

## Quick start

**Prerequisites:** Node.js 22+ (the mobile app pins `engines.node >= 22.11.0`), npm, and Docker Desktop (or a local PostgreSQL 14+ and Redis). Building the mobile app additionally needs the Android SDK (JDK 17) or Xcode.

> **Windows note:** the bundled Compose file publishes Postgres on host port **55432** and Redis on **56379**, because a native PostgreSQL service commonly occupies 5432. Adjust `.env` if you prefer different ports.

### 1. Start the databases

```bash
git clone <your-repo-url> phoneguard
cd phoneguard
docker compose up -d postgres redis
```

### 2. Run the API

```bash
cd backend
cp .env.example .env          # then edit secrets for anything non-local
npm install
npm run prisma:generate
npm run prisma:migrate        # creates the schema
npm run db:seed               # optional: demo family + 14 days of data
npm run start:dev
```

The API is now on <http://localhost:3000>:

- REST base — <http://localhost:3000/api/v1>
- **Swagger UI** — <http://localhost:3000/api/v1/docs>
- Health — <http://localhost:3000/health> and `/health/ready`

Verify everything works with the built-in smoke test:

```bash
npm run smoke     # 33 end-to-end checks across every module
```

### 3. Run the mobile app

```bash
cd mobile
npm install
cp .env.example .env          # point API_URL at your machine's LAN IP for a device
npm start                     # Metro bundler
npm run android               # or: npm run ios
```

> The mobile app requires the Android SDK (or Xcode) to build — see
> [Platform capabilities and limits](#platform-capabilities-and-limits).
> To build an installable Android APK without setting up the SDK locally, use
> the [GitHub Actions APK workflow](mobile/README.md#build-an-apk-with-github-actions).

---

## Demo accounts

Created by `npm run db:seed`:

| Role | Email | Password |
| --- | --- | --- |
| Parent / guardian | `parent@phoneguard.dev` | `Password123!` |
| Child | `child@phoneguard.dev` | `Password123!` |

The seed also creates the **Morgan Family** household, two devices, four rules (app limit, category cap, school hours, bedtime), three rewards, a pending redemption and a 14-day usage history.

---

## API reference

All routes are prefixed with `/api/v1` (except `/health`). Authenticated routes need `Authorization: Bearer <accessToken>`.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account; returns a token pair |
| `POST` | `/auth/login` | Exchange credentials for a token pair |
| `POST` | `/auth/refresh` | Rotate a refresh token |
| `POST` | `/auth/logout` | Revoke one refresh token |
| `POST` | `/auth/logout-all` | Revoke every session |
| `GET` | `/auth/me` | Current user profile |

### Households

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/households` | Create a household (you become owner) |
| `GET` | `/households` | List your households |
| `GET/PATCH/DELETE` | `/households/:id` | Read / rename / delete |
| `GET/POST` | `/households/:id/members` | List / add members |
| `PATCH/DELETE` | `/households/:id/members/:memberId` | Change role / remove |
| `POST/GET` | `/households/:id/invites` | Create / list invite codes |
| `POST` | `/households/invites/accept` | Accept an invite code |

### Devices

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/devices` | Register a device, receive a pairing code |
| `POST` | `/devices/pair` | Pair a managed device into a household |
| `GET` | `/devices` | List devices you own or manage (revoked are hidden; `?includeRevoked=true` to see them) |
| `GET/PATCH/DELETE` | `/devices/:id` | Read / update / revoke (revoke is a soft delete so the audit trail survives) |
| `POST` | `/devices/:id/heartbeat` | Liveness ping |

### Usage

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/usage/ingest` | Ingest a day of per-app usage (idempotent) |
| `GET` | `/usage/overview` | Headline stats, top apps, 7-day trend |
| `GET` | `/usage/apps` | Per-app usage for a day |
| `GET` | `/usage/range` | Daily series across a date range |
| `GET` | `/usage/categories` | Usage grouped by category |

### Rules, focus, rewards, notifications

| Method | Path | Description |
| --- | --- | --- |
| `POST/GET` | `/rules` | Create / list rules |
| `GET` | `/rules/effective/:deviceId` | **Policy bundle for a device** |
| `GET` | `/rules/progress/:deviceId` | Live limit counters |
| `PATCH/DELETE` | `/rules/:id` | Update / delete |
| `POST` | `/rules/:id/toggle` | Enable / disable |
| `POST` | `/focus/start` | Start a focus session |
| `POST` | `/focus/:id/stop` | Stop and award points |
| `POST` | `/focus/:id/cancel` | Cancel |
| `GET` | `/focus/active`, `/focus/history`, `/focus/stats` | Session reads |
| `POST/GET` | `/rewards` | Create / list rewards |
| `POST` | `/rewards/:id/redeem` | Redeem with points |
| `GET` | `/rewards/redemptions` | List redemptions |
| `POST` | `/rewards/redemptions/:id/decide` | Approve / deny |
| `POST` | `/rewards/points/grant` | Grant / deduct points (guardian; optional `targetUserId` to award another member) |
| `GET` | `/rewards/points` | Points ledger |
| `GET` | `/notifications` | Notification feed |
| `POST` | `/notifications/read-all`, `/:id/read` | Mark as read |
| `POST` | `/notifications/push-token` | Register a push token |

---

## Data model

Defined in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

```
User ──┬── RefreshToken
       ├── HouseholdMember ──► Household ──┬── HouseholdInvite
       ├── Device ──┬── AppUsageDaily       ├── Rule ──► LimitProgress
       │            ├── AppUsageEvent       └── Reward ──► RewardRedemption
       │            └── DailySummary
       ├── FocusSession
       ├── PointsLedger
       └── Notification
```

Highlights:

- **`AppUsageDaily`** is unique on `(deviceId, packageName, date)` — the upsert target for ingest.
- **`DailySummary`** caches screen time, pickups, notifications and unlocks per device per day for fast dashboards.
- **`Rule.config`** is a JSON blob with a shape per `RuleType` (`APP_LIMIT`, `CATEGORY_LIMIT`, `BLOCKLIST`, `SCHEDULE`, `BEDTIME`), validated on write by `assertValidConfig()`.
- **`LimitProgress`** holds the live `usedSeconds` / `bonusSeconds` / `blockedAt` for a rule + package + day.
- **`PointsLedger`** is an append-only audit trail; `User.pointsBalance` is a cached total updated in the same transaction.

---

## How enforcement works

1. **The device reports usage.** Every few minutes (and on each app-foreground transition) the client batches foreground time and posts it to `/usage/ingest`.
2. **The server recomputes policy progress.** For each enabled `APP_LIMIT` / `CATEGORY_LIMIT` rule that matches the device, `LimitProgress` is upserted. If `usedSeconds >= limit × 60`, `blockedAt` is stamped.
3. **The device pulls the policy.** `GET /rules/effective/:deviceId` returns all enabled rules plus progress in one response.
4. **The device enforces locally.** Schedule windows and blocklists are evaluated on-device (see the native modules) so enforcement keeps working offline.
5. **Guardians observe.** The dashboard, notifications and reward approvals all read from the server.

---

## Platform capabilities and limits

This is the single most important engineering constraint for a product like this, and it shapes the whole mobile layer.

### Android — full capability

| Capability | Mechanism |
| --- | --- |
| Screen time per app | `UsageStatsManager.queryUsageStats()` |
| Foreground app detection | `UsageStatsManager` + `ActivityManager` |
| Blocking apps | `AccessibilityService` (intercept window changes) or an overlay / app-launcher approach |
| Detecting lock / unlock | `ACTION_USER_PRESENT`, `KeyguardManager` |
| Surviving restarts | `ForegroundService` + `BOOT_COMPLETED` receiver |
| Admin-level controls | Device Admin API (optional, more invasive) |

Required manifest permissions: `PACKAGE_USAGE_STATS` (special access, granted via Settings), `BIND_ACCESSIBILITY_SERVICE`, `FOREGROUND_SERVICE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `QUERY_ALL_PACKAGES`.

### iOS — restricted by design

Apple does **not** expose a general-purpose usage-stats or app-blocking API to third-party apps. The only sanctioned route is the **Screen Time / Family Controls** framework, and it is heavily gated:

- Requires the `com.apple.developer.family-controls` entitlement, which Apple must approve.
- The managing app must run in an **unmanaged / parent** context; the managed device is enrolled via Apple's own flow.
- Apps can only be blocked via **`ManagedSettings`** and usage read via **`DeviceActivity`** — you cannot read arbitrary per-app foreground time the way Android allows.
- In practice this means a *different* product surface on iOS: `DeviceActivityMonitor` extensions, `DeviceActivityReport` for the dashboard, and `ManagedSettingsStore` for enforcement.

**What this means for the codebase:** the mobile app defines a platform-agnostic `UsageBridge` / `Blocker` interface (`mobile/src/native/`) with a full Android implementation and an iOS layer that targets the Screen Time APIs. Anything not achievable on iOS degrades gracefully rather than pretending to work.

### Distribution notes

- Google Play restricts `QUERY_ALL_PACKAGES` and accessibility-based blocking; apps of this category generally either ship via managed distribution (MDM / Play Private Channel) or must justify the permission during review.
- On iOS, expect App Review to scrutinise any Screen Time entitlement request.

---

## Testing

```bash
# API
cd backend
npm test          # Jest unit tests (21 tests: date utilities, rule validation)
npm run smoke     # 33 end-to-end API checks against a running server
npm run typecheck # tsc --noEmit

# Mobile
cd mobile
npm test          # Jest unit + component tests (16 tests)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
```

The smoke test (`backend/scripts/smoke.mjs`) exercises the full happy path — auth and refresh rotation, household invites, device pairing, usage ingest and analytics, rule CRUD and validation rejection, the focus-session lifecycle, the points/reward/redemption flow, notifications, and authorisation negatives (a child must not manage rules; an unknown device must 404). It is safe to re-run: every write happens against a throwaway device that is registered, paired and then revoked at the end, so the seeded demo data is never modified. (Revocation is a soft delete, so its row survives hidden as an audit trail; `npm run db:seed` resets everything.)

The mobile tests cover the formatting helpers every screen depends on (durations, clock conversion, countdowns, initials) and render the presentational primitives to assert the right copy and loading behaviour reaches the tree. The native Android/iOS modules are not unit-tested here because they need a device or emulator — see [Platform capabilities and limits](#platform-capabilities-and-limits).

---

## Deployment

### CI and container image publishing

The `Backend CI and image` GitHub Actions workflow runs on pull requests and
pushes to `main`. It generates Prisma Client, type-checks, runs backend tests,
and builds the API before building its Docker image. Pull requests build the
image without publishing it. A successful push to `main` publishes the image
to GitHub Container Registry (GHCR) as
`ghcr.io/youssefqyt/phoneguard:sha-<commit>` and `:latest`.

The commit-SHA tag identifies an exact release and is preferred for deployment;
`:latest` is a convenience tag. The package is initially private. Configure
registry access on a deployment server before pulling it. This workflow does
not deploy to a server; that is a separate CD step.

### Docker Compose (single host)

```bash
export JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
docker compose --profile full up -d --build
```

This starts Postgres, Redis and the API (the API container applies `prisma migrate deploy` on boot). The image is a multi-stage build running as a non-root user with a built-in healthcheck.
The Compose file builds this image from local source; it does not pull the
GHCR image published by CI.

### Managed platforms

- **API** — deploy `backend/` to any Node 20+ host (Fly.io, Render, Railway, ECS, App Runner). Set `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `CORS_ORIGINS`. Run `prisma migrate deploy` as a release step.
- **Database** — managed PostgreSQL (RDS, Neon, Supabase, Cloud SQL). Enable backups and TLS (`?sslmode=require`).
- **Mobile** — build with EAS or the React Native CLI; distribute via Play Console / App Store Connect or an internal track.

**Production checklist**

- [ ] Generate long random JWT secrets (≥32 bytes) — never ship the defaults.
- [ ] Restrict `CORS_ORIGINS` to known origins.
- [ ] Terminate TLS at the edge and force HTTPS.
- [ ] Back up Postgres and test a restore.
- [ ] Add rate limiting at the edge in addition to the built-in throttler.
- [ ] Ship push credentials (Expo/FCM/APNs) and store them as secrets.
- [ ] Review the privacy policy — this app processes sensitive behavioural telemetry.

---

## Configuration reference

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3000` | HTTP port |
| `API_PREFIX` | `api/v1` | Global route prefix |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string |
| `JWT_ACCESS_SECRET` | `dev-access-secret` | **Change in production** |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | **Change in production** |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | `30d` | Refresh token lifetime |
| `CORS_ORIGINS` | `*` | Comma-separated allow-list |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | `60` / `120` | Rate limit window (s) / requests |
| `SEED_PARENT_EMAIL` / `SEED_CHILD_EMAIL` | demo addresses | Seed accounts |

---

## Roadmap

- [ ] Realtime policy push over WebSocket so a rule change lands on the device immediately.
- [ ] Raw timeline view from `AppUsageEvent`.
- [ ] Weekly email digests for guardians.
- [ ] Full iOS `DeviceActivity` + `ManagedSettings` implementation.
- [ ] App-category auto-classification service (replace the static package map).
- [ ] Chore / task engine that awards points automatically.
- [ ] Multi-language support.

---

## Legal and ethical notes

PhoneGuard processes sensitive behavioural data and is designed for **consensual** use: a guardian managing a child's device, or a person managing their own.

- Only install monitoring on devices you own or have explicit, informed permission to manage.
- On a child's device, be transparent — a wellbeing tool that the child knows about works better than covert surveillance.
- Comply with applicable law: GDPR, COPPA, and local data-protection rules treat this telemetry as personal (often special-category) data.
- Never ship the default JWT secrets or seed passwords.

---

## License

MIT — see [`LICENSE`](LICENSE).
