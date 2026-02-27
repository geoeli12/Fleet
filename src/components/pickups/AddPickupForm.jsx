import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import customersIL from "@/data/customers_il.json";
import customersPA from "@/data/customers_pa.json";

const getInitialForm = (calledOutDate, regionValue) => ({
  region: (regionValue || "").toString().trim().toUpperCase(),
  date_called_out: calledOutDate || format(new Date(), "yyyy-MM-dd"),
  company: "",
  dk_trl: "",
  location: "",
  shift_code: "",
  notes: "",

  // These are intentionally NOT shown when creating a new pickup.
  // They are edited on the row itself.
  date_picked_up: "",
  driver: "",
});

// One example row for bulk paste
const exampleRow = {
  company: "Uline - U6",
  dk_trl: "31489",
  location: "1141 S. 10th St., Watertown, WI 53094",
  shift_code: "Pickup",
  notes: "Out of service / Broken Axel",
};

const normalizeLines = (text) => {
  const raw = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = raw.split("\n").map((l) => (l ?? "").toString().trim());
  let end = parts.length;
  while (end > 0 && !parts[end - 1]) end--;
  return parts.slice(0, end);
};

export default function AddPickupForm({ onAdd, defaultCalledOutDate, region }) {
  const [form, setForm] = useState(() => getInitialForm(defaultCalledOutDate, region));
  const [isExpanded, setIsExpanded] = useState(false);

  // Company suggestions
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const ignoreCompanyBlurRef = useRef(false);

  const customerDirectory = useMemo(() => {
    const normalize = (v) => (v ?? "").toString().trim();

    const safeParse = (raw) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const getRows = (key, fallback) => {
      if (typeof window === "undefined") return fallback || [];
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? safeParse(raw) : null;
      return Array.isArray(parsed) ? parsed : fallback || [];
    };

    const ilRows = getRows("customers_il", customersIL);
    const paRows = getRows("customers_pa", customersPA);

    const withMeta = (rows, rgn) =>
      (rows || []).map((r, idx) => ({
        _key: `${rgn}-${r.id ?? idx}`,
        region: rgn,
        customer: normalize(r.customer),
        address: normalize(r.address),
        receivingHours: normalize(r.receivingHours),
        receivingNotes: normalize(r.receivingNotes),
      }));

    return [...withMeta(ilRows, "IL"), ...withMeta(paRows, "PA")].filter((r) => r.customer);
  }, []);

  const normalizeCompanyKey = (v) =>
    (v ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^\d+\s+/, "")
      .replace(/^[-–—\s]+/, "")
      .trim();

  const companyMatches = useMemo(() => {
    const q = (form.company || "").trim().toLowerCase();
    if (!q) return [];
    const regionUpper = (region || "").toString().trim().toUpperCase();

    // Prefer matches from the currently selected region, but allow cross-region matches too.
    const matches = customerDirectory
      .filter((r) => r.customer.toLowerCase().includes(q))
      .sort((a, b) => {
        const aPref = a.region === regionUpper ? 0 : 1;
        const bPref = b.region === regionUpper ? 0 : 1;
        return aPref - bPref;
      })
      .slice(0, 10);

    return matches;
  }, [form.company, customerDirectory, region]);

  const applyCompanyPick = (row) => {
    setForm((prev) => ({
      ...prev,
      company: row.customer,
      // Optional: If you want auto-fill location from customer address, uncomment:
      // location: prev.location || row.address,
    }));
  };

  // Bulk Paste
  const [bulkCols, setBulkCols] = useState({ ...exampleRow });
  const [exampleActiveCols, setExampleActiveCols] = useState(() => ({
    company: true,
    dk_trl: true,
    location: true,
    shift_code: true,
    notes: true,
  }));

  useEffect(() => {
    if (defaultCalledOutDate) {
      setForm((prev) => ({ ...prev, date_called_out: defaultCalledOutDate }));
    }
  }, [defaultCalledOutDate]);

  useEffect(() => {
    const r = (region || "").toString().trim().toUpperCase();
    setForm((prev) => ({ ...prev, region: r }));
  }, [region]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;

    await onAdd({
      ...form,
      region: (region || form.region || "").toString().trim().toUpperCase(),

      // New pickup form should NOT set these.
      date_picked_up: "",
      driver: "",
    });

    setForm(getInitialForm(form.date_called_out, region));
    setIsExpanded(false);
  };

  const isExampleActive = useMemo(() => Object.values(exampleActiveCols).some(Boolean), [exampleActiveCols]);

  const clearBulk = () => {
    setBulkCols({ company: "", dk_trl: "", location: "", shift_code: "", notes: "" });
    setExampleActiveCols({ company: false, dk_trl: false, location: false, shift_code: false, notes: false });
  };

  const bulkArrays = useMemo(() => {
    const a = {
      company: normalizeLines(bulkCols.company),
      dk_trl: normalizeLines(bulkCols.dk_trl),
      location: normalizeLines(bulkCols.location),
      shift_code: normalizeLines(bulkCols.shift_code),
      notes: normalizeLines(bulkCols.notes),
    };

    const maxLen = Math.max(a.company.length, a.dk_trl.length, a.location.length, a.shift_code.length, a.notes.length);

    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      const row = {
        company: a.company[i] || "",
        dk_trl: a.dk_trl[i] || "",
        location: a.location[i] || "",
        shift_code: a.shift_code[i] || "",
        notes: a.notes[i] || "",
      };
      if (Object.values(row).some((v) => String(v || "").trim())) rows.push(row);
    }

    return rows;
  }, [bulkCols]);

  const submitBulk = async () => {
    if (!bulkArrays.length) return;

    const r = (region || form.region || "").toString().trim().toUpperCase();
    const baseDate = form.date_called_out || defaultCalledOutDate || format(new Date(), "yyyy-MM-dd");

    for (const row of bulkArrays) {
      // require company at minimum
      if (!String(row.company || "").trim()) continue;
      await onAdd({
        region: r,
        date_called_out: baseDate,
        company: row.company,
        dk_trl: row.dk_trl,
        location: row.location,
        shift_code: row.shift_code,
        notes: row.notes,

        // Not included in create
        date_picked_up: "",
        driver: "",
      });
    }

    clearBulk();
    setIsExpanded(false);
  };

  const handleBulkFocus = (field) => {
    // When user clicks a column, clear just that column's example
    if (!exampleActiveCols[field]) return;

    setBulkCols((prev) => ({ ...prev, [field]: "" }));
    setExampleActiveCols((prev) => ({ ...prev, [field]: false }));
  };

  if (!isExpanded) {
    return (
      <Button onClick={() => setIsExpanded(true)} className="rounded-xl h-12 px-5">
        <Plus className="h-4 w-4 mr-2" />
        New Pick Up
      </Button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full md:w-[740px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-slate-800">New Pick Up</div>
          <div className="text-sm text-slate-500">Single entry or bulk paste (same style as Dispatch Log)</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-xl">{(region || "").toString().trim().toUpperCase() || "IL"}</Badge>
          <Button variant="outline" className="rounded-xl" onClick={() => setIsExpanded(false)}>
            Close
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Tabs defaultValue="single">
          <TabsList className="rounded-xl">
            <TabsTrigger value="single" className="rounded-xl">Single</TabsTrigger>
            <TabsTrigger value="bulk" className="rounded-xl">
              <Table className="h-4 w-4 mr-2" />
              Bulk Paste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-600">Type</label>
                  <Input
                    value={form.shift_code}
                    onChange={(e) => setForm((p) => ({ ...p, shift_code: e.target.value }))}
                    placeholder="Pickup"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="md:col-span-3" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1 relative">
                  <label className="text-xs font-semibold text-slate-600">Company</label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Start typing customer..."
                    className="h-11 rounded-xl"
                    onFocus={() => setIsCompanyFocused(true)}
                    onBlur={() => {
                      if (ignoreCompanyBlurRef.current) return;
                      setIsCompanyFocused(false);
                    }}
                  />

                  {isCompanyFocused && companyMatches.length > 0 && (
                    <div
                      className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                      onMouseDown={() => {
                        // prevent blur while clicking
                        ignoreCompanyBlurRef.current = true;
                      }}
                    >
                      {companyMatches.map((r) => (
                        <button
                          key={r._key}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-slate-50"
                          // Use onMouseDown so the selection happens BEFORE the input blur closes the menu.
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyCompanyPick(r);
                            setIsCompanyFocused(false);
                            // allow normal blur behavior again
                            window.setTimeout(() => {
                              ignoreCompanyBlurRef.current = false;
                            }, 0);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-slate-800 truncate">{r.customer}</div>
                            <Badge variant="secondary" className="rounded-xl">{r.region}</Badge>
                          </div>
                          {r.address ? <div className="text-xs text-slate-500 truncate">{r.address}</div> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-600">Dk/TRL#</label>
                  <Input
                    value={form.dk_trl}
                    onChange={(e) => setForm((p) => ({ ...p, dk_trl: e.target.value }))}
                    placeholder="31489"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-600">Location</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="1141 S. 10th St., Watertown, WI 53094"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Out of service / Broken Axel..."
                  className="min-h-[90px] rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsExpanded(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl">Save</Button>
              </div>

              <div className="text-xs text-slate-500">
                <span className="font-semibold">Note:</span> P/U Date and Driver are entered when you edit the row.
              </div>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="mt-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="text-sm font-semibold text-slate-700 mb-3">Paste values into any column</div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { key: "company", label: "Company" },
                  { key: "dk_trl", label: "Dk/TRL#" },
                  { key: "location", label: "Location" },
                  { key: "shift_code", label: "Type" },
                  { key: "notes", label: "Notes" },
                ].map((c) => (
                  <div key={c.key}>
                    <label className="text-xs font-semibold text-slate-600">{c.label}</label>
                    <Textarea
                      value={bulkCols[c.key]}
                      onFocus={() => handleBulkFocus(c.key)}
                      onChange={(e) => setBulkCols((p) => ({ ...p, [c.key]: e.target.value }))}
                      className={`min-h-[150px] rounded-xl ${isExampleActive && exampleActiveCols[c.key] ? "text-slate-400" : ""}`}
                      placeholder={c.label}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4">
                <Button variant="outline" className="rounded-xl" onClick={clearBulk}>
                  Clear
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setIsExpanded(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-xl" onClick={submitBulk}>
                    Save
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-3">
                Bulk rows use the current page date. P/U Date and Driver are added when editing.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
