import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import api from '../api/axios';

import {
    Grid,
    Database,
    Shield,
    Sparkles,
    Users,
    LogOut,
    Globe,
    ClipboardList
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import bgDark from '../assets/bg/prithvinet-bg.png';

const AdminLayout = () => {
    const location = useLocation();
    const { user, logout } = useContext(AuthContext);
    const [alertCount, setAlertCount] = useState(0);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await api.get('/api/alerts');
                const missingLimits = res.data.filter(a => a.alert_type === 'LIMIT_MISSING' && a.status === 'UNRESOLVED').length;
                setAlertCount(missingLimits);
            } catch (err) {
                console.error("Failed to fetch alerts in layout", err);
            }
        };
        fetchAlerts();
        const handleUpdate = () => fetchAlerts();
        window.addEventListener('policyUpdated', handleUpdate);
        const interval = setInterval(fetchAlerts, 30000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('policyUpdated', handleUpdate);
        };
    }, []);

    const navItems = [
        { path: '/admin-dashboard', label: 'Overview', icon: Grid },
        { path: '/admin-dashboard/offices', label: 'Master Data (ROs)', icon: Database },
        { path: '/admin-dashboard/industries', label: 'Master Data (Ind.)', icon: Database },
        { path: '/admin-dashboard/policy', label: 'Policy & Limits', icon: Shield, badge: alertCount },
        { path: '/admin-dashboard/copilot', label: 'AI Copilot & Forecast', icon: Sparkles },
        { path: '/admin-dashboard/users', label: 'User Management', icon: Users },
        { path: '/admin-dashboard/citizen-reports', label: 'Citizen Reports', icon: ClipboardList },
    ];

    const pageTitle =
        navItems.find(item => item.path === location.pathname)?.label ||
        'Super Admin Dashboard';

    return (
        <div className="relative h-screen font-sans overflow-hidden" style={{ backgroundColor: '#0b1114', color: '#94a3b8' }}>

            {/* Background Image */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <img src={bgDark} alt="background" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#0b1114]/90"></div>
            </div>

            {/* Ambient Glow */}
            <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] pointer-events-none"></div>

            {/* Layout */}
            <div className="relative z-10 flex h-full">

                {/* Sidebar */}
                <aside className="w-64 flex flex-col" style={{ backgroundColor: 'rgba(26, 35, 39, 0.9)', borderRight: '1px solid #263238' }}>
                    <div className="backdrop-blur-md w-full h-full flex flex-col">

                        {/* Logo */}
                        <div className="p-6 flex items-center gap-3" style={{ borderBottom: '1px solid #263238' }}>
                            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30 text-emerald-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-white">PrithviNet</h2>
                                <p className="text-xs text-emerald-400 font-medium">State HQ Portal</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    location.pathname === item.path ||
                                    location.pathname.startsWith(item.path + '/');

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                                            isActive
                                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold'
                                                : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-5 h-5" />
                                            {item.label}
                                        </div>
                                        {item.badge > 0 && (
                                            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Logout */}
                        <div className="p-4" style={{ borderTop: '1px solid #263238' }}>
                            <button
                                onClick={logout}
                                className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Topbar */}
                    <header className="h-16 flex items-center justify-between px-8 shrink-0 backdrop-blur-md"
                            style={{ backgroundColor: 'rgba(26, 35, 39, 0.9)', borderBottom: '1px solid #263238' }}>

                        <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-400">
                                Logged in as
                                <span className="text-emerald-400 font-bold ml-1">
                                    {user?.role?.toUpperCase()}
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                {user?.role?.slice(0,2)?.toUpperCase() || "SA"}
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto p-8 relative">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
