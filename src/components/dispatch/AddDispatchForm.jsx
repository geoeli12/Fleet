import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

export default function AddDispatchForm({ onAdd, defaultDate }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    setForm((s) => ({ ...s, date: defaultDate || s.date }));
  }, [defaultDate]);

  function reset() {
    setForm({
      date: defaultDate || "",
      customer: "",
      city: "",
      trailer_number: "",
      bol_number: "",
      driver_name: "",
      dock_hours: "",
      notes: "",
    });
  }

  async function submit() {
    if (!onAdd) return;

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

      await onAdd(payload);
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setTimeout(() => setForm((s) => ({ ...s, date: defaultDate || s.date })), 0); }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl h-12">
          <Plus className="h-4 w-4 mr-2" />
          Add Dispatch Entry
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[760px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>New Dispatch Entry</DialogTitle>
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
          <Button variant="outline" className="rounded-xl" onClick={() => { reset(); setOpen(false); }}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
