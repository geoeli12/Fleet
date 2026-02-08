import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";

// Build paths relative to THIS file (not process.cwd())
// This avoids the accidental server\server\... path issue.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server/src/db.js -> server/data/db.json
const dataDir = path.resolve(__dirname, "..", "data");
const dbFile = path.join(dataDir, "db.json");

// Ensure folder exists
fs.mkdirSync(dataDir, { recursive: true });

const adapter = new JSONFile(dbFile);

export const db = new Low(adapter, {
  drivers: [],
  shifts: [],
  runs: [],
  schedules: [],
  customLoadTypes: [],
});

export async function initDb() {
  await db.read();
  db.data ||= {
    drivers: [],
    shifts: [],
    runs: [],
    schedules: [],
    customLoadTypes: [],
  };
  await db.write();
}

export function makeId(prefix) {
  return `${prefix}_${nanoid(10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function sortItems(items, sort) {
  if (!sort) return items;

  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;

  const out = [...items].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (typeof av === "number" && typeof bv === "number") return av - bv;

    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    if (as < bs) return -1;
    if (as > bs) return 1;
    return 0;
  });

  return desc ? out.reverse() : out;
}

export function applyFilters(items, query) {
  const q = { ...(query || {}) };
  delete q.sort;

  const keys = Object.keys(q);
  if (keys.length === 0) return items;

  return items.filter((it) =>
    keys.every((k) => String(it?.[k] ?? "") === String(q[k] ?? ""))
  );
}