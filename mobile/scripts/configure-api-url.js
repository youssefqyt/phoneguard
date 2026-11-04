#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const apiUrl = process.env.PHONEGUARD_API_URL?.trim();
if (!apiUrl) {
  throw new Error(
    'Set PHONEGUARD_API_URL to the API base URL, including /api/v1.',
  );
}

let parsedUrl;
try {
  parsedUrl = new URL(apiUrl);
} catch {
  throw new Error(`Invalid API URL: ${apiUrl}`);
}

if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
  throw new Error('API URL must use http:// or https://.');
}
if (
  parsedUrl.username ||
  parsedUrl.password ||
  parsedUrl.search ||
  parsedUrl.hash
) {
  throw new Error(
    'API URL must not contain credentials, a query string, or a fragment.',
  );
}

const apiPath = parsedUrl.pathname.replace(/\/+$/, '');
if (apiPath !== '/api/v1') {
  throw new Error('API URL must end with /api/v1.');
}

const normalizedUrl = `${parsedUrl.origin}${apiPath}`;
const configPath = path.resolve(__dirname, '../src/config/buildConfig.ts');
fs.writeFileSync(
  configPath,
  `export const BUILD_API_URL: string | undefined = ${JSON.stringify(
    normalizedUrl,
  )};\n`,
);
console.log(`Configured APK API URL: ${normalizedUrl}`);
