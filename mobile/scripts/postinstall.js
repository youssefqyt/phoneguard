#!/usr/bin/env node
/**
 * Post-install helper for the PhoneGuard mobile app.
 *
 * Runs after `npm install` and performs non-fatal environment checks plus a
 * couple of idempotent patches that the React Native template needs for this
 * app's native modules (usage stats + app blocking).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function log(message) {
  console.log(`[phoneguard] ${message}`);
}

function warn(message) {
  console.warn(`[phoneguard] ⚠ ${message}`);
}

function fileExists(relative) {
  return fs.existsSync(path.join(ROOT, relative));
}

function ensureManifestPermissions() {
  const manifestPath = path.join(
    ROOT,
    'android/app/src/main/AndroidManifest.xml',
  );
  if (!fs.existsSync(manifestPath)) {
    warn('AndroidManifest.xml not found — skipping permission patch');
    return;
  }

  const required = [
    'android.permission.INTERNET',
    'android.permission.PACKAGE_USAGE_STATS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.QUERY_ALL_PACKAGES',
  ];

  let manifest = fs.readFileSync(manifestPath, 'utf8');
  let changed = false;

  for (const permission of required) {
    if (manifest.includes(`android:name="${permission}"`)) continue;
    manifest = manifest.replace(
      /(\n\s*)<uses-permission android:name="android\.permission\.INTERNET" \/>/,
      (match, indent) =>
        `${indent}<uses-permission android:name="android.permission.INTERNET" />` +
        `${indent}<uses-permission android:name="${permission}" />`,
    );
    changed = true;
  }

  // Ensure the accessibility service is declared exactly once.
  if (!manifest.includes('PhoneGuardAccessibilityService')) {
    const serviceXml = `
      <!-- PhoneGuard: intercepts app launches to enforce limits and blocklists -->
      <service
        android:name=".blocking.PhoneGuardAccessibilityService"
        android:exported="false"
        android:label="@string/accessibility_service_label"
        android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
        <intent-filter>
          <action android:name="android.accessibilityservice.AccessibilityService" />
        </intent-filter>
        <meta-data
          android:name="android.accessibilityservice"
          android:resource="@xml/accessibility_service_config" />
      </service>
`;
    manifest = manifest.replace('    </application>', `${serviceXml}    </application>`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(manifestPath, manifest, 'utf8');
    log('patched AndroidManifest.xml (permissions + accessibility service)');
  }
}

function reportEnvironment() {
  const checks = [
    ['android/app/build.gradle', 'Android project'],
    ['ios/PhoneGuard/AppDelegate.swift', 'iOS project'],
    ['../backend/prisma/schema.prisma', 'backend (monorepo sibling)'],
  ];
  for (const [relative, label] of checks) {
    if (!fileExists(relative)) {
      warn(`could not find ${label} at ${relative}`);
    }
  }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 22) {
    warn(`Node ${process.versions.node} detected — the project targets Node 22+`);
  }
}

try {
  ensureManifestPermissions();
  reportEnvironment();
  log('setup complete — run `npm run android` (Android SDK required) or `npm run ios`');
} catch (error) {
  // Never fail the install because of this script.
  warn(`postinstall skipped: ${error instanceof Error ? error.message : error}`);
}
