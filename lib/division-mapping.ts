/**
 * Pemetaan Divisi & Jabatan awal, sekali jalan (tiket 14). Dipakai
 * `scripts/pemetaan-divisi.ts` lewat `DivisionMappingService`.
 *
 * Bebas Prisma: menerima isi database & file pemetaan sebagai data biasa,
 * mengembalikan rencana. Daftar orangnya sendiri tidak ada di repo (data
 * pribadi karyawan) — dibaca dari file pemetaan lokal.
 */

import { formatWorkerPosition, type OrgRole } from "./division";

type StructurePosition = {
  name: string;
  /** Role yang diduga dipegang orang berjabatan ini — selain itu, berhenti. */
  roles: readonly OrgRole[];
};

/** Struktur awal. Nama Jabatan unik di seluruh struktur, jadi file cukup menyebut Jabatan. */
export const DIVISION_STRUCTURE: readonly {
  division: string;
  positions: readonly StructurePosition[];
}[] = [
  {
    division: "Admin",
    positions: [
      { name: "Supervisor Admin", roles: ["SUPERVISOR"] },
      // Role ADMIN boleh: ada Admin yang memang ber-Role ADMIN.
      { name: "Admin", roles: ["EMPLOYEE", "ADMIN"] },
    ],
  },
  {
    division: "Teknis",
    positions: [
      { name: "Supervisor Teknis", roles: ["SUPERVISOR"] },
      { name: "Teknisi", roles: ["EMPLOYEE"] },
      { name: "Teknisi (EoS)", roles: ["EMPLOYEE"] },
      { name: "Programmer", roles: ["EMPLOYEE"] },
    ],
  },
];

/** Satu baris file pemetaan. `line` = nomor baris file (CSV) atau urutan objek (JSON). */
export type MappingEntry = { userId: string; email: string; jabatan: string; line?: number };

export type MappingUser = {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  isActive: boolean;
  /** Kolom teks jabatan lama. */
  position: string | null;
  positionId: string | null;
};

export type MappingInput = {
  entries: MappingEntry[];
  divisions: { id: string; name: string }[];
  positions: { id: string; name: string; divisionId: string }[];
  users: MappingUser[];
};

export type MappingAssignment = {
  userId: string;
  name: string;
  jabatan: string;
  division: string;
  /** Null selama Jabatan-nya belum dibuat (dry-run di database yang belum dipetakan). */
  positionId: string | null;
};

export type MappingPlan =
  | {
      ok: true;
      createDivisions: string[];
      createPositions: { division: string; name: string }[];
      assignments: MappingAssignment[];
      /** Sudah memegang Jabatan yang sama — dilewati. */
      skipped: MappingAssignment[];
      /** User aktif non-Manager yang tetap tanpa Jabatan — untuk dicocokkan manusia. */
      unmapped: { userId: string; name: string }[];
    }
  | { ok: false; errors: string[] };

/**
 * Teks jabatan lama yang harus muncul di file pemetaan: user aktif berteks
 * persis ini (peka huruf besar) yang tidak disebut file berarti snapshot sudah
 * usang → berhenti. Teks ini hanya pemeriksa; pemetaan tetap dari file (id + email).
 */
export const TEKNISI_TEXT = "Teknisi";

export type ParsedMapping =
  | { ok: true; entries: MappingEntry[] }
  | { ok: false; errors: string[] };

const CSV_HEADER = "userId,email,jabatan";

/**
 * Baca file pemetaan lokal. CSV: header `userId,email,jabatan`, pemisah koma,
 * baris kosong & baris `#` dilewati. JSON: array `{ userId, email, jabatan }`.
 * "Baris N" pada pesan = nomor baris file (CSV) atau urutan objek (JSON).
 */
export function parseDivisionMapping(content: string, fileName: string): ParsedMapping {
  const extension = fileName.toLowerCase().split(".").pop();
  const parsed =
    extension === "csv"
      ? parseCsv(content.replace(/^\uFEFF/, ""))
      : extension === "json"
        ? parseJson(content)
        : { ok: false as const, errors: [`${fileName}: file pemetaan harus .csv atau .json.`] };

  if (parsed.ok && parsed.entries.length === 0) {
    return { ok: false, errors: [`${fileName} tidak berisi baris pemetaan.`] };
  }
  return parsed;
}

type RawRow = { line: number; userId: unknown; email: unknown; jabatan: unknown };

function toEntries(rows: RawRow[]): ParsedMapping {
  const errors: string[] = [];
  const entries: MappingEntry[] = [];

  for (const { line, ...raw } of rows) {
    const [userId, email, jabatan] = [raw.userId, raw.email, raw.jabatan].map((value) =>
      typeof value === "string" ? value.trim() : "",
    );
    if (!userId || !email || !jabatan) {
      errors.push(`Baris ${line}: userId, email, dan jabatan wajib diisi.`);
    } else {
      entries.push({ userId, email, jabatan, line });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, entries };
}

function parseCsv(content: string): ParsedMapping {
  const lines = content
    .split(/\r?\n/)
    .map((text, index) => ({ line: index + 1, text: text.trim() }))
    .filter(({ text }) => text !== "" && !text.startsWith("#"));
  const [header, ...rows] = lines;

  if (header?.text.replace(/\s/g, "") !== CSV_HEADER) {
    return { ok: false, errors: [`Baris pertama CSV harus header ${CSV_HEADER}.`] };
  }

  const errors: string[] = [];
  const raw: RawRow[] = [];
  for (const { line, text } of rows) {
    const cells = text.split(",");
    if (cells.length !== 3) {
      errors.push(`Baris ${line}: harus 3 kolom (${CSV_HEADER}), ada ${cells.length}.`);
      continue;
    }
    const [userId, email, jabatan] = cells;
    raw.push({ line, userId, email, jabatan });
  }

  const parsed = toEntries(raw);
  if (errors.length > 0) return { ok: false, errors: [...errors, ...(parsed.ok ? [] : parsed.errors)] };
  return parsed;
}

function parseJson(content: string): ParsedMapping {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (error) {
    return { ok: false, errors: [`JSON tidak terbaca: ${(error as Error).message}`] };
  }
  if (!Array.isArray(data)) {
    return { ok: false, errors: ["JSON harus berupa array { userId, email, jabatan }."] };
  }

  return toEntries(
    data.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return { line: index + 1, userId: row.userId, email: row.email, jabatan: row.jabatan };
    }),
  );
}

const STRUCTURE_POSITIONS = DIVISION_STRUCTURE.flatMap(({ division, positions }) =>
  positions.map((position) => ({ ...position, division })),
);

export function planDivisionMapping(input: MappingInput): MappingPlan {
  const divisionId = (name: string) =>
    input.divisions.find((division) => division.name === name)?.id ?? null;
  const positionId = (division: string, name: string) => {
    const id = divisionId(division);
    if (!id) return null;
    return (
      input.positions.find((p) => p.divisionId === id && p.name === name)?.id ?? null
    );
  };

  const createDivisions = DIVISION_STRUCTURE.map(({ division }) => division).filter(
    (name) => !divisionId(name),
  );
  const createPositions = STRUCTURE_POSITIONS.filter(
    ({ division, name }) => !positionId(division, name),
  ).map(({ division, name }) => ({ division, name }));

  const usersById = new Map(input.users.map((user) => [user.id, user]));
  const errors: string[] = [];
  const assignments: MappingAssignment[] = [];
  const skipped: MappingAssignment[] = [];

  const seen = new Set<string>();

  for (const entry of input.entries) {
    const target = usersById.get(entry.userId);
    const structure = STRUCTURE_POSITIONS.find((p) => p.name === entry.jabatan);
    // Nomor baris file kalau ada (dari `parseDivisionMapping`), kalau tidak id user-nya.
    const row = entry.line === undefined ? `User ${entry.userId}` : `Baris ${entry.line}`;

    if (seen.has(entry.userId)) {
      errors.push(`${row}: user disebut lebih dari sekali di file.`);
      continue;
    }
    seen.add(entry.userId);

    if (!target) {
      errors.push(`${row}: user tidak ada di database.`);
      continue;
    }
    if (normalizeEmail(target.email) !== normalizeEmail(entry.email)) {
      errors.push(`${row}: email tidak cocok dengan user ${target.name}.`);
      continue;
    }
    if (!structure) {
      const known = STRUCTURE_POSITIONS.map((p) => p.name).join(", ");
      errors.push(`${row}: Jabatan "${entry.jabatan}" tidak ada di struktur (${known}).`);
      continue;
    }
    const who = `${target.name} (${target.id})`;
    if (!target.isActive) {
      errors.push(`${who} nonaktif — akun nonaktif tidak dipetakan.`);
      continue;
    }
    if (!structure.roles.includes(target.role)) {
      errors.push(
        `${who} ber-Role ${target.role}, padahal ${structure.name} diduga ${structure.roles.join("/")}.`,
      );
      continue;
    }

    const assignment: MappingAssignment = {
      userId: target.id,
      name: target.name,
      jabatan: structure.name,
      division: structure.division,
      positionId: positionId(structure.division, structure.name),
    };

    if (target.positionId === null) {
      assignments.push(assignment);
    } else if (target.positionId === assignment.positionId) {
      skipped.push(assignment);
    } else {
      errors.push(
        `${who} sudah memegang Jabatan lain (${describePosition(input, target.positionId)}), bukan ${structure.name}.`,
      );
    }
  }

  const listed = new Set(input.entries.map((entry) => entry.userId));
  for (const user of input.users) {
    if (user.isActive && user.position === TEKNISI_TEXT && !listed.has(user.id)) {
      errors.push(
        `${user.name} (${user.id}) aktif berteks jabatan "${TEKNISI_TEXT}" tapi tidak ada di file pemetaan — snapshot sudah usang? Tambahkan ke file.`,
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const mapped = new Set([...assignments, ...skipped].map((a) => a.userId));
  const unmapped = input.users
    .filter(
      (user) =>
        user.isActive &&
        user.role !== "MANAGER" &&
        user.positionId === null &&
        !mapped.has(user.id),
    )
    .map((user) => ({ userId: user.id, name: user.name }));

  return { ok: true, createDivisions, createPositions, assignments, skipped, unmapped };
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function describePosition(input: MappingInput, id: string) {
  const position = input.positions.find((p) => p.id === id);
  const division = input.divisions.find((d) => d.id === position?.divisionId);
  return formatWorkerPosition(position?.name ?? id, division?.name);
}
