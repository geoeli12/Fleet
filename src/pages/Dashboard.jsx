import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  ClipboardList,
  History,
  CalendarDays,
  Users,
  Truck,
  Fuel,
  Droplets,
  PlusCircle,
  Gauge,
  Package,
  DollarSign,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

const Section = ({ title, subtitle, children }) => (
  <section className="space-y-4">
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
    {children}
  </section>
);

const StatPill = ({ label, value, className }) => (
  <div
    className={[
      "relative overflow-hidden rounded-2xl px-4 py-3 sm:px-5 sm:py-4",
      "bg-white/8 backdrop-blur-xl ring-1 ring-white/12 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.65)]",
      "text-white",
      className || "",
    ].join(" ")}
  >
    <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_10%_0%,rgba(245,158,11,0.22),transparent_55%)]" />
    <div className="relative flex items-center justify-between gap-3">
      <div className="text-xs sm:text-sm text-white/70">{label}</div>
      <div className="text-lg sm:text-xl font-semibold tracking-tight">{value}</div>
    </div>
  </div>
);

const Tile = ({ to, icon: Icon, title, description, pill }) => (
  <Link
    to={to}
    className={[
      "group relative overflow-hidden rounded-3xl p-4 sm:p-5",
      "bg-white/7 backdrop-blur-xl ring-1 ring-white/12",
      "shadow-[0_18px_60px_-28px_rgba(0,0,0,0.85)]",
      "transition-all duration-200",
      "hover:-translate-y-0.5 hover:ring-amber-400/35 hover:shadow-[0_22px_70px_-28px_rgba(0,0,0,0.9)]",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
    ].join(" ")}
  >
    {/* glow / sheen */}
    <div className="pointer-events-none absolute -inset-24 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(245,158,11,0.22),transparent_65%)]" />
    </div>
    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-sm" />
    </div>

    <div className="relative flex items-start gap-4">
      <div className="relative">
        <div
          className={[
            "grid h-12 w-12 place-items-center rounded-2xl",
            "bg-gradient-to-br from-white/12 to-white/4 ring-1 ring-white/10",
            "shadow-[0_12px_40px_-24px_rgba(0,0,0,0.9)]",
            "transition-transform duration-200 group-hover:scale-[1.03]",
          ].join(" ")}
        >
          <Icon className="h-6 w-6 text-amber-300" />
        </div>

        {pill ? (
          <div className="absolute -top-2 -right-2">
            <Badge className="rounded-full bg-amber-400 text-black hover:bg-amber-400">
              {pill}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-sm sm:text-base font-semibold text-white">
            {title}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/70" />
        </div>

        <div className="mt-1 line-clamp-2 text-xs sm:text-sm text-white/70">
          {description}
        </div>
      </div>
    </div>
  </Link>
);

function safeParseISO(d) {
  try {
    if (!d) return null;
    return parseISO(String(d));
  } catch {
    return null;
  }
}

function dateOnlyLocal(dt) {
  if (!dt) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export default function Dashboard() {
  const primary = [
    {
      name: "Driver Logs",
      to: createPageUrl("DriverLog"),
      icon: ClipboardList,
      description: "Clock in/out, manage active shifts, and add runs as you go.",
    },
    {
      name: "Shift History",
      to: createPageUrl("ShiftHistory"),
      icon: History,
      description: "Review completed shifts, edit entries, and check totals.",
    },
    {
      name: "Dispatch Log",
      to: createPageUrl("DispatchLog"),
      icon: Truck,
      description: "Track dispatch info and operational notes in one place.",
    },
    {
      name: "Load History",
      to: createPageUrl("LoadHistory"),
      icon: History,
      description: "Browse all dispatch records across dates.",
    },
    {
      name: "Pick Ups",
      to: createPageUrl("PickUps"),
      icon: Package,
      description: "Track trailer doors/call-outs and picked up dates.",
    },
    {
      name: "Pick Up History",
      to: createPageUrl("PickupHistory"),
      icon: History,
      description: "Browse all pick up records across dates.",
    },
    {
      name: "Create a Schedule",
      to: createPageUrl("Schedule"),
      icon: Gauge,
      description: "Plan the day/night schedule and keep coverage balanced.",
    },
    {
      name: "Fuel",
      to: createPageUrl("FuelDashboard"),
      icon: Fuel,
      description: "Enter fuel usage, and main tank refills.",
    },
    {
      name: "Fuel History",
      to: createPageUrl("FuelHistory"),
      icon: Droplets,
      description: "Browse all fuel usage logged history.",
    },
    {
      name: "Attd Calendar",
      to: createPageUrl("Calendar"),
      icon: CalendarDays,
      description: "See attendance, PTO, absences, and lateness at a glance.",
    },
    {
      name: "Drivers",
      to: createPageUrl("Drivers"),
      icon: Users,
      description: "Add new drivers, and manage driver profiles.",
    },
    {
      name: "Customers",
      to: createPageUrl("Customers"),
      icon: Users,
      description: "Lookup customer addresses, receiving hours, and notes (IL list).",
    },
    {
      name: "Customers PA",
      to: createPageUrl("CustomersPA"),
      icon: Truck,
      description: "Lookup customer addresses, hours, ETA, and contacts (PA list).",
    },
    {
      name: "Inventory Entry",
      to: createPageUrl("InventoryEntry"),
      icon: Package,
      description: "Enter pallet inventory counts for a customer and trailer.",
    },
    {
      name: "Inventory Log",
      to: createPageUrl("InventoryLog"),
      icon: Package,
      description: "Search and filter all pallet inventory entries.",
    },
    {
      name: "Customer Prices",
      to: createPageUrl("CustomerPrices"),
      icon: DollarSign,
      description: "Manage customer pallet pricing and defaults.",
    },
    {
      name: "Invoice",
      to: createPageUrl("Invoice"),
      icon: FileText,
      description: "Print-ready invoice entry (matches the Excel layout).",
    },
  ];

  const quick = [
    {
      name: "Add Refill",
      to: createPageUrl("AddRefill"),
      icon: PlusCircle,
      description: "Log a tank refill fast (with invoice # when needed).",
      pill: "Quick add",
    },
    {
      name: "Add Reading",
      to: createPageUrl("AddReading"),
      icon: PlusCircle,
      description: "Enter a fuel reading to keep consumption accurate.",
      pill: "Quick add",
    },
  ];

  const dispatchQuery = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      const list = await api.entities.DispatchOrder.list("-date");
      return Array.isArray(list) ? list : [];
    },
  });

  const counts = useMemo(() => {
    const orders = Array.isArray(dispatchQuery.data) ? dispatchQuery.data : [];
    const now = new Date();

    const today = dateOnlyLocal(now);
    const wkStart = startOfWeek(now, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(now, { weekStartsOn: 1 });
    const moStart = startOfMonth(now);
    const moEnd = endOfMonth(now);

    let todayCount = 0;
    let remainNoDriver = 0;
    let weekCount = 0;
    let monthCount = 0;

    for (const o of orders) {
      const d = safeParseISO(o?.date);
      if (!d) continue;

      const localDay = dateOnlyLocal(d);
      if (!localDay) continue;

      const drv = String(o?.driver_name || "").trim();
      const inToday = today && localDay.getTime() === today.getTime();
      const inWeek = isWithinInterval(localDay, {
        start: dateOnlyLocal(wkStart),
        end: dateOnlyLocal(wkEnd),
      });
      const inMonth = isWithinInterval(localDay, {
        start: dateOnlyLocal(moStart),
        end: dateOnlyLocal(moEnd),
      });

      if (inToday) {
        todayCount += 1;
        if (!drv) remainNoDriver += 1;
      }
      if (inWeek) weekCount += 1;
      if (inMonth) monthCount += 1;
    }

    return { todayCount, remainNoDriver, weekCount, monthCount };
  }, [dispatchQuery.data]);

  return (
    <div className="min-h-screen text-white bg-[#0B1220]">
      {/* futuristic background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(245,158,11,0.14),transparent_55%),radial-gradient(60%_55%_at_0%_35%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(60%_55%_at_100%_60%,rgba(236,72,153,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_22%,rgba(255,255,255,0.02))]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/25 to-black/35" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-12 w-12 shrink-0 rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/12 grid place-items-center shadow-[0_18px_60px_-30px_rgba(0,0,0,0.9)]">
            <LayoutGrid className="h-6 w-6 text-amber-300" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Transport Dash
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Pick where you want to go — everything is one click away.
            </p>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <StatPill label="Today" value={counts.todayCount} className="md:col-span-1" />
              <StatPill label="Remaining (no driver)" value={counts.remainNoDriver} className="md:col-span-1" />
              <StatPill label="This week" value={counts.weekCount} className="md:col-span-1" />
              <StatPill label="This month" value={counts.monthCount} className="md:col-span-1" />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-12">
          <Section
            title="Main Pages"
            subtitle="Your daily workflow — shift log, schedule, dispatch, and fuel."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {primary.map((x) => (
                <Tile
                  key={x.name}
                  to={x.to}
                  icon={x.icon}
                  title={x.name}
                  description={x.description}
                  pill={x.pill}
                />
              ))}
            </div>
          </Section>

          <Section
            title="Quick Actions"
            subtitle="Jump straight into common data entry screens."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quick.map((x) => (
                <Tile
                  key={x.name}
                  to={x.to}
                  icon={x.icon}
                  title={x.name}
                  description={x.description}
                  pill={x.pill}
                />
              ))}
            </div>
          </Section>

          <div className="pb-6 text-xs text-white/60">
            Tip: this is your home base — use the Back buttons to return here fast.
          </div>
        </div>
      </div>
    </div>
  );
}
