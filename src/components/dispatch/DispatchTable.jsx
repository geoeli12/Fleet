import React, { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function DispatchTable({ logs, onUpdate, onDelete, showDate = false }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const getRowStatus = (log) => {
    const deliveredVal = String(log.delivered_by ?? "").trim().toLowerCase();

    if (deliveredVal === "no") return 'not_delivered';
    if (deliveredVal) return 'dispatched';
    if (log.trailer_number && String(log.trailer_number).trim()) return 'loaded';
    return 'pending';
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'dispatched':
        return 'bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500';
      case 'not_delivered':
        // Light blue fill when Delivered = No
        return 'bg-gradient-to-r from-sky-50 to-sky-100 border-l-4 border-l-sky-500';
      case 'loaded':
        return 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-l-emerald-500';
      default:
        return 'bg-white border-l-4 border-l-slate-200';
    }
  };

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
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const baseColumns = [
    { key: 'company', label: 'Company', width: 'w-40' },
    { key: 'trailer_number', label: 'Trailer #', width: 'w-28' },
    { key: 'notes', label: 'Notes', width: 'flex-1' },
    { key: 'dock_hours', label: 'Dock Hrs', width: 'w-28' },
    { key: 'bol', label: 'BOL', width: 'w-28' },
    { key: 'item', label: 'Item', width: 'w-24' },
    { key: 'delivered_by', label: 'Delivered', width: 'w-28' },
  ];

  const columns = showDate
    ? [{ key: 'date', label: 'Date', width: 'w-28' }, ...baseColumns]
    : baseColumns;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white">
        <div className="flex items-center px-4 py-3 gap-2">
          {columns.map(col => (
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
          <div className="px-4 py-12 text-center text-slate-400">
            No dispatch logs yet. Add your first entry above.
          </div>
        ) : (
          logs.map((log) => {
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
                {columns.map(col => (
                  <div key={col.key} className={cn(col.width)}>
                    {isEditing ? (
                      <Input
                        value={editData[col.key] || ''}
                        onChange={(e) => handleChange(col.key, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={col.label}
                      />
                    ) : (
                      <span className="text-sm text-slate-700">
                        {col.key === 'date' ? (log.date ? format(new Date(log.date), 'MM/dd/yyyy') : '-') : (log[col.key] || '-')}
                      </span>
                    )}
                  </div>
                ))}
                <div className="w-20 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-50" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(log.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="bg-slate-50 px-4 py-3 flex items-center gap-6 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-xs text-slate-600">Loaded & Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-slate-600">Dispatched</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500"></div>
          <span className="text-xs text-slate-600">Not Delivered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-300"></div>
          <span className="text-xs text-slate-600">Pending</span>
        </div>
      </div>
    </div>
  );
}