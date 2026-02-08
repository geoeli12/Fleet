
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Truck, History, ClipboardList, Users, CalendarDays } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
    const navItems = [
        { name: 'DriverLog', label: 'Log', icon: ClipboardList },
        { name: 'ShiftHistory', label: 'History', icon: History },
        { name: 'Calendar', label: 'Calendar', icon: CalendarDays },
        { name: 'Schedule', label: 'Schedule', icon: ClipboardList },
        { name: 'Drivers', label: 'Drivers', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link to={createPageUrl('DriverLog')} className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <Truck className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-semibold text-slate-800 tracking-tight">
                                Driver<span className="text-emerald-600">Log</span>
                            </span>
                        </Link>

                        <nav className="flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPageName === item.name;
                                return (
                                    <Link
                                        key={item.name}
                                        to={createPageUrl(item.name)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </header>

            <main>
                {children}
            </main>
        </div>
    );
}

