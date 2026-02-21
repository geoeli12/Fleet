import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Loader2 } from "lucide-react";

function toText(v) {
  return v === null || v === undefined ? "" : String(v);
}

export default function DispatchTable({ logs = [], onUpdate, onDelete }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => {
    const arr = Array.isArray(logs) ? logs.slice() : [];
    // Most recent first (by date then created_at)
    arr.sort((a, b) => {
      const da = toText(a?.date);
      const db = toText(b?.date);
      if (da !== db) return db.localeCompare(da);
      return toText(b?.created_at).localeCompare(toText(a?.created_at));
    });
    return arr;
  }, [logs]);

  const [form, setForm] = useState({
    date: "",
    customer: "",
    city: "",
    trailer_number: "",
    bol_number: "",
    driver_name: "",
    dock_hours: "",
    notes: "",
  });

  function openEdit(row) {
    setActive(row);
    setForm({
      date: toText(row?.date),
      customer: toText(row?.customer),
      city: toText(row?.city),
      trailer_number: toText(row?.trailer_number),
      bol_number: toText(row?.bol_number),
      driver_name: toText(row?.driver_name),
      dock_hours: toText(row?.dock_hours),
      notes: toText(row?.notes),
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!active?.id) return;
    if (!onUpdate) {
      setEditOpen(false);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: form.date || null,
        customer: form.customer || null,
        city: form.city || null,
        trailer_number: form.trailer_number || null,
        bol_number: form.bol_number || null,
        driver_name: form.driver_name || null,
        dock_hours: form.dock_hours === "" ? null : Number(form.dock_hours),
        notes: form.notes || null,
      };
      await onUpdate(active.id, payload);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!active?.id || !onDelete) {
      setConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(active.id);
      setConfirmOpen(false);
      setEditOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="min-w-[220px]">Customer</TableHead>
                <TableHead className="min-w-[160px]">City</TableHead>
                <TableHead className="whitespace-nowrap">Trailer</TableHead>
                <TableHead className="whitespace-nowrap">BOL</TableHead>
                <TableHead className="min-w-[140px]">Driver</TableHead>
                <TableHead className="whitespace-nowrap text-right">Dock</TableHead>
                <TableHead className="min-w-[260px]">Notes</TableHead>
                <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No dispatch entries found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-medium">{toText(row.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{toText(row.customer)}</span>
                        {row?.source_file_name ? (
                          <Badge variant="secondary" className="rounded-xl">
                            {toText(row.source_file_name)}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{toText(row.city)}</TableCell>
                    <TableCell className="whitespace-nowrap">{toText(row.trailer_number)}</TableCell>
                    <TableCell className="whitespace-nowrap">{toText(row.bol_number)}</TableCell>
                    <TableCell>{toText(row.driver_name)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {row?.dock_hours === null || row?.dock_hours === undefined || row?.dock_hours === ""
                        ? ""
                        : Number(row.dock_hours).toFixed(1)}
                    </TableCell>
                    <TableCell className="max-w-[520px]">
                      <span className="line-clamp-2">{toText(row.notes)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => openEdit(row)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => {
                            setActive(row);
                            setConfirmOpen(true);
                          }}
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
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[720px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Dispatch Entry</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Trailer #</Label>
              <Input value={form.trailer_number} onChange={(e) => setForm((s) => ({ ...s, trailer_number: e.target.value }))} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Customer</Label>
              <Input value={form.customer} onChange={(e) => setForm((s) => ({ ...s, customer: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Driver</Label>
              <Input value={form.driver_name} onChange={(e) => setForm((s) => ({ ...s, driver_name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>BOL #</Label>
              <Input value={form.bol_number} onChange={(e) => setForm((s) => ({ ...s, bol_number: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Dock Hours</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 1.5"
                value={form.dock_hours}
                onChange={(e) => setForm((s) => ({ ...s, dock_hours: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={5}
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setActive(active);
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            <Button className="rounded-xl" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the dispatch record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={doDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
