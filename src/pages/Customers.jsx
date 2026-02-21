import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import seedCustomers from "@/data/customers_il.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Copy, MapPin, ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "customers_il";

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

function joinParts(...parts) {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" • ");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text ?? ""));
    return true;
  } catch {
    return false;
  }
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function loadCustomers() {
  if (typeof window === "undefined") return Array.isArray(seedCustomers) ? seedCustomers : [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeJsonParse(raw) : null;
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(seedCustomers) ? seedCustomers : [];
}

function saveCustomers(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list ?? []));
  } catch {
    // ignore
  }
}

function CustomerEditorDialog({ open, onOpenChange, title, initial, onSave }) {
  const [form, setForm] = useState(() => ({ ...initial }));

  useEffect(() => {
    setForm({ ...initial });
  }, [initial, open]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const normalizeEmail = (v) => String(v ?? "").trim();
  const normalizePhone = (v) => String(v ?? "").trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Customer</Label>
            <Input value={form.customer || ""} onChange={set("customer")} className="rounded-xl" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea value={form.address || ""} onChange={set("address")} className="min-h-[70px] rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Receiving Hours</Label>
            <Input value={form.receivingHours || ""} onChange={set("receivingHours")} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Distance</Label>
            <Input value={form.distance || ""} onChange={set("distance")} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Drop Trailers</Label>
            <Input value={form.dropTrailers || ""} onChange={set("dropTrailers")} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Contact</Label>
            <Input value={form.contact || ""} onChange={set("contact")} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Contact Phone #</Label>
            <Input
              value={form.contactPhone || ""}
              onChange={(e) => setForm((p) => ({ ...p, contactPhone: normalizePhone(e.target.value) }))}
              className="rounded-xl"
              placeholder="(###) ###-####"
            />
          </div>

          <div className="space-y-2">
            <Label>Contact E-Mail</Label>
            <Input
              value={form.contactEmail || ""}
              onChange={(e) => setForm((p) => ({ ...p, contactEmail: normalizeEmail(e.target.value) }))}
              className="rounded-xl"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Receiving Notes</Label>
            <Textarea value={form.receivingNotes || ""} onChange={set("receivingNotes")} className="min-h-[70px] rounded-xl" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={set("notes")} className="min-h-[70px] rounded-xl" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-amber-500 text-black hover:bg-amber-500/90"
            onClick={() => onSave(form)}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerCard({ row, onEdit, onDelete }) {
  const title = row?.customer || "Unknown customer";

  const hasAddr = !!String(row?.address || "").trim();
  const hasContactName = !!String(row?.contact || "").trim();
  const hasContactPhone = !!String(row?.contactPhone || "").trim();
  const hasContactEmail = !!String(row?.contactEmail || "").trim();
  const hasAnyContact = hasContactName || hasContactPhone || hasContactEmail;

  const meta = joinParts(
    row?.receivingHours ? `Hours: ${row.receivingHours}` : "",
    row?.distance ? `Distance: ${row.distance}` : "",
    row?.dropTrailers ? `Drop: ${row.dropTrailers}` : ""
  );

  return (
    <Card className="rounded-2xl border-black/10 bg-white/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              <span className="truncate">{title}</span>
            </CardTitle>
            {meta ? (
              <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-amber-400 text-black hover:bg-amber-400">
              IL
            </Badge>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-xl"
                  title="Delete customer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove <span className="font-medium">{title}</span> from your IL customer list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-600/90"
                    onClick={() => onDelete?.(row)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              variant="secondary"
              className="h-8 w-8 p-0 rounded-xl"
              title="Edit customer"
              onClick={() => onEdit?.(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {hasAddr ? (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                {row.address}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 rounded-xl"
                  onClick={async () => {
                    await copyText(row.address);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy address
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {row?.receivingNotes ? (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {row.receivingNotes}
          </div>
        ) : null}

        {hasAnyContact ? (
          <>
            <Separator className="bg-black/10" />
            <div className="space-y-1">
              {hasContactName ? (
                <div className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                  {row.contact}
                </div>
              ) : null}

              {hasContactPhone ? (
                <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                  <span className="text-muted-foreground">Phone:</span> {row.contactPhone}
                </div>
              ) : null}

              {hasContactEmail ? (
                <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                  <span className="text-muted-foreground">E-Mail:</span> {row.contactEmail}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {row?.notes ? (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">
            {row.notes}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Customers() {
  const [q, setQ] = useState("");
  const [list, setList] = useState(() => loadCustomers());

  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState("edit"); // "edit" | "new"
  const [activeRow, setActiveRow] = useState(null);

  useEffect(() => {
    // one-time hydrate in case SSR or older session
    setList(loadCustomers());
  }, []);

  useEffect(() => {
    saveCustomers(list);
  }, [list]);

  const rows = useMemo(() => {
    const sorted = [...(list || [])].sort((a, b) => {
      const aa = norm(a?.customer);
      const bb = norm(b?.customer);
      return aa.localeCompare(bb);
    });

    const qq = norm(q);
    if (!qq) return sorted;

    return sorted.filter((r) => {
      const hay = [
        r?.customer,
        r?.address,
        r?.receivingHours,
        r?.receivingNotes,
        r?.distance,
        r?.contact,
        r?.contactPhone,
        r?.contactEmail,
        r?.notes,
        r?.dropTrailers,
      ]
        .map(norm)
        .join(" | ");

      return hay.includes(qq);
    });
  }, [q, list]);

  const deleteRow = (row) => {
    if (!row) return;
    const id = row?.id;

    // Prefer id match; fall back to customer+address match
    const next = (list || []).filter((r, idx) => {
      const rid = r?.id ?? idx;
      if (id != null) return String(rid) !== String(id);
      const keyA = `${norm(r?.customer)}|${norm(r?.address)}`;
      const keyB = `${norm(row?.customer)}|${norm(row?.address)}`;
      return keyA !== keyB;
    });

    setList(next);
  };

  const openEdit = (row) => {
    setEditMode("edit");
    setActiveRow(row);
    setEditOpen(true);
  };

  const openNew = () => {
    setEditMode("new");
    setActiveRow({
      id: null,
      customer: "",
      address: "",
      receivingHours: "",
      receivingNotes: "",
      contact: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
      distance: "",
      dropTrailers: "",
    });
    setEditOpen(true);
  };

  const saveRow = (draft) => {
    const cleaned = {
      ...(draft || {}),
      customer: String(draft?.customer ?? "").trim(),
      address: String(draft?.address ?? "").trim(),
      contact: String(draft?.contact ?? "").trim(),
      contactPhone: String(draft?.contactPhone ?? "").trim(),
      contactEmail: String(draft?.contactEmail ?? "").trim(),
    };

    if (!cleaned.customer) return;

    if (editMode === "new") {
      const id = cleaned.id ?? `il-${Date.now()}`;
      const next = [{ ...cleaned, id }, ...list];
      setList(next);
      setEditOpen(false);
      return;
    }

    const id = activeRow?.id;
    const next = list.map((r, idx) => {
      const rid = r?.id ?? idx;
      if (String(rid) === String(id)) return { ...r, ...cleaned, id: rid };
      return r;
    });
    setList(next);
    setEditOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <CustomerEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editMode === "new" ? "Add new customer (IL)" : "Edit customer (IL)"}
        initial={activeRow || {}}
        onSave={saveRow}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-400/90 text-black grid place-items-center shadow-sm ring-1 ring-black/10">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Customers
              </h1>
              <div className="text-sm text-muted-foreground">
                Quick lookup of customer details (from your Excel list).
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Button
            type="button"
            onClick={openNew}
            className="h-10 rounded-xl bg-amber-500 text-black hover:bg-amber-500/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>

          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-black text-amber-400 hover:bg-black">
              {rows.length}
            </Badge>
            <span className="text-sm text-muted-foreground">matches</span>
          </div>

          <Link
            to={createPageUrl("CustomersPA")}
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-black/10 bg-white/70 hover:bg-white transition-colors text-sm font-medium"
          >
            Customers PA
            <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground" />
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by customer, address, contact, hours…"
          className="h-11 rounded-2xl bg-white/70 border-black/10"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((r, idx) => (
          <CustomerCard
            key={String(r?.id ?? idx)}
            row={r}
            onEdit={openEdit}
            onDelete={deleteRow}
          />
        ))}
      </div>
    </div>
  );
}
