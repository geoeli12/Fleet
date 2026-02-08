
import React, { useState, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";

export default function Calendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { data: shifts = [] } = useQuery({
        queryKey: ['allShifts'],
        queryFn: () => api.entities.Shift.list('-created_date', 500)
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => api.entities.Driver.filter({ status: 'active' }, 'name')
    });

    const driverNames = useMemo(() => drivers.map(d => d.name), [drivers]);

    const attendanceByDate = useMemo(() => {
        const completedShifts = shifts.filter(s => s.status === 'completed' && s.date);
        const dateMap = {};

        const uniqueDates = [...new Set(completedShifts.map(s => s.date))];

        uniqueDates.forEach(dateStr => {
            const driversWithShift = completedShifts
                .filter(s => s.date === dateStr)
                .map(s => ({
                    name: s.driver_name,
                    status: s.attendance_status || 'present',
                    is_pto: s.is_pto || s.shift_type === 'pto'
                }));

            const present = driversWithShift.filter(d => !d.is_pto && d.status === 'present').length;
            const late = driversWithShift.filter(d => !d.is_pto && d.status === 'late').length;
            const pto = driversWithShift.filter(d => d.is_pto).length;
            const absent = driverNames.filter(name => 
                !driversWithShift.find(d => d.name === name)
            ).length;

            dateMap[dateStr] = { present, late, absent, pto };
        });

        return dateMap;
    }, [shifts, driverNames]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const firstDayOfWeek = monthStart.getDay();
    const emptyDays = Array(firstDayOfWeek).fill(null);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-light tracking-tight text-slate-800">
                            Attendance <span className="font-semibold">Calendar</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="text-xl font-semibold text-slate-700 min-w-[200px] text-center">
                                {format(currentMonth, 'MMMM yyyy')}
                            </div>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm text-slate-600">Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-sm text-slate-600">Late</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm text-slate-600">Absent</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-sm text-slate-600">PTO</span>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Day Headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-3">
                                {day}
                            </div>
                        ))}

                        {/* Empty cells before month starts */}
                        {emptyDays.map((_, idx) => (
                            <div key={`empty-${idx}`} className="aspect-square"></div>
                        ))}

                        {/* Calendar days */}
                        {daysInMonth.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const data = attendanceByDate[dateStr];
                            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                            return (
                                <div
                                    key={dateStr}
                                    className={`aspect-square border rounded-xl p-3 flex flex-col ${
                                        isToday ? 'border-slate-800 border-2 bg-slate-50' : 'border-slate-200 bg-slate-50/30'
                                    }`}
                                >
                                    <div className="text-lg font-semibold text-slate-700 mb-2">
                                        {format(day, 'd')}
                                    </div>
                                    {data && (
                                        <div className="flex flex-wrap gap-1.5 mt-auto">
                                            {data.present > 0 && (
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            )}
                                            {data.late > 0 && (
                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                            )}
                                            {data.absent > 0 && (
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            )}
                                            {data.pto > 0 && (
                                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

