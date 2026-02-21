import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

const Bubble = ({ to, icon: Icon, title, description, pill }) => (
  <TooltipProvider delayDuration={120}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className="group flex flex-col items-center gap-3 rounded-2xl p-2 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-black shadow-sm ring-1 ring-black/10 grid place-items-center transition-all group-hover:shadow-md group-hover:ring-amber-400/30">
              <Icon className="h-10 w-10 text-amber-400" />
            </div>

            {pill ? (
              <div className="absolute -top-2 -right-2">
                <Badge className="rounded-full bg-amber-400 text-black hover:bg-amber-400">
                  {pill}
                </Badge>
              </div>
            ) : null}
          </div>

          {/* 🔥 RESTORED ICON TAB NAME */}
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">
              {title}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </TooltipTrigger>

      {/* Tooltip shows description ONLY */}
      <TooltipContent side="top" className="max-w-[260px]">
        <div className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
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
    <div className="min-h-screen bg-[radial-gradient(60%_60%_at_50%_0%,rgba(245,158,11,0.14),transparent_55%),linear-gradient(to_bottom,rgba(255,251,235,0.9),rgba(255,251,235,0.75))]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-12 w-12 shrink-0 rounded-2xl bg-amber-400/90 text-black grid place-items-center shadow-sm ring-1 ring-black/10">
            <LayoutGrid className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Transport Dash
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick where you want to go — everything is one click away.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Badge className="px-6 py-2 text-base font-semibold rounded-xl bg-black text-amber-400 shadow-sm">
                Today: {counts.todayCount}
              </Badge>
              <Badge className="px-6 py-2 text-base font-semibold rounded-xl bg-amber-100 text-amber-900 shadow-sm">
                Rmn: {counts.remainNoDriver}
              </Badge>
              <Badge className="px-6 py-2 text-base font-semibold rounded-xl bg-white/90 text-foreground shadow-sm ring-1 ring-black/5">
                Week: {counts.weekCount}
              </Badge>
              <Badge className="px-6 py-2 text-base font-semibold rounded-xl bg-white/90 text-foreground shadow-sm ring-1 ring-black/5">
                Month: {counts.monthCount}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-10">
          <Section title="Main Pages" subtitle="Your daily workflow — shift log, schedule, dispatch, and fuel.">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {primary.map((x) => (
                <Bubble
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

          <Section title="Quick Actions" subtitle="Jump straight into common data entry screens.">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {quick.map((x) => (
                <Bubble
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

          <div className="pb-6 text-xs text-muted-foreground">
            Tip: this is your home base — use the Back buttons to return here fast.
          </div>
        </div>
      </div>
    </div>
  );
}