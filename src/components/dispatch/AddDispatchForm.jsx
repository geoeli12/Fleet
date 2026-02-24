import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// One example row (shows in the grid until the user clicks into any column)
const exampleRow = {
  company: 'Uline - U6',
  trailer_number: '1256',
  notes: 'Leave at dock 3',
  dock_hours: '660',
  bol: '6592',
  item: '96x48',
  delivered_by: 'Yes'
};

const normalizeLines = (text) => {
  const raw = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = raw.split('\n').map(l => (l ?? '').toString().trim());
  // Trim trailing empty lines (common when pasting)
  let end = parts.length;
  while (end > 0 && !parts[end - 1]) end--;
  return parts.slice(0, end);
};

export default function AddDispatchForm({ onAdd, defaultDate }) {
  const [form, setForm] = useState(initialForm);
  const [isExpanded, setIsExpanded] = useState(false);

  // Bulk Paste (column-based)
  const [bulkCols, setBulkCols] = useState({ ...exampleRow });
  const [exampleActive, setExampleActive] = useState(true);
  const shouldRefocus = useRef({ field: null });

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

  const clearBulk = () => {
    setBulkCols({
      company: '',
      trailer_number: '',
      notes: '',
      dock_hours: '',
      bol: '',
      item: '',
      delivered_by: ''
    });
  };

  const bulkArrays = useMemo(() => {
    const a = {
      company: normalizeLines(bulkCols.company),
      trailer_number: normalizeLines(bulkCols.trailer_number),
      notes: normalizeLines(bulkCols.notes),
      dock_hours: normalizeLines(bulkCols.dock_hours),
      bol: normalizeLines(bulkCols.bol),
      item: normalizeLines(bulkCols.item),
      delivered_by: normalizeLines(bulkCols.delivered_by),
    };
    const maxLen = Math.max(
      a.company.length,
      a.trailer_number.length,
      a.notes.length,
      a.dock_hours.length,
      a.bol.length,
      a.item.length,
      a.delivered_by.length
    );
    return { a, maxLen };
  }, [bulkCols]);

  const bulkEntryCount = useMemo(() => {
    // While example is showing, treat it as 0 entries (so you don't accidentally import the sample)
    if (exampleActive) return 0;

    const { a, maxLen } = bulkArrays;
    let count = 0;
    for (let i = 0; i < maxLen; i++) {
      const company = (a.company[i] || '').trim();
      if (company) count++;
    }
    return count;
  }, [bulkArrays, exampleActive]);

  const handleBulkSubmit = async (e) => {
    e.preventDefault();

    if (exampleActive) return;

    const { a, maxLen } = bulkArrays;
    if (maxLen === 0) return;

    const entries = [];
    for (let i = 0; i < maxLen; i++) {
      const company = (a.company[i] || '').trim();
      if (!company) continue;

      entries.push({
        date: form.date,
        company,
        trailer_number: (a.trailer_number[i] || '').trim(),
        notes: (a.notes[i] || '').trim(),
        dock_hours: (a.dock_hours[i] || '').trim(),
        bol: (a.bol[i] || '').trim(),
        item: (a.item[i] || '').trim(),
        delivered_by: (a.delivered_by[i] || '').trim()
      });
    }

    for (const entry of entries) {
      await onAdd(entry);
    }

    clearBulk();
    // Reset back to example after import? No — keep it empty.
    
    setIsExpanded(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkColChange = (field, value) => {
    if (exampleActive) {
      // If user types without focusing first (rare), clear example first.
      setExampleActive(false);
      clearBulk();
      // Let the change apply after clear
      setTimeout(() => {
        setBulkCols(prev => ({ ...prev, [field]: value }));
      }, 0);
      return;
    }
    setBulkCols(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkFocus = (field) => {
    // Clicking into any column should clear the example data
    if (exampleActive) {
      shouldRefocus.current.field = field;
      setExampleActive(false);
      clearBulk();
    }
  };

  // Try to keep cursor in the clicked textarea after clearing example
  useEffect(() => {
    if (!exampleActive && shouldRefocus.current.field) {
      const id = `bulk-${shouldRefocus.current.field}`;
      const el = document.getElementById(id);
      if (el && typeof el.focus === 'function') el.focus();
      shouldRefocus.current.field = null;
    }
  }, [exampleActive]);

  if (!isExpanded) {
    return (
      <Button
        onClick={() => {
          // Reset example each time the form opens (matches "show one example")
          setBulkCols({ ...exampleRow });
          setExampleActive(true);
          setIsExpanded(true);
        }}
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
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Paste values into any column below. Each line is one order.
                  {exampleActive ? <span className="text-slate-400"> (click any column to start)</span> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    clearBulk();
                    setExampleActive(false);
                  }}
                  className="text-slate-500"
                >
                  Clear
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-7 gap-0 border-b border-slate-200 bg-slate-50">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Company</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Trailer #</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Notes</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Dock Hrs</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">BOL</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Item</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700">Delivered</div>
                  </div>

                  <div className="grid grid-cols-7 gap-0">
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-company"
                        value={bulkCols.company}
                        onFocus={() => handleBulkFocus('company')}
                        onChange={(e) => handleBulkColChange('company', e.target.value)}
                        placeholder="Company"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-trailer_number"
                        value={bulkCols.trailer_number}
                        onFocus={() => handleBulkFocus('trailer_number')}
                        onChange={(e) => handleBulkColChange('trailer_number', e.target.value)}
                        placeholder="Trailer #"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-notes"
                        value={bulkCols.notes}
                        onFocus={() => handleBulkFocus('notes')}
                        onChange={(e) => handleBulkColChange('notes', e.target.value)}
                        placeholder="Notes"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-dock_hours"
                        value={bulkCols.dock_hours}
                        onFocus={() => handleBulkFocus('dock_hours')}
                        onChange={(e) => handleBulkColChange('dock_hours', e.target.value)}
                        placeholder="Dock Hrs"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-bol"
                        value={bulkCols.bol}
                        onFocus={() => handleBulkFocus('bol')}
                        onChange={(e) => handleBulkColChange('bol', e.target.value)}
                        placeholder="BOL"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-item"
                        value={bulkCols.item}
                        onFocus={() => handleBulkFocus('item')}
                        onChange={(e) => handleBulkColChange('item', e.target.value)}
                        placeholder="Item"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="p-2">
                      <Textarea
                        id="bulk-delivered_by"
                        value={bulkCols.delivered_by}
                        onFocus={() => handleBulkFocus('delivered_by')}
                        onChange={(e) => handleBulkColChange('delivered_by', e.target.value)}
                        placeholder="Delivered"
                        className="h-56 font-mono text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Tip: Paste a vertical selection from Excel into any column. The importer matches lines by row number.
              </p>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  disabled={bulkEntryCount === 0}
                >
                  <Table className="h-4 w-4 mr-2" />
                  Import {bulkEntryCount} {bulkEntryCount === 1 ? 'Entry' : 'Entries'}
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
