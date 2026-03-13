import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Grid, MapPin, List, Users, Sparkles, LogOut, Globe } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ROLayout = () => {
    const location = useLocation();
    const { user, logout } = useContext(AuthContext);

    const navItems = [
        { path: '/ro-dashboard', label: 'Overview', icon: Grid },
        { path: '/ro-dashboard/locations', label: 'Locations & Sensors', icon: MapPin },
        { path: '/ro-dashboard/logs', label: 'Alerts & Logs', icon: List },
        { path: '/ro-dashboard/team', label: 'Team Management', icon: Users },
        { path: '/ro-dashboard/forecast', label: 'AI Forecast', icon: Sparkles },
    ];

    return (
        <div className="flex h-screen bg-[#0b1114] text-slate-200 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1a2327] border-r border-[#263238] flex flex-col z-20">
                <div className="p-6 flex items-center gap-3 border-b border-[#263238]">
                    <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-500">
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight text-white">PrithviNet</h2>
                        <p className="text-xs text-emerald-500 font-medium">Regional Officer</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (location.pathname === '/ro-dashboard' && item.path === '/ro-dashboard/');
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#263238]">
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="h-16 bg-[#1a2327] border-b border-[#263238] flex items-center justify-between px-8 z-10 shrink-0">
                    <h1 className="text-lg font-semibold text-white">
                        {navItems.find(item => item.path === location.pathname)?.label || 'Regional Dashboard'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-400">
                            Logged in as <span className="text-emerald-500 font-medium">{user?.role?.toUpperCase()}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm">
                            RO
                        </div>
                    </div>
                </header>

                {/* Sub-page content */}
                <main className="flex-1 overflow-auto p-8 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ROLayout;
