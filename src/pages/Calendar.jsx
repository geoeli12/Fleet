import React, { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import { api } from "@/api/apiClient";

import AttendanceCalendar from "@/components/calendar/AttendanceCalendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function normalizeStatus(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "pto") return "pto";
  if (s === "absent" || s === "a") return "absent";
  if (s === "late" || s === "l") return "late";
  if (s === "present" || s === "p" || !s) return "present";
  return s;
}

function pickHigherPriority(existing, next) {
  // Highest -> lowest: pto, absent, late, present
  const rank = { pto: 4, absent: 3, late: 2, present: 1 };
  const a = rank[existing] || 0;
  const b = rank[next] || 0;
  return b >= a ? next : existing;
}

function safeISODate(value) {
  if (!value) return "";
  // value may be YYYY-MM-DD, or date-time
  const s = String(value);
  const iso = s.slice(0, 10);
  // quick sanity check
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const d = new Date(s);
  if (isValid(d)) return format(d, "yyyy-MM-dd");
  return "";
}

export default function Calendar() {
  const [selectedDay, setSelectedDay] = useState(null); // Date
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayRecords, setDayRecords] = useState([]);

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.entities.Driver.filter({ status: "active" }, "name"),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["allShifts"],
    queryFn: () => api.entities.Shift.list("-created_date"),
  });

  const employees = useMemo(() => {
    const list = Array.isArray(drivers) ? drivers : [];
    return list
      .filter((d) => d && d.name)
      .map((d) => ({
        id: String(d.id ?? d.employee_id ?? d.name),
        name: String(d.name),
        department: d.state ? String(d.state) : "", // DayDetailModal compatibility if used later
      }));
  }, [drivers]);

  const attendance = useMemo(() => {
    const completed = (Array.isArray(shifts) ? shifts : []).filter(
      (s) => (s?.status || "").toLowerCase() === "completed"
    );

    // date -> driverKey -> { status, record }
    const byDate = new Map();

    for (const s of completed) {
      const driverName = String(s?.driver_name || s?.driver || s?.name || "").trim();
      if (!driverName) continue;

      const isPto = !!(s?.is_pto || String(s?.shift_type || "").toLowerCase() === "pto");
      const status = isPto ? "pto" : normalizeStatus(s?.attendance_status || "present");

      const dates = Array.isArray(s?.pto_dates) && s.pto_dates.length
        ? s.pto_dates.map((d) => safeISODate(d)).filter(Boolean)
        : [safeISODate(s?.date || s?.shift_date || s?.shiftDate || s?.shift_dt)];

      for (const dateStr of dates) {
        if (!dateStr) continue;
        if (!byDate.has(dateStr)) byDate.set(dateStr, new Map());
        const m = byDate.get(dateStr);

        // Prefer matching to a Driver id if possible, but fall back to name
        const matched = employees.find((e) => e.name === driverName);
        const employeeKey = matched ? matched.id : driverName;

        const existing = m.get(employeeKey);
        const nextStatus = existing ? pickHigherPriority(existing.status, status) : status;

        m.set(employeeKey, {
          status: nextStatus,
          employee_name: matched ? matched.name : driverName,
        });
      }
    }

    // For each date that has at least one record, mark everyone else absent
    const results = [];
    for (const [dateStr, m] of byDate.entries()) {
      const presentKeys = new Set([...m.keys()]);

      for (const e of employees) {
        if (!presentKeys.has(e.id)) {
          m.set(e.id, { status: "absent", employee_name: e.name });
        }
      }

      for (const [employeeKey, info] of m.entries()) {
        results.push({
          id: `${dateStr}::${employeeKey}`,
          date: dateStr,
          status: info.status,
          employee_name: info.employee_name,
        });
      }
    }

    return results;
  }, [shifts, employees]);

  const handleDayClick = useCallback(
    (day, dayData) => {
      setSelectedDay(day);
      setDayRecords(dayData?.records || []);
      setDayModalOpen(true);
    },
    []
  );

  const selectedSummary = useMemo(() => {
    if (!selectedDay) return { present: [], late: [], absent: [], pto: [] };
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    const records = attendance.filter((r) => r.date === dateStr);
    return {
      present: records.filter((r) => r.status === "present"),
      late: records.filter((r) => r.status === "late"),
      absent: records.filter((r) => r.status === "absent"),
      pto: records.filter((r) => r.status === "pto"),
    };
  }, [selectedDay, attendance]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AttendanceCalendar
          attendance={attendance}
          employees={employees}
          onDayClick={handleDayClick}
        />

        {/* Simple day detail dialog (keeps your app independent of Base44-only edit flows) */}
        <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {selectedDay ? format(selectedDay, "EEEE, MMMM d, yyyy") : ""}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="present" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="present">Present</TabsTrigger>
                <TabsTrigger value="late">Late</TabsTrigger>
                <TabsTrigger value="absent">Absent</TabsTrigger>
                <TabsTrigger value="pto">PTO</TabsTrigger>
              </TabsList>

              {(
                [
                  ["present", selectedSummary.present],
                  ["late", selectedSummary.late],
                  ["absent", selectedSummary.absent],
                  ["pto", selectedSummary.pto],
                ]
              ).map(([key, list]) => (
                <TabsContent key={key} value={key} className="mt-4">
                  {list.length ? (
                    <ul className="space-y-2">
                      {list
                        .slice()
                        .sort((a, b) => String(a.employee_name).localeCompare(String(b.employee_name)))
                        .map((r) => (
                          <li
                            key={r.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                          >
                            {r.employee_name}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-500">No records</div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
