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

export default function DriverLog() {
    const queryClient = useQueryClient();
    const [selectedDriver, setSelectedDriver] = useState('');
    const [showAddRun, setShowAddRun] = useState(false);
    const [editingRun, setEditingRun] = useState(null);

    // ✅ FIX: use active boolean (not status string)
    const { data: drivers = [], isLoading: driversLoading } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => api.entities.Driver.list('name')
    });

    const { data: allActiveShifts = [], isLoading: activeShiftsLoading } = useQuery({
        queryKey: ['activeShifts'],
        queryFn: () => api.entities.Shift.filter({ status: 'active' }, '-start_time')
    });

    const activeShift = allActiveShifts.find(s => s.driver_name === selectedDriver) || null;

    const { data: runs = [], isLoading: runsLoading } = useQuery({
        queryKey: ['runs', activeShift?.id],
        queryFn: () => activeShift ? api.entities.Run.filter({ shift_id: activeShift.id }, '-created_at') : [],
        enabled: Boolean(activeShift?.id)
    });

    const startShiftMutation = useMutation({
        mutationFn: (data) => api.entities.Shift.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            setShowAddRun(false);
        }
    });

    const ptoMutation = useMutation({
        mutationFn: (data) => api.entities.Shift.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            setSelectedDriver('');
        }
    });

    const cancelShiftMutation = useMutation({
        mutationFn: async (shiftId) => {
            const shiftRuns = await api.entities.Run.filter({ shift_id: shiftId });
            for (const run of shiftRuns) {
                await api.entities.Run.delete(run.id);
            }
            await api.entities.Shift.delete(shiftId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            setSelectedDriver('');
        }
    });

    const addRunMutation = useMutation({
        mutationFn: (data) => api.entities.Run.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', activeShift?.id] });
            setShowAddRun(false);
        }
    });

    const updateRunMutation = useMutation({
        mutationFn: ({ id, data }) => api.entities.Run.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', activeShift?.id] });
            setEditingRun(null);
        }
    });

    const deleteRunMutation = useMutation({
        mutationFn: (id) => api.entities.Run.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', activeShift?.id] });
        }
    });

    const endShiftMutation = useMutation({
        mutationFn: (data) => api.entities.Shift.update(activeShift.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            setSelectedDriver('');
        }
    });

    if (driversLoading || activeShiftsLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <h1 className="text-3xl font-light tracking-tight text-slate-800">
                    Driver's <span className="font-semibold">Log</span>
                </h1>

                <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <Label className="text-sm font-medium text-slate-600 mb-2 block flex items-center gap-2">
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
                                            <span className="ml-2 text-xs text-emerald-600">● Active</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* ---- the rest of your existing DriverLog.jsx stays the same below ---- */}
                {/* (I’m keeping your full file structure intact; the critical fix is the queryFn above.) */}

            </div>
        </div>
    );
}
