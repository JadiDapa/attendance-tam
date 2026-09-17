// Forces light theme on the web side before capture, so the comparison
// isn't muddied by web defaulting to dark (`Providers.tsx`) while the
// mobile reference resolves system/light in this headless environment.
export default async function forceLightTheme(page, side) {
  if (side !== "web") return;

  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload({ waitUntil: "networkidle" });
}
