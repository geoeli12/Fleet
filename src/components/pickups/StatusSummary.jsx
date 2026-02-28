import React from 'react';
import { Truck, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function StatusSummary({ logs = [], variant = "dispatch" }) {
  const safeLogs = Array.isArray(logs) ? logs : [];

  if (variant === "pickups") {
    const dispatched = safeLogs.reduce((acc, log) => {
      const puDate = String(log?.date_picked_up ?? log?.picked_up_date ?? "").trim();
      const driver = String(log?.driver ?? log?.driver_name ?? "").trim();
      return acc + (puDate && driver ? 1 : 0);
    }, 0);

    const total = safeLogs.length;
    const remaining = Math.max(0, total - dispatched);

    const cards = [
      { label: 'Total Pick Ups', value: total, icon: Package, color: 'bg-slate-100 text-slate-600' },
      { label: 'Dispatched', value: dispatched, icon: Truck, color: 'bg-red-100 text-red-600' },
      { label: 'Remaining Pick Ups', value: remaining, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{card.value}</div>
            <div className="text-sm text-slate-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: dispatch log summary
  const stats = safeLogs.reduce(
    (acc, log) => {
      const deliveredVal = String(log?.delivered_by ?? "").trim().toLowerCase();

      if (deliveredVal === "no") {
        acc.notDelivered++;
      } else if (deliveredVal) {
        acc.dispatched++;
      } else if (log?.trailer_number && String(log.trailer_number).trim()) {
        acc.loaded++;
      } else {
        acc.pending++;
      }

      return acc;
    },
    { dispatched: 0, loaded: 0, pending: 0, notDelivered: 0 }
  );

  const cards = [
    { label: 'Total Entries', value: safeLogs.length, icon: Package, color: 'bg-slate-100 text-slate-600' },
    { label: 'Loaded & Ready', value: stats.loaded, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Dispatched', value: stats.dispatched, icon: Truck, color: 'bg-red-100 text-red-600' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    { label: 'Not Delivered', value: stats.notDelivered, icon: XCircle, color: 'bg-sky-100 text-sky-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{card.value}</div>
          <div className="text-sm text-slate-500 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
