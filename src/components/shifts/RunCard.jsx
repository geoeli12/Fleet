
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Clock, Package, ArrowDown, ArrowUp, TruckIcon, PackageCheck, FileText } from "lucide-react";
import { format } from "date-fns";

const defaultLoadTypeColors = {
    scrap: "bg-amber-100 text-amber-800 border-amber-200",
    occ: "bg-blue-100 text-blue-800 border-blue-200",
    mix: "bg-purple-100 text-purple-800 border-purple-200",
    empty: "bg-slate-100 text-slate-600 border-slate-200"
};

export default function RunCard({ run, index, isCurrentRun, onClick }) {
    const loadTypeColor = defaultLoadTypeColors[run.load_type] || "bg-teal-100 text-teal-800 border-teal-200";

    return (
        <Card 
            className={`border-0 shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
                isCurrentRun 
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-400/50' 
                    : 'bg-white/80'
            }`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            run.run_type === 'pickup' 
                                ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700'
                                : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'
                        }`}>
                            {run.run_type === 'pickup' ? <PackageCheck className="h-4 w-4" /> : <TruckIcon className="h-4 w-4" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-slate-800 font-medium">
                                <MapPin className="h-4 w-4 text-emerald-500" />
                                {run.city}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                <Building2 className="h-3.5 w-3.5" />
                                {run.customer_name}
                            </div>
                        </div>
                    </div>
                                        {isCurrentRun && (
                        <Badge className="bg-amber-200 text-amber-800 border-0 text-[10px] px-2 py-0.5">
                            Current
                        </Badge>
                    )}

                    {run.load_type && (
                        <Badge className={`${loadTypeColor} border font-medium`}>
                            <Package className="h-3 w-3 mr-1" />
                            {run.load_type.toUpperCase()}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    {run.trailer_dropped && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                            <ArrowDown className="h-4 w-4 text-red-500" />
                            <span className="text-slate-600">Dropped: <span className="font-medium text-slate-800">{run.trailer_dropped}</span></span>
                        </div>
                    )}
                    {run.trailer_picked_up && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                            <ArrowUp className="h-4 w-4 text-green-500" />
                            <span className="text-slate-600">Picked: <span className="font-medium text-slate-800">{run.trailer_picked_up}</span></span>
                        </div>
                    )}
                </div>

                {(run.arrival_time || run.departure_time) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />
                        {run.arrival_time && (
                            <span>In: <span className="font-medium text-slate-700">{format(new Date(run.arrival_time), 'h:mm a')}</span></span>
                        )}
                        {run.departure_time && (
                            <span>Out: <span className="font-medium text-slate-700">{format(new Date(run.departure_time), 'h:mm a')}</span></span>
                        )}
                    </div>
                )}

                {run.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                            <FileText className="h-4 w-4 mt-0.5 text-slate-400" />
                            <span className="italic">{run.notes}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

