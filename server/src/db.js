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
    runs: ["driver_id", "run_date", "load_type", "notes"],
    shifts: ["shift_date", "shift_type", "start_time", "end_time"],
    schedules: ["schedule_date", "data"],
    customLoadTypes: ["label"],
  };
  return allow[collectionKey] || [];
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
      driverId: "driver_id",
      runDate: "run_date",
      loadType: "load_type",
    },
    shifts: {
      shiftDate: "shift_date",
      shiftType: "shift_type",
      startTime: "start_time",
      endTime: "end_time",
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
