import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusMap from '../../components/maps/StatusMap';
import { AlertCircle, TrendingUp, Sparkles, MapPin, Building2, Factory, ShieldCheck, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Overview = () => {
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Alerts state
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [totalROs, setTotalROs] = useState(0);
    const [totalIndustries, setTotalIndustries] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch KPIs
                const roRes = await api.get('/api/master/regional-offices');
                setTotalROs(roRes.data?.length || 0);

                const indRes = await api.get('/api/master/industries');
                setTotalIndustries(indRes.data?.length || 0);

                // Fetch Heatmap data
                const hmRes = await api.get('/api/reports/map-data');
                setHeatmapData(hmRes.data);

                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch overview metrics", err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                setIsLoading(true);
                const res = await api.get('/api/alerts');
                const activeAlerts = res.data.filter(a => a.status === 'UNRESOLVED' || a.status === 'ACTION_TAKEN');
                setAlerts(activeAlerts);
            } catch (err) {
                console.error("Failed to fetch alerts", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight">Command Center</h1>
                <div className="text-sm text-slate-400">Live Environmental Status</div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-[#1a2327] border border-[#263238] rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Total ROs</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{totalROs}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <Building2 className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>

                <div className="bg-[#1a2327] border border-[#263238] rounded-xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Total Industries</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{totalIndustries}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                        <Factory className="w-6 h-6 text-blue-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Heatmap Area */}
                <div className="lg:col-span-2 bg-[#1a2327] border border-[#263238] rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-[#263238] flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MapPin className="text-emerald-500 w-5 h-5" /> Real-time Pollution Heatmap
                        </h2>
                    </div>
                    <div className="flex-1 w-full bg-[#0b1114]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-emerald-500">Loading map...</div>
                        ) : (
                            <StatusMap data={heatmapData} center={[23.2599, 77.4126]} zoom={7} />
                        )}
                    </div>
                </div>

                {/* Info panels */}
                <div className="space-y-6">
                    {/* Mini Forecast */}
                    <Link to="/admin-dashboard/copilot" className="block transform transition-all hover:scale-[1.02]">
                        <div className="bg-gradient-to-br from-[#1a2327] to-[#0b1114] border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_15px_rgba(0,230,118,0.1)] group">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-emerald-500 mb-1 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> AI Risk Outlook
                                    </h3>
                                    <p className="text-xs text-slate-400">Next 72 Hours</p>
                                </div>
                                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-white mb-2">Moderate Increase</div>
                            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                                PM2.5 levels are forecasted to rise by 12% in the central industrial corridor due to thermal inversion.
                            </p>
                        </div>
                    </Link>

                    {/* Active Alerts List */}
                    <div className="bg-[#1a2327] border border-[#263238] rounded-xl p-5 shadow-sm flex flex-col min-h-[350px]">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" /> Active System Alerts
                        </h3>
                        
                        <div className="flex-1 flex flex-col">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((n) => (
                                        <div key={n} className="h-16 bg-slate-800/50 rounded-lg animate-pulse border border-[#263238]"></div>
                                    ))}
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6 text-center">
                                    <ShieldCheck className="w-12 h-12 text-emerald-500 mb-3" />
                                    <h4 className="font-bold text-white text-lg">All Clear</h4>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Statewide compliance is currently at 100%. No active environmental alerts.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className="bg-[#0b1114] border border-[#263238] rounded-lg p-3 flex flex-col gap-2 transition-colors hover:border-slate-600">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200">
                                                        {alert.industry_name || alert.location_name || 'Industrial Facility'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Parameter: <span className="text-white font-mono font-bold">{alert.parameter}</span>
                                                    </p>
                                                </div>
                                                {alert.status === 'UNRESOLVED' ? (
                                                    <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-red-500/20 whitespace-nowrap">
                                                        Unresolved
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-amber-500/20 whitespace-nowrap">
                                                        Action Taken
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-end mt-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(alert.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Limit: {alert.allowed_value}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Overview;
