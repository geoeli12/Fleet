import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

/**
 * Calendar page
 * - Click a day to open a detail dialog
 * - Shows Present / Late / Absent / PTO driver lists for that day
 *
 * Data loading strategy (so this works even if your API is not wired yet):
 * 1) Try server endpoints:
 *    - GET /api/drivers               -> [{ id, name, phone?, state? }, ...]
 *    - GET /api/attendance?month=YYYY-MM
 *        -> [{ date:'YYYY-MM-DD', driverId, status:'present|late|absent|pto', ... }, ...]
 * 2) Fallback to localStorage:
 *    - localStorage.drivers          -> array
 *    - localStorage.attendance       -> array
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function weekdayIndexSun0(d) {
  return d.getDay(); // 0=Sun
}

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

async function tryFetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function statusLabel(s) {
  switch (s) {
    case "present":
      return "Present";
    case "late":
      return "Late";
    case "absent":
      return "Absent";
    case "pto":
      return "PTO";
    default:
      return s;
  }
}

function statusDotClass(s) {
  // We intentionally avoid depending on specific tailwind colors in case your theme differs.
  // These are very standard tailwind utility classes though.
  switch (s) {
    case "present":
      return "bg-amber-500/100";
    case "late":
      return "bg-orange-500";
    case "absent":
      return "bg-red-500";
    case "pto":
      return "bg-violet-500";
    default:
      return "bg-slate-400";
  }
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (v === "present" || v === "p") return "present";
  if (v === "late" || v === "l") return "late";
  if (v === "absent" || v === "a") return "absent";
  if (v === "pto") return "pto";
  return v || "present";
}

function makeEmptyDay() {
  return { present: [], late: [], absent: [], pto: [] };
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [drivers, setDrivers] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null); // ISO string YYYY-MM-DD
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load drivers
  useEffect(() => {
    let alive = true;
    (async () => {
      const fromApi = await tryFetchJson("/api/drivers");
      const fromLs = safeJsonParse(localStorage.getItem("drivers"), []);
      const list = Array.isArray(fromApi) ? fromApi : fromLs;
      if (!alive) return;
      setDrivers(Array.isArray(list) ? list : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load attendance for the visible month
  useEffect(() => {
    let alive = true;
    (async () => {
      const mk = monthKey(currentMonth);
      const fromApi = await tryFetchJson(`/api/attendance?month=${encodeURIComponent(mk)}`);
      const fromLs = safeJsonParse(localStorage.getItem("attendance"), []);
      const list = Array.isArray(fromApi) ? fromApi : fromLs;
      if (!alive) return;

      // Keep only the current month in view (helps performance)
      const filtered = (Array.isArray(list) ? list : []).filter((r) => {
        const d = String(r?.date || "");
        return d.startsWith(mk);
      });
      setAttendance(filtered);
    })();
    return () => {
      alive = false;
    };
  }, [currentMonth]);

  const driversById = useMemo(() => {
    const m = new Map();
    for (const d of drivers) {
      const id = d?.id ?? d?._id ?? d?.driverId ?? d?.name; // tolerate different shapes
      if (id != null) m.set(String(id), d);
    }
    return m;
  }, [drivers]);

  const attendanceByDate = useMemo(() => {
    const map = new Map(); // dateKey -> {present,late,absent,pto} arrays of driver objects or strings
    for (const rec of attendance || []) {
      const date = String(rec?.date || "").slice(0, 10);
      if (!date) continue;

      const status = normalizeStatus(rec?.status);
      if (!map.has(date)) map.set(date, makeEmptyDay());
      const day = map.get(date);

      const driverId = rec?.driverId ?? rec?.driver?.id ?? rec?.driver ?? rec?.id;
      const driverObj = driverId != null ? driversById.get(String(driverId)) : null;
      const display =
        driverObj ||
        rec?.driverName ||
        rec?.name ||
        (driverId != null ? String(driverId) : "Unknown");

      if (!day[status]) day[status] = [];
      day[status].push(display);
    }
    return map;
  }, [attendance, driversById]);

  const monthGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // We render a classic calendar: pad with blanks before day 1 and after day N to complete weeks.
    const firstWeekday = weekdayIndexSun0(start);
    const daysInMonth = end.getDate();

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ type: "blank", key: `b-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const key = toISODate(d);
      cells.push({ type: "day", key, day, dateObj: d });
    }
    // pad to multiple of 7
    while (cells.length % 7 !== 0) {
      cells.push({ type: "blank", key: `a-${cells.length}` });
    }
    return cells;
  }, [currentMonth]);

  const selectedSummary = useMemo(() => {
    if (!selectedDate) return null;
    return attendanceByDate.get(selectedDate) || makeEmptyDay();
  }, [selectedDate, attendanceByDate]);

  const monthTitle = useMemo(() => {
    const d = currentMonth;
    const name = d.toLocaleString(undefined, { month: "long" });
    return `${name} ${d.getFullYear()}`;
  }, [currentMonth]);

  function openDay(dateKey) {
    setSelectedDate(dateKey);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-light tracking-tight">
            Attendance <span className="font-semibold">Calendar</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusDotClass("present")}`} />
              Present
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusDotClass("late")}`} />
              Late
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusDotClass("absent")}`} />
              Absent
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusDotClass("pto")}`} />
              PTO
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentMonth((m) => addMonths(m, -1))}>
            ◀
          </Button>
          <div className="min-w-[160px] text-center text-lg font-medium text-white">
            {monthTitle}
          </div>
          <Button variant="outline" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            ▶
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">Month view</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="px-1 text-xs font-semibold text-white/60">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-3">
            {monthGrid.map((cell) => {
              if (cell.type === "blank") {
                return <div key={cell.key} className="h-[110px] rounded-xl border border-transparent" />;
              }

              const dayData = attendanceByDate.get(cell.key);
              const hasAny =
                dayData &&
                (dayData.present.length || dayData.late.length || dayData.absent.length || dayData.pto.length);

              const dotOrder = ["present", "late", "absent", "pto"].filter(
                (s) => dayData && dayData[s] && dayData[s].length > 0
              );

              return (
                <button
                  type="button"
                  key={cell.key}
                  onClick={() => openDay(cell.key)}
                  className={[
                    "h-[110px] rounded-xl border bg-black p-3 text-left transition",
                    "hover:border-slate-300 hover:shadow-sm",
                    hasAny ? "border-slate-200" : "border-white/10",
                  ].join(" ")}
                  title="Click to view day details"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-semibold text-white">{cell.day}</div>
                    {hasAny ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {dotOrder.reduce((sum, s) => sum + (dayData?.[s]?.length || 0), 0)}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {dotOrder.slice(0, 4).map((s) => (
                      <span key={s} className={`h-2.5 w-2.5 rounded-full ${statusDotClass(s)}`} />
                    ))}
                  </div>

                  {hasAny ? (
                    <div className="mt-2 text-xs text-white/60">
                      {dayData.present.length ? `${dayData.present.length} present` : null}
                      {dayData.late.length ? `${dayData.present.length ? " • " : ""}${dayData.late.length} late` : null}
                      {dayData.absent.length ? `${(dayData.present.length || dayData.late.length) ? " • " : ""}${dayData.absent.length} absent` : null}
                      {dayData.pto.length ? `${(dayData.present.length || dayData.late.length || dayData.absent.length) ? " • " : ""}${dayData.pto.length} PTO` : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">No records</div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Day details{" "}
              <span className="ml-2 text-sm font-normal text-white/60">{selectedDate || ""}</span>
            </DialogTitle>
          </DialogHeader>

          {!selectedDate ? (
            <div className="py-6 text-sm text-white/70">Select a day.</div>
          ) : (
            <Tabs defaultValue="present" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="present">Present</TabsTrigger>
                <TabsTrigger value="late">Late</TabsTrigger>
                <TabsTrigger value="absent">Absent</TabsTrigger>
                <TabsTrigger value="pto">PTO</TabsTrigger>
              </TabsList>

              {["present", "late", "absent", "pto"].map((s) => (
                <TabsContent key={s} value={s} className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(s)}`} />
                      <div className="text-sm font-semibold text-white">{statusLabel(s)}</div>
                    </div>
                    <Badge variant="secondary">{(selectedSummary?.[s] || []).length}</Badge>
                  </div>

                  <div className="max-h-[320px] overflow-auto rounded-xl border bg-slate-50 p-3">
                    {(selectedSummary?.[s] || []).length === 0 ? (
                      <div className="py-10 text-center text-sm text-white/60">No drivers</div>
                    ) : (
                      <ul className="space-y-2">
                        {(selectedSummary?.[s] || []).map((d, idx) => {
                          const name = typeof d === "string" ? d : d?.name || d?.fullName || d?.driverName || "Unknown";
                          const phone = typeof d === "string" ? "" : d?.phone || d?.phoneNumber || "";
                          const state = typeof d === "string" ? "" : d?.state || d?.region || "";
                          return (
                            <li
                              key={`${s}-${idx}`}
                              className="flex items-center justify-between rounded-lg bg-black px-3 py-2 shadow-sm"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white">{name}</div>
                                {(phone || state) ? (
                                  <div className="mt-0.5 text-xs text-white/60">
                                    {phone ? phone : null}
                                    {phone && state ? " • " : null}
                                    {state ? state : null}
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
