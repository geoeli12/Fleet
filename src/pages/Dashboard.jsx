import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  ArrowRight
} from "lucide-react";

const Section = ({ title, subtitle, children }) => (
  <section className="space-y-4">
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

const Tile = ({ to, icon: Icon, title, description, pill }) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
    <div className="relative p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-black/90 text-amber-300 flex items-center justify-center shadow-sm ring-1 ring-white/10">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
              {pill ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20">
                  {pill}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
        </div>

        <div className="shrink-0 mt-1 text-muted-foreground group-hover:text-foreground transition-colors">
          <ArrowRight className="h-5 w-5" />
        </div>
      </div>
    </div>
  </Link>
);

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
      name: "Shift Calendar",
      to: createPageUrl("Calendar"),
      icon: CalendarDays,
      description: "See attendance, PTO, absences, and lateness at a glance.",
    },
    {
      name: "Create a Schedule",
      to: createPageUrl("Schedule"),
      icon: Gauge,
      description: "Plan the day/night schedule and keep coverage balanced.",
    },
    {
      name: "Dispatch",
      to: createPageUrl("DispatchLog"),
      icon: Truck,
      description: "Track dispatch info and operational notes in one place.",
    },
    {
      name: "Fuel",
      to: createPageUrl("FuelDashboard"),
      icon: Fuel,
      description: "Enter refills/reads and keep tanks & units up to date.",
    },
    {
      name: "Fuel History",
      to: createPageUrl("FuelHistory"),
      icon: Droplets,
      description: "Browse all refills and readings with clean drill-down cards.",
    },
    {
      name: "Drivers",
      to: createPageUrl("Drivers"),
      icon: Users,
      description: "Manage driver profiles, phone numbers, and IL/PA flags.",
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

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="pt-10 pb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-black/10">
            <LayoutGrid className="h-6 w-6 text-black/90" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Pick where you want to go — everything is one click away.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <Section title="Main Pages" subtitle="Your daily workflow — shift log, schedule, dispatch, and fuel.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <Section title="Quick Actions" subtitle="Jump straight into common data entry screens.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="pb-6 text-xs text-muted-foreground">
          Tip: use the top navigation to move between pages anytime — the dashboard is just your new home base.
        </div>
      </div>
    </div>
  );
}
