// server/src/db.js
import { createClient } from "@supabase/supabase-js";

export let supabase = null;

/**
 * Collections define:
 * - table name in Supabase
 * - primary key column
 * - allowed columns (anything not listed is dropped)
 */
const COLLECTIONS = {
  drivers: {
    table: "drivers",
    primaryKey: "id",
    allowed: ["id", "name", "phone", "state", "active", "created_at"],
  },

  shifts: {
    table: "shifts",
    primaryKey: "id",
    allowed: [
      "id",
      "shift_date",
      "shift_type",
      "start_time",
      "end_time",
      "driver_name",
      "driver_id",
      "unit_number",
      "start_odometer",
      "end_odometer",
      "status",
      "attendance_status",
      "created_at",
    ],
  },

  runs: {
    table: "runs",
    primaryKey: "id",
    allowed: [
      "id",
      "run_date",
      "shift_id",
      "driver_id",
      "driver_name",
      "load_type",
      "start_location",
      "end_location",
      "departure_time",
      "arrival_time",
      "notes",
      "created_at",
    ],
  },

  schedules: {
    table: "schedules",
    primaryKey: "id",
    allowed: ["id", "schedule_date", "data", "created_at"],
  },

  customLoadTypes: {
    table: "custom_load_types",
    primaryKey: "id",
    allowed: ["id", "label", "created_at"],
  },
};

function requireCollection(key) {
  const c = COLLECTIONS[key];
  if (!c) throw new Error(`Unknown collection: ${key}`);
  return c;
}

function pickAllowed(collectionKey, payload) {
  const c = requireCollection(collectionKey);
  const out = {};
  for (const k of c.allowed) {
    if (payload && payload[k] !== undefined) out[k] = payload[k];
  }
  return out;
}

/**
 * Map collectionKey -> table name
 */
export function tableNameFor(collectionKey) {
  return requireCollection(collectionKey).table;
}

/**
 * Normalize incoming payloads from the frontend
 * so your app can keep using the same fields it already uses.
 */
export function normalizePayload(collectionKey, payload) {
  if (!payload || typeof payload !== "object") return {};

  // clone
  const p = { ...payload };

  // ---- DRIVERS ----
  if (collectionKey === "drivers") {
    // Some UIs send driverName instead of name
    if (p.driverName !== undefined && p.name === undefined) p.name = p.driverName;
    delete p.driverName;

    // Default active if missing (optional)
    if (p.active === undefined) {
      // leave as-is (DB default can handle it)
    }

    return p;
  }

  // ---- SHIFTS ----
  if (collectionKey === "shifts") {
    // frontend sends `date` sometimes; DB column is `shift_date`
    if (p.date !== undefined && p.shift_date === undefined) {
      p.shift_date = p.date;
    }
    delete p.date;

    // Ensure status default
    if (p.status === undefined || p.status === null || p.status === "") {
      p.status = "active";
    }

    // IMPORTANT: allow end_time to be NULL (clock-out later)
    // leave end_time as undefined/null if not clocked out

    return p;
  }

  // ---- RUNS ----
  if (collectionKey === "runs") {
    // frontend sends `date`; DB column is `run_date`
    if (p.date !== undefined && p.run_date === undefined) {
      p.run_date = p.date;
    }
    delete p.date;
    return p;
  }

  return p;
}

/**
 * Shape outgoing row for API response
 * (Keep as passthrough unless you want to transform fields)
 */
export function apiShape(row) {
  return row;
}

export async function initDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.");
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  // quick sanity check
  const { error } = await supabase.from("drivers").select("id").limit(1);
  if (error && error.code !== "PGRST116") {
    console.log("Supabase check error:", error);
  }
}

export async function listRecords(collectionKey) {
  const c = requireCollection(collectionKey);

  const { data, error } = await supabase
    .from(c.table)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getRecord(collectionKey, id) {
  const c = requireCollection(collectionKey);

  const { data, error } = await supabase
    .from(c.table)
    .select("*")
    .eq(c.primaryKey, id)
    .single();

  if (error) throw error;
  return data;
}

export async function createRecord(collectionKey, payload) {
  const c = requireCollection(collectionKey);

  const normalized = normalizePayload(collectionKey, payload);
  const insertPayload = pickAllowed(collectionKey, normalized);

  const { data, error } = await supabase
    .from(c.table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecord(collectionKey, id, payload) {
  const c = requireCollection(collectionKey);

  const normalized = normalizePayload(collectionKey, payload);
  const updatePayload = pickAllowed(collectionKey, normalized);

  const { data, error } = await supabase
    .from(c.table)
    .update(updatePayload)
    .eq(c.primaryKey, id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecord(collectionKey, id) {
  const c = requireCollection(collectionKey);

  const { error } = await supabase.from(c.table).delete().eq(c.primaryKey, id);

  if (error) throw error;
  return { ok: true };
}
