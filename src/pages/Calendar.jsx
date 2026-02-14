import React, { useMemo, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/apiClient";

/**
 * Calendar page
 * - Click a day to open a detail dialog
 * - Shows Present / Late / Absent / PTO driver lists for that day
 *
 * FIX:
 * The previous Calendar implementation was a stub that looked for
 *   /api/attendance and/or localStorage.attendance.
 * Your app actually records attendance via the Shift entity (see ShiftHistory).
 * So the calendar always said "No records".
 *
 * This version computes attendance directly from completed Shift records.
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

// (legacy helpers removed)

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

  const [selectedDate, setSelectedDate] = useState(null); // ISO string YYYY-MM-DD
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.entities.Driver.filter({ status: "active" }, "name"),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["allShifts"],
    queryFn: () => api.entities.Shift.list("-created_date"),
  });

  const driverNames = useMemo(
    () => (Array.isArray(drivers) ? drivers.map((d) => d?.name).filter(Boolean) : []),
    [drivers]
  );

  function getShiftDateStr(s) {
    const v = s?.shift_date || s?.date || s?.shiftDate || s?.shift_dt;
    if (!v) return "";
    return String(v).slice(0, 10);
  }

  function getShiftDates(s) {
    const isPto = !!(s?.is_pto || s?.shift_type === "pto" || s?.attendance_status === "pto");
    const ptoDates = Array.isArray(s?.pto_dates) ? s.pto_dates : [];
    if (isPto && ptoDates.length) return ptoDates.map((d) => String(d).slice(0, 10)).filter(Boolean);
    const one = getShiftDateStr(s);
    return one ? [one] : [];
  }

  const attendanceByDate = useMemo(() => {
    const mk = monthKey(currentMonth);
    const completed = (Array.isArray(shifts) ? shifts : []).filter((s) => s?.status === "completed");

    const tmp = new Map();
    const haveByDate = new Map(); // date -> Set(driverName)

    for (const s of completed) {
      const dates = getShiftDates(s);
      if (!dates.length) continue;

      const driver = s?.driver_name || s?.driver || s?.name;
      if (!driver) continue;

      const isPto = !!(s?.is_pto || s?.shift_type === "pto" || s?.attendance_status === "pto");
      const status = isPto ? "pto" : normalizeStatus(s?.attendance_status || "present");

      for (const date of dates) {
        if (!date.startsWith(mk)) continue;
        if (!tmp.has(date)) tmp.set(date, makeEmptyDay());
        if (!haveByDate.has(date)) haveByDate.set(date, new Set());

        haveByDate.get(date).add(String(driver));
        tmp.get(date)[status].push(String(driver));
      }
    }

    // Add absent drivers for dates that have at least one record (same strategy as ShiftHistory)
    for (const [date, day] of tmp.entries()) {
      const have = haveByDate.get(date) || new Set();
      const absentDrivers = driverNames.filter((n) => !have.has(n));
      day.absent.push(...absentDrivers);
    }

    return tmp;
  }, [shifts, driverNames, currentMonth]);

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
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
          <div className="min-w-[160px] text-center text-lg font-medium text-foreground">
            {monthTitle}
          </div>
          <Button variant="outline" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            ▶
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Month view</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="px-1 text-xs font-semibold text-muted-foreground">
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
                    hasAny ? "border-slate-200" : "border-black/10",
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
              <span className="ml-2 text-sm font-normal text-muted-foreground">{selectedDate || ""}</span>
            </DialogTitle>
          </DialogHeader>

          {!selectedDate ? (
            <div className="py-6 text-sm text-muted-foreground">Select a day.</div>
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
                      <div className="text-sm font-semibold text-foreground">{statusLabel(s)}</div>
                    </div>
                    <Badge variant="secondary">{(selectedSummary?.[s] || []).length}</Badge>
                  </div>

                  <div className="max-h-[320px] overflow-auto rounded-xl border bg-background p-3">
                    {(selectedSummary?.[s] || []).length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">No drivers</div>
                    ) : (
                      <ul className="space-y-2">
                        {(selectedSummary?.[s] || []).map((d, idx) => {
                          const name = typeof d === "string" ? d : d?.name || d?.fullName || d?.driverName || "Unknown";
                          const phone = typeof d === "string" ? "" : d?.phone || d?.phoneNumber || "";
                          const state = typeof d === "string" ? "" : d?.state || d?.region || "";
                          return (
                            <li
                              key={`${s}-${idx}`}
                              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 shadow-sm"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{name}</div>
                                {(phone || state) ? (
                                  <div className="mt-0.5 text-xs text-muted-foreground">
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
