import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Plus, Route, Loader2, User, Truck, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import StartShiftForm from '@/components/shifts/StartShiftForm';
import AddRunForm from '@/components/shifts/AddRunForm';
import RunCard from '@/components/shifts/RunCard';
import EndShiftForm from '@/components/shifts/EndShiftForm';
import ActiveShiftCard from '@/components/shifts/ActiveShiftCard';
import EditRunDialog from '@/components/shifts/EditRunDialog';

function computeAttendanceStatus(shiftType, startTime) {
    const start = new Date(startTime);
    const hour = start.getHours();
    const minute = start.getMinutes();
    const totalMinutes = hour * 60 + minute;

    if (shiftType === 'day') {
        // Day shift starts at 6:00 AM (360 min). Late if after 6:00 AM
        return totalMinutes > 360 ? 'late' : 'present';
    } else if (shiftType === 'night') {
        // Night shift starts at 6:00 PM (1080 min). Late if after 6:00 PM
        return totalMinutes > 1080 ? 'late' : 'present';
    }
    return 'present';
}

export default function DriverLog() {
    const [showAddRun, setShowAddRun] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [editingRun, setEditingRun] = useState(null);
    const queryClient = useQueryClient();

    const { data: drivers = [], isLoading: driversLoading } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => api.entities.Driver.filter({ active: true }, 'name')
    });

    const { data: allActiveShifts = [], isLoading: shiftsLoading } = useQuery({
        queryKey: ['activeShifts'],
        queryFn: () => api.entities.Shift.filter({ status: 'active' }, '-created_date', 100)
    });

    const activeShift = selectedDriver 
        ? allActiveShifts.find(shift => shift.driver_name === selectedDriver)
        : null;

    const { data: runs = [], isLoading: runsLoading } = useQuery({
        queryKey: ['runs', activeShift?.id],
        queryFn: () => activeShift ? api.entities.Run.filter({ shift_id: activeShift.id }, '-created_date') : [],
        enabled: !!activeShift
    });

    const startShiftMutation = useMutation({
        mutationFn: (data) => {
            const attendanceStatus = computeAttendanceStatus(data.shift_type, data.start_time);
            return api.entities.Shift.create({ ...data, attendance_status: attendanceStatus });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeShifts'] })
    });

    const ptoMutation = useMutation({
        mutationFn: (data) => api.entities.Shift.create({ ...data, attendance_status: 'pto' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeShifts'] })
    });

    const cancelShiftMutation = useMutation({
        mutationFn: async (shiftId) => {
            const shiftRuns = runs;
            for (const run of shiftRuns) {
                await api.entities.Run.delete(run.id);
            }
            await api.entities.Shift.delete(shiftId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            queryClient.invalidateQueries({ queryKey: ['runs'] });
        }
    });

    const addRunMutation = useMutation({
        mutationFn: (data) => api.entities.Run.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs'] });
            setShowAddRun(false);
        }
    });

    const updateRunMutation = useMutation({
        mutationFn: ({ id, data }) => api.entities.Run.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs'] });
            setEditingRun(null);
        }
    });

    const endShiftMutation = useMutation({
        mutationFn: (data) => api.entities.Shift.update(activeShift.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            queryClient.invalidateQueries({ queryKey: ['runs'] });
        }
    });

    if (shiftsLoading || driversLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-950 to-amber-950/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-950 to-amber-950/20">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-light tracking-tight text-white">
                        Driver's <span className="font-semibold">Log</span>
                    </h1>
                    <p className="text-white/60 mt-1">Track your shifts and runs</p>
                </div>

                {/* Driver Selection */}
                <Card className="border-0 shadow-md bg-black/60 backdrop-blur-sm mb-6">
                    <CardContent className="p-4">
                        <Label className="text-sm font-medium text-white/70 mb-2 block flex items-center gap-2">
                            <User className="h-4 w-4" /> Select Driver
                        </Label>
                        <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                            <SelectTrigger className="h-11 border-slate-200 rounded-xl">
                                <SelectValue placeholder="Select your name to begin" />
                            </SelectTrigger>
                            <SelectContent>
                                {drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.name}>
                                        {driver.name}
                                        {allActiveShifts.find(s => s.driver_name === driver.name) && (
                                            <span className="ml-2 text-xs text-amber-300">● Active</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {!selectedDriver ? (
                    <>
                        <div className="text-center py-12 px-6 bg-black/50 rounded-2xl border border-dashed border-slate-200 mb-6">
                            <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-white/60 font-medium">Select your name to get started</p>
                        </div>

                        {allActiveShifts.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-amber-300" />
                                    Active Shifts
                                    <span className="text-sm font-normal text-slate-400">({allActiveShifts.length})</span>
                                </h2>
                                <div className="grid gap-3">
                                    {allActiveShifts.map((shift) => {
                                        const isNight = shift.shift_type === 'night';
                                        return (
                                            <Card key={shift.id} className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${
                                                isNight ? 'bg-gradient-to-br from-indigo-50 to-purple-50' : 'bg-gradient-to-br from-amber-500/10 to-amber-600/10'
                                            }`}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1" onClick={() => setSelectedDriver(shift.driver_name)}>
                                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                                                isNight ? 'bg-gradient-to-br from-indigo-100 to-purple-100' : 'bg-gradient-to-br from-amber-500/15 to-amber-600/15'
                                                            }`}>
                                                                <User className={`h-5 w-5 ${isNight ? 'text-indigo-600' : 'text-amber-300'}`} />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-white">{shift.driver_name}</div>
                                                                <div className="text-sm text-white/60">Unit {shift.unit_number} • Started {format(new Date(shift.start_time), 'h:mm a')}</div>
                                                            </div>
                                                            <Badge className={`ml-auto ${isNight ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-500/15 text-amber-200'} border-0`}>
                                                                {isNight ? 'Night' : 'Day'}
                                                            </Badge>
                                                        </div>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Cancel Shift</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to cancel {shift.driver_name}'s shift? All runs will be deleted.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-xl">Keep Shift</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={async () => {
                                                                        const shiftRuns = await api.entities.Run.filter({ shift_id: shift.id });
                                                                        for (const run of shiftRuns) { await api.entities.Run.delete(run.id); }
                                                                        await api.entities.Shift.delete(shift.id);
                                                                        queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
                                                                    }} className="bg-red-600 hover:bg-red-700 rounded-xl">
                                                                        Cancel Shift
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <AnimatePresence mode="wait">
                        {!activeShift ? (
                            <motion.div key="start-shift" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                <StartShiftForm 
                                    onSubmit={(data) => startShiftMutation.mutate({...data, driver_name: selectedDriver})}
                                    onPTO={(data) => ptoMutation.mutate({...data, driver_name: selectedDriver})}
                                    isLoading={startShiftMutation.isPending || ptoMutation.isPending}
                                    drivers={drivers}
                                />
                            </motion.div>
                        ) : (
                            <motion.div key="active-shift" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                                <ActiveShiftCard 
                                    shift={activeShift} 
                                    onCancel={() => cancelShiftMutation.mutate(activeShift.id)}
                                    onDriverClick={() => setSelectedDriver('')}
                                />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <Route className="h-5 w-5 text-blue-500" />
                                            Today's Runs
                                            <span className="text-sm font-normal text-slate-400">({runs.length})</span>
                                        </h2>
                                        {!showAddRun && (
                                            <Button onClick={() => setShowAddRun(true)}
                                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25">
                                                <Plus className="h-4 w-4 mr-2" /> Add Run
                                            </Button>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {showAddRun && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <AddRunForm
                                                    shiftId={activeShift.id}
                                                    driverName={activeShift.driver_name}
                                                    onSubmit={(data) => addRunMutation.mutate(data)}
                                                    isLoading={addRunMutation.isPending}
                                                    onCancel={() => setShowAddRun(false)}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {runsLoading ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : runs.length === 0 ? (
                                        <div className="text-center py-12 px-6 bg-black/50 rounded-2xl border border-dashed border-slate-200">
                                            <Route className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-white/60 font-medium">No runs logged yet</p>
                                            <p className="text-slate-400 text-sm mt-1">Add your first run to get started</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {runs.map((run, index) => (
                                                <motion.div key={run.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                                                    <RunCard 
                                                        run={run} 
                                                        index={index} 
                                                        isCurrentRun={index === 0}
                                                        onClick={() => setEditingRun(run)}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <EndShiftForm shift={activeShift} onSubmit={(data) => endShiftMutation.mutate(data)} isLoading={endShiftMutation.isPending} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

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
    );
}
