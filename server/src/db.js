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
  // quick connectivity check
  const { error } = await supabase.from("drivers").select("id").limit(1);
  if (error) {
    console.error("Supabase DB check failed:", error.message);
    throw error;
  }
  console.log("Supabase connected OK");
}

/** Map your existing API collection names -> actual Supabase table names */
export function tableNameFor(collectionKey) {
  const map = {
    drivers: "drivers",
    runs: "runs",
    shifts: "shifts",
    schedules: "schedules",
    customLoadTypes: "custom_load_types", // IMPORTANT
  };
  return map[collectionKey] || collectionKey;
}

/** Normalize payload keys (camelCase -> snake_case) per-table */
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

  // Common
  applyMap({
    createdDate: "created_date",
    createdAt: "created_at",
  });

  // Per table
  const per = {
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
      // data already "data" (json) in your UI; keep as-is
    },
    customLoadTypes: {
      // Supabase table is custom_load_types(label)
      // UI might send label, or loadTypeLabel, etc. We accept a few common ones:
      loadTypeLabel: "label",
      name: "label",
    },
    drivers: {},
  };

  applyMap(per[collectionKey]);

  // Never allow client to force server-managed columns
  delete out.id;
  delete out.created_at;
  delete out.created_date;

  return out;
}

/**
 * Keep compatibility with your old API which returned created_date.
 * Supabase uses created_at; we add created_date = ISO string
 */
export function apiShape(row) {
  if (!row) return row;
  const created_date =
    row.created_date ??
    (row.created_at ? new Date(row.created_at).toISOString() : undefined);

  return { ...row, created_date };
}
