// Logs into the web app (localhost:3000) and the Expo web reference
// (localhost:8081) with the test account and saves Playwright storage
// state for both, so parity captures can run authenticated without
// re-logging-in every time.
//
// Usage: node scripts/parity/save-auth.mjs
// Env:   PARITY_EMAIL, PARITY_PASSWORD (falls back to the hardcoded test
//        account used throughout this project).

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { dismissExpoErrorOverlay } from "./lib.mjs";

const EMAIL = process.env.PARITY_EMAIL ?? "daffaalthaf25@gmail.com";
const PASSWORD = process.env.PARITY_PASSWORD ?? "daffa2004";

const WEB_URL = process.env.PARITY_WEB_URL ?? "http://localhost:3000";
const MOBILE_WEB_URL = process.env.PARITY_MOBILE_WEB_URL ?? "http://localhost:8081";

const AUTH_DIR = path.resolve(process.cwd(), "parity-auth");

async function loginWeb(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(`${WEB_URL}/login`, { waitUntil: "networkidle" });

  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /masuk|sign in|log in|login/i }).click();

  // Login redirects to the role's default dashboard route.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");

  await context.storageState({ path: path.join(AUTH_DIR, "web.json") });
  await context.close();
  console.log("Saved web session -> parity-auth/web.json");
}

async function loginMobileWeb(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(MOBILE_WEB_URL, { waitUntil: "networkidle", timeout: 60000 });

  // Splash screen auto-redirects to /welcome or /home depending on auth state.
  await page.waitForTimeout(2000);
  await dismissExpoErrorOverlay(page);

  const loginLink = page.getByText("Masuk", { exact: true });
  if (await loginLink.isVisible().catch(() => false)) {
    await loginLink.click();
  }

  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await dismissExpoErrorOverlay(page);
  await page.getByText("Masuk", { exact: true }).last().click();

  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle");
  await dismissExpoErrorOverlay(page);

  await context.storageState({ path: path.join(AUTH_DIR, "mobile.json") });
  await context.close();
  console.log("Saved mobile (Expo web) session -> parity-auth/mobile.json");
}

async function main() {
  await mkdir(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    await loginWeb(browser);
  } catch (err) {
    console.error("Web login failed:", err.message);
  }

  try {
    await loginMobileWeb(browser);
  } catch (err) {
    console.error("Mobile (Expo web) login failed (reference may be unavailable):", err.message);
  }

  await browser.close();
}

main();
