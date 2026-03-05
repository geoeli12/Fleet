import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function toYmd(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function safeYmd(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toNullableInt(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
}

const numericKeys = [
  "pallet_1_6",
  "pallet_1_reg",
  "pallet_2_prem",
  "pallet_2_reg",
  "pallet_2x4",
  "customs_count",
];

const emptyForm = {
  date: "",
  customer: "",
  ht: "",
  pallet_1_6: "",
  pallet_1_reg: "",
  pallet_2_prem: "",
  pallet_2_reg: "",
  pallet_2x4: "",
  customs_count: "",
  bol_number: "",
  po_number: "",
  type: "",
  notes: "",
};

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/10 px-4 py-3 shadow-sm">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function DailyOrders() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  const ymd = useMemo(() => toYmd(selectedDate), [selectedDate]);

  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ["dailyOrders", ymd],
    queryFn: async () => {
      try {
        const res = await api.entities.DailyOrder.filter({ date: ymd }, "created_at");
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
    enabled: Boolean(ymd),
  });

  const orders = useMemo(() => unwrapListResult(rawOrders), [rawOrders]);

  const summary = useMemo(() => {
    const s = {
      count: orders.length,
      pallet_1_6: 0,
      pallet_1_reg: 0,
      pallet_2_prem: 0,
      pallet_2_reg: 0,
      pallet_2x4: 0,
      customs_count: 0,
    };

    for (const o of orders) {
      for (const k of numericKeys) {
        const n = Number(o?.[k] ?? 0);
        if (!Number.isNaN(n)) s[k] += n;
      }
    }
    return s;
  }, [orders]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState("add"); // add | edit
  const [activeOrder, setActiveOrder] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Customer suggestion (same behavior as Invoice)
  const [customerFocused, setCustomerFocused] = useState(false);
  const ignoreCustomerBlurRef = useRef(false);

  const { data: rawCustomers } = useQuery({
    queryKey: ["customersIL"],
    queryFn: async () => {
      try {
        const res = await api.entities.CustomerIL.list("customer");
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const customers = useMemo(() => unwrapListResult(rawCustomers), [rawCustomers]);

  const customerMatches = useMemo(() => {
    const q = (form.customer || "").trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => String(c?.customer || "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [form.customer, customers]);

  const onPickCustomer = (cust) => {
    const name = String(cust?.customer || "");
    setForm((p) => ({ ...p, customer: name }));
    setCustomerFocused(false);
  };

  const dayName = useMemo(() => {
    try {
      return format(selectedDate, "EEEE");
    } catch {
      return "";
    }
  }, [selectedDate]);

  const openAdd = () => {
    setMode("add");
    setActiveOrder(null);
    setForm({ ...emptyForm, date: ymd });
    setDialogOpen(true);
  };

  const openEdit = (order) => {
    setMode("edit");
    setActiveOrder(order);
    const next = { ...emptyForm };
    next.date = safeYmd(order?.date) || ymd;
    next.customer = order?.customer ?? "";
    next.ht = order?.ht ?? "";
    next.bol_number = order?.bol_number ?? "";
    next.po_number = order?.po_number ?? "";
    next.type = order?.type ?? "";
    next.notes = order?.notes ?? "";
    for (const k of numericKeys) {
      const v = order?.[k];
      next[k] = v === null || v === undefined ? "" : String(v);
    }
    setForm(next);
    setDialogOpen(true);
  };

  useEffect(() => {
    // If the user changes the date while dialog is open in "add" mode,
    // keep the form date synced.
    if (!dialogOpen) return;
    if (mode !== "add") return;
    setForm((p) => ({ ...p, date: ymd }));
  }, [ymd, dialogOpen, mode]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const buildPayload = () => {
    const payload = {
      date: safeYmd(form.date) || ymd,
      customer: String(form.customer ?? "").trim() || null,
      ht: String(form.ht ?? "").trim() || null,
      bol_number: String(form.bol_number ?? "").trim() || null,
      po_number: String(form.po_number ?? "").trim() || null,
      type: String(form.type ?? "").trim() || null,
      notes: String(form.notes ?? "").trim() || null,
    };

    for (const k of numericKeys) payload[k] = toNullableInt(form[k]);
    return payload;
  };

  const save = async () => {
    try {
      const payload = buildPayload();
      if (mode === "add") {
        await api.entities.DailyOrder.create(payload);
      } else {
        if (!activeOrder?.id) return;
        await api.entities.DailyOrder.update(activeOrder.id, payload);
      }

      await qc.invalidateQueries({ queryKey: ["dailyOrders", ymd] });
      setDialogOpen(false);
      setActiveOrder(null);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not save order. ${e?.message ? String(e.message) : ""}`);
    }
  };

  const deleteOrder = async (order) => {
    if (!order?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete this order for "${order.customer || "Unknown"}"?`);
    if (!ok) return;

    try {
      await api.entities.DailyOrder.delete(order.id);
      await qc.invalidateQueries({ queryKey: ["dailyOrders", ymd] });
      if (activeOrder?.id === order.id) {
        setDialogOpen(false);
        setActiveOrder(null);
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not delete order. ${e?.message ? String(e.message) : ""}`);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="w-full px-6 py-6 space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  {dayName}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => setSelectedDate((d) => subDays(d, 1))}
                    aria-label="Previous day"
                    title="Previous day"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/10 px-3 py-2 shadow-sm">
                    <Input
                      type="date"
                      value={ymd}
                      onChange={(e) => {
                        const v = safeYmd(e.target.value);
                        if (!v) return;
                        const [yy, mm, dd] = v.split("-").map((x) => Number(x));
                        if (!yy || !mm || !dd) return;
                        setSelectedDate(new Date(yy, mm - 1, dd));
                      }}
                      className="h-9 w-[160px] rounded-xl"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => setSelectedDate((d) => addDays(d, 1))}
                    aria-label="Next day"
                    title="Next day"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={openAdd} className="rounded-2xl">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <Stat label="Orders" value={summary.count} />
              <Stat label="#1.6" value={summary.pallet_1_6} />
              <Stat label="#1 Reg" value={summary.pallet_1_reg} />
              <Stat label="#2 Prem" value={summary.pallet_2_prem} />
              <Stat label="#2 Reg" value={summary.pallet_2_reg} />
              <Stat label="2x4" value={summary.pallet_2x4} />
              <Stat label="Customs" value={summary.customs_count} />
            </div>

            <div className="rounded-3xl ring-1 ring-black/10 bg-white overflow-x-auto">
              <Table className="table-auto min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Customer</TableHead>
                    <TableHead className="whitespace-nowrap">HT</TableHead>
                    <TableHead className="whitespace-nowrap">#1.6</TableHead>
                    <TableHead className="whitespace-nowrap">#1 Reg</TableHead>
                    <TableHead className="whitespace-nowrap">#2 Prem</TableHead>
                    <TableHead className="whitespace-nowrap">#2 Reg</TableHead>
                    <TableHead className="whitespace-nowrap">2x4</TableHead>
                    <TableHead className="whitespace-nowrap">Customs Count</TableHead>
                    <TableHead className="whitespace-nowrap">BOL #</TableHead>
                    <TableHead className="whitespace-nowrap">PO #</TableHead>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead className="min-w-[260px]">Notes</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-10 text-slate-600">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-10 text-slate-600">
                        No orders for this day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-amber-50/70"
                        onClick={() => openEdit(o)}
                        title="Click to edit"
                      >
                        <TableCell className="font-medium whitespace-nowrap">{o.customer || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.ht || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_1_6 ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_1_reg ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_2_prem ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_2_reg ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_2x4 ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.customs_count ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.bol_number || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.po_number || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.type || ""}</TableCell>
                        <TableCell className="whitespace-normal break-words">{o.notes || ""}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openEdit(o)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => deleteOrder(o)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[85vh] overflow-hidden rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {mode === "add" ? "New Daily Order" : "Edit Daily Order"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={safeYmd(form.date)}
                  onChange={(e) => setField("date", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              {/* Customer with suggestion dropdown */}
              <div className="space-y-2 relative">
                <Label>Customer</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setField("customer", e.target.value)}
                  onFocus={() => setCustomerFocused(true)}
                  onBlur={() => {
                    if (ignoreCustomerBlurRef.current) {
                      ignoreCustomerBlurRef.current = false;
                      return;
                    }
                    setCustomerFocused(false);
                  }}
                  placeholder="Uline - 16"
                  className="rounded-2xl"
                />

                {customerFocused && customerMatches.length > 0 && (
                  <div
                    className="absolute z-30 mt-1 left-0 right-0 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden"
                    onMouseDown={() => {
                      ignoreCustomerBlurRef.current = true;
                    }}
                    onMouseUp={() => {
                      ignoreCustomerBlurRef.current = false;
                    }}
                  >
                    {customerMatches.map((c) => (
                      <button
                        type="button"
                        key={c.id ?? c.customer}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                        onClick={() => onPickCustomer(c)}
                      >
                        {c.customer}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>HT</Label>
                <Input
                  value={form.ht}
                  onChange={(e) => setField("ht", e.target.value)}
                  placeholder="Heat Treated"
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                  placeholder="96x48"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>#1.6</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_1_6}
                  onChange={(e) => setField("pallet_1_6", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>#1 Reg</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_1_reg}
                  onChange={(e) => setField("pallet_1_reg", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>#2 Prem</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_2_prem}
                  onChange={(e) => setField("pallet_2_prem", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>#2 Reg</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_2_reg}
                  onChange={(e) => setField("pallet_2_reg", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>2x4</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_2x4}
                  onChange={(e) => setField("pallet_2x4", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Customs Count</Label>
                <Input
                  inputMode="numeric"
                  value={form.customs_count}
                  onChange={(e) => setField("customs_count", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>BOL #</Label>
                <Input
                  value={form.bol_number}
                  onChange={(e) => setField("bol_number", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>PO #</Label>
                <Input
                  value={form.po_number}
                  onChange={(e) => setField("po_number", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Optional"
                  className="min-h-[110px] rounded-2xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {mode === "edit" ? (
              <Button
                variant="destructive"
                className="rounded-2xl mr-auto"
                onClick={() => deleteOrder(activeOrder)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : null}

            <Button variant="outline" className="rounded-2xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
