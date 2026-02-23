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

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function parseLocalYMD(ymd) {
  // Avoid new Date("YYYY-MM-DD") which parses as UTC and can shift a day in local timezones.
  if (!ymd || typeof ymd !== "string" || ymd.length < 10) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function isPendingBolToken(value) {
  if (!value) return false;
  const s = String(value);
  return s.startsWith("__PENDING_BOL__:");
}

function normalizeUiForSave(ui) {
  // Defensive fix for bulk paste that includes a leading index column (1,2,3...) which shifts everything right.
  // Expected: company, trailer_number, notes, dock_hours, bol, item, delivered_by
  // Common bad paste: [index], company, trailer, notes, dock, bol, item, delivered_by
  const companyRaw = (ui?.company ?? "").toString().trim();
  const trailerRaw = (ui?.trailer_number ?? "").toString().trim();
  const notesRaw = (ui?.notes ?? "").toString().trim();
  const dockRaw = (ui?.dock_hours ?? "").toString().trim();
  const bolRaw = (ui?.bol ?? "").toString().trim();
  const itemRaw = (ui?.item ?? "").toString().trim();
  const delivRaw = (ui?.delivered_by ?? "").toString().trim();

  const companyLooksLikeIndex = /^\d+$/.test(companyRaw) && companyRaw.length <= 6;
  const trailerLooksLikeCompany = trailerRaw.length > 0 && /[A-Za-z]/.test(trailerRaw);
  const notesLooksLikeTrailer = notesRaw.length > 0 && /^[A-Za-z0-9\- ]+$/.test(notesRaw) && /\d/.test(notesRaw);
  const dockLooksLikeNotes = dockRaw.length > 0 && /[A-Za-z]/.test(dockRaw) && !/^\d{3,}$/.test(dockRaw);
  const bolLooksLikeDockHrs = bolRaw.length > 0 && (/\bam\b|\bpm\b/i.test(bolRaw) || bolRaw.includes(":") || bolRaw.toLowerCase().includes("missing") || bolRaw.includes("24/7"));

  // If the first field is an index and the rest look shifted, realign.
  if (companyLooksLikeIndex && trailerLooksLikeCompany && (notesLooksLikeTrailer || dockLooksLikeNotes || bolLooksLikeDockHrs)) {
    return {
      ...ui,
      company: trailerRaw,
      trailer_number: notesRaw,
      notes: dockRaw,
      dock_hours: bolRaw,
      bol: itemRaw,
      item: delivRaw,
      delivered_by: "",
    };
  }

  return ui;
}



function toUiLog(order) {
  return {
    id: order.id,
    date: toYMD(order.date),
    company: order.customer ?? order.company ?? "",
    trailer_number: order.trailer_number ?? "",
    notes: order.notes ?? "",
    dock_hours: order.dock_hours ?? "",
    bol: isPendingBolToken(order.bol_number ?? order.bol ?? "") ? "" : (order.bol_number ?? order.bol ?? ""),
    item: order.item ?? "",
    delivered_by: order.driver_name ?? order.delivered_by ?? "",
  };
}

function toDbPayload(ui) {
  const fixed = normalizeUiForSave(ui || {});
  const dateYmd = fixed.date || null;

  const company = (fixed.company ?? "").toString().trim();
  const trailer_number = (fixed.trailer_number ?? "").toString().trim();
  const notes = (fixed.notes ?? "").toString().trim();
  const dock_hours = (fixed.dock_hours ?? "").toString().trim();

  const bolIn = (fixed.bol ?? "").toString().trim();
  const item = (fixed.item ?? "").toString().trim();
  const driver_name = (fixed.delivered_by ?? "").toString().trim();

  // DB has NOT NULL on bol_number, plus a UNIQUE(day, customer, bol_number) constraint.
  // To allow multiple "no BOL yet" rows, we save a unique pending token, but display it as blank in UI.
  const bol_number = bolIn ? bolIn : `__PENDING_BOL__:${dateYmd || "no-date"}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

  return {
    date: dateYmd,
    customer: company,
    trailer_number,
    notes,
    dock_hours,
    bol_number,
    item,
    driver_name,
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
    return base.filter((log) => {
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
        <StatusSummary logs={filteredLogs.filter((l) => (l.bol || '').toString().trim().length > 0)} />

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const d = parseLocalYMD(selectedDate) || new Date();
              setSelectedDate(format(subDays(d, 1), "yyyy-MM-dd"));
            }}
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
            onClick={() => {
              const d = parseLocalYMD(selectedDate) || new Date();
              setSelectedDate(format(addDays(d, 1), "yyyy-MM-dd"));
            }}
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
