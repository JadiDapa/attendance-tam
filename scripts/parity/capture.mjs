#!/usr/bin/env node
// Single screenshot of any URL at mobile (390x844 @3x) or desktop (1440x900)
// size, using the saved web session. Useful for quick spot-checks outside
// the full compare pipeline (e.g. confirming desktop is unchanged).
//
// Usage:
//   node scripts/parity/capture.mjs --url <route> --out <path.png> [--desktop] [--session web|mobile|none]

import fs from "node:fs/promises";
import path from "node:path";
import {
  AUTH_DIR,
  MOBILE_VIEWPORT,
  DESKTOP_VIEWPORT,
  launchBrowser,
  newContext,
  preparePage,
  ensureAuthenticated,
} from "./lib.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (["desktop"].includes(key)) {
        args[key] = true;
      } else {
        args[key] = argv[i + 1];
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.url || !args.out) {
    console.error(
      "Usage: node scripts/parity/capture.mjs --url <route-or-full-url> --out <path.png> [--desktop] [--session web|mobile|none]",
    );
    process.exit(1);
  }

  const baseUrl = process.env.PARITY_WEB_URL ?? "http://localhost:3000";
  const fullUrl = args.url.startsWith("http") ? args.url : `${baseUrl}${args.url}`;

  const session = args.session ?? "web";
  const storageStatePath =
    session === "none" ? undefined : path.join(AUTH_DIR, `${session}.json`);

  const browser = await launchBrowser();
  const context = await newContext(browser, {
    viewport: args.desktop ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT,
    storageStatePath,
    mobile: !args.desktop,
  });
  const page = await context.newPage();

  await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 45000 });

  if (session !== "none") {
    const reloggedIn = await ensureAuthenticated(page, { side: session });
    if (reloggedIn && new URL(page.url()).pathname !== new URL(fullUrl).pathname) {
      await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 45000 });
    }
  }

  await preparePage(page);

  const outPath = path.resolve(process.cwd(), args.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });

  await context.close();
  await browser.close();

  console.log(`Saved ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
