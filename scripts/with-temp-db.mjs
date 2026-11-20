#!/usr/bin/env node
/**
 * Jalankan satu perintah dengan database Postgres sementara, lalu hapus
 * database itu — berhasil atau gagal. Dua mode:
 *
 *   --migrate  → `DATABASE_URL` = database sementara, migrasi sudah diputar.
 *                `npm run test:int` (integration test service).
 *   --shadow   → `SHADOW_DATABASE_URL` = database sementara yang kosong.
 *                `npm run db:check-drift:local` (cek drift tanpa CI).
 *
 * Nama database selalu berawalan `tam_temp_` — `servers/test/setup.ts`
 * menolak jalan di database lain.
 *
 * Server Postgres: `TEMP_DATABASE_SERVER_URL` (URL ke database apa pun yang
 * sudah ada di server itu), default `postgresql://localhost:5432/postgres`
 * (tanpa user = user OS, seperti `psql`).
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { userInfo } from "node:os";
import pg from "pg";

const SERVER_URL =
  process.env.TEMP_DATABASE_SERVER_URL ?? "postgresql://localhost:5432/postgres";

const [mode, ...command] = process.argv.slice(2);

if (!["--migrate", "--shadow"].includes(mode) || command.length === 0) {
  console.error("Pakai: node scripts/with-temp-db.mjs --migrate|--shadow <perintah…>");
  process.exit(2);
}

const name = `tam_temp_${Date.now()}_${randomBytes(3).toString("hex")}`;
const tempUrl = new URL(SERVER_URL);
tempUrl.pathname = `/${name}`;
// `pg` jatuh ke user OS kalau URL tanpa user, Prisma tidak — isi eksplisit.
if (!tempUrl.username) tempUrl.username = process.env.PGUSER ?? userInfo().username;

async function admin(sql) {
  const client = new pg.Client({ connectionString: SERVER_URL });
  try {
    await client.connect();
  } catch (error) {
    console.error(
      `✖ Tidak bisa konek ke Postgres di ${new URL(SERVER_URL).host} (${error.message}).\n` +
        "  Jalankan Postgres lokal, atau set TEMP_DATABASE_SERVER_URL.",
    );
    process.exit(1);
  }
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

function run(cmd, env) {
  const result = spawnSync(cmd[0], cmd.slice(1), {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

await admin(`CREATE DATABASE "${name}"`);

let status = 1;
try {
  if (mode === "--migrate") {
    const env = { DATABASE_URL: tempUrl.toString() };
    status = run(["npx", "prisma", "migrate", "deploy"], env);
    if (status === 0) status = run(command, env);
  } else {
    status = run(command, { SHADOW_DATABASE_URL: tempUrl.toString() });
  }
} finally {
  await admin(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

process.exit(status);
