import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EditRefillDialog({ refill, onSave, isSaving }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    gallons_added: refill.gallons_added || "",
    date: refill.date ? format(new Date(refill.date), "yyyy-MM-dd") : "",
    cost: refill.cost || "",
    notes: refill.notes || "",
    invoice_number: (refill.invoice_number || extractInvoiceFromNotes(refill.notes)) || ""
  });



  const extractInvoiceFromNotes = (notes) => {
    const m = /\bInv(?:oice)?\s*#?\s*([A-Za-z0-9\-]+)/i.exec(notes || "");
    return m ? m[1] : "";
  };

  const injectInvoiceIntoNotes = (notes, invoice) => {
    const inv = (invoice || "").trim();
    if (!inv) return notes || "";
    const tag = `Inv ${inv}`;
    const cur = (notes || "").trim();
    if (!cur) return tag;
    if (/\binv(?:oice)?\b/i.test(cur)) return cur;
    return `${tag} - ${cur}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const inv = (formData.invoice_number || "").trim();

    const payload = {
      gallons_added: parseFloat(formData.gallons_added),
      date: formData.date + "T12:00:00",
      cost: formData.cost ? parseFloat(formData.cost) : null,
      notes: formData.notes
    };

    // Try saving invoice_number if your DB supports it; otherwise fall back to Notes.
    try {
      if (inv) payload.invoice_number = inv;
      await onSave(refill.id, payload);
      setOpen(false);
    } catch (err) {
      const msg = String(err?.message || err || "").toLowerCase();
      const looksLikeMissingField =
        inv &&
        (msg.includes("invoice") || msg.includes("column") || msg.includes("field") || msg.includes("does not exist") || msg.includes("no field"));

      if (looksLikeMissingField) {
        const payload2 = { ...payload };
        payload2.notes = injectInvoiceIntoNotes(formData.notes, inv);
        await onSave(refill.id, payload2);
        setOpen(false);
        return;
      }
      throw err;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-500">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Refill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Gallons Added</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.gallons_added}
              onChange={(e) => setFormData(prev => ({ ...prev, gallons_added: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Cost (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Invoice # (optional)</Label>
            <Input
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              placeholder="e.g., 825786"
            />
          </div>



          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}