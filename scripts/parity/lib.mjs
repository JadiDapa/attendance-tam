// Shared helpers for the parity capture/compare scripts.

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

export const AUTH_DIR = path.resolve(process.cwd(), "parity-auth");
export const OUTPUT_DIR = path.resolve(process.cwd(), "parity-output");

export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }

  /* Next.js dev-mode indicator (route info / issues badge) — dev-only chrome,
     not part of the real app, and it's a custom element so this only works
     because it hides the host node itself rather than piercing its shadow DOM. */
  nextjs-portal {
    display: none !important;
  }
`;

export async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function newContext(browser, { viewport, storageStatePath, mobile = false } = {}) {
  const opts = {
    viewport: viewport ?? MOBILE_VIEWPORT,
  };

  if (mobile) {
    opts.deviceScaleFactor = 3;
    opts.isMobile = true;
    opts.hasTouch = true;
  }

  if (storageStatePath && (await fileExists(storageStatePath))) {
    opts.storageState = storageStatePath;
  }

  const context = await browser.newContext(opts);
  await context.addInitScript(() => {
    try {
      localStorage.setItem("parity-disable-animations", "1");
    } catch {
      /* ignore (private mode etc.) */
    }
  });
  return context;
}

export async function preparePage(page) {
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page
    .evaluate(() => document.fonts && document.fonts.ready)
    .catch(() => {});
  await dismissExpoErrorOverlay(page);
}

/**
 * Expo web's Metro LogBox surfaces an "Uncaught Error" overlay for
 * SDK 57's incomplete expo-secure-store web shim (see MOBILE_PARITY.md).
 * The error fires inside a useEffect after the tree has already mounted,
 * so the app underneath is still usable — dismiss the overlay via its
 * close ("X") button so captures/interactions can proceed.
 */
export async function dismissExpoErrorOverlay(page) {
  const overlayVisible = await page
    .getByText("Uncaught Error", { exact: false })
    .first()
    .isVisible()
    .catch(() => false);

  if (!overlayVisible) return;

  const closeButton = page.locator('[data-testid="close-toggle-button"], [aria-label="Close"]').first();
  if (await closeButton.count()) {
    await closeButton.click({ force: true }).catch(() => {});
    return;
  }

  // Fallback: the close icon is the first interactive element in the
  // LogBox toolbar (top-left corner of the overlay).
  await page.mouse.click(22, 33).catch(() => {});
}

export async function maskSelectors(page, selectors = []) {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      await locator
        .nth(i)
        .evaluate((el) => {
          el.style.visibility = "hidden";
        })
        .catch(() => {});
    }
  }
}

export async function launchBrowser() {
  return chromium.launch();
}

const EMAIL = process.env.PARITY_EMAIL ?? "daffaalthaf25@gmail.com";
const PASSWORD = process.env.PARITY_PASSWORD ?? "daffa2004";

/**
 * Clerk's session JWT cookie is short-lived (~60s) and normally silently
 * refreshed by clerk-js in a live browser tab — a storageState snapshot goes
 * stale almost immediately. If a captured page lands back on the login
 * screen, log in again live instead of failing the whole capture.
 */
export async function ensureAuthenticated(page, { side }) {
  const pathname = new URL(page.url()).pathname;

  if (side === "web" && pathname.startsWith("/login")) {
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /masuk|sign in|log in|login/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    return true;
  }

  // Expo's static export normalizes the URL bar to "/" for some deep-linked
  // routes even though the correct screen renders underneath — pathname
  // alone is unreliable here, so gate on an actual "not signed in" content
  // marker instead (the welcome screen's headline).
  const looksLikeWelcome =
    side === "mobile" && (await page.getByText("Selamat Datang!", { exact: true }).isVisible().catch(() => false));

  if (side === "mobile" && looksLikeWelcome) {
    await dismissExpoErrorOverlay(page);
    const loginLink = page.getByText("Masuk", { exact: true }).first();
    if (await loginLink.isVisible().catch(() => false)) {
      await loginLink.click();
    }
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Password").fill(PASSWORD);
    await dismissExpoErrorOverlay(page);
    await page.getByText("Masuk", { exact: true }).last().click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");
    return true;
  }

  return false;
}

export async function loadStepsModule(stepsPath) {
  if (!stepsPath) return null;
  const resolved = path.isAbsolute(stepsPath) ? stepsPath : path.resolve(process.cwd(), stepsPath);
  const mod = await import(`file://${resolved.replace(/\\/g, "/")}`);
  return mod.default ?? mod;
}
