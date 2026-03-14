import React, { useState, useEffect } from 'react';
import { Menu, Bell, Wind, Activity, ShieldCheck, AlertTriangle, Home, Map as MapIcon, BarChart2, Droplets, Volume2, Info, Navigation, Leaf, Sparkles, MapPin } from 'lucide-react';
import api from '../../api/axios';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import bgDark from '../../assets/bg/prithvinet-bg.png';

const MapUpdater = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
};

const colorStyles = {
    emerald: {
        bg: 'bg-emerald-500/10',
        hoverBg: 'group-hover:bg-emerald-500/20',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
        shadow: 'hover:shadow-emerald-500/10',
    },
    blue: {
        bg: 'bg-blue-500/10',
        hoverBg: 'group-hover:bg-blue-500/20',
        text: 'text-blue-400',
        dot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
        shadow: 'hover:shadow-blue-500/10',
    },
    amber: {
        bg: 'bg-amber-500/10',
        hoverBg: 'group-hover:bg-amber-500/20',
        text: 'text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        shadow: 'hover:shadow-amber-500/10',
    }
};

const MetricCard = ({ title, value, status, icon: Icon, colorTheme, gradientClass, delay }) => {
    const theme = colorStyles[colorTheme];
    return (
        <div className={`relative overflow-hidden backdrop-blur-xl p-6 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 group animate-fade-in-up`}
             style={{ animationDelay: `${delay}ms`, backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-accent)', boxShadow: 'var(--card-shadow)' }}>
            <div className={`absolute -right-10 -top-10 w-32 h-32 ${theme.bg} rounded-full blur-3xl ${theme.hoverBg} transition-all duration-500`}></div>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
                <div className={`p-2 rounded-2xl ${theme.bg} ${theme.text} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-4xl lg:text-5xl font-bold bg-gradient-to-br ${gradientClass} text-transparent bg-clip-text tracking-tight`}>{value}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-accent)' }}>
                <div className={`w-2 h-2 rounded-full ${theme.dot}`}></div>
                <span className={`text-xs font-semibold ${theme.text}`}>{status}</span>
            </div>
        </div>
    );
};

const CitizenMap = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Using axios instance but this endpoint shouldn't require auth
                const res = await api.get('/api/public/dashboard-data');
                setDashboardData(res.data);
            } catch (error) {
                console.error("Failed fetching public dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Fetch user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Failed to get user location:", error);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 animate-[spin_3s_linear_infinite]"></div>
                    <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-[spin_1.5s_linear_infinite] absolute inset-0"></div>
                </div>
                <p className="text-emerald-500/80 tracking-widest text-sm font-bold uppercase animate-pulse">Initializing PrithviNet</p>
            </div>
        );
    }

    if (!dashboardData) return null;

    const { city_info, map_zones, forecast, forecast_trend_text, advisories } = dashboardData;

    return (
        <div className="min-h-screen bg-bg-primary text-text-secondary pb-24 font-sans selection:bg-emerald-500/30 overflow-x-hidden relative transition-colors duration-300">
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .citizen-custom-popup .leaflet-popup-content-wrapper {
                    background: transparent;
                    box-shadow: none;
                    padding: 0;
                }
                .citizen-custom-popup .leaflet-popup-tip {
                    display: none;
                }
                .leaflet-container {
                    font-family: inherit;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img src={bgDark} alt="background" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#0b1114]/80"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl shadow-none"
                    style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}>
                <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Leaf className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-lg font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                                Prithvi<span className="text-emerald-600 dark:text-emerald-400">Net</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]"></span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 space-y-8">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-fade-in-up">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{city_info.city}</h2>
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                LIVE
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-slate-500" />
                            Conditions as of {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Primary KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <MetricCard 
                        title="Air Quality (AQI)" 
                        value={city_info.aqi} 
                        status={city_info.aqi_status} 
                        icon={Wind} 
                        colorTheme="emerald" 
                        gradientClass="from-emerald-300 to-teal-400"
                        delay={100}
                    />
                    <MetricCard 
                        title="Water Quality (WQI)" 
                        value={city_info.wqi} 
                        status={city_info.wqi_status} 
                        icon={Droplets} 
                        colorTheme="blue" 
                        gradientClass="from-blue-300 to-cyan-400"
                        delay={200}
                    />
                    <MetricCard 
                        title="Noise Level" 
                        value={`${city_info.noise_level} dB`} 
                        status={city_info.noise_status} 
                        icon={Volume2} 
                        colorTheme="amber" 
                        gradientClass="from-amber-300 to-orange-400"
                        delay={300}
                    />
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
                    {/* Map Section */}
                    <div className="lg:col-span-2 glass-card rounded-3xl p-5 sm:p-6 shadow-2xl animate-fade-in-up flex flex-col" style={{ animationDelay: '400ms' }}>
                         <div className="flex justify-between items-center mb-5">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-500/10 rounded-xl">
                                     <MapIcon className="w-5 h-5 text-blue-400" />
                                 </div>
                                 <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Geospatial Environmental Map</h3>
                             </div>
                             <button className="hidden sm:flex text-xs font-bold text-slate-400 hover:text-white transition-colors items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 group">
                                 <Navigation className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform" />
                                 Recenter
                             </button>
                         </div>
                         <div className="relative h-[380px] sm:h-[450px] w-full rounded-2xl overflow-hidden border border-slate-700/50 ring-1 ring-slate-950/5 shadow-inner mt-auto">
                            <MapContainer
                                center={userLocation ? [userLocation.lat, userLocation.lng] : [city_info.lat || 21.2787, city_info.lng || 81.8661]}
                                zoom={userLocation ? 11 : 9}
                                zoomControl={false}
                                className="w-full h-full z-10 bg-[#0a0f14]"
                                style={{ filter: 'contrast(1.05) saturate(1.2)' }}
                            >
                                <MapUpdater 
                                    center={userLocation ? [userLocation.lat, userLocation.lng] : [city_info.lat || 21.2787, city_info.lng || 81.8661]} 
                                    zoom={userLocation ? 11 : 9} 
                                />
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution=""
                                />
                                {map_zones.map((zone) => {
                                    const isGood = zone.color === 'green';
                                    const isMod = zone.color === 'yellow';
                                    const fillColor = isGood ? '#10b981' : isMod ? '#f59e0b' : '#ef4444';
                                    
                                    return (
                                        <CircleMarker
                                            key={zone.id}
                                            center={[zone.lat, zone.lng]}
                                            radius={8}
                                            pathOptions={{ 
                                                fillColor: fillColor, 
                                                color: '#ffffff', 
                                                weight: 1.5, 
                                                fillOpacity: 0.9 
                                            }}
                                        >
                                            <Popup className="citizen-custom-popup" autoPan={false} closeButton={false}>
                                                <div className="bg-slate-900/95 backdrop-blur-xl p-4 font-sans border border-slate-700/80 rounded-2xl shadow-2xl min-w-[220px]">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="relative flex items-center justify-center">
                                                            <div className="absolute w-full h-full animate-ping rounded-full opacity-40" style={{ backgroundColor: fillColor }}></div>
                                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-sm relative z-10" style={{ backgroundColor: fillColor }}></div>
                                                        </div>
                                                        <span className="font-bold text-[15px] text-white tracking-wide">{zone.status}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mb-3 pb-3 border-b border-slate-800 leading-relaxed font-medium">
                                                        {zone.status_msg}
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <div className="flex justify-between items-center text-[13px] bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                                                            <span className="text-slate-400 font-medium">Air Quality:</span>
                                                            <span className="font-bold text-white">{zone.aqi} <span className="text-[10px] text-slate-500">AQI</span></span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[13px] bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
                                                            <span className="text-slate-400 font-medium">Forecast:</span>
                                                            <span className={`font-semibold capitalize ${isGood ? 'text-emerald-400' : isMod ? 'text-amber-400' : 'text-red-400'}`}>
                                                                {zone.forecast_trend}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    )
                                })}
                                {userLocation && (
                                    <CircleMarker
                                        center={[userLocation.lat, userLocation.lng]}
                                        radius={7}
                                        pathOptions={{ 
                                            fillColor: '#3b82f6', 
                                            color: '#ffffff', 
                                            weight: 2, 
                                            fillOpacity: 1 
                                        }}
                                    >
                                        <Popup className="citizen-custom-popup" autoPan={false} closeButton={false}>
                                            <div className="bg-blue-600 px-3 py-2 font-sans rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2">
                                                <Navigation className="w-3 h-3 text-white fill-white" />
                                                <span className="font-bold text-[12px] text-white tracking-wide uppercase">Your Location</span>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                )}
                            </MapContainer>
                            
                            {/* Map Floating Stats */}
                            <div className="absolute bottom-4 left-4 z-20 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/50 shadow-xl flex items-center gap-3">
                                 <div className="flex -space-x-2">
                                     <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 relative z-30"></div>
                                     <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900 relative z-20"></div>
                                     <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-slate-900 relative z-10"></div>
                                 </div>
                                 <span className="text-xs font-semibold text-slate-300">Active Sensors (<span className="text-white">{map_zones.length}</span>)</span>
                            </div>
                         </div>
                    </div>

                    {/* Right column: Forecast & Advisories */}
                    <div className="space-y-6">
                        {/* 7-Day Forecast */}
                        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-2xl animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight uppercase">AI AQI Forecast</h3>
                                </div>
                                <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-lg tracking-widest border border-indigo-500/20">7 DAYS</span>
                            </div>
                            
                            <div className="h-32 mb-6 flex items-end justify-between gap-1.5 sm:gap-2">
                                {forecast.map((f, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group cursor-crosshair">
                                        <div className="w-full relative h-[100px] flex items-end justify-center rounded-t-lg hover:bg-slate-800/50 transition-colors pb-1">
                                            <div 
                                                className={`w-1.5 md:w-2 rounded-full transition-all duration-700 group-hover:bg-indigo-400 ${f.is_today ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]' : 'bg-slate-700'}`}
                                                style={{ height: `${f.value}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-[10px] mt-2 uppercase tracking-wider ${f.is_today ? 'text-indigo-400 font-bold' : 'text-slate-500 font-medium group-hover:text-slate-300'}`}>{f.day}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 text-center">
                                <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed font-bold"><strong className="text-indigo-500 dark:text-indigo-400 font-extrabold mr-1.5">Trend Prediction:</strong>{forecast_trend_text}</p>
                            </div>
                        </div>

                        {/* Advisories Widget */}
                        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-2xl animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 bg-amber-500/10 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight uppercase">Public Advisories</h3>
                            </div>
                            <div className="space-y-3 max-h-[190px] overflow-y-auto no-scrollbar pr-1">
                                {advisories.map((adv, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer ${adv.type === 'alert' ? 'bg-amber-950/20 border-amber-900/50 hover:bg-amber-900/30' : 'bg-emerald-950/20 border-emerald-900/50 hover:bg-emerald-900/30'}`}>
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 shrink-0">
                                                {adv.type === 'alert' ? 
                                                    <Info className="w-4 h-4 text-amber-500" /> : 
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                }
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-black text-slate-800 dark:text-white mb-1.5 tracking-wide">{adv.title}</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">{adv.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Navigation Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 px-8 py-3.5 rounded-full flex items-center gap-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 transition-all hover:border-emerald-500/30 dark:hover:border-slate-700 group/nav">
                <button className="flex flex-col items-center gap-1 transition-all text-emerald-400 hover:scale-110">
                    <Home className="w-[20px] h-[20px] mb-0.5" />
                    <span className="text-[8px] font-black tracking-widest opacity-100 transition-opacity">HOME</span>
                </button>
                <button className="flex flex-col items-center gap-1 transition-all text-slate-500 hover:text-white hover:scale-110">
                    <MapPin className="w-[18px] h-[18px] mb-0.5" />
                    <span className="text-[8px] font-black tracking-widest opacity-70 hover:opacity-100 transition-opacity uppercase">MAP</span>
                </button>
                <button className="flex flex-col items-center gap-1 transition-all text-slate-500 hover:text-white hover:scale-110">
                    <BarChart2 className="w-[18px] h-[18px] mb-0.5" />
                    <span className="text-[8px] font-black tracking-widest opacity-70 hover:opacity-100 transition-opacity">TRENDS</span>
                </button>
                 <button className="flex flex-col items-center gap-1 transition-all text-slate-500 hover:text-white hover:scale-110">
                    <AlertTriangle className="w-[18px] h-[18px] mb-0.5" />
                    <span className="text-[8px] font-black tracking-widest opacity-70 hover:opacity-100 transition-opacity">ALERTS</span>
                </button>
            </div>
        </div>
    );
};

export default CitizenMap;
