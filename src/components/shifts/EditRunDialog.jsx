
import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TruckIcon, PackageCheck, Plus } from "lucide-react";

const DEFAULT_LOAD_TYPES = ['scrap', 'occ', 'mix', 'empty'];

export default function EditRunDialog({ run, open, onClose, onSave, isSaving }) {
    const [data, setData] = useState({
        run_type: run?.run_type || 'delivery',
        city: run?.city || '',
        customer_name: run?.customer_name || '',
        trailer_dropped: run?.trailer_dropped || '',
        trailer_picked_up: run?.trailer_picked_up || '',
        load_type: run?.load_type || '',
        arrival_time: run?.arrival_time ? new Date(run.arrival_time).toISOString().slice(0, 16) : '',
        departure_time: run?.departure_time ? new Date(run.departure_time).toISOString().slice(0, 16) : '',
        notes: run?.notes || ''
    });

    const { data: customLoadTypes = [] } = useQuery({
        queryKey: ['customLoadTypes'],
        queryFn: () => api.entities.CustomLoadType.list('name')
    });

    const allLoadTypes = [
        ...DEFAULT_LOAD_TYPES,
        ...customLoadTypes.map(t => t.name.toLowerCase()).filter(n => !DEFAULT_LOAD_TYPES.includes(n))
    ];

    // Also include the run's load_type if it's not in the list
    if (run?.load_type && !allLoadTypes.includes(run.load_type)) {
        allLoadTypes.push(run.load_type);
    }

    const handleSave = () => {
        onSave({
            ...data,
            arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : null,
            departure_time: data.departure_time ? new Date(data.departure_time).toISOString() : null
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Run</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Run Type</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setData({...data, run_type: 'delivery'})}
                                className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                    data.run_type === 'delivery' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-black text-white/70'
                                }`}>
                                <TruckIcon className="h-4 w-4" /> Delivery
                            </button>
                            <button type="button" onClick={() => setData({...data, run_type: 'pickup'})}
                                className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                    data.run_type === 'pickup' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-slate-200 bg-black text-white/70'
                                }`}>
                                <PackageCheck className="h-4 w-4" /> Pickup
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Input value={data.city} onChange={(e) => setData({...data, city: e.target.value})} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Input value={data.customer_name} onChange={(e) => setData({...data, customer_name: e.target.value})} className="rounded-xl" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Trailer Dropped</Label>
                            <Input value={data.trailer_dropped} onChange={(e) => setData({...data, trailer_dropped: e.target.value})} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Trailer Picked Up</Label>
                            <Input value={data.trailer_picked_up} onChange={(e) => setData({...data, trailer_picked_up: e.target.value})} className="rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Load Type</Label>
                        <Select value={data.load_type} onValueChange={(value) => setData({...data, load_type: value})}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select load type" /></SelectTrigger>
                            <SelectContent>
                                {allLoadTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Arrival Time</Label>
                            <Input type="datetime-local" value={data.arrival_time} onChange={(e) => setData({...data, arrival_time: e.target.value})} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Departure Time</Label>
                            <Input type="datetime-local" value={data.departure_time} onChange={(e) => setData({...data, departure_time: e.target.value})} className="rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={data.notes} onChange={(e) => setData({...data, notes: e.target.value})} className="rounded-xl resize-none" rows={2} />
                    </div>
                </div>
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => onClose(false)} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 rounded-xl">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

