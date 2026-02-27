import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Table } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import customersIL from "@/data/customers_il.json";
import customersPA from "@/data/customers_pa.json";

const getInitialForm = (calledOutYmd, regionValue) => ({
  date_called_out: calledOutYmd || format(new Date(), "yyyy-MM-dd"),
  region: (regionValue || "").toString().trim().toUpperCase(),
  company: "",
  dk_trl: "",
  location: "",
  date_picked_up: "",
  driver: "",
  shift_code: "S",
  notes: "",
});

// One example row (shows until the user clicks into any column)
const exampleRow = {
  company: "401 Home Depot - Monroe",
  dk_trl: "54396/odd",
  location: "500 Gateway Blvd. Monroe, OH 45050",
  date_called_out: "2026-02-16",
  date_picked_up: "",
  driver: "",
  shift_code: "S",
  notes: "Get this 4th",
};

const normalizeLines = (text) => {
  const raw = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = raw.split("\n").map((l) => (l ?? "").toString().trim());
  let end = parts.length;
  while (end > 0 && !parts[end - 1]) end--;
  return parts.slice(0, end);
};

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AddPickupForm({ onAdd, defaultCalledOutDate, region }) {
  const [form, setForm] = useState(() => getInitialForm(defaultCalledOutDate, region));
  const [isExpanded, setIsExpanded] = useState(false);

  // Company suggestions
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const ignoreCompanyBlurRef = useRef(false);

  const customerDirectory = useMemo(() => {
    const normalize = (v) => (v ?? "").toString().trim();

    const getRows = (key, fallback) => {
      if (typeof window === "undefined") return fallback || [];
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? safeParseJson(raw) : null;
      return Array.isArray(parsed) ? parsed : fallback || [];
    };

    const ilRows = getRows("customers_il", customersIL);
    const paRows = getRows("customers_pa", customersPA);

    const withMeta = (rows, reg) =>
      (rows || []).map((r, idx) => ({
        _key: `${reg}-${r.id ?? idx}`,
        region: reg,
        customer: normalize(r.customer),
        address: normalize(r.address),
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

  const applyCompanyPick = (row) => {
    const addr = (row?.address || "").trim();
    setForm((prev) => ({
      ...prev,
      company: row.customer,
      location: prev.location || addr,
    }));
  };

  const tryAutoFillLocationFromCompany = () => {
    if (form.location) return;
    const q = normalizeCompanyKey(form.company);
    if (!q) return;
    const match =
      customerDirectory.find((r) => normalizeCompanyKey(r.customer) === q) ||
      customerDirectory.find((r) => normalizeCompanyKey(r.customer).startsWith(q)) ||
      customerDirectory.find((r) => normalizeCompanyKey(r.customer).includes(q));
    if (!match) return;
    const addr = (match.address || "").trim();
    if (!addr) return;
    setForm((prev) => ({ ...prev, location: addr }));
  };

  const companyMatches = useMemo(() => {
    const q = (form.company || "").trim().toLowerCase();
    if (!q) return [];
    const r = (region || form.region || "").toString().trim().toUpperCase();
    const src = r === "IL" || r === "PA" ? customerDirectory.filter((x) => x.region === r) : customerDirectory;
    return src.filter((x) => x.customer.toLowerCase().includes(q)).slice(0, 10);
  }, [form.company, customerDirectory, region, form.region]);

  // Bulk Paste (column-based)
  const [bulkCols, setBulkCols] = useState({ ...exampleRow });
  const [exampleActiveCols, setExampleActiveCols] = useState(() => ({
    company: true,
    dk_trl: true,
    location: true,
    date_called_out: true,
    date_picked_up: true,
    driver: true,
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

  const isExampleActive = useMemo(() => Object.values(exampleActiveCols).some(Boolean), [exampleActiveCols]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;

    await onAdd({ ...form, region: (region || form.region || "").toString().trim().toUpperCase() });
    setForm(getInitialForm(form.date_called_out, region));
    setIsExpanded(false);
  };

  const clearBulk = () => {
    setBulkCols({
      company: "",
      dk_trl: "",
      location: "",
      date_called_out: "",
      date_picked_up: "",
      driver: "",
      shift_code: "",
      notes: "",
    });
    setExampleActiveCols({
      company: false,
      dk_trl: false,
      location: false,
      date_called_out: false,
      date_picked_up: false,
      driver: false,
      shift_code: false,
      notes: false,
    });
  };

  const bulkArrays = useMemo(() => {
    const a = {
      company: normalizeLines(bulkCols.company),
      dk_trl: normalizeLines(bulkCols.dk_trl),
      location: normalizeLines(bulkCols.location),
      date_called_out: normalizeLines(bulkCols.date_called_out),
      date_picked_up: normalizeLines(bulkCols.date_picked_up),
      driver: normalizeLines(bulkCols.driver),
      shift_code: normalizeLines(bulkCols.shift_code),
      notes: normalizeLines(bulkCols.notes),
    };
    const maxLen = Math.max(
      a.company.length,
      a.dk_trl.length,
      a.location.length,
      a.date_called_out.length,
      a.date_picked_up.length,
      a.driver.length,
      a.shift_code.length,
      a.notes.length
    );
    return { arrays: a, maxLen };
  }, [bulkCols]);

  const handleBulkImport = async () => {
    const { arrays, maxLen } = bulkArrays;
    const fallbackDate = form.date_called_out || defaultCalledOutDate || format(new Date(), "yyyy-MM-dd");
    const reg = (region || form.region || "").toString().trim().toUpperCase();

    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      const row = {
        company: arrays.company[i] || "",
        dk_trl: arrays.dk_trl[i] || "",
        location: arrays.location[i] || "",
        date_called_out: arrays.date_called_out[i] || fallbackDate,
        date_picked_up: arrays.date_picked_up[i] || "",
        driver: arrays.driver[i] || "",
        shift_code: arrays.shift_code[i] || form.shift_code || "S",
        notes: arrays.notes[i] || "",
        region: reg,
      };

      // Skip empty rows
      if (!String(row.company).trim() && !String(row.dk_trl).trim() && !String(row.location).trim() && !String(row.notes).trim()) {
        continue;
      }

      rows.push(row);
    }

    for (const r of rows) {
      // eslint-disable-next-line no-await-in-loop
      await onAdd(r);
    }

    clearBulk();
    setIsExpanded(false);
  };

  const onBulkColFocus = (field) => {
    if (!isExampleActive) return;
    setExampleActiveCols((prev) => ({ ...prev, [field]: false }));
    setBulkCols((prev) => ({ ...prev, [field]: prev[field] === exampleRow[field] ? "" : prev[field] }));
  };

  return (
    <div className="w-full">
      {!isExpanded ? (
        <Button onClick={() => setIsExpanded(true)} className="rounded-xl h-12 px-5" type="button">
          <Plus className="h-4 w-4 mr-2" />
          Add a Pick Up
        </Button>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 w-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-slate-800">New Pick Up</div>
              <div className="text-sm text-slate-500">Single entry or bulk paste (same style as Dispatch Log)</div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="rounded-xl">{(region || form.region || "").toString().toUpperCase() || ""}</Badge>
              <Button variant="outline" className="rounded-xl" type="button" onClick={() => setIsExpanded(false)}>
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

              <TabsContent value="single" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Date Called out</label>
                      <Input
                        type="date"
                        value={form.date_called_out}
                        onChange={(e) => setForm((p) => ({ ...p, date_called_out: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Date Picked Up</label>
                      <Input
                        type="date"
                        value={form.date_picked_up}
                        onChange={(e) => setForm((p) => ({ ...p, date_picked_up: e.target.value }))}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Driver</label>
                      <Input
                        value={form.driver}
                        onChange={(e) => setForm((p) => ({ ...p, driver: e.target.value }))}
                        className="h-11 rounded-xl"
                        placeholder="Danny"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Shift</label>
                      <Input
                        value={form.shift_code}
                        onChange={(e) => setForm((p) => ({ ...p, shift_code: e.target.value }))}
                        className="h-11 rounded-xl"
                        placeholder="S"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1 relative">
                      <label className="text-xs font-semibold text-slate-600">Company</label>
                      <Input
                        value={form.company}
                        onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                        onFocus={() => setIsCompanyFocused(true)}
                        onBlur={() => {
                          if (ignoreCompanyBlurRef.current) {
                            ignoreCompanyBlurRef.current = false;
                            return;
                          }
                          setIsCompanyFocused(false);
                          tryAutoFillLocationFromCompany();
                        }}
                        className="h-11 rounded-xl"
                        placeholder="Start typing customer..."
                      />

                      {isCompanyFocused && companyMatches.length > 0 && (
                        <div
                          className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                          onMouseDown={() => {
                            ignoreCompanyBlurRef.current = true;
                          }}
                        >
                          {companyMatches.map((r) => (
                            <button
                              key={r._key}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              onClick={() => {
                                applyCompanyPick(r);
                                setIsCompanyFocused(false);
                              }}
                            >
                              <div className="text-sm font-semibold text-slate-800">{r.customer}</div>
                              <div className="text-xs text-slate-500 truncate">{r.address || ""}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600">Dk/TRL#</label>
                      <Input
                        value={form.dk_trl}
                        onChange={(e) => setForm((p) => ({ ...p, dk_trl: e.target.value }))}
                        className="h-11 rounded-xl"
                        placeholder="31489"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-xs font-semibold text-slate-600">Location</label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                        onBlur={tryAutoFillLocationFromCompany}
                        className="h-11 rounded-xl"
                        placeholder="1141 S. 10th St., Watertown, WI 53094"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Notes</label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      className="rounded-xl min-h-[84px]"
                      placeholder="Out of service / Broken Axel..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsExpanded(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="rounded-xl">Save</Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="bulk" className="mt-4">
                <div className="space-y-3">
                  <div className="text-sm text-slate-600">
                    Paste one column at a time (Excel style). If a column still shows the example, just click in it and paste.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Date Called out (blank = selected date)</label>
                      <Textarea
                        value={bulkCols.date_called_out}
                        onFocus={() => onBulkColFocus("date_called_out")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, date_called_out: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Company</label>
                      <Textarea
                        value={bulkCols.company}
                        onFocus={() => onBulkColFocus("company")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, company: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Dk/TRL#</label>
                      <Textarea
                        value={bulkCols.dk_trl}
                        onFocus={() => onBulkColFocus("dk_trl")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, dk_trl: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Location</label>
                      <Textarea
                        value={bulkCols.location}
                        onFocus={() => onBulkColFocus("location")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, location: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Date Picked Up</label>
                      <Textarea
                        value={bulkCols.date_picked_up}
                        onFocus={() => onBulkColFocus("date_picked_up")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, date_picked_up: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Driver</label>
                      <Textarea
                        value={bulkCols.driver}
                        onFocus={() => onBulkColFocus("driver")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, driver: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Shift (S/L/B)</label>
                      <Textarea
                        value={bulkCols.shift_code}
                        onFocus={() => onBulkColFocus("shift_code")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, shift_code: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Notes</label>
                      <Textarea
                        value={bulkCols.notes}
                        onFocus={() => onBulkColFocus("notes")}
                        onChange={(e) => setBulkCols((p) => ({ ...p, notes: e.target.value }))}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Rows detected: <span className="font-semibold">{bulkArrays.maxLen}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="rounded-xl" onClick={clearBulk}>
                        Clear
                      </Button>
                      <Button type="button" className="rounded-xl" onClick={handleBulkImport}>
                        Import
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
