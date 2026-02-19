import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/apiClient";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  ClipboardList,
  History,
  Truck,
  Gauge,
  Fuel,
  Droplets,
  CalendarDays,
  Users
} from "lucide-react";

export default function Dashboard() {
  const { data: dispatchOrders = [] } = useQuery({
    queryKey: ["dispatch-orders"],
    queryFn: async () => {
      const res = await api.dispatchorder.list();
      return res ?? [];
    }
  });

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const stats = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0];

    const todayOrders = dispatchOrders.filter(
      o => o.date?.startsWith(todayStr)
    );

    const weekOrders = dispatchOrders.filter(
      o => new Date(o.date) >= startOfWeek
    );

    const monthOrders = dispatchOrders.filter(
      o => new Date(o.date) >= startOfMonth
    );

    const remaining = todayOrders.filter(
      o => !o.driver_name
    );

    return {
      today: todayOrders.length,
      week: weekOrders.length,
      month: monthOrders.length,
      remaining: remaining.length
    };
  }, [dispatchOrders]);

  const pages = [
    {
      name: "Driver Logs",
      desc: "Clock in/out, manage active shifts, and add runs as you go.",
      icon: ClipboardList,
      path: "/DriverLog"
    },
    {
      name: "Shift History",
      desc: "Review completed shifts and edit entries.",
      icon: History,
      path: "/ShiftHistory"
    },
    {
      name: "Dispatch Log",
      desc: "Track dispatch info and operational notes.",
      icon: Truck,
      path: "/DispatchLog"
    },
    {
      name: "Create a Schedule",
      desc: "Plan the day/night schedule and balance coverage.",
      icon: Gauge,
      path: "/Schedule"
    },
    {
      name: "Fuel",
      desc: "Enter fuel usage and tank refills.",
      icon: Fuel,
      path: "/Fuel"
    },
    {
      name: "Fuel History",
      desc: "Browse all logged fuel history.",
      icon: Droplets,
      path: "/FuelHistory"
    },
    {
      name: "Attd Calendar",
      desc: "Track attendance, PTO, and status.",
      icon: CalendarDays,
      path: "/Calendar"
    },
    {
      name: "Drivers",
      desc: "Manage driver profiles and information.",
      icon: Users,
      path: "/Drivers"
    }
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Transport Dash</h1>
          <p className="text-muted-foreground">
            Pick where you want to go — everything is one click away.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-black text-white text-sm">
            Today: {stats.today}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-200 text-sm">
            Rmn: {stats.remaining}
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-200 text-sm">
            Week: {stats.week}
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-200 text-sm">
            Month: {stats.month}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 pt-6">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <div key={page.name} className="flex flex-col items-center space-y-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={page.path}
                      className="w-24 h-24 rounded-full bg-black flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                    >
                      <Icon className="w-10 h-10 text-yellow-400" />
                    </Link>
                  </TooltipTrigger>

                  {/* DESCRIPTION ONLY — title removed */}
                  <TooltipContent>
                    <div className="text-sm">
                      {page.desc}
                    </div>
                  </TooltipContent>
                </Tooltip>

                <span className="text-sm font-medium">
                  {page.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}