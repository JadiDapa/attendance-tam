#!/usr/bin/env node
/**
 * Guardrail: produksi sudah berjalan, jadi setiap migrasi Prisma baru hanya
 * boleh MENAMBAH — tabel baru, kolom nullable, atau kolom dengan DEFAULT.
 * Tidak ada DROP, RENAME, ganti tipe, SET NOT NULL, atau hapus data. Dengan
 * begitu migrasi bisa jalan sebelum kode baru (dan mobile versi lama) ikut rilis.
 *
 * Hanya memeriksa migrasi sesudah PRODUCTION_BASELINE; migrasi lama memang
 * berisi DROP dan tidak diubah lagi.
 *
 * Kalau satu statement memang harus melanggar (mis. kolom yang sudah tidak
 * dibaca mobile mana pun), tulis komentar `-- migration-safety: allow <alasan>`
 * tepat di atas statement itu.
 *
 * Jalankan: node scripts/check-migrations.mjs   (bagian dari `npm run check`)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Migrasi terakhir yang sudah ada di produksi saat guardrail ini dipasang. */
export const PRODUCTION_BASELINE = "20260919010000_admin_attendance_edit";

const ALLOW_MARKER = /--\s*migration-safety:\s*allow\b/i;

/**
 * Pecah SQL jadi statement. `code` adalah statement tanpa komentar, dengan isi
 * string ('…') dan identifier ("…") dikosongkan — supaya kata seperti DROP di
 * komentar, nilai DEFAULT, atau nama kolom tidak ikut terhitung.
 */
function splitStatements(sql) {
  const statements = [];
  let text = "";
  let code = "";
  let i = 0;

  const flush = () => {
    if (code.trim()) statements.push({ text: text.trim(), code });
    text = "";
    code = "";
  };

  while (i < sql.length) {
    const char = sql[i];

    if (char === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      text += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (char === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      text += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (char === "'" || char === '"') {
      let j = i + 1;

      while (j < sql.length) {
        if (sql[j] === char && sql[j + 1] === char) j += 2; // '' atau "" di dalam literal
        else if (sql[j] === char) break;
        else j += 1;
      }

      text += sql.slice(i, j + 1);
      code += `${char}_${char}`;
      i = j + 1;
      continue;
    }

    if (char === ";") {
      flush();
      i += 1;
      continue;
    }

    text += char;
    code += char;
    i += 1;
  }

  flush();

  return statements;
}

/** Pecah statement di koma tingkat atas (bukan koma di dalam kurung). */
function splitClauses(code) {
  const clauses = [];
  let depth = 0;
  let current = "";

  for (const char of code) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;

    if (char === "," && depth === 0) {
      clauses.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  clauses.push(current);

  return clauses;
}

const RULES = [
  { reason: "DROP", test: (code) => /\bDROP\b(?!\s+NOT\s+NULL\b)/.test(code) },
  { reason: "RENAME", test: (code) => /\bRENAME\b/.test(code) },
  {
    reason: "mengganti tipe kolom",
    test: (code) => /\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/.test(code),
  },
  {
    reason: "menjadikan kolom yang ada wajib (SET NOT NULL)",
    test: (code) => /\bSET\s+NOT\s+NULL\b/.test(code),
  },
  {
    reason: "menghapus data",
    test: (code) => /\b(TRUNCATE|DELETE\s+FROM)\b/.test(code),
  },
  {
    reason: "kolom wajib (NOT NULL) tanpa DEFAULT",
    test: (code) =>
      /^\s*ALTER\s+TABLE\b/.test(code) &&
      splitClauses(code).some(
        (clause) =>
          /\bADD\s+COLUMN\b/.test(clause) &&
          /\bNOT\s+NULL\b/.test(clause) &&
          !/\bDEFAULT\b/.test(clause),
      ),
  },
];

/** Statement yang melanggar aturan "hanya menambah", beserta alasannya. */
export function findUnsafeStatements(sql) {
  const issues = [];

  for (const { text, code } of splitStatements(sql)) {
    if (ALLOW_MARKER.test(text)) continue;

    const normalized = code.toUpperCase().replace(/\s+/g, " ");

    for (const rule of RULES) {
      if (rule.test(normalized)) issues.push({ reason: rule.reason, statement: text });
    }
  }

  return issues;
}

function main() {
  const root = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));
  const migrations = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name > PRODUCTION_BASELINE)
    .map((entry) => entry.name)
    .sort();

  let failed = 0;

  for (const name of migrations) {
    const sql = readFileSync(join(root, name, "migration.sql"), "utf8");

    for (const issue of findUnsafeStatements(sql)) {
      failed += 1;
      console.error(`✖ ${name}: ${issue.reason}\n    ${issue.statement.replace(/\n/g, "\n    ")}\n`);
    }
  }

  if (failed) {
    console.error(
      `${failed} statement melanggar aturan "migrasi hanya menambah" ` +
        "(kolom baru harus nullable atau punya DEFAULT; tanpa DROP/RENAME/ganti tipe). " +
        "Lihat komentar di scripts/check-migrations.mjs.",
    );
    process.exit(1);
  }

  console.log(`✔ ${migrations.length} migrasi sesudah ${PRODUCTION_BASELINE} hanya menambah`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
