// server/src/db.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render."
  );
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function initDb() {
  const { error } = await supabase.from("drivers").select("id").limit(1);
  if (error) {
    console.error("Supabase DB check failed:", error.message);
    throw error;
  }
  console.log("Supabase connected OK");
}

/** API collection key -> Supabase table */
export function tableNameFor(collectionKey) {
  const map = {
    drivers: "drivers",
    runs: "runs",
    shifts: "shifts",
    schedules: "schedules",
    customLoadTypes: "custom_load_types",
  };
  return map[collectionKey] || collectionKey;
}

/** Allowed columns per collection (prevents “column does not exist” errors) */
function allowedColumnsFor(collectionKey) {
  const allow = {
    drivers: ["name", "phone", "state", "active"],

    // Your UI sends many more fields than the original minimal schema.
    // If your runs table doesn't have these yet, add them (or Supabase will reject insert).
    runs: [
      "shift_id",
      "driver_id",
      "driver_name",
      "run_date",
      "run_type",
      "city",
      "customer_name",
      "trailer_dropped",
      "trailer_picked_up",
      "load_type",
      "arrival_time",
      "departure_time",
      "notes",
    ],

    // Your UI creates a shift with date/start_time/shift_type + other metadata
    shifts: [
      "shift_date",
      "shift_type",
      "start_time",
      "end_time",
      "driver_name",
      "status",
      "unit_number",
      "starting_odometer",
    ],

    schedules: ["schedule_date", "data"],
    customLoadTypes: ["label"],
  };

  return allow[collectionKey] || [];
}

function isoToTime(value) {
  if (!value) return value;

  // If already looks like HH:MM or HH:MM:SS, keep it
  if (typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.length === 5 ? `${value}:00` : value;
  }

  // If ISO date string, convert to HH:MM:SS
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  } catch {
    return value;
  }
}

function isoToDate(value) {
  if (!value) return value;
  // If already YYYY-MM-DD, keep it
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return value;
  }
}

/** Normalize + map UI keys -> DB keys, then DROP unknown keys */
export function normalizePayload(collectionKey, body) {
  const src = body || {};
  const out = { ...src };

  const applyMap = (m) => {
    for (const [from, to] of Object.entries(m || {})) {
      if (out[from] !== undefined && out[to] === undefined) {
        out[to] = out[from];
        delete out[from];
      }
    }
  };

  // Common alternate names you might have in the UI
  applyMap({
    createdDate: "created_date",
    createdAt: "created_at",
  });

  // Table-specific mappings (UI -> DB)
  const per = {
    drivers: {
      driverName: "name",
      DriverName: "name",
      driver_name: "name",
      phoneNumber: "phone",
      phone_number: "phone",
      selectedState: "state",
      isActive: "active",
    },

    runs: {
      shiftId: "shift_id",
      shift_id: "shift_id",
      driverId: "driver_id",
      driver_id: "driver_id",
      driverName: "driver_name",
      driver_name: "driver_name",
      runDate: "run_date",
      run_date: "run_date",
      loadType: "load_type",
      load_type: "load_type",
      runType: "run_type",
      customerName: "customer_name",
      trailerDropped: "trailer_dropped",
      trailerPickedUp: "trailer_picked_up",
      arrivalTime: "arrival_time",
      departureTime: "departure_time",
    },

    shifts: {
      // IMPORTANT: UI sends `date`, your DB column is `shift_date`
      date: "shift_date",
      shiftDate: "shift_date",

      shiftType: "shift_type",

      // UI sends ISO strings; your DB columns are `time`
      startTime: "start_time",
      endTime: "end_time",

      driverName: "driver_name",
      unitNumber: "unit_number",
      startingOdometer: "starting_odometer",
    },

    schedules: {
      scheduleDate: "schedule_date",
    },

    customLoadTypes: {
      loadTypeLabel: "label",
      name: "label",
      value: "label",
    },
  };

  applyMap(per[collectionKey]);

  // Never allow client to force server-managed columns
  delete out.id;
  delete out.created_at;
  delete out.created_date;

  // Type conversions that match your current Supabase schema
  if (collectionKey === "shifts") {
    if (out.shift_date) out.shift_date = isoToDate(out.shift_date);
    if (out.start_time) out.start_time = isoToTime(out.start_time);
    if (out.end_time) out.end_time = isoToTime(out.end_time);

    // If UI forgot shift_date but did send start_time as ISO, derive date
    if (!out.shift_date && out.start_time && typeof src.start_time === "string") {
      out.shift_date = isoToDate(src.start_time);
    }
  }

  if (collectionKey === "runs") {
    if (out.run_date) out.run_date = isoToDate(out.run_date);
    if (out.arrival_time) out.arrival_time = isoToTime(out.arrival_time);
    if (out.departure_time) out.departure_time = isoToTime(out.departure_time);
  }

  // ✅ DROP unknown keys so Supabase doesn’t reject the insert/update
  const allowed = allowedColumnsFor(collectionKey);
  if (allowed.length) {
    for (const k of Object.keys(out)) {
      if (!allowed.includes(k)) delete out[k];
    }
  }

  return out;
}

/** Back-compat: add created_date if UI expects it */
export function apiShape(row) {
  if (!row) return row;
  const created_date =
    row.created_date ??
    (row.created_at ? new Date(row.created_at).toISOString() : undefined);
  return { ...row, created_date };
}
