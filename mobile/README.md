# PhoneGuard — mobile app

React Native 0.88 · TypeScript · React Navigation 7 · React Query 5 · Zustand.

This is the client half of PhoneGuard. For the full product overview, API
reference, data model and deployment guide, see the [root README](../README.md).

## Native app

```bash
npm install
npm start                # Metro
npm run android          # or: npm run ios
```

Building requires the Android SDK (JDK 17) or Xcode. The JS layer is fully
functional on its own, but the usage-tracking and app-blocking features need
the native modules described below.

### Browser app

The existing React Native screens also run in a browser using React Native Web
and Vite; this is the same app and API, not a separate mockup.

```powershell
npm install
npm run web
```

Open `http://127.0.0.1:5173`. The browser defaults to
`http://localhost:3000/api/v1`, so start the backend on the same computer. To
use a different reachable API, create `.env.local` from `.env.example` and set
`VITE_API_URL` to the API base URL (including `/api/v1`), then restart Vite.
Do not put credentials in the URL or commit `.env.local`.

Create and preview a production web bundle with:

```powershell
npm run web:build
npm run web:preview
```

The generated bundle is in `mobile/dist`. For a deployed web app, configure
`VITE_API_URL` to an HTTPS API origin reachable by its users and configure the
API's CORS allowlist for the web origin. The development API must also allow
the Vite origin (`http://127.0.0.1:5173`) in CORS.

Browser authentication tokens are stored in `sessionStorage`, not persistent
`localStorage`, and are removed when the browser tab session ends. This reduces
long-lived persistence but is not equivalent to secure native storage: scripts
running on the site can access the session. Use HTTPS and protect the web app
from cross-site scripting before using real accounts.

### API base URL

Native `src/config/index.ts` resolves `API_URL` from the build environment,
then the URL embedded in the Android build, and otherwise falls back to:

| Target | Default |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000/api/v1` |
| iOS simulator | `http://localhost:3000/api/v1` |

A physical device needs an API URL reachable from the phone, such as your
computer's LAN IP. A `.env` file is not loaded automatically by this project.
For browser development, configure `VITE_API_URL` as described above; the
browser defaults to `http://localhost:3000/api/v1` and must not use the Android
emulator-only `10.0.2.2` address.

### Build an APK with GitHub Actions

Push the project, including `.github/workflows/android-apk.yml`, to GitHub.
Save the API base URL reachable by your phone as a repository Actions variable
named `PHONEGUARD_API_URL` (or as a repository secret with the same name). For
example, use `http://<computer-LAN-address>:3000/api/v1`, replacing the
placeholder with your computer's reachable Wi-Fi address. Add it once under
**Settings → Secrets and variables → Actions**; you do not need to enter it
each time you build.

Then open **Actions → Build Android APK → Run workflow**. You can enter the
phone-reachable API URL in the `api_url` input; it overrides the saved variable
or secret. If none is provided, the workflow uses the Android emulator URL
`http://10.0.2.2:3000/api/v1`, so the APK can still build without repository
secrets. That fallback works only on an emulator, not a physical phone.

When the workflow finishes, open its run, download the `phoneguard-android-apk`
artifact, extract it, and install the APK on your Android phone. GitHub-hosted
runners cannot discover your computer's private LAN IP, so for a physical phone
enter that reachable URL when starting the workflow or save it as the repository
variable/secret. If your router changes the IP, update it and build a new APK.

Keep the API running and the phone on the same Wi-Fi as your computer when
using a LAN address. The workflow enables HTTP for this testing APK; use HTTPS
for a public or production deployment. The APK is signed with the project's
debug key and is intended for testing, not Play Store distribution.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Start the Metro bundler |
| `npm run android` / `npm run ios` | Build and install on a device or emulator |
| `npm run web` | Start the browser app on `127.0.0.1:5173` |
| `npm run web:build` | Build the browser app into `dist/` |
| `npm run web:preview` | Preview the production browser build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Jest unit + component tests |

`npm install` also runs `scripts/postinstall.js`, which ensures the Android
manifest declares the permissions PhoneGuard needs.

## Project layout

```
src/
├── api/          # Typed REST client, React Query hooks, DTOs
├── components/   # Design-system primitives (Card, Button, StatTile, …)
├── hooks/        # Shared hooks (device selection)
├── native/       # UsageBridge — the JS side of the native contract
├── navigation/   # Auth stack + main tab navigator
├── screens/      # One folder per feature area
├── store/        # Zustand: auth session, local settings
├── theme/        # Design tokens
└── utils/        # Formatting + storage helpers
```

## Native modules

`UsageBridge` (`src/native/UsageBridge.ts`) is the platform-agnostic contract.
Every call degrades to a safe no-op when the native module is missing, so the
UI keeps working on simulators and platforms that lack the capability. The
browser shows these capabilities as unavailable instead of implying they work.

| Capability | Android | iOS | Web |
| --- | --- | --- | --- |
| Read per-app usage | ✅ `UsageStatsManager` | ❌ needs the Family Controls entitlement | ❌ |
| Block apps | ✅ Accessibility service | ❌ needs `ManagedSettings` | ❌ |
| Schedules | ✅ Accessibility service | ❌ | ❌ |

iOS ships an honest stub that reports "unavailable" rather than pretending.
The browser can manage accounts, households, rules, rewards and focus timers
through the API, but cannot inspect installed apps, collect device usage,
enforce limits, or block apps. Browser-created devices are registered as
`WEB`; use the Android app for device-level collection and enforcement.
See [Platform capabilities and limits](../README.md#platform-capabilities-and-limits)
in the root README for the full picture, including App Store and Play Store
distribution caveats.

### Android files

| File (under `android/app/src/main/java/com/phoneguard/`) | Purpose |
| --- | --- |
| `PhoneGuardModule.kt` | React Native bridge (the `PhoneGuard` native module) |
| `PhoneGuardPackage.kt` | Module registration |
| `usage/UsageStatsRepository.kt` | Reads `UsageStatsManager` per-app usage |
| `blocking/EnforcementPolicy.kt` | Persists the blocked set and schedules |
| `blocking/PhoneGuardAccessibilityService.kt` | Enforces blocks in the foreground |

iOS lives in `ios/PhoneGuard/`: `PhoneGuardModule.swift` plus
`PhoneGuardModuleBridge.m` for the Objective-C interop.

## Security note

Tokens are stored via `src/utils/storage.ts`, which currently wraps
`AsyncStorage` on native platforms; browser builds use tab-scoped
`sessionStorage`. Before shipping native builds, swap the native implementation
for `react-native-keychain` (or an encrypted store) — nothing else in the app
needs to change because every caller goes through this module.
