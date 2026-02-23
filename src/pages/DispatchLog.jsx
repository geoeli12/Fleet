import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, RefreshCw, Search, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, addDays, subDays } from "date-fns";
import DispatchTable from "@/components/dispatch/DispatchTable";
import AddDispatchForm from "@/components/dispatch/AddDispatchForm";
import StatusSummary from "@/components/dispatch/StatusSummary";
import { toast } from "sonner";

function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  // Accept ISO timestamps and YYYY-MM-DD
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  // Fallback: Date parse
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function ymdToLocalDate(ymd) {
  // JS Date parsing treats YYYY-MM-DD as UTC, which can break day navigation in negative timezones.
  // Build a local midnight date instead.
  if (!ymd) return new Date();
  const s = String(ymd).slice(0, 10);
  const parts = s.split("-");
  if (parts.length !== 3) return new Date(ymd);
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return new Date(ymd);
  return new Date(y, m - 1, d);
}

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function toUiLog(order) {
  return {
    id: order.id,
    date: toYMD(order.date),
    company: order.customer ?? order.company ?? "",
    trailer_number: order.trailer_number ?? "",
    notes: order.notes ?? "",
    dock_hours: order.dock_hours ?? "",
    bol: order.bol_number ?? order.bol ?? "",
    item: order.item ?? "",
    delivered_by: order.driver_name ?? order.delivered_by ?? "",
    _created_at: order.created_at ?? order.createdAt ?? order.inserted_at ?? order.insertedAt ?? null,
  };
}

function toDbPayload(ui) {
  return {
    date: ui.date || null,
    customer: ui.company || "",
    trailer_number: ui.trailer_number || "",
    notes: ui.notes || "",
    dock_hours: ui.dock_hours || "",
    bol_number: ui.bol || "",
    item: ui.item || "",
    driver_name: ui.delivered_by || "",
  };
}

export default function DispatchLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const {
    data: rawOrders,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      try {
        const list = await api.entities.DispatchOrder.list("-date");
        return unwrapListResult(list);
      } catch (e) {
        toast.error(e?.message || "Failed to load dispatch orders");
        return [];
      }
    },
  });

  const uiLogs = useMemo(() => unwrapListResult(rawOrders).map(toUiLog), [rawOrders]);

  const createMutation = useMutation({
    mutationFn: async (uiData) => api.entities.DispatchOrder.create(toDbPayload(uiData)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to add entry"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.entities.DispatchOrder.update(id, toDbPayload(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.entities.DispatchOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to delete entry"),
  });

  const filteredLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const matches = base.filter((log) => {
      if (toYMD(log.date) !== selectedDate) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        log.company?.toLowerCase().includes(search) ||
        log.trailer_number?.toLowerCase().includes(search) ||
        log.bol?.toLowerCase().includes(search) ||
        log.delivered_by?.toLowerCase().includes(search) ||
        log.notes?.toLowerCase().includes(search) ||
        log.item?.toLowerCase().includes(search)
      );
    });

    // Keep rows stable:
    // - Bulk paste should stay in the pasted order
    // - Editing should not reshuffle the row
    // Prefer created_at (insertion order). Fall back to numeric id if available.
    const toSortableTime = (v) => {
      if (!v) return null;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : null;
    };

    return matches
      .slice()
      .sort((a, b) => {
        const ta = toSortableTime(a._created_at);
        const tb = toSortableTime(b._created_at);
        if (ta != null && tb != null && ta !== tb) return ta - tb;
        if (ta != null && tb == null) return -1;
        if (ta == null && tb != null) return 1;

        const ia = typeof a.id === "number" ? a.id : Number(a.id);
        const ib = typeof b.id === "number" ? b.id : Number(b.id);
        const na = Number.isFinite(ia);
        const nb = Number.isFinite(ib);
        if (na && nb && ia !== ib) return ia - ib;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [uiLogs, selectedDate, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Dispatch Log</h1>
                <p className="text-sm text-slate-500">Track loads and deliveries</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("LoadHistory")}>
                <Button variant="outline" className="rounded-xl">
                  <History className="h-4 w-4 mr-2" />
                  Load History
                </Button>
              </Link>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <StatusSummary logs={filteredLogs} />

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(format(subDays(ymdToLocalDate(selectedDate), 1), "yyyy-MM-dd"))}
            className="rounded-xl h-12 w-12"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 p-0 h-8 text-lg font-semibold text-center w-40"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(format(addDays(ymdToLocalDate(selectedDate), 1), "yyyy-MM-dd"))}
            className="rounded-xl h-12 w-12"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <AddDispatchForm onAdd={createMutation.mutateAsync} defaultDate={selectedDate} />
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading dispatch logs...</p>
          </div>
        ) : (
          <DispatchTable
            logs={filteredLogs}
            onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
            onDelete={(id) => deleteMutation.mutateAsync(id)}
          />
        )}
      </main>
    </div>
  );
}
