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
      "run_type",
      "city",
      "customer_name",
      "trailer_dropped",
      "trailer_picked_up",
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

fuel_readings: {
  table: "fuel_readings",
  primaryKey: "id",
  allowed: [
    "id",
    "driver_id",
    "driver_name",
    "before_image",
    "after_image",
    "before_reading",
    "after_reading",
    "gallons_used",
    "date",
    "time",
    "notes",
    "created_at",
  ],
},

fuel_refills: {
  table: "fuel_refills",
  primaryKey: "id",
  allowed: [
    "id",
    "gallons_added",
    "date",
    "cost",
    "notes",
    "running_total_after",
    "created_at",
  ],
},

fuel_tank: {
  table: "fuel_tank",
  primaryKey: "id",
  allowed: ["id", "current_gallons", "last_updated", "created_at"],
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

export function tableNameFor(collectionKey) {
  return requireCollection(collectionKey).table;
}

/**
 * Normalize incoming payloads from the frontend.
 * IMPORTANT: returns ONLY allowed columns to prevent Supabase insert/update failures.
 */
export function normalizePayload(collectionKey, payload) {
  if (!payload || typeof payload !== "object") return {};

  const p = { ...payload };

  // ---- DRIVERS ----
  if (collectionKey === "drivers") {
    // UI variants -> DB column names
    if (p.driverName !== undefined && p.name === undefined) p.name = p.driverName;
    if (p.phoneNumber !== undefined && p.phone === undefined) p.phone = p.phoneNumber;

    delete p.driverName;
    delete p.phoneNumber;

    // Ensure active is always boolean so UI doesn't break filters/badges
    if (p.active === undefined || p.active === null) p.active = false;

    return pickAllowed(collectionKey, p);
  }

  // ---- SHIFTS ----
  if (collectionKey === "shifts") {
    // UI sends `date` sometimes; DB column is `shift_date`
    if (p.date !== undefined && p.shift_date === undefined) p.shift_date = p.date;
    delete p.date;

    // Ensure status default
    if (p.status === undefined || p.status === null || p.status === "") p.status = "active";

    return pickAllowed(collectionKey, p);
  }

  // ---- RUNS ----
  if (collectionKey === "runs") {
    // UI sends `date`; DB column is `run_date`
    if (p.date !== undefined && p.run_date === undefined) p.run_date = p.date;
    delete p.date;

    return pickAllowed(collectionKey, p);
  }

  // Default: strip to allowed keys
  return pickAllowed(collectionKey, p);
}

/**
 * Shape outgoing rows so frontend always gets what it expects.
 */
export function apiShape(collectionKey, row) {
  if (!row || typeof row !== "object") return row;

  if (collectionKey === "drivers") {
    const out = { ...row };

    // Always expose a boolean `active` to frontend
    if (out.active === undefined || out.active === null) out.active = false;

    // Some schemas use is_active; if present, map it
    if (out.active === false && out.is_active !== undefined && out.is_active !== null) {
      out.active = Boolean(out.is_active);
    }

    // Some schemas store phone_number; map it
    if (!out.phone && out.phone_number) out.phone = out.phone_number;

    return out;
  }

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
  return (data || []).map((r) => apiShape(collectionKey, r));
}

export async function getRecord(collectionKey, id) {
  const c = requireCollection(collectionKey);

  const { data, error } = await supabase
    .from(c.table)
    .select("*")
    .eq(c.primaryKey, id)
    .single();

  if (error) throw error;
  return apiShape(collectionKey, data);
}

export async function createRecord(collectionKey, payload) {
  const c = requireCollection(collectionKey);

  const insertPayload = normalizePayload(collectionKey, payload);

  const { data, error } = await supabase
    .from(c.table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return apiShape(collectionKey, data);
}

export async function updateRecord(collectionKey, id, payload) {
  const c = requireCollection(collectionKey);

  const updatePayload = normalizePayload(collectionKey, payload);

  const { data, error } = await supabase
    .from(c.table)
    .update(updatePayload)
    .eq(c.primaryKey, id)
    .select("*")
    .single();

  if (error) throw error;
  return apiShape(collectionKey, data);
}

export async function deleteRecord(collectionKey, id) {
  const c = requireCollection(collectionKey);

  const { error } = await supabase.from(c.table).delete().eq(c.primaryKey, id);

  if (error) throw error;
  return { ok: true };
}
