
import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Plus, User, Phone, Loader2, Pencil, Trash2, Users } from "lucide-react";

export default function Drivers() {
    const [isOpen, setIsOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', state: 'IL' });
    const queryClient = useQueryClient();

    const { data: drivers = [], isLoading } = useQuery({
        queryKey: ['allDrivers'],
        queryFn: () => api.entities.Driver.list('name')
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.entities.Driver.create({ ...data, status: 'active' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            setIsOpen(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.entities.Driver.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            setIsOpen(false);
            setEditingDriver(null);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.entities.Driver.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
        }
    });

    const resetForm = () => {
        setFormData({ name: '', phone: '', state: 'IL' });
    };

    const handleEdit = (driver) => {
        setEditingDriver(driver);
        setFormData({ name: driver.name, phone: driver.phone || '', state: driver.state || 'IL' });
        setIsOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingDriver) {
            updateMutation.mutate({ id: editingDriver.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setEditingDriver(null);
            resetForm();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-light tracking-tight text-slate-800">
                            Manage <span className="font-semibold">Drivers</span>
                        </h1>
                        <p className="text-slate-500 mt-1">{drivers.length} drivers registered</p>
                    </div>
                    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/25">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Driver
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-emerald-500" />
                                    {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Driver Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        placeholder="e.g. (555) 123-4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, state: 'IL'})}
                                            className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all font-medium ${
                                                formData.state === 'IL'
                                                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            IL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, state: 'PA'})}
                                            className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all font-medium ${
                                                formData.state === 'PA'
                                                    ? 'border-green-400 bg-green-50 text-green-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            PA
                                        </button>
                                    </div>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button 
                                        type="submit" 
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingDriver ? 'Update Driver' : 'Add Driver'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {drivers.length === 0 ? (
                    <div className="text-center py-16 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium text-lg">No drivers yet</p>
                        <p className="text-slate-400 mt-1">Add your first driver to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drivers.map((driver) => (
                            <Card key={driver.id} className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800">{driver.name}</div>
                                                {driver.state && (
                                                    <div className="text-xs text-slate-500 font-medium">
                                                        {driver.state}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={`${driver.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} border-0`}>
                                            {driver.status}
                                        </Badge>
                                    </div>
                                    {driver.phone && (
                                        <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                                            <Phone className="h-4 w-4" />
                                            {driver.phone}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(driver)}
                                            className="flex-1 rounded-lg"
                                        >
                                            <Pencil className="h-3.5 w-3.5 mr-1" />
                                            Edit
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-2xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Driver</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete {driver.name}? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => deleteMutation.mutate(driver.id)}
                                                        className="bg-red-600 hover:bg-red-700 rounded-xl"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

