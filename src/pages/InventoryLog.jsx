import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Search, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function InventoryLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['inventoryEntries'],
    queryFn: () => api.entities.InventoryEntry.list('-date'),
  });

  const calculate48x40Total = (entry) => {
    return (entry.pallet_48x40_1 || 0) + (entry.pallet_48x40_2 || 0);
  };

  const calculateGrandTotal = (entry) => {
    const total48x40 = calculate48x40Total(entry);
    return total48x40 + 
      (entry.large_odd || 0) +
      (entry.chep_peco || 0) +
      (entry.scrap_pull || 0) +
      (entry.small_odd || 0) +
      (entry.trash_pallets || 0) +
      (entry.euro_pallets || 0) +
      (entry.block_pallets || 0) +
      (entry.stringer_pallets || 0) +
      (entry.plastic_pallets || 0);
  };

  // Group entries by date
  const groupedByDate = entries.reduce((acc, entry) => {
    const date = entry.date || 'No Date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return new Date(b) - new Date(a);
  });

  // Filter entries
  const filteredDates = sortedDates.filter(date => {
    if (dateFilter && date !== dateFilter) return false;
    if (searchTerm) {
      return groupedByDate[date].some(entry => 
        entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.trailer_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const filteredGroupedByDate = filteredDates.reduce((acc, date) => {
    if (searchTerm) {
      acc[date] = groupedByDate[date].filter(entry =>
        entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.trailer_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      acc[date] = groupedByDate[date];
    }
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Inventory Log</h1>
              <p className="text-sm text-slate-500">View entries organized by date</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search customer, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            {(searchTerm || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Entries by Date */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Loading entries...
            </CardContent>
          </Card>
        ) : filteredDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredDates.map((date) => {
              const dateEntries = filteredGroupedByDate[date];
              const totalForDate = dateEntries.reduce((sum, entry) => sum + calculateGrandTotal(entry), 0);
              
              return (
                <Card key={date} className="shadow-sm border-slate-200">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span>
                          {date === 'No Date' ? 'No Date' : format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="text-sm font-normal text-slate-500">
                          ({dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'})
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-slate-700">Total: {totalForDate}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs font-semibold">Customer</TableHead>
                          <TableHead className="text-xs font-semibold">Trailer #</TableHead>
                          <TableHead className="text-xs font-semibold">Counted By</TableHead>
                          <TableHead className="text-xs font-semibold">Received Date</TableHead>
                          <TableHead className="text-xs font-semibold bg-yellow-50">48x40 #1</TableHead>
                          <TableHead className="text-xs font-semibold bg-yellow-50">48x40 #2</TableHead>
                          <TableHead className="text-xs font-semibold bg-yellow-100">48x40 Total</TableHead>
                          <TableHead className="text-xs font-semibold">Large Odd</TableHead>
                          <TableHead className="text-xs font-semibold">Small Odd</TableHead>
                          <TableHead className="text-xs font-semibold">CHEP/PECO</TableHead>
                          <TableHead className="text-xs font-semibold">Trash</TableHead>
                          <TableHead className="text-xs font-semibold">Euro</TableHead>
                          <TableHead className="text-xs font-semibold">Block</TableHead>
                          <TableHead className="text-xs font-semibold">Stringer</TableHead>
                          <TableHead className="text-xs font-semibold bg-green-50">Plastic</TableHead>
                          <TableHead className="text-xs font-semibold bg-green-100">Grand Total</TableHead>
                          <TableHead className="text-xs font-semibold">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateEntries.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-slate-50">
                            <TableCell className="font-medium text-sm">{entry.customer_name}</TableCell>
                            <TableCell className="text-sm">{entry.trailer_number || '-'}</TableCell>
                            <TableCell className="text-sm">{entry.counted_by || '-'}</TableCell>
                            <TableCell className="text-sm">{entry.date_count_received || '-'}</TableCell>
                            <TableCell className="text-sm bg-yellow-50 text-center">{entry.pallet_48x40_1 || 0}</TableCell>
                            <TableCell className="text-sm bg-yellow-50 text-center">{entry.pallet_48x40_2 || 0}</TableCell>
                            <TableCell className="text-sm font-semibold bg-yellow-100 text-center">{calculate48x40Total(entry)}</TableCell>
                            <TableCell className="text-sm text-center">{entry.large_odd || 0}</TableCell>
                            <TableCell className="text-sm text-center">{entry.small_odd || 0}</TableCell>
                            <TableCell className="text-sm text-center">{entry.chep_peco || 0}</TableCell>
                            <TableCell className="text-sm text-center">{entry.trash_pallets || 0}</TableCell>
                            <TableCell className="text-sm text-center">{entry.euro_pallets || 0}</TableCell>
                            <TableCell className="text-sm text-center">{entry.block_pallets || 0}</TableCell>
                            <TableCell className="text-sm text-center">{entry.stringer_pallets || 0}</TableCell>
                            <TableCell className="text-sm bg-green-50 text-center">{entry.plastic_pallets || 0}</TableCell>
                            <TableCell className="text-sm font-semibold bg-green-100 text-center">{calculateGrandTotal(entry)}</TableCell>
                            <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{entry.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}