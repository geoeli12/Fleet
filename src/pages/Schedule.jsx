
import React, { useState, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Download, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

export default function Schedule() {
    const [scheduleDate, setScheduleDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [activeTab, setActiveTab] = useState('day');
    const queryClient = useQueryClient();

    const { data: drivers = [] } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => api.entities.Driver.filter({ status: 'active' }, 'name')
    });

    const { data: schedules = [] } = useQuery({
        queryKey: ['schedules', scheduleDate],
        queryFn: async () => {
            const results = await api.entities.Schedule.filter({ date: scheduleDate });
            return results || [];
        }
    });

    const createScheduleMutation = useMutation({
        mutationFn: (data) => api.entities.Schedule.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast.success('Driver scheduled');
        }
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: (id) => api.entities.Schedule.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast.success('Schedule removed');
        }
    });

    const [formData, setFormData] = useState({
        driver_name: '',
        unit_number: '',
        planned_city: '',
        planned_customer: '',
        notes: ''
    });

    const handleAddDriver = () => {
        if (!formData.driver_name) {
            toast.error('Please select a driver');
            return;
        }

        createScheduleMutation.mutate({
            ...formData,
            date: scheduleDate,
            shift_type: activeTab,
            state: activeTab.includes('PA') ? 'PA' : 'IL'
        });

        setFormData({
            driver_name: '',
            unit_number: '',
            planned_city: '',
            planned_customer: '',
            notes: ''
        });
    };

    const handleExportExcel = () => {
        const shiftSchedules = schedules.filter(s => s.shift_type === activeTab);
        
        if (shiftSchedules.length === 0) {
            toast.error('No schedules to export');
            return;
        }

        const headers = ['Driver', 'Unit', 'City', 'Customer', 'Notes', 'State'];
        const rows = shiftSchedules.map(s => [
            s.driver_name,
            s.unit_number || '',
            s.planned_city || '',
            s.planned_customer || '',
            s.notes || '',
            s.state || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Schedule_${activeTab}_${scheduleDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('CSV file downloaded');
    };

    const filteredSchedules = schedules.filter(s => s.shift_type === activeTab);

    const ilDayDrivers = drivers.filter(d => d.state === 'IL');
    const paDayDrivers = drivers.filter(d => d.state === 'PA');

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-950 to-amber-950/20">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-light tracking-tight text-white">
                        Schedule <span className="font-semibold">Planning</span>
                    </h1>
                    <p className="text-white/60 mt-1">Plan driver shifts and runs</p>
                </div>

                {/* Date Selector */}
                <Card className="mb-6 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-amber-300" />
                            Schedule Date
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="max-w-xs"
                        />
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="day">Day (IL)</TabsTrigger>
                        <TabsTrigger value="night">Night (IL)</TabsTrigger>
                        <TabsTrigger value="dayPA">Day (PA)</TabsTrigger>
                        <TabsTrigger value="nightPA">Night (PA)</TabsTrigger>
                    </TabsList>

                    {['day', 'night', 'dayPA', 'nightPA'].map(shiftType => (
                        <TabsContent key={shiftType} value={shiftType}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Add Driver Form */}
                                <Card className="border-0 shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Plus className="h-5 w-5 text-amber-300" />
                                            Add Driver
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>Driver</Label>
                                            <Select
                                                value={formData.driver_name}
                                                onValueChange={(value) => setFormData({ ...formData, driver_name: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select driver" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(shiftType.includes('PA') ? paDayDrivers : ilDayDrivers).map(driver => (
                                                        <SelectItem key={driver.id} value={driver.name}>
                                                            {driver.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Unit Number</Label>
                                            <Input
                                                value={formData.unit_number}
                                                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                                                placeholder="e.g., 101"
                                            />
                                        </div>

                                        <div>
                                            <Label>Planned City</Label>
                                            <Input
                                                value={formData.planned_city}
                                                onChange={(e) => setFormData({ ...formData, planned_city: e.target.value })}
                                                placeholder="e.g., Chicago"
                                            />
                                        </div>

                                        <div>
                                            <Label>Planned Customer</Label>
                                            <Input
                                                value={formData.planned_customer}
                                                onChange={(e) => setFormData({ ...formData, planned_customer: e.target.value })}
                                                placeholder="Customer name"
                                            />
                                        </div>

                                        <div>
                                            <Label>Notes</Label>
                                            <Input
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                placeholder="Additional notes"
                                            />
                                        </div>

                                        <Button
                                            onClick={handleAddDriver}
                                            className="w-full bg-amber-600 hover:bg-amber-700"
                                            disabled={createScheduleMutation.isPending}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add to Schedule
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Scheduled Drivers */}
                                <Card className="lg:col-span-2 border-0 shadow-lg">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">
                                            Scheduled Drivers ({filteredSchedules.length})
                                        </CardTitle>
                                        <Button
                                            onClick={handleExportExcel}
                                            variant="outline"
                                            size="sm"
                                            disabled={filteredSchedules.length === 0}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export Excel
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {filteredSchedules.length === 0 ? (
                                            <div className="text-center py-12 text-white/60">
                                                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                                <p>No drivers scheduled yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {filteredSchedules.map(schedule => (
                                                    <div
                                                        key={schedule.id}
                                                        className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-xl p-4 border border-amber-400/20"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-white mb-2">
                                                                    {schedule.driver_name}
                                                                    {schedule.unit_number && (
                                                                        <span className="text-sm text-white/60 ml-2">
                                                                            Unit {schedule.unit_number}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-white/70 space-y-1">
                                                                    {schedule.planned_city && (
                                                                        <div>📍 {schedule.planned_city}</div>
                                                                    )}
                                                                    {schedule.planned_customer && (
                                                                        <div>🏢 {schedule.planned_customer}</div>
                                                                    )}
                                                                    {schedule.notes && (
                                                                        <div>📝 {schedule.notes}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}

