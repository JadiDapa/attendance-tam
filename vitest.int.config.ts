import { defineConfig } from "vitest/config";

import base from "./vitest.config";

/**
 * Integration test service (`servers/**\/*.int.test.ts`) terhadap Postgres
 * sungguhan. Jalankan lewat `npm run test:int`, yang menyediakan database
 * sementara (`scripts/with-temp-db.mjs`) — setup menolak database lain.
 *
 * Spread, bukan `mergeConfig`: `mergeConfig` menggabungkan array `include`,
 * sehingga unit test ikut jalan di sini.
 */
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["servers/**/*.int.test.ts"],
    setupFiles: ["servers/test/setup.ts"],
    // Satu database untuk semua file: jalankan berurutan.
    fileParallelism: false,
  },
});
