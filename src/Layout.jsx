import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { History, ClipboardList, Users, CalendarDays, Fuel, Droplets } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
    const navItems = [
        { name: 'DriverLog', label: 'Log', icon: ClipboardList },
        { name: 'ShiftHistory', label: 'History', icon: History },
        { name: 'Calendar', label: 'Calendar', icon: CalendarDays },
        { name: 'Schedule', label: 'Schedule', icon: ClipboardList },
        { name: 'FuelDashboard', label: 'Fuel', icon: Fuel },
        { name: 'FuelHistory', label: 'Fuel History', icon: Droplets },
        { name: 'Drivers', label: 'Drivers', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-black/5 via-background to-background text-foreground">
            <header className="sticky top-0 z-50 border-b border-black/10 bg-black/80 backdrop-blur-lg">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link to={createPageUrl('DriverLog')} className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/10 overflow-hidden">
                                <img
                                    src="/ash_pallet_logo.svg"
                                    alt="ASH Pallet Management"
                                    className="h-8 w-8 object-contain"
                                    loading="eager"
                                />
                            </div>
                            <div className="leading-tight">
                                <div className="text-sm font-semibold tracking-wide text-amber-300">
                                    ASH Pallet Management
                                </div>
                                <div className="text-xs text-white/70">
                                    DriverLog
                                </div>
                            </div>
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
                                                ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25'
                                                : 'text-white/80 hover:bg-white/10 hover:text-white'
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

            <main className="pb-10">
                {children}
            </main>
        </div>
    );
}
