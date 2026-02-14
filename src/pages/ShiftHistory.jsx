
import React, { useState, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
    Loader2, Calendar, Clock, Gauge, Route, User, 
    ChevronRight, Pencil, Trash2, Download, Sun, Moon,
    CalendarDays, AlertCircle
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EditRunDialog from '@/components/shifts/EditRunDialog';

export default function ShiftHistory() {
    const [timeFilter, setTimeFilter] = useState('all');
    const [driverFilter, setDriverFilter] = useState('all');
    const [editingShift, setEditingShift] = useState(null);
    const [editingRun, setEditingRun] = useState(null);
    const [editShiftData, setEditShiftData] = useState({});
    const queryClient = useQueryClient();

    const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
        queryKey: ['allShifts'],
        queryFn: () => api.entities.Shift.list('-created_date', 500)
    });

    const { data: allRuns = [] } = useQuery({
        queryKey: ['allRuns'],
        queryFn: () => api.entities.Run.list('-created_date', 2000)
    });

    const { data: drivers = [] } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => api.entities.Driver.filter({ status: 'active' }, 'name')
    });

    const updateShiftMutation = useMutation({
        mutationFn: ({ id, data }) => api.entities.Shift.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allShifts'] });
            setEditingShift(null);
        }
    });

    const deleteShiftMutation = useMutation({
        mutationFn: async (shiftId) => {
            const shiftRuns = allRuns.filter(r => r.shift_id === shiftId);
            for (const run of shiftRuns) { await api.entities.Run.delete(run.id); }
            await api.entities.Shift.delete(shiftId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allShifts'] });
            queryClient.invalidateQueries({ queryKey: ['allRuns'] });
        }
    });

    const updateRunMutation = useMutation({
        mutationFn: ({ id, data }) => api.entities.Run.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allRuns'] });
            setEditingRun(null);
        }
    });

    const deleteRunMutation = useMutation({
        mutationFn: (id) => api.entities.Run.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allRuns'] })
    });

    const runsByShift = allRuns.reduce((acc, run) => {
        if (!acc[run.shift_id]) acc[run.shift_id] = [];
        acc[run.shift_id].push(run);
        return acc;
    }, {});

    // Build attendance records: for each day in range, add absent drivers
    const attendanceRecords = useMemo(() => {
        const completedShifts = shifts.filter(s => s.status === 'completed');
        if (completedShifts.length === 0 || drivers.length === 0) return [];

        // Get unique dates from completed shifts
        const shiftDates = [...new Set(completedShifts.map(s => s.date).filter(Boolean))].sort();
        if (shiftDates.length === 0) return [];

        const driverNames = drivers.map(d => d.name);
        const absentRecords = [];

        shiftDates.forEach(dateStr => {
            const driversWithShift = completedShifts
                .filter(s => s.date === dateStr)
                .map(s => s.driver_name);
            
            driverNames.forEach(name => {
                if (!driversWithShift.includes(name)) {
                    absentRecords.push({
                        id: `absent-${name}-${dateStr}`,
                        driver_name: name,
                        date: dateStr,
                        status: 'completed',
                        attendance_status: 'absent',
                        shift_type: 'day',
                        is_absent: true
                    });
                }
            });
        });

        return absentRecords;
    }, [shifts, drivers]);

    // Combine real shifts with absent records
    const allShiftsWithAbsent = useMemo(() => {
        const completedShifts = shifts.filter(s => s.status === 'completed');
        return [...completedShifts, ...attendanceRecords].sort((a, b) => {
            if (a.date && b.date) return b.date.localeCompare(a.date);
            return 0;
        });
    }, [shifts, attendanceRecords]);

    const filteredShifts = useMemo(() => {
        return allShiftsWithAbsent.filter(shift => {
            if (driverFilter !== 'all' && shift.driver_name !== driverFilter) return false;
            if (timeFilter === 'all') return true;
            if (!shift.date) return false;
            const shiftDate = parseISO(shift.date);
            const now = new Date();
            if (timeFilter === 'week') {
                return isWithinInterval(shiftDate, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
            }
            if (timeFilter === 'month') {
                return isWithinInterval(shiftDate, { start: startOfMonth(now), end: endOfMonth(now) });
            }
            return true;
        });
    }, [allShiftsWithAbsent, timeFilter, driverFilter]);

    const uniqueDrivers = [...new Set(allShiftsWithAbsent.map(s => s.driver_name))].sort();

    const getAttendanceBadge = (shift) => {
        if (shift.is_absent || shift.attendance_status === 'absent') {
            return <Badge className="bg-red-100 text-red-700 border-0">Absent</Badge>;
        }
        if (shift.is_pto || shift.shift_type === 'pto' || shift.attendance_status === 'pto') {
            return <Badge className="bg-violet-100 text-violet-700 border-0">PTO</Badge>;
        }
        if (shift.attendance_status === 'late') {
            return <Badge className="bg-orange-100 text-orange-700 border-0">Late</Badge>;
        }
        return <Badge className="bg-amber-500/15 text-amber-200 border-0">Present</Badge>;
    };

    const exportToExcel = () => {
        const headers = ['Date', 'Driver', 'Attendance', 'Shift Type', 'Unit', 'Shift Start', 'Shift End', 'Start Miles', 'End Miles', 'Total Miles', 'City', 'Customer', 'Run Type', 'Load Type', 'Trailer Dropped', 'Trailer Picked Up', 'Arrival Time', 'Departure Time', 'Notes'];
        const rows = [];
        filteredShifts.forEach(shift => {
            if (shift.is_absent) {
                rows.push([shift.date, shift.driver_name, 'Absent', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
                return;
            }
            if (shift.is_pto || shift.shift_type === 'pto') {
                const ptoDatesStr = (shift.pto_dates || []).join(', ');
                rows.push([shift.date, shift.driver_name, 'PTO', 'PTO', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ptoDatesStr]);
                return;
            }
            const shiftRuns = runsByShift[shift.id] || [];
            const totalMiles = (shift.ending_odometer || 0) - (shift.starting_odometer || 0);
            const startTime = shift.start_time ? new Date(shift.start_time) : null;
            const endTime = shift.end_time ? new Date(shift.end_time) : null;
            const attendance = shift.attendance_status || 'present';
            
            if (shiftRuns.length > 0) {
                shiftRuns.forEach(run => {
                    rows.push([
                        shift.date, shift.driver_name, attendance, shift.shift_type || 'day', shift.unit_number,
                        startTime ? format(startTime, 'h:mm a') : '', endTime ? format(endTime, 'h:mm a') : '',
                        shift.starting_odometer, shift.ending_odometer || '', totalMiles,
                        run.city, run.customer_name, run.run_type || '', run.load_type || '',
                        run.trailer_dropped || '', run.trailer_picked_up || '',
                        run.arrival_time ? format(new Date(run.arrival_time), 'h:mm a') : '',
                        run.departure_time ? format(new Date(run.departure_time), 'h:mm a') : '',
                        run.notes || ''
                    ]);
                });
            } else {
                rows.push([
                    shift.date, shift.driver_name, attendance, shift.shift_type || 'day', shift.unit_number,
                    startTime ? format(startTime, 'h:mm a') : '', endTime ? format(endTime, 'h:mm a') : '',
                    shift.starting_odometer, shift.ending_odometer || '', totalMiles,
                    '', '', '', '', '', '', '', '', ''
                ]);
            }
        });
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `driver_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    const handleEditShift = (shift) => {
        setEditShiftData({
            driver_name: shift.driver_name,
            unit_number: shift.unit_number,
            shift_type: shift.shift_type || 'day',
            starting_odometer: shift.starting_odometer,
            ending_odometer: shift.ending_odometer
        });
        setEditingShift(shift);
    };

    if (shiftsLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-black/5 via-background to-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black/5 via-background to-background">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-light tracking-tight text-white">
                            Shift <span className="font-semibold">History</span>
                        </h1>
                        <p className="text-white/60 mt-1">{filteredShifts.length} records found</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={exportToExcel} variant="outline" className="rounded-xl" disabled={filteredShifts.length === 0}>
                            <Download className="h-4 w-4 mr-2" /> Export CSV
                        </Button>
                        <Link to={createPageUrl('DriverLog')}>
                            <Badge className="bg-amber-500/15 text-amber-200 hover:bg-amber-200 cursor-pointer px-4 py-2">
                                Current Shift <ChevronRight className="h-4 w-4 ml-1" />
                            </Badge>
                        </Link>
                    </div>
                </div>

                <Card className="border-0 shadow-md bg-white ring-1 ring-black/5 backdrop-blur-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Label className="text-xs text-white/60 mb-2 block flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Time Period
                                </Label>
                                <Tabs value={timeFilter} onValueChange={setTimeFilter}>
                                    <TabsList className="bg-slate-100 w-full">
                                        <TabsTrigger value="all" className="flex-1">All Time</TabsTrigger>
                                        <TabsTrigger value="week" className="flex-1">This Week</TabsTrigger>
                                        <TabsTrigger value="month" className="flex-1">This Month</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                            <div className="sm:w-64">
                                <Label className="text-xs text-white/60 mb-2 block flex items-center gap-1">
                                    <User className="h-3 w-3" /> Driver
                                </Label>
                                <Select value={driverFilter} onValueChange={setDriverFilter}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Drivers" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Drivers</SelectItem>
                                        {uniqueDrivers.map(driver => (
                                            <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {filteredShifts.length === 0 ? (
                    <div className="text-center py-16 bg-black/50 rounded-2xl border border-dashed border-slate-200">
                        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-white/60 font-medium text-lg">No records found</p>
                        <p className="text-slate-400 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredShifts.map((shift) => {
                            // Absent record
                            if (shift.is_absent) {
                                return (
                                    <Card key={shift.id} className="border-0 shadow-md bg-red-50/50 backdrop-blur-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{shift.driver_name}</div>
                                                        <div className="text-sm text-white/60">{shift.date ? format(parseISO(shift.date), 'MMMM d, yyyy') : ''}</div>
                                                    </div>
                                                </div>
                                                {getAttendanceBadge(shift)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            // PTO record
                            if (shift.is_pto || shift.shift_type === 'pto') {
                                return (
                                    <Card key={shift.id} className="border-0 shadow-md bg-violet-50/50 backdrop-blur-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                                        <CalendarDays className="h-5 w-5 text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{shift.driver_name}</div>
                                                        <div className="text-sm text-white/60">
                                                            PTO: {(shift.pto_dates || [shift.date]).map(d => {
                                                                try { return format(parseISO(d), 'MMM d'); } catch { return d; }
                                                            }).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getAttendanceBadge(shift)}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-2xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete PTO</AlertDialogTitle>
                                                                <AlertDialogDescription>Delete this PTO record?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteShiftMutation.mutate(shift.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            // Normal shift
                            const shiftRuns = runsByShift[shift.id] || [];
                            const totalMiles = (shift.ending_odometer || 0) - (shift.starting_odometer || 0);
                            const startTime = shift.start_time ? new Date(shift.start_time) : null;
                            const endTime = shift.end_time ? new Date(shift.end_time) : null;
                            const isNight = shift.shift_type === 'night';

                            return (
                                <Card key={shift.id} className="border-0 shadow-lg bg-white ring-1 ring-black/5 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                                    isNight ? 'bg-gradient-to-br from-indigo-100 to-purple-100' : 'bg-gradient-to-br from-amber-100 to-orange-100'
                                                }`}>
                                                    {isNight ? <Moon className="h-5 w-5 text-indigo-600" /> : <Sun className="h-5 w-5 text-amber-600" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <CardTitle className="text-lg font-semibold text-white">{shift.driver_name}</CardTitle>
                                                    </div>
                                                    <div className="text-sm text-white/60">
                                                        Unit {shift.unit_number} • {startTime ? format(startTime, 'MMMM d, yyyy') : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getAttendanceBadge(shift)}
                                                <Badge className={`border-0 ${isNight ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {isNight ? 'Night' : 'Day'}
                                                </Badge>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditShift(shift)} className="h-8 w-8">
                                                    <Pencil className="h-4 w-4 text-slate-400" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-2xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
                                                            <AlertDialogDescription>Delete this shift and all its runs?</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteShiftMutation.mutate(shift.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                            <div className="bg-slate-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-xs text-white/60 mb-1"><Clock className="h-3.5 w-3.5" /> Time In</div>
                                                <div className="font-semibold text-white">{startTime ? format(startTime, 'h:mm a') : '-'}</div>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-xs text-white/60 mb-1"><Clock className="h-3.5 w-3.5" /> Time Out</div>
                                                <div className="font-semibold text-white">{endTime ? format(endTime, 'h:mm a') : '-'}</div>
                                            </div>
                                            <div className="bg-amber-500/10 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-xs text-amber-300 mb-1"><Gauge className="h-3.5 w-3.5" /> Miles</div>
                                                <div className="font-semibold text-amber-200">{totalMiles.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-blue-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1"><Route className="h-3.5 w-3.5" /> Runs</div>
                                                <div className="font-semibold text-blue-700">{shiftRuns.length}</div>
                                            </div>
                                        </div>

                                        {shiftRuns.length > 0 && (
                                            <div className="border-t border-black/10 pt-4">
                                                <div className="text-sm font-medium text-white/70 mb-3">Run Details</div>
                                                <div className="space-y-2">
                                                    {shiftRuns.map((run, idx) => (
                                                        <div key={run.id} className="bg-slate-50/50 px-3 py-2 rounded-lg group cursor-pointer hover:bg-black/5/50" onClick={() => setEditingRun(run)}>
                                                            <div className="flex items-center justify-between text-sm mb-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-white/70">{idx + 1}</span>
                                                                    <span className="font-medium text-white">{run.city}</span>
                                                                    <span className="text-slate-400">•</span>
                                                                    <span className="text-white/60">{run.customer_name}</span>
                                                                    {run.trailer_dropped && <span className="text-xs text-red-500">↓{run.trailer_dropped}</span>}
                                                                    {run.trailer_picked_up && <span className="text-xs text-amber-300">↑{run.trailer_picked_up}</span>}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {run.load_type && <Badge variant="outline" className="text-xs">{run.load_type.toUpperCase()}</Badge>}
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingRun(run); }}>
                                                                            <Pencil className="h-3 w-3 text-slate-400" />
                                                                        </Button>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={(e) => e.stopPropagation()}>
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent className="rounded-2xl">
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Delete Run</AlertDialogTitle>
                                                                                    <AlertDialogDescription>Are you sure you want to delete this run?</AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => deleteRunMutation.mutate(run.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete</AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {(run.arrival_time || run.departure_time) && (
                                                                <div className="flex items-center gap-4 ml-9 text-xs text-white/60">
                                                                    {run.arrival_time && <span>Arrived: <span className="font-medium text-white">{format(new Date(run.arrival_time), 'h:mm a')}</span></span>}
                                                                    {run.departure_time && <span>Left: <span className="font-medium text-white">{format(new Date(run.departure_time), 'h:mm a')}</span></span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Edit Shift Dialog */}
                <Dialog open={!!editingShift} onOpenChange={() => setEditingShift(null)}>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader><DialogTitle>Edit Shift</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Driver</Label>
                                <Select value={editShiftData.driver_name} onValueChange={(value) => setEditShiftData({...editShiftData, driver_name: value})}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {drivers.map((driver) => (
                                            <SelectItem key={driver.id} value={driver.name}>{driver.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Unit Number</Label>
                                <Input value={editShiftData.unit_number} onChange={(e) => setEditShiftData({...editShiftData, unit_number: e.target.value})} className="rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Starting Odometer</Label>
                                    <Input type="number" value={editShiftData.starting_odometer} onChange={(e) => setEditShiftData({...editShiftData, starting_odometer: parseFloat(e.target.value)})} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ending Odometer</Label>
                                    <Input type="number" value={editShiftData.ending_odometer} onChange={(e) => setEditShiftData({...editShiftData, ending_odometer: parseFloat(e.target.value)})} className="rounded-xl" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button onClick={() => updateShiftMutation.mutate({ id: editingShift.id, data: editShiftData })}
                                disabled={updateShiftMutation.isPending} className="bg-amber-600 hover:bg-amber-700 rounded-xl">
                                {updateShiftMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Run Dialog */}
                {editingRun && (
                    <EditRunDialog
                        run={editingRun}
                        open={!!editingRun}
                        onClose={() => setEditingRun(null)}
                        onSave={(data) => updateRunMutation.mutate({ id: editingRun.id, data })}
                        isSaving={updateRunMutation.isPending}
                    />
                )}
            </div>
        </div>
    );
}

