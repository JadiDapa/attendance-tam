#!/usr/bin/env node
// Compares a web-app screen against the mobile reference (Expo web, or a
// static reference PNG) at mobile viewport size and produces a pixel diff.
//
// Usage:
//   node scripts/parity/compare.mjs --name <screen> --web <route> --mobile <expo-route>
//   node scripts/parity/compare.mjs --name <screen> --web <route> --ref <png-path>
//   node scripts/parity/compare.mjs --name <screen> --web <route> --mobile <expo-route> --steps <file> --mask <selector> [--mask <selector> ...]
//
// Outputs parity-output/<name>/{web.png,mobile.png,diff.png} and prints the
// pixel diff percentage.

import fs from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import {
  AUTH_DIR,
  OUTPUT_DIR,
  MOBILE_VIEWPORT,
  launchBrowser,
  newContext,
  preparePage,
  maskSelectors,
  loadStepsModule,
  ensureAuthenticated,
} from "./lib.mjs";

function parseArgs(argv) {
  const args = { mask: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mask") {
      args.mask.push(argv[++i]);
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      args[key] = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function capture({ browser, url, storageStatePath, stepsModule, side, mask }) {
  const context = await newContext(browser, {
    viewport: MOBILE_VIEWPORT,
    storageStatePath,
    mobile: true,
  });
  const page = await context.newPage();

  const targetPath = new URL(url).pathname;

  // Clerk's dev-instance session handshake (syncing `__clerk_db_jwt` between
  // the app and *.clerk.accounts.dev) is intermittently flaky in this
  // sandboxed environment and can bounce a fresh login through
  // /account-disabled or back to /login. Retry the whole login+navigate a
  // few times rather than failing the capture outright. On the mobile side,
  // Expo's static export sometimes normalizes the URL bar to "/" for a
  // correctly-rendered deep link, so success there is "no error thrown and
  // not the 404 page" rather than a strict path match.
  let ok = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

      const reloggedIn = await ensureAuthenticated(page, { side });
      if (side === "web" && reloggedIn && new URL(page.url()).pathname !== targetPath) {
        // Login redirects to the role's default route, which usually *is*
        // the target — only navigate again if it landed somewhere else.
        await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      }

      await page.waitForTimeout(500);

      if (side === "web") {
        ok = new URL(page.url()).pathname === targetPath;
      } else {
        const isUnmatched = await page.getByText("Unmatched Route", { exact: true }).isVisible().catch(() => false);
        ok = !isUnmatched;
      }
    } catch (err) {
      console.warn(`  [${side}] attempt ${attempt} threw: ${err.message.split("\n")[0]}`);
      ok = false;
    }

    if (ok) break;

    console.warn(`  [${side}] attempt ${attempt} failed, retrying...`);
  }

  if (!ok) {
    throw new Error(`Could not reach ${targetPath} after retries on the ${side} side.`);
  }

  await preparePage(page);

  if (stepsModule) {
    await stepsModule(page, side);
    await preparePage(page);
  }

  if (mask?.length) {
    await maskSelectors(page, mask);
  }

  const buffer = await page.screenshot({ fullPage: false });
  await context.close();
  return buffer;
}

async function loadPngFromBuffer(buffer) {
  return PNG.sync.read(buffer);
}

function resizeCanvas(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const resized = new PNG({ width, height });
  PNG.bitblt(png, resized, 0, 0, Math.min(png.width, width), Math.min(png.height, height), 0, 0);
  return resized;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.name || !args.web) {
    console.error(
      "Usage: node scripts/parity/compare.mjs --name <screen> --web <route> [--mobile <expo-route> | --ref <png-path>] [--steps <file>] [--mask <selector>]",
    );
    process.exit(1);
  }

  const webBaseUrl = process.env.PARITY_WEB_URL ?? "http://localhost:3000";
  const mobileBaseUrl = process.env.PARITY_MOBILE_WEB_URL ?? "http://localhost:8081";

  const outDir = path.join(OUTPUT_DIR, args.name);
  await fs.mkdir(outDir, { recursive: true });

  const stepsModule = await loadStepsModule(args.steps);

  const browser = await launchBrowser();

  console.log(`Capturing web: ${webBaseUrl}${args.web}`);
  const webBuffer = await capture({
    browser,
    url: `${webBaseUrl}${args.web}`,
    storageStatePath: path.join(AUTH_DIR, "web.json"),
    stepsModule,
    side: "web",
    mask: args.mask,
  });
  await fs.writeFile(path.join(outDir, "web.png"), webBuffer);

  let mobileBuffer;
  if (args.ref) {
    console.log(`Loading static reference: ${args.ref}`);
    mobileBuffer = await fs.readFile(path.resolve(args.ref));
  } else if (args.mobile) {
    console.log(`Capturing mobile reference: ${mobileBaseUrl}${args.mobile}`);
    mobileBuffer = await capture({
      browser,
      url: `${mobileBaseUrl}${args.mobile}`,
      storageStatePath: path.join(AUTH_DIR, "mobile.json"),
      stepsModule,
      side: "mobile",
      mask: args.mask,
    });
  } else {
    console.error("Must pass either --mobile <expo-route> or --ref <png-path>");
    await browser.close();
    process.exit(1);
  }
  await fs.writeFile(path.join(outDir, "mobile.png"), mobileBuffer);

  await browser.close();

  const webPng = await loadPngFromBuffer(webBuffer);
  let mobilePng = await loadPngFromBuffer(mobileBuffer);

  const width = Math.max(webPng.width, mobilePng.width);
  const height = Math.max(webPng.height, mobilePng.height);
  const webResized = resizeCanvas(webPng, width, height);
  const mobileResized = resizeCanvas(mobilePng, width, height);

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    webResized.data,
    mobileResized.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );

  await fs.writeFile(path.join(outDir, "diff.png"), PNG.sync.write(diff));

  const pct = ((diffPixels / (width * height)) * 100).toFixed(2);
  console.log(`\n${args.name}: ${pct}% different (${diffPixels} / ${width * height} px)`);
  console.log(`Output: parity-output/${args.name}/{web,mobile,diff}.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
