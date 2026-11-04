# PhoneGuard — mobile app

React Native 0.88 · TypeScript · React Navigation 7 · React Query 5 · Zustand.

This is the client half of PhoneGuard. For the full product overview, API
reference, data model and deployment guide, see the [root README](../README.md).

## Getting started

```bash
npm install
cp .env.example .env     # optional: point API_URL at your LAN IP for a device
npm start                # Metro
npm run android          # or: npm run ios
```

Building requires the Android SDK (JDK 17) or Xcode. The JS layer is fully
functional on its own, but the usage-tracking and app-blocking features need
the native modules described below.

### API base URL

`src/config/index.ts` resolves `API_URL` from the environment and otherwise
falls back to:

| Target | Default |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000/api/v1` |
| iOS simulator | `http://localhost:3000/api/v1` |

A physical device needs your machine's LAN IP — see `.env.example`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Start the Metro bundler |
| `npm run android` / `npm run ios` | Build and install on a device or emulator |
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
UI keeps working on simulators and on platforms that lack the capability.

| Capability | Android | iOS |
| --- | --- | --- |
| Read per-app usage | ✅ `UsageStatsManager` | ❌ needs the Family Controls entitlement |
| Block apps | ✅ Accessibility service | ❌ needs `ManagedSettings` |
| Schedules | ✅ Accessibility service | ❌ |

iOS ships an honest stub that reports "unavailable" rather than pretending.
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
`AsyncStorage`. Before shipping, swap that one module for
`react-native-keychain` (or an encrypted store) — nothing else in the app needs
to change because every caller goes through it.
