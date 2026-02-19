import React, { useMemo, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Truck, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

function parseMaybeDateFromText(text) {
  if (!text) return null;

  // YYYY-MM-DD
  let m = text.match(/\b(20\d{2})[-_\.](0[1-9]|1[0-2])[-_\.](0[1-9]|[12]\d|3[01])\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // M-D-YY / MM-DD-YY
  m = text.match(/\b(0?[1-9]|1[0-2])[-_\.](0?[1-9]|[12]\d|3[01])[-_\.](\d{2})\b/);
  if (m) {
    const mm = String(m[1]).padStart(2, "0");
    const dd = String(m[2]).padStart(2, "0");
    const yy = Number(m[3]);
    const yyyy = yy >= 70 ? 1900 + yy : 2000 + yy;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function parseBolFromText(text) {
  if (!text) return "";
  // Try common patterns: BOL12345, BOL-12345, 1234567
  const m1 = text.match(/\bBOL\s*[-_#:]?\s*(\d{4,})\b/i);
  if (m1) return m1[1];

  const m2 = text.match(/\b(\d{5,})\b/);
  if (m2) return m2[1];

  return "";
}

function cleanCustomerFromFilename(name) {
  if (!name) return "";
  const base = name.replace(/\.[^.]+$/, ""); // remove extension
  // Remove obvious date and bol number chunks
  const withoutDate = base
    .replace(/\b20\d{2}[-_\.](0[1-9]|1[0-2])[-_\.](0[1-9]|[12]\d|3[01])\b/g, " ")
    .replace(/\b(0?[1-9]|1[0-2])[-_\.](0?[1-9]|[12]\d|3[01])[-_\.](\d{2})\b/g, " ");

  const withoutBol = withoutDate
    .replace(/\bBOL\s*[-_#:]?\s*\d{4,}\b/gi, " ")
    .replace(/\b\d{5,}\b/g, " ");

  return withoutBol
    .replace(/[_\.\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function orderCardTone(order) {
  const trl = (order.trailer_number || "").trim();
  const drv = (order.driver_name || "").trim();

  if (!trl && !drv) {
    return {
      card: "bg-gradient-to-br from-zinc-50 to-zinc-100/60 border-zinc-200/70",
      badge: "bg-zinc-100 text-zinc-700",
      label: "Unassigned",
    };
  }

  if (trl && !drv) {
    return {
      card: "bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-200/70",
      badge: "bg-emerald-100 text-emerald-800",
      label: "Trailer set",
    };
  }

  return {
    card: "bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200/70",
    badge: "bg-rose-100 text-rose-800",
    label: "Driver assigned",
  };
}

export default function DispatchLog() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null); // order object or null

  const [form, setForm] = useState({
    date: today,
    customer: "",
    city: "",
    bol_number: "",
    notes: "",
    dock_hours: "",
    trailer_number: "",
    driver_name: "",
  });

  const [importRows, setImportRows] = useState([]);

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      try {
        const list = await api.entities.Driver.list("name");
        return (list || []).filter((d) => d.active);
      } catch (e) {
        return [];
      }
    },
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      try {
        const list = await api.entities.DispatchOrder.list("-date");
        return list || [];
      } catch (e) {
        // Table may not exist yet in Supabase.
        // Keep the page usable; show a toast once.
        const msg = e?.message || "Failed to load dispatch orders";
        toast.error(msg);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.entities.DispatchOrder.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
      toast.success("Order added");
    },
    onError: (e) => toast.error(e?.message || "Failed to add order"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.entities.DispatchOrder.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
      toast.success("Order updated");
    },
    onError: (e) => toast.error(e?.message || "Failed to update order"),
  });

  const grouped = useMemo(() => {
    const map = new Map();

    const sorted = [...(orders || [])].sort((a, b) => {
      const da = (a.date || "").toString();
      const db = (b.date || "").toString();
      if (da !== db) return db.localeCompare(da);
      // fallback stable order
      return String(b.id || "").localeCompare(String(a.id || ""));
    });

    for (const o of sorted) {
      const d = o.date || "";
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(o);
    }

    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [orders]);

  function openAdd() {
    setEditing(null);
    setForm({
      date: today,
      customer: "",
      city: "",
      bol_number: "",
      notes: "",
      dock_hours: "",
      trailer_number: "",
      driver_name: "",
    });
    setDialogOpen(true);
  }

  function openEdit(order) {
    setEditing(order);
    setForm({
      date: order.date || today,
      customer: order.customer || "",
      city: order.city || "",
      bol_number: order.bol_number || "",
      notes: order.notes || "",
      dock_hours: order.dock_hours || "",
      trailer_number: order.trailer_number || "",
      driver_name: order.driver_name || "",
    });
    setDialogOpen(true);
  }

  async function saveOrder() {
    if (!form.date || !form.customer || !form.bol_number) {
      toast.error("Please enter Date, Customer, and BOL #");
      return;
    }

    const payload = {
      date: form.date,
      customer: form.customer.trim(),
      city: (form.city || "").trim(),
      bol_number: (form.bol_number || "").trim(),
      notes: (form.notes || "").trim(),
      dock_hours: (form.dock_hours || "").trim(),
      trailer_number: (form.trailer_number || "").trim(),
      driver_name: (form.driver_name || "").trim(),
    };

    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    setDialogOpen(false);
  }

  function onPickImportFiles() {
    if (fileInputRef.current) fileInputRef.current.click();
  }

  function onImportFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const rows = files.map((f) => {
      const name = f.name || "";
      const date = parseMaybeDateFromText(name) || today;
      const bol = parseBolFromText(name);
      const customer = cleanCustomerFromFilename(name);

      return {
        _file: name,
        date,
        customer: customer || "",
        city: "",
        bol_number: bol || "",
        notes: "",
        dock_hours: "",
        trailer_number: "",
        driver_name: "",
        source_file_name: name,
      };
    });

    setImportRows(rows);
    setImportOpen(true);

    // If it looks like nothing was extracted, tell the user how to make it work better.
    const extractedAny = rows.some((r) => r.customer || r.bol_number);
    if (!extractedAny) {
      toast.message("Tip: rename files like '2026-02-18 Uline BOL 12345.pdf' to auto-fill Date/Customer/BOL.");
    }
  }

  async function importAll() {
    const valid = importRows.filter((r) => r.date && r.customer && r.bol_number);
    if (valid.length === 0) {
      toast.error("Nothing to import yet. Fill Date, Customer, and BOL # on at least one row.");
      return;
    }

    try {
      for (const r of valid) {
        await createMutation.mutateAsync({
          date: r.date,
          customer: (r.customer || "").trim(),
          city: (r.city || "").trim(),
          bol_number: (r.bol_number || "").trim(),
          notes: (r.notes || "").trim(),
          dock_hours: (r.dock_hours || "").trim(),
          trailer_number: (r.trailer_number || "").trim(),
          driver_name: (r.driver_name || "").trim(),
          source_file_name: r.source_file_name || r._file || "",
        });
      }
      setImportOpen(false);
      setImportRows([]);
      toast.success(`Imported ${valid.length} order${valid.length === 1 ? "" : "s"}`);
    } catch (e) {
      // createMutation already toasts errors; just stop.
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-zinc-900">
              Dispatch <span className="font-semibold">Log</span>
            </h1>
            <p className="text-zinc-600 mt-1">Track orders by day, assign trailer and driver, and keep dock hours in one place.</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={onImportFilesSelected}
            />
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={onPickImportFiles}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Image/PDF
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-xl"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Order
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-300" />
              Orders
              <span className="text-sm font-normal text-zinc-500">({orders?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-zinc-600">Loading...</div>
            ) : grouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200/40 bg-white/60 p-10 text-center">
                <FileText className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                <div className="text-zinc-800 font-medium">No dispatch orders yet</div>
                <div className="text-zinc-600 text-sm mt-1">Click “Add New Order” to start a day.</div>
              </div>
            ) : (
              <div className="space-y-8">
                {grouped.map((g) => {
                  const totalCount = g.items.length;
                  const routedCount = g.items.reduce((n, it) => n + (it.driver_name ? 1 : 0), 0);
                  const readyCount = g.items.reduce((n, it) => n + (!it.driver_name && it.trailer_number ? 1 : 0), 0);
                  return (
                  <div key={g.date || "no-date"}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-semibold text-zinc-900">
                        {g.date ? format(new Date(g.date + "T00:00:00"), "EEE, M/d/yy") : "No Date"}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge className="rounded-full border-0 bg-zinc-200/70 text-zinc-800">{totalCount} Orders</Badge>
                        <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-900">{readyCount} Ready</Badge>
                        <Badge className="rounded-full border-0 bg-rose-100 text-rose-900">{routedCount} Routed</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {g.items.map((o) => {
                        const tone = orderCardTone(o);
                        return (
                          <Card
                            key={o.id}
                            className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${tone.card}`}
                            onClick={() => openEdit(o)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-10 w-10 rounded-2xl bg-white/60 border border-black/5 flex items-center justify-center shrink-0">
                                    <Truck className="h-5 w-5 text-zinc-700" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="font-semibold text-zinc-900 truncate">{o.customer || "(No customer)"}</div>
                                    <div className="text-sm text-zinc-700 truncate">
                                      {o.city ? o.city : ""}
                                      {o.city ? " • " : ""}
                                      <span className="text-zinc-600">BOL</span> {o.bol_number || "—"}
                                    </div>
                                  </div>
                                </div>

                                <Badge className={`${tone.badge} border-0 shrink-0 rounded-full`}>{tone.label}</Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-1 rounded-full bg-white/60 border border-black/5 text-zinc-700">
                                  <span className="text-zinc-500">Trailer:</span> {o.trailer_number || "—"}
                                </span>
                                <span className="px-2 py-1 rounded-full bg-white/60 border border-black/5 text-zinc-700">
                                  <span className="text-zinc-500">Driver:</span> {o.driver_name || "—"}
                                </span>
                                {o.dock_hours ? (
                                  <span className="px-2 py-1 rounded-full bg-white/60 border border-black/5 text-zinc-700">
                                    <span className="text-zinc-500">Dock:</span> {o.dock_hours}
                                  </span>
                                ) : null}
                              </div>

                              {o.notes ? (
                                <div className="mt-2 text-sm text-zinc-700 line-clamp-1">{o.notes}</div>
                              ) : null}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Order" : "Add New Order"}</DialogTitle>
              <DialogDescription>
                Enter the order details. Card color updates automatically based on Trailer/Driver.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div>
                <Label>Customer</Label>
                <Input
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Customer name"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g., Joliet"
                />
              </div>

              <div>
                <Label>BOL #</Label>
                <Input
                  value={form.bol_number}
                  onChange={(e) => setForm({ ...form, bol_number: e.target.value })}
                  placeholder="e.g., 123456"
                />
              </div>

              <div>
                <Label>Dock Hours</Label>
                <Input
                  value={form.dock_hours}
                  onChange={(e) => setForm({ ...form, dock_hours: e.target.value })}
                  placeholder="e.g., 7am–1pm"
                />
              </div>

              <div>
                <Label>Trailer #</Label>
                <Input
                  value={form.trailer_number}
                  onChange={(e) => setForm({ ...form, trailer_number: e.target.value })}
                  placeholder="e.g., 3056"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Driver</Label>
                <Select
                  value={form.driver_name || ""}
                  onValueChange={(value) => setForm({ ...form, driver_name: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">(None)</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes / instructions"
                  className="min-h-[90px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="secondary" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                onClick={saveOrder}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Save Changes" : "Add Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-4xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Import Orders from Files</DialogTitle>
              <DialogDescription>
                This uses the filename to auto-fill Date / Customer / BOL (example: “2026-02-18 Uline BOL 12345.pdf”).
                You can edit anything before importing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[60vh] overflow-auto pr-2">
              {importRows.map((r, idx) => (
                <Card key={`${r._file}-${idx}`} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="text-sm text-zinc-600 mb-3 truncate">
                      <span className="font-medium text-zinc-900">File:</span> {r._file}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={r.date}
                          onChange={(e) => {
                            const next = [...importRows];
                            next[idx] = { ...r, date: e.target.value };
                            setImportRows(next);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Customer</Label>
                        <Input
                          value={r.customer}
                          onChange={(e) => {
                            const next = [...importRows];
                            next[idx] = { ...r, customer: e.target.value };
                            setImportRows(next);
                          }}
                        />
                      </div>
                      <div>
                        <Label>BOL #</Label>
                        <Input
                          value={r.bol_number}
                          onChange={(e) => {
                            const next = [...importRows];
                            next[idx] = { ...r, bol_number: e.target.value };
                            setImportRows(next);
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="secondary" className="rounded-xl" onClick={() => setImportOpen(false)}>
                Close
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                onClick={importAll}
                disabled={createMutation.isPending}
              >
                Import Orders
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
