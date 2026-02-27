import React, { useMemo, useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function daysBetween(fromYmd, toYmd) {
  if (!fromYmd) return "";
  const a = new Date(`${fromYmd}T00:00:00`);
  const b = toYmd ? new Date(`${toYmd}T00:00:00`) : new Date();
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  const diff = Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : "";
}

export default function PickupTable({ logs, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

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

  const columns = useMemo(
    () => [
      { key: "company", label: "Company", width: "w-44" },
      { key: "dk_trl", label: "Dk/TRL#", width: "w-32" },
      { key: "location", label: "Location", width: "flex-1" },
      { key: "date_called_out", label: "Date Called out", width: "w-32" },
      { key: "days_open", label: "# of D", width: "w-20" },
      { key: "date_picked_up", label: "Date Picked Up", width: "w-32" },
      { key: "driver", label: "Driver", width: "w-28" },
      { key: "shift_code", label: "S/L/B", width: "w-20" },
      { key: "notes", label: "Notes", width: "w-[340px]" },
    ],
    []
  );

  const getRowStyle = (log) => {
    const days = Number(daysBetween(log.date_called_out, log.date_picked_up));

    // If picked up date exists -> completed (soft green)
    if (log.date_picked_up) return "bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-l-emerald-500";

    // If days open is high -> attention (soft red)
    if (Number.isFinite(days) && days >= 10) return "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500";

    // Otherwise normal
    return "bg-white border-l-4 border-l-slate-200";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
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

      {/* Body */}
      <div className="divide-y divide-slate-100">
        {logs.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400">No pick ups yet. Add your first entry above.</div>
        ) : (
          logs.map((log) => {
            const isEditing = editingId === log.id;
            const days = daysBetween(log.date_called_out, log.date_picked_up);

            return (
              <div
                key={log.id}
                onClick={() => !isEditing && startEdit(log)}
                className={cn(
                  "flex items-center px-4 py-3 gap-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                  getRowStyle(log),
                  isEditing && "cursor-default"
                )}
              >
                {columns.map((col) => {
                  if (col.key === "days_open") {
                    return (
                      <div key={col.key} className={cn(col.width)}>
                        <span className="text-sm font-semibold text-slate-700">{days === "" ? "-" : days}</span>
                      </div>
                    );
                  }

                  const value = log[col.key] ?? "";

                  // These fields must be DATE inputs when editing
                  const isDateField = col.key === "date_called_out" || col.key === "date_picked_up";

                  return (
                    <div key={col.key} className={cn(col.width)}>
                      {isEditing ? (
                        <Input
                          type={isDateField ? "date" : "text"}
                          value={editData[col.key] || ""}
                          onChange={(e) => handleChange(col.key, e.target.value)}
                          className="h-8 text-sm"
                          placeholder={col.label}
                        />
                      ) : (
                        <span className="text-sm text-slate-700">{value ? value : "-"}</span>
                      )}
                    </div>
                  );
                })}

                <div className="w-20 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(log)} className="h-8 w-8">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(log.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
