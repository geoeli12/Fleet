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
    // NOTE: your current Supabase schema requires end_time NOT NULL
    shifts: ["shift_date", "shift_type", "start_time", "end_time"],
    schedules: ["schedule_date", "data"],
    customLoadTypes: ["label"],
  };
  return allow[collectionKey] || [];
}

function isoToTimeString(val) {
  if (val === undefined || val === null || val === "") return undefined;

  // Already HH:MM or HH:MM:SS
  if (typeof val === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(val.trim())) {
    const s = val.trim();
    return s.length === 5 ? `${s}:00` : s;
  }

  // ISO string like 2026-02-13T23:15:22.123Z
  if (typeof val === "string" && val.includes("T")) {
    const t = val.split("T")[1] || "";
    const hhmmss = t.replace("Z", "").split(".")[0];
    if (/^\d{2}:\d{2}:\d{2}$/.test(hhmmss)) return hhmmss;
    if (/^\d{2}:\d{2}$/.test(hhmmss)) return `${hhmmss}:00`;
  }

  return undefined;
}

function addHoursToTime(timeStr, hoursToAdd) {
  if (!timeStr) return undefined;
  const parts = timeStr.split(":").map((x) => parseInt(x, 10));
  if (parts.length < 2) return undefined;
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;

  const total = (h * 3600 + m * 60 + s + hoursToAdd * 3600) % (24 * 3600);
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
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

  // Common alternate names
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

      // IMPORTANT: UI uses status=active/inactive
      status: "active",
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

      // IMPORTANT: UI sends date + start_time
      date: "shift_date",
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

  // Special normalization (drivers): status -> active boolean
  if (collectionKey === "drivers" && out.active !== undefined) {
    if (typeof out.active === "string") {
      const s = out.active.trim().toLowerCase();
      if (s === "active") out.active = true;
      else if (s === "inactive") out.active = false;
    }
  }

  // Special normalization (shifts)
  if (collectionKey === "shifts") {
    // Convert ISO -> HH:MM:SS for Supabase "time" columns
    const st = isoToTimeString(out.start_time);
    if (st) out.start_time = st;

    const et = isoToTimeString(out.end_time);
    if (et) out.end_time = et;

    // Your schema has end_time NOT NULL, but UI doesn't send it on "start shift".
    // Default: 12h shift unless PTO
    if (!out.end_time && out.start_time) {
      const t = String(out.shift_type || "").toLowerCase();
      if (t === "pto") out.end_time = out.start_time;
      else out.end_time = addHoursToTime(out.start_time, 12);
    }
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

/** Back-compat: add created_date + status if UI expects it */
export function apiShape(row) {
  if (!row) return row;

  const created_date =
    row.created_date ??
    (row.created_at ? new Date(row.created_at).toISOString() : undefined);

  // IMPORTANT: UI expects drivers.status
  let status;
  if (row.active !== undefined) status = row.active ? "active" : "inactive";

  return { ...row, created_date, ...(status ? { status } : {}) };
}
