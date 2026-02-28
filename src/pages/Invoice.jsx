import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Printer, X } from "lucide-react";

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== null && typeof v !== "undefined" && String(v).trim() !== "") return v;
  }
  return "";
}

function getCustomerName(c) {
  return String(pickFirst(c, ["customer_name", "name", "customer", "customerName"])).trim();
}

function buildAddressLine2(c) {
  const city = String(pickFirst(c, ["city", "customer_city"])).trim();
  const state = String(pickFirst(c, ["state", "st", "customer_state"])).trim();
  const zip = String(pickFirst(c, ["zip", "zip_code", "postal", "postal_code", "customer_zip"])).trim();
  const parts = [city, state].filter(Boolean).join(", ");
  return [parts, zip].filter(Boolean).join(" ").trim();
}

const money = (n) => {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
};

const blankRow = () => ({
  date: "",
  ashRef: "",
  trailer: "",
  custRef: "",
  qty48x40_1: "",
  qty48x40_2: "",
  largeOdd: "",
  smallOdd: "",
  baledOcc: "",
});

function coerceInt(v) {
  if (v === "" || v === null || typeof v === "undefined") return 0;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function Invoice() {
  const [invoiceMonth, setInvoiceMonth] = useState(() => {
    const now = new Date();
    return `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
  });
  const [dtValue, setDtValue] = useState("0");

  const [customerNo, setCustomerNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress1, setCustomerAddress1] = useState("");
  const [customerAddress2, setCustomerAddress2] = useState("");

  const [customerFocused, setCustomerFocused] = useState(false);
  const ignoreCustomerBlurRef = useRef(false);

  const [rows, setRows] = useState(() => Array.from({ length: 26 }, blankRow));

  const printStyleId = "invoice-print-style";

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(printStyleId)) return;
    const style = document.createElement("style");
    style.id = printStyleId;
    style.textContent = `
      @media print {
        header { display: none !important; }
        main { padding: 0 !important; }
        body { background: #fff !important; }
        .no-print { display: none !important; }
        .print-sheet { box-shadow: none !important; border: none !important; }
        .print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        /* Fit the whole invoice on a single letter page */
        @page { margin: 0.25in; }
        .print-compact-header { padding: 0 !important; }
        .print-compact-content { padding: 0 !important; }
        .print-title { font-size: 26px !important; line-height: 1.05 !important; }
        .print-subtitle { font-size: 11px !important; }
        .print-meta { font-size: 11px !important; }
        .print-sheet table { font-size: 9px !important; }
        .print-sheet th { padding: 2px !important; }
        .print-sheet td { padding: 1px !important; }
        .print-sheet input { font-size: 9px !important; }
        .print-sep { margin: 6px 0 !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const { data: rawCustomers } = useQuery({
    queryKey: ["customersForInvoice"],
    queryFn: async () => {
      // The app has had a few naming variations over time; try the common ones.
      const tryList = async (entityName, orderBy) => {
        const ent = api?.entities?.[entityName];
        if (!ent?.list) return null;
        const res = await ent.list(orderBy);
        return unwrapListResult(res);
      };

      try {
        const a = await tryList("Customer", "name");
        if (a) return a;
      } catch {
        // ignore
      }
      try {
        const b = await tryList("Customers", "name");
        if (b) return b;
      } catch {
        // ignore
      }
      // Fallback: some builds used CustomerPrice, but the goal is Customers.
      try {
        const c = await tryList("CustomerPrice", "customer_name");
        if (c) return c;
      } catch {
        // ignore
      }
      return [];
    },
  });

  const customers = useMemo(() => unwrapListResult(rawCustomers), [rawCustomers]);

  const customerMatches = useMemo(() => {
    const q = (customerName || "").trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => getCustomerName(c).toLowerCase().includes(q))
      .slice(0, 10);
  }, [customerName, customers]);

  const selectedCustomer = useMemo(() => {
    const q = (customerName || "").trim().toLowerCase();
    if (!q) return null;
    return (
      customers.find((c) => getCustomerName(c).toLowerCase() === q) ||
      customers.find((c) => getCustomerName(c).toLowerCase().startsWith(q)) ||
      null
    );
  }, [customerName, customers]);

  const getUnitPrices = () => {
    const c = selectedCustomer || {};
    // Accept multiple possible field names to match the Customers page.
    const num = (keys) => safeNum(pickFirst(c, keys));
    return {
      p48x40_1: num(["price_48x40_1", "price48x40_1", "pallet_48x40_1", "p48x40_1", "rate_48x40_1"]),
      p48x40_2: num(["price_48x40_2", "price48x40_2", "pallet_48x40_2", "p48x40_2", "rate_48x40_2"]),
      pLargeOdd: num(["price_large_odd", "priceLargeOdd", "large_odd", "pLargeOdd", "rate_large_odd"]),
      pSmallOdd: num(["price_small_odd", "priceSmallOdd", "small_odd", "pSmallOdd", "rate_small_odd"]),
      pBaledOcc: num([
        "price_baled_cardboard",
        "price_baled_occ",
        "priceBaledOcc",
        "baled_occ",
        "pBaledOcc",
        "rate_baled_occ",
      ]),
    };
  };

  const calcRow = (r) => {
    const q1 = coerceInt(r.qty48x40_1);
    const q2 = coerceInt(r.qty48x40_2);
    const qLarge = coerceInt(r.largeOdd);
    const qSmall = coerceInt(r.smallOdd);
    const qOcc = coerceInt(r.baledOcc);
    const { p48x40_1, p48x40_2, pLargeOdd, pSmallOdd, pBaledOcc } = getUnitPrices();
    const totalQty48 = q1 + q2;
    const total =
      q1 * p48x40_1 +
      q2 * p48x40_2 +
      qLarge * pLargeOdd +
      qSmall * pSmallOdd +
      qOcc * pBaledOcc;
    return { totalQty48, total };
  };

  const totals = useMemo(() => {
    let t1 = 0,
      t2 = 0,
      t48 = 0,
      tLarge = 0,
      tSmall = 0,
      tOcc = 0,
      grand = 0;

    for (const r of rows) {
      const q1 = coerceInt(r.qty48x40_1);
      const q2 = coerceInt(r.qty48x40_2);
      const qLarge = coerceInt(r.largeOdd);
      const qSmall = coerceInt(r.smallOdd);
      const qOcc = coerceInt(r.baledOcc);
      const { totalQty48, total } = calcRow(r);

      t1 += q1;
      t2 += q2;
      t48 += totalQty48;
      tLarge += qLarge;
      tSmall += qSmall;
      tOcc += qOcc;
      if (total > 0) grand += total;
    }

    return { t1, t2, t48, tLarge, tSmall, tOcc, grand };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectedCustomer]);

  const updateRow = (idx, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const clearRow = (idx) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = blankRow();
      return copy;
    });
  };

  const onPickCustomer = (cust) => {
    setCustomerName(getCustomerName(cust));
    setCustomerNo(
      String(
        pickFirst(cust, ["customer_no", "customer_number", "customer_id", "customerId", "id", "cust_no"]) || ""
      )
    );

    const line1 = String(
      pickFirst(cust, [
        "address1",
        "address_1",
        "address_line_1",
        "address_line1",
        "address",
        "street",
        "location",
      ])
    ).trim();
    const line2Raw = String(
      pickFirst(cust, ["address2", "address_2", "address_line_2", "address_line2"]) || ""
    ).trim();
    const line2 = line2Raw || buildAddressLine2(cust);

    setCustomerAddress1(line1);
    setCustomerAddress2(line2);
    setCustomerFocused(false);
  };

  // If the user types an exact customer name, auto-fill the related fields (without overwriting edits).
  useEffect(() => {
    if (!selectedCustomer) return;
    if (!customerNo) {
      const no = pickFirst(selectedCustomer, ["customer_no", "customer_number", "customer_id", "customerId", "id", "cust_no"]);
      if (no !== "") setCustomerNo(String(no));
    }
    if (!customerAddress1) {
      const line1 = pickFirst(selectedCustomer, [
        "address1",
        "address_1",
        "address_line_1",
        "address_line1",
        "address",
        "street",
        "location",
      ]);
      if (line1 !== "") setCustomerAddress1(String(line1).trim());
    }
    if (!customerAddress2) {
      const line2Raw = pickFirst(selectedCustomer, ["address2", "address_2", "address_line_2", "address_line2"]);
      const line2 = String(line2Raw || buildAddressLine2(selectedCustomer)).trim();
      if (line2) setCustomerAddress2(line2);
    }
  }, [selectedCustomer, customerNo, customerAddress1, customerAddress2]);

  const unitPrices = useMemo(() => getUnitPrices(), [selectedCustomer]);

  return (
    <div className="min-h-screen bg-amber-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="text-xl font-bold text-neutral-900">Invoice</div>
              <div className="text-sm text-neutral-600">Print-ready entry screen</div>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-neutral-900 hover:bg-neutral-800">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <Card className="print-sheet rounded-2xl border border-black/10 shadow-sm">
          <CardHeader className="pb-3 print-compact-header">
            <CardTitle className="sr-only">Invoice Sheet</CardTitle>

            <div className="text-center space-y-1">
              <div className="print-title text-2xl font-extrabold tracking-wide text-red-600">ASH PALLET MANAGEMENT, INC.</div>
              <div className="print-subtitle italic text-sm text-neutral-700">
                “Where customer service and respect are our highest priorities, second to your bottom line.”
              </div>
              <div className="print-meta text-sm text-neutral-800">61 McMillen Rd., Antioch, IL 60002</div>
              <div className="print-meta text-sm text-neutral-800">
                Office: (847) 473-5700&nbsp;&nbsp; Fax: (847) 473-5600&nbsp;&nbsp; Email: ap@ashpallet.com
              </div>
            </div>

            <Separator className="my-3 print-sep" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-24">Customer #:</Label>
                  <Input value={customerNo} onChange={(e) => setCustomerNo(e.target.value)} className="h-8" />
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Label className="w-24">Customer:</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onFocus={() => setCustomerFocused(true)}
                      onBlur={() => {
                        if (ignoreCustomerBlurRef.current) {
                          ignoreCustomerBlurRef.current = false;
                          return;
                        }
                        setCustomerFocused(false);
                      }}
                      className="h-8"
                      placeholder="Start typing…"
                    />
                  </div>
                  {customerFocused && customerMatches.length > 0 && (
                    <div
                      className="absolute z-20 mt-1 left-24 right-0 bg-white border border-black/10 rounded-lg shadow-lg overflow-hidden"
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
                          key={c.id ?? c.customer_id ?? c.customer_no ?? getCustomerName(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                          onClick={() => onPickCustomer(c)}
                        >
                          {getCustomerName(c)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-24" />
                  <Input
                    value={customerAddress1}
                    onChange={(e) => setCustomerAddress1(e.target.value)}
                    className="h-8"
                    placeholder="Address line 1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24" />
                  <Input
                    value={customerAddress2}
                    onChange={(e) => setCustomerAddress2(e.target.value)}
                    className="h-8"
                    placeholder="Address line 2"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div className="sm:col-span-2 flex items-center gap-2 justify-end">
                    <Label className="whitespace-nowrap">Month</Label>
                    <Input
                      value={invoiceMonth}
                      onChange={(e) => setInvoiceMonth(e.target.value)}
                      className="h-8 max-w-[240px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Label className="whitespace-nowrap">DT -</Label>
                    <Input value={dtValue} onChange={(e) => setDtValue(e.target.value)} className="h-8 w-20" />
                  </div>
                </div>

                <div className="no-print rounded-xl border border-black/10 bg-amber-50/60 p-3 text-xs">
                  <div className="font-semibold text-neutral-800">Pricing loaded from Customers</div>
                  <div className="mt-1 grid grid-cols-2 sm:grid-cols-5 gap-2 text-neutral-700">
                    <div>
                      48x40 #1: <span className="font-semibold">{money(unitPrices.p48x40_1)}</span>
                    </div>
                    <div>
                      48x40 #2: <span className="font-semibold">{money(unitPrices.p48x40_2)}</span>
                    </div>
                    <div>
                      Large Odd: <span className="font-semibold">{money(unitPrices.pLargeOdd)}</span>
                    </div>
                    <div>
                      Small Odd: <span className="font-semibold">{money(unitPrices.pSmallOdd)}</span>
                    </div>
                    <div>
                      Baled OCC: <span className="font-semibold">{money(unitPrices.pBaledOcc)}</span>
                    </div>
                  </div>
                  {!selectedCustomer ? (
                    <div className="mt-2 text-neutral-600">Pick a customer to auto-calc totals.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 print-compact-content">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-black/40 p-1 font-semibold text-center">Date</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Ash Pallet Ref #</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Trailer #</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Customer Ref #</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">48x40 #1</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">48x40 #2</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">48x40 Total</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Large Odd</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Small Odd</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Baled OCC</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Total ($)</th>
                    <th className="no-print border border-black/40 p-1 font-semibold text-center"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const { totalQty48, total } = calcRow(r);
                    return (
                      <tr key={idx}>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.date}
                            onChange={(e) => updateRow(idx, "date", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.ashRef}
                            onChange={(e) => updateRow(idx, "ashRef", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.trailer}
                            onChange={(e) => updateRow(idx, "trailer", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.custRef}
                            onChange={(e) => updateRow(idx, "custRef", e.target.value)}
                          />
                        </td>

                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.qty48x40_1}
                            onChange={(e) => updateRow(idx, "qty48x40_1", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.qty48x40_2}
                            onChange={(e) => updateRow(idx, "qty48x40_2", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right tabular-nums">
                          {totalQty48 ? totalQty48 : ""}
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.largeOdd}
                            onChange={(e) => updateRow(idx, "largeOdd", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.smallOdd}
                            onChange={(e) => updateRow(idx, "smallOdd", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.baledOcc}
                            onChange={(e) => updateRow(idx, "baledOcc", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right tabular-nums">
                          {total > 0 ? money(total) : ""}
                        </td>
                        <td className="no-print border border-black/40 p-0.5 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[10px] hover:bg-white"
                            onClick={() => clearRow(idx)}
                            title="Clear row"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  <tr>
                    <td className="border border-black/40 p-0.5" colSpan={4}>
                      <div className="text-right font-semibold pr-2">Totals</div>
                    </td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.t1 || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.t2 || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.t48 || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.tLarge || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.tSmall || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.tOcc || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">
                      {totals.grand ? money(totals.grand) : ""}
                    </td>
                    <td className="no-print border border-black/40 p-0.5" />
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-black/40 pb-1">
                  <div className="text-sm font-semibold">Invoice total</div>
                  <div className="text-sm font-extrabold tabular-nums">{money(totals.grand)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
