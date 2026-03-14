import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Grid, FileText, BarChart2, Settings, Bell, User, LogOut, Menu, X } from 'lucide-react';
import bgImage from "../assets/bg/prithvinet-bg.png";

const IndustryLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navLinks = [
        { path: '/industry', icon: <Grid className="w-5 h-5" />, label: 'Home' },
        { path: '/industry/logs', icon: <FileText className="w-5 h-5" />, label: 'Logs' },
        { path: '/industry/analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
        { path: '/industry/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' }
    ];

    return (
        <div className="flex bg-[#0b1114] text-slate-300 min-h-screen font-sans relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                    src={bgImage}
                    alt="background"
                    className="w-full h-full object-cover scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b1114]/70 via-[#0b1114]/60 to-[#0b1114]/80 backdrop-blur-[1px]"></div>
                {/* Additional dark overlay requested */}
                <div className="absolute inset-0 bg-black/50"></div>
            </div>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar (Desktop & Mobile) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a2327]/90 backdrop-blur-md border-r border-[#263238] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-[#263238]">
                    <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                        PrithviNet
                    </span>
                    <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <p className="px-2 text-xs font-semibold tracking-wider text-slate-500 uppercase mb-4">Menu</p>
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            end={link.path === '/industry'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                                    isActive 
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            {link.icon}
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#263238]">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center w-full gap-3 px-3 py-2.5 text-slate-400 font-medium rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
                {/* Topbar */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#1a2327]/90 backdrop-blur-md border-b border-[#263238] z-30">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-sm font-bold tracking-widest text-slate-200 uppercase hidden sm:block">
                            <span className="text-emerald-500">INDUSTRY</span> PORTAL
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-[#263238]">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#1a2327]"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-[#263238]">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
            
            {/* Mobile Bottom Navigation (Visible only on very small screens, overrides sidebar links purely for layout choice but sidebar handles it. Adding as requested) */}
            <div className="sm:hidden fixed bottom-0 left-0 w-full bg-[#1a2327]/90 backdrop-blur-md border-t border-[#263238] z-50 pb-safe">
                <nav className="flex justify-around items-center p-2">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            end={link.path === '/industry'}
                            className={({ isActive }) =>
                                `flex flex-col items-center p-2 gap-1 rounded-lg ${
                                    isActive ? 'text-emerald-500' : 'text-slate-500'
                                }`
                            }
                        >
                            {React.cloneElement(link.icon, { className: 'w-5 h-5' })}
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default IndustryLayout;
