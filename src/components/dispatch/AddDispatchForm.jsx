import React, { useState, useEffect } from 'react';
import { Plus, Table } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';

const initialForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  company: '',
  trailer_number: '',
  notes: '',
  dock_hours: '',
  bol: '',
  item: '',
  delivered_by: ''
};

export default function AddDispatchForm({ onAdd, defaultDate }) {
  const [form, setForm] = useState(initialForm);
  const [bulkData, setBulkData] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (defaultDate) {
      setForm(prev => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    await onAdd(form);
    setForm({ ...initialForm, date: form.date });
    setIsExpanded(false);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkData.trim()) return;

    const lines = bulkData.trim().split('\n');
    const entries = lines.map(line => {
      const cols = line.split('\t');
      return {
        date: form.date,
        company: cols[0] || '',
        trailer_number: cols[1] || '',
        notes: cols[2] || '',
        dock_hours: cols[3] || '',
        bol: cols[4] || '',
        item: cols[5] || '',
        delivered_by: cols[6] || ''
      };
    }).filter(entry => entry.company.trim());

    for (const entry of entries) {
      await onAdd(entry);
    }

    setBulkData('');
    setIsExpanded(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isExpanded) {
    return (
      <Button 
        onClick={() => setIsExpanded(true)}
        className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-12 px-6 shadow-lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add New Entry
      </Button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Dispatch Entry</h3>
      
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="single">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Paste</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Company *</label>
          <Input
            value={form.company}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="Company name"
            className="h-10"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Trailer #</label>
          <Input
            value={form.trailer_number}
            onChange={(e) => handleChange('trailer_number', e.target.value)}
            placeholder="e.g. 1256"
            className="h-10"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">BOL</label>
          <Input
            value={form.bol}
            onChange={(e) => handleChange('bol', e.target.value)}
            placeholder="e.g. 138411"
            className="h-10"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
          <Input
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes"
            className="h-10"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Dock Hours</label>
          <Input
            value={form.dock_hours}
            onChange={(e) => handleChange('dock_hours', e.target.value)}
            placeholder="e.g. 6am - 4am"
            className="h-10"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Item</label>
          <Input
            value={form.item}
            onChange={(e) => handleChange('item', e.target.value)}
            placeholder="e.g. 96x48"
            className="h-10"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
        <Button type="button" variant="ghost" onClick={() => setIsExpanded(false)} className="text-slate-500">
          Cancel
        </Button>
      </div>
          </form>
        </TabsContent>

        <TabsContent value="bulk">
          <form onSubmit={handleBulkSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Paste from Excel (Company, Trailer#, Notes, Dock Hours, BOL, Item, Delivered)
                </label>
                <Textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="Paste your Excel rows here (tab-separated)&#10;Example:&#10;Uline - T6&#9;1296&#9;Missing&#9;6am - 4am&#9;138436&#9;96x48&#9;"
                  className="h-48 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Tip: Copy rows from Excel and paste here. Each row will create a new entry with today's date.
                </p>
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                  <Table className="h-4 w-4 mr-2" />
                  Import {bulkData.split('\n').filter(l => l.trim()).length} Entries
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsExpanded(false)} className="text-slate-500">
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}