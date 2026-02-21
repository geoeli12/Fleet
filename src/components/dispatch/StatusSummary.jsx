import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Users, MapPin, Clock } from "lucide-react";

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

export default function StatusSummary({ logs = [] }) {
  const stats = useMemo(() => {
    const arr = Array.isArray(logs) ? logs : [];
    const loads = arr.length;

    const customers = new Set();
    const drivers = new Set();
    const cities = new Set();
    let dock = 0;

    for (const r of arr) {
      if (r?.customer) customers.add(String(r.customer).trim());
      if (r?.driver_name) drivers.add(String(r.driver_name).trim());
      if (r?.city) cities.add(String(r.city).trim());
      dock += n(r?.dock_hours);
    }

    return {
      loads,
      customers: customers.size,
      drivers: drivers.size,
      cities: cities.size,
      dock,
    };
  }, [logs]);

  const items = [
    { icon: Truck, label: "Loads", value: stats.loads },
    { icon: Users, label: "Drivers", value: stats.drivers },
    { icon: MapPin, label: "Cities", value: stats.cities },
    { icon: Clock, label: "Dock Hours", value: stats.dock ? stats.dock.toFixed(1) : "0.0" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-black/5 flex items-center justify-center">
              <it.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="text-lg font-semibold leading-tight">{it.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="col-span-2 md:col-span-4">
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary" className="rounded-xl">
            Customers: {stats.customers}
          </Badge>
          <Badge variant="secondary" className="rounded-xl">
            Total Loads: {stats.loads}
          </Badge>
        </div>
      </div>
    </div>
  );
}
