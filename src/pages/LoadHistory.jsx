import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, RefreshCw, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DispatchTable from "@/components/dispatch/DispatchTable";

export default function LoadHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["dispatch-orders"],
    queryFn: () => api.entities.DispatchOrder.list("-created_at"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.DispatchOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatch-orders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.DispatchOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatch-orders"] }),
  });

  const filteredLogs = useMemo(() => {
    const arr = Array.isArray(logs) ? logs : [];
    if (!searchTerm) return arr;

    const search = searchTerm.toLowerCase();
    return arr.filter((log) => {
      return (
        toText(log.customer).toLowerCase().includes(search) ||
        toText(log.city).toLowerCase().includes(search) ||
        toText(log.trailer_number).toLowerCase().includes(search) ||
        toText(log.bol_number).toLowerCase().includes(search) ||
        toText(log.driver_name).toLowerCase().includes(search) ||
        toText(log.notes).toLowerCase().includes(search) ||
        toText(log.date).includes(search)
      );
    });
  }, [logs, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Load History</h1>
                <p className="text-sm text-slate-500">All dispatch records</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("DispatchLog")}>
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Today
                </Button>
              </Link>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Search */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div className="text-slate-600">
            <span className="font-semibold text-2xl">{filteredLogs.length}</span> total entries
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search all history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading history...</p>
          </div>
        ) : (
          <DispatchTable
            logs={filteredLogs}
            onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
            onDelete={deleteMutation.mutateAsync}
          />
        )}
      </main>
    </div>
  );
}

function toText(v) {
  return v === null || v === undefined ? "" : String(v);
}
