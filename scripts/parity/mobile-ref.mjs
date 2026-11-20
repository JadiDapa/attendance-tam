#!/usr/bin/env node
// Serves the mobile reference (Expo web static export of ../mobile-tam) for
// parity captures, on ONE origin with the dashboard API:
//
//   http://localhost:8081/api/*  -> proxied to the Next dev server (:3000)
//   http://localhost:8081/*      -> files from ../mobile-tam/dist (SPA fallback)
//
// Why the proxy: the Next API sends no CORS headers (the native app never
// needs them), so an Expo web build on :8081 calling :3000 from the browser
// fails every request and the reference renders without data. Same origin
// sidesteps that without touching backend code.
//
// Usage:
//   npm run parity:mobile-ref              # serve an existing export
//   npm run parity:mobile-ref -- --export  # (re)export first, then serve
//
// `--export` builds with the dashboard's own NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
// (from .env — ../mobile-tam/.env.example may point at another Clerk
// instance, and then no parity account can sign in) and
// EXPO_PUBLIC_API_URL=<this proxy>. It always passes `--clear`: Metro inlines
// EXPO_PUBLIC_* at transform time and otherwise reuses stale values from cache.
//
// Env: PARITY_MOBILE_DIR (default ../mobile-tam), PARITY_MOBILE_PORT (8081),
//      PARITY_WEB_URL (http://localhost:3000).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const MOBILE_DIR = path.resolve(process.env.PARITY_MOBILE_DIR ?? "../mobile-tam");
const DIST = path.join(MOBILE_DIR, "dist");
const PORT = Number(process.env.PARITY_MOBILE_PORT ?? 8081);
const API = new URL(process.env.PARITY_WEB_URL ?? "http://localhost:3000");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function exportMobile() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — run via `npm run parity:mobile-ref` so .env is loaded.");
    process.exit(1);
  }

  console.log(`Exporting ${MOBILE_DIR} for web (API -> http://localhost:${PORT})...`);
  const result = spawnSync("npx", ["expo", "export", "-p", "web", "--clear"], {
    cwd: MOBILE_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
      EXPO_PUBLIC_API_URL: `http://localhost:${PORT}`,
    },
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** Exact file, then `<path>.html`, then `<path>/index.html`, then the SPA shell. */
function resolveStatic(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const base = path.normalize(path.join(DIST, clean));

  if (base !== DIST && !base.startsWith(DIST + path.sep)) return null;

  for (const candidate of [base, `${base}.html`, path.join(base, "index.html")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  return path.join(DIST, "index.html");
}

function proxyApi(req, res) {
  const upstream = http.request(
    {
      host: API.hostname,
      port: API.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: API.host },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );

  upstream.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`parity proxy: ${API.origin} unreachable (${err.message}) — is \`npm run dev\` running?`);
  });

  req.pipe(upstream);
}

function serveStatic(req, res) {
  const file = resolveStatic(req.url ?? "/");

  if (!file) {
    res.writeHead(403).end();
    return;
  }

  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

if (process.argv.includes("--export")) exportMobile();

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error(`No export at ${DIST} — run \`npm run parity:mobile-ref -- --export\` first.`);
  process.exit(1);
}

http
  .createServer((req, res) => (req.url?.startsWith("/api/") ? proxyApi(req, res) : serveStatic(req, res)))
  .listen(PORT, () => {
    console.log(`Mobile reference on http://localhost:${PORT} (/api/* -> ${API.origin})`);
  });
