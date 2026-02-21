import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import customers from "@/data/customers_il.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Copy, MapPin, ArrowRight } from "lucide-react";

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

function CustomerCard({ row }) {
  const title = row?.customer || "Unknown customer";

  const hasAddr = !!String(row?.address || "").trim();
  const hasContact = !!String(row?.contact || "").trim();

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

          <Badge className="rounded-full bg-amber-400 text-black hover:bg-amber-400">
            IL
          </Badge>
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

        {hasContact ? (
          <>
            <Separator className="bg-black/10" />
            <div className="text-sm text-foreground whitespace-pre-wrap break-words">
              {row.contact}
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

  const rows = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const qq = norm(q);
    if (!qq) return list;

    return list.filter((r) => {
      const hay = [
        r?.customer,
        r?.address,
        r?.receivingHours,
        r?.receivingNotes,
        r?.distance,
        r?.contact,
        r?.notes,
        r?.dropTrailers,
      ]
        .map(norm)
        .join(" | ");

      return hay.includes(qq);
    });
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
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
          <CustomerCard key={String(r?.id ?? idx)} row={r} />
        ))}
      </div>
    </div>
  );
}
