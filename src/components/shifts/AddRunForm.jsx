
import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Building2, Package, Clock, Plus, ArrowRightLeft, TruckIcon, PackageCheck, FileText } from "lucide-react";

const DEFAULT_LOAD_TYPES = ['scrap', 'occ', 'mix', 'empty'];

export default function AddRunForm({ shiftId, driverName, onSubmit, isLoading, onCancel }) {
    const [formData, setFormData] = useState({
        run_type: 'delivery',
        city: '',
        customer_name: '',
        trailer_dropped: '',
        trailer_picked_up: '',
        load_type: '',
        arrival_time: '',
        departure_time: '',
        notes: ''
    });
    const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const queryClient = useQueryClient();

    const { data: customLoadTypes = [] } = useQuery({
        queryKey: ['customLoadTypes'],
        queryFn: () => api.entities.CustomLoadType.list('name')
    });

    const createCustomTypeMutation = useMutation({
        mutationFn: (data) => api.entities.CustomLoadType.create(data),
        onSuccess: (newType) => {
            queryClient.invalidateQueries({ queryKey: ['customLoadTypes'] });
            setFormData({...formData, load_type: newTypeName.toLowerCase()});
            setNewTypeName('');
            setShowNewTypeDialog(false);
        }
    });

    const allLoadTypes = [
        ...DEFAULT_LOAD_TYPES,
        ...customLoadTypes.map(t => t.name.toLowerCase()).filter(n => !DEFAULT_LOAD_TYPES.includes(n))
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const now = new Date();
        onSubmit({
            ...formData,
            shift_id: shiftId,
            driver_name: driverName,
            arrival_time: formData.arrival_time ? new Date(formData.arrival_time).toISOString() : null,
            departure_time: formData.departure_time ? new Date(formData.departure_time).toISOString() : null,
            date: now.toISOString().split('T')[0]
        });
        setFormData({
            run_type: 'delivery',
            city: '',
            customer_name: '',
            trailer_dropped: '',
            trailer_picked_up: '',
            load_type: '',
            arrival_time: '',
            departure_time: '',
            notes: ''
        });
    };

    const handleLoadTypeChange = (value) => {
        if (value === '__add_new__') {
            setShowNewTypeDialog(true);
        } else {
            setFormData({...formData, load_type: value});
        }
    };

    return (
        <>
            <Card className="border-0 shadow-lg bg-black/90 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-white" />
                        </div>
                        Add New Run
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-white/70">Run Type</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, run_type: 'delivery'})}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                        formData.run_type === 'delivery' 
                                            ? 'border-blue-400 bg-blue-50 text-blue-700' 
                                            : 'border-slate-200 bg-black text-white/70 hover:border-slate-300'
                                    }`}
                                >
                                    <TruckIcon className="h-4 w-4" />
                                    Delivery
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, run_type: 'pickup'})}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                        formData.run_type === 'pickup' 
                                            ? 'border-amber-400 bg-amber-500/10 text-amber-200' 
                                            : 'border-slate-200 bg-black text-white/70 hover:border-slate-300'
                                    }`}
                                >
                                    <PackageCheck className="h-4 w-4" />
                                    Pickup
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5" /> City
                                </Label>
                                <Input placeholder="Enter city" value={formData.city}
                                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> Customer Name
                                </Label>
                                <Input placeholder="Enter customer" value={formData.customer_name}
                                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <ArrowRightLeft className="h-3.5 w-3.5" /> Trailer Dropped
                                </Label>
                                <Input placeholder="Trailer # dropped" value={formData.trailer_dropped}
                                    onChange={(e) => setFormData({...formData, trailer_dropped: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <ArrowRightLeft className="h-3.5 w-3.5" /> Trailer Picked Up
                                </Label>
                                <Input placeholder="Trailer # picked up" value={formData.trailer_picked_up}
                                    onChange={(e) => setFormData({...formData, trailer_picked_up: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" /> Load Type
                            </Label>
                            <Select value={formData.load_type} onValueChange={handleLoadTypeChange}>
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl">
                                    <SelectValue placeholder="Select load type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allLoadTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                                    ))}
                                    <SelectItem value="__add_new__">
                                        <span className="flex items-center gap-2 text-blue-600">
                                            <Plus className="h-3.5 w-3.5" /> Add new type...
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" /> Arrival Time
                                </Label>
                                <Input type="datetime-local" value={formData.arrival_time}
                                    onChange={(e) => setFormData({...formData, arrival_time: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" /> Departure Time
                                </Label>
                                <Input type="datetime-local" value={formData.departure_time}
                                    onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Notes
                            </Label>
                            <Textarea placeholder="Add any additional notes..." value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                className="border-slate-200 rounded-xl resize-none" rows={2} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onCancel}
                                className="flex-1 h-11 rounded-xl border-slate-200">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}
                                className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25">
                                {isLoading ? 'Adding...' : 'Add Run'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Load Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            placeholder="Enter load type name"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewTypeDialog(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createCustomTypeMutation.mutate({ name: newTypeName })}
                            disabled={!newTypeName.trim() || createCustomTypeMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            {createCustomTypeMutation.isPending ? 'Adding...' : 'Add Type'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

