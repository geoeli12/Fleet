import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, ChevronLeft, ChevronRight, History, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { addDays, format, subDays } from "date-fns";
import { toast } from "sonner";

import AddPickupForm from "@/components/pickups/AddPickupForm";
import PickupTable from "@/components/pickups/PickupTable";
import StatusSummary from "@/components/StatusSummary";

function parseYMDToLocalDate(ymd) {
  if (!ymd || typeof ymd !== "string" || ymd.length < 10) return new Date();
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
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

function toUiLog(row) {
  const region = (row.region ?? row.state ?? row.location_region ?? "").toString().trim();
  return {
    id: row.id,
    region: region.toUpperCase(),
    created_at: row.created_at ?? null,
    company: row.company ?? row.customer ?? "",
    dk_trl: row.dk_trl ?? row.dk_trl_number ?? row.dk_trl_no ?? row.dk_trl_num ?? "",
    location: row.location ?? row.address ?? "",
    date_called_out: toYMD(row.date_called_out ?? row.called_out_date ?? row.date ?? ""),
    date_picked_up: toYMD(row.date_picked_up ?? row.picked_up_date ?? ""),
    driver: row.driver ?? row.driver_name ?? "",
    shift_code: row.shift_code ?? row.shift ?? row.shiftType ?? "",
    notes: row.notes ?? "",
  };
}

function toDbPayload(ui) {
  const region = (ui.region ?? "").toString().trim().toUpperCase();
  return {
    region,
    company: ui.company || "",
    dk_trl: ui.dk_trl || "",
    location: ui.location || "",
    date_called_out: toYMD(ui.date_called_out) || null,
    date_picked_up: toYMD(ui.date_picked_up) || null,
    driver: ui.driver || "",
    shift_code: ui.shift_code || "",
    notes: ui.notes || "",
  };
}

export default function PickUps() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [region, setRegion] = useState(() => {
    try {
      return localStorage.getItem("pickup_region") || "IL";
    } catch {
      return "IL";
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("pickup_region", region);
    } catch {
      // ignore
    }
  }, [region]);

  const queryClient = useQueryClient();

  const { data: rawRows, isLoading, refetch } = useQuery({
    queryKey: ["pickupOrders"],
    queryFn: async () => {
      try {
        const list = await api.entities.PickupOrder.list("-date_called_out");
        return unwrapListResult(list);
      } catch (e) {
        toast.error(e?.message || "Failed to load pick ups");
        return [];
      }
    },
  });

  const uiLogs = useMemo(() => unwrapListResult(rawRows).map(toUiLog), [rawRows]);

  const createMutation = useMutation({
    mutationFn: async (uiData) => api.entities.PickupOrder.create(toDbPayload(uiData)),
    onSuccess: (created) => {
      queryClient.setQueryData(["pickupOrders"], (old) => {
        const arr = unwrapListResult(old);
        if (!created) return arr;
        const createdId = created.id ?? created?.data?.id;
        const exists = createdId != null && arr.some((x) => (x?.id ?? x?.data?.id) === createdId);
        return exists ? arr : [created, ...arr];
      });
      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });
      toast.success("Pick up added");
    },
    onError: (e) => toast.error(e?.message || "Failed to add pick up"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.entities.PickupOrder.update(id, toDbPayload(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.entities.PickupOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to delete"),
  });

  const statsLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const filtered = base.filter((log) => {
      const called = toYMD(log.date_called_out);
      const picked = toYMD(log.date_picked_up);

      if (!called) return false;

      const hasPuDate = Boolean(picked);
      const startOk = called <= selectedDate;
      const endOk = !hasPuDate || selectedDate <= picked;

      if (!(startOk && endOk)) return false;
      if (region && String(log.region || "").toUpperCase() !== String(region).toUpperCase()) return false;

      return true;
    });

    return filtered
      .slice()
      .sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : NaN;
        const bt = b.created_at ? new Date(b.created_at).getTime() : NaN;
        const aHas = Number.isFinite(at);
        const bHas = Number.isFinite(bt);
        if (aHas && bHas && at !== bt) return at - bt;
        const ai = typeof a.id === "number" ? a.id : Number(String(a.id ?? "").replace(/\D/g, ""));
        const bi = typeof b.id === "number" ? b.id : Number(String(b.id ?? "").replace(/\D/g, ""));
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return 0;
      });
  }, [uiLogs, selectedDate, region]);

  const filteredLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const filtered = base.filter((log) => {
      const called = toYMD(log.date_called_out);
      const picked = toYMD(log.date_picked_up);

      // Rolling window (duplicate, don't "move"):
      // Show a pickup on EVERY day from the called-out day THROUGH the picked-up day (inclusive).
      // If a P/U date is entered in the future (scheduled), it should still appear on earlier days
      // until that P/U day actually arrives. After the P/U day, it should stop appearing.
      //
      // Examples:
      // - Called 2/24, Picked 2/28 -> shows on 2/24, 2/25, 2/26, 2/27, 2/28; not on 3/1+
      // - Called 2/24, no P/U yet   -> shows on 2/24 and every day after until a P/U date is set
      if (!called) return false;

      const hasPuDate = Boolean(picked);
      const startOk = called <= selectedDate;
      const endOk = !hasPuDate || selectedDate <= picked;

      if (!(startOk && endOk)) return false;
      if (region && String(log.region || "").toUpperCase() !== String(region).toUpperCase()) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        log.company?.toLowerCase().includes(search) ||
        log.dk_trl?.toLowerCase().includes(search) ||
        log.location?.toLowerCase().includes(search) ||
        log.driver?.toLowerCase().includes(search) ||
        log.notes?.toLowerCase().includes(search)
      );
    });

    // Keep stable order by created_at/id
    return filtered
      .slice()
      .sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : NaN;
        const bt = b.created_at ? new Date(b.created_at).getTime() : NaN;
        const aHas = Number.isFinite(at);
        const bHas = Number.isFinite(bt);
        if (aHas && bHas && at !== bt) return at - bt;
        const ai = typeof a.id === "number" ? a.id : Number(String(a.id ?? "").replace(/\D/g, ""));
        const bi = typeof b.id === "number" ? b.id : Number(String(b.id ?? "").replace(/\D/g, ""));
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return 0;
      });
  }, [uiLogs, selectedDate, searchTerm, region]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Pick Ups</h1>
                <p className="text-sm text-slate-500">Track trailer doors, call-outs, and pickups</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("PickupHistory")}>
                <Button variant="outline" className="rounded-xl">
                  <History className="h-4 w-4 mr-2" />
                  Pick Up History
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
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const d = subDays(parseYMDToLocalDate(selectedDate), 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
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
              const d = addDays(parseYMDToLocalDate(selectedDate), 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
            }}
            className="rounded-xl h-12 w-12"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={region?.toUpperCase() === "IL" ? "default" : "outline"}
                onClick={() => setRegion("IL")}
                className="rounded-xl h-12 px-4"
              >
                IL
              </Button>
              <Button
                type="button"
                variant={region?.toUpperCase() === "PA" ? "default" : "outline"}
                onClick={() => setRegion("PA")}
                className="rounded-xl h-12 px-4"
              >
                PA
              </Button>
            </div>
            <AddPickupForm
              onAdd={async (row) => {
                const payload = { ...row, date_called_out: row.date_called_out || selectedDate, region };
                return createMutation.mutateAsync(payload);
              }}
              defaultCalledOutDate={selectedDate}
              region={region}
            />
          </div>

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

        <StatusSummary logs={statsLogs} variant="pickups" />

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading pick ups...</p>
          </div>
        ) : (
          <PickupTable
            viewDate={selectedDate}
            logs={filteredLogs}
            onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
            onDelete={(id) => deleteMutation.mutateAsync(id)}
          />
        )}
      </main>
    </div>
  );
}
