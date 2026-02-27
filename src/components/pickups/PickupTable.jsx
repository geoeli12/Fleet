import React, { useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function parseLocalYmd(ymd) {
  if (!ymd || typeof ymd !== "string" || ymd.length < 10) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function computeDaysOpen({ date_called_out, date_picked_up }) {
  const called = parseLocalYmd(toYMD(date_called_out));
  if (!called) return "";
  const picked = parseLocalYmd(toYMD(date_picked_up));
  const end = picked || new Date();
  const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = differenceInCalendarDays(endLocal, called);
  return Number.isFinite(diff) ? String(diff) : "";
}

export default function PickupTable({ logs, onUpdate, onDelete, showCalledOutDate = false }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const columns = useMemo(() => {
    const base = [
      { key: "company", label: "Company", width: "w-44" },
      { key: "dk_trl", label: "Dk/TRL#", width: "w-28" },
      { key: "location", label: "Location", width: "flex-1" },
      { key: "date_called_out", label: "Date Called out", width: "w-40" },
      { key: "days_open", label: "# of D", width: "w-20" },
      { key: "date_picked_up", label: "Date Picked U", width: "w-28" },
      { key: "driver", label: "Driver", width: "w-28" },
      { key: "shift_code", label: "", width: "w-14" },
      { key: "notes", label: "Notes", width: "w-[28rem]" },
    ];
    // Optional: if you ever want to show the selected date as a column too
    return showCalledOutDate ? base : base;
  }, [showCalledOutDate]);

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditData({ ...log });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    await onUpdate(editingId, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const getRowStatus = (log) => {
    const picked = String(log?.date_picked_up ?? "").trim();
    return picked ? "picked" : "open";
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "picked":
        return "bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-l-emerald-500";
      default:
        return "bg-white border-l-4 border-l-slate-200";
    }
  };

  const hydratedLogs = useMemo(() => {
    const arr = Array.isArray(logs) ? logs : [];
    return arr.map((l) => ({
      ...l,
      days_open: l?.days_open ?? computeDaysOpen(l),
    }));
  }, [logs]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 text-white">
        <div className="flex items-center px-4 py-3 gap-2">
          {columns.map((col) => (
            <div key={col.key} className={cn("text-xs font-semibold uppercase tracking-wider", col.width)}>
              {col.label}
            </div>
          ))}
          <div className="w-20 text-xs font-semibold uppercase tracking-wider text-center">Actions</div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {hydratedLogs.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400">No pick ups yet. Add your first entry above.</div>
        ) : (
          hydratedLogs.map((log) => {
            const status = getRowStatus(log);
            const isEditing = editingId === log.id;

            return (
              <div
                key={log.id}
                onClick={() => !isEditing && startEdit(log)}
                className={cn(
                  "flex items-center px-4 py-3 gap-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                  getStatusStyles(status),
                  isEditing && "cursor-default"
                )}
              >
                {columns.map((col) => (
                  <div key={col.key} className={cn(col.width)}>
                    {isEditing ? (
                      <Input
                        value={editData[col.key] ?? ""}
                        onChange={(e) => handleChange(col.key, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={col.label || " "}
                      />
                    ) : (
                      <span className="text-sm text-slate-700">
                        {col.key === "date_called_out" || col.key === "date_picked_up" ? (
                          (() => {
                            const ymd = toYMD(log[col.key]);
                            if (!ymd) return "-";
                            // Keep the sheet-like look: MM/dd/yy
                            return format(new Date(`${ymd}T00:00:00`), "MM/dd/yy");
                          })()
                        ) : (
                          (log[col.key] ?? "") || "-"
                        )}
                      </span>
                    )}
                  </div>
                ))}

                <div className="w-20 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                        onClick={saveEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:bg-slate-50"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(log.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-slate-50 px-4 py-3 flex items-center gap-6 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-xs text-slate-600">Picked up</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-300"></div>
          <span className="text-xs text-slate-600">Open</span>
        </div>
      </div>
    </div>
  );
}
