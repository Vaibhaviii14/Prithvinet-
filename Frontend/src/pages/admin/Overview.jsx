import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import PollutionHeatmap from '../../components/maps/PollutionHeatmap';
import { AlertCircle, TrendingUp, Sparkles, MapPin, Building2, Factory } from 'lucide-react';
import { Link } from 'react-router-dom';

const Overview = () => {
    const [heatmapData, setHeatmapData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

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
                const hmRes = await api.get('/api/reports/heatmap-data');
                setHeatmapData(hmRes.data);

                // Fetch alerts
                const alRes = await api.get('/api/alerts');
                setAlerts(alRes.data.slice(0, 5)); // Keep top 5

                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch overview metrics", err);
                setLoading(false);
            }
        };
        fetchData();
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
                            <PollutionHeatmap data={heatmapData} center={[23.2599, 77.4126]} zoom={7} />
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
                    <div className="bg-[#1a2327] border border-[#263238] rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" /> Recent Critical Alerts
                        </h3>
                        {alerts.length === 0 && !loading && (
                            <div className="text-sm text-slate-500 text-center py-4">No active alerts.</div>
                        )}
                        <div className="space-y-3">
                            {alerts.map((alert, idx) => (
                                <div key={idx} className="flex gap-3 items-start border-l-2 border-red-500 pl-3">
                                    <div className="bg-red-500/10 p-1.5 rounded-full mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">
                                            Threshold Breach - Param {alert.parameter_id}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Value: <span className="text-red-400 font-bold">{alert.value}</span> / {alert.limit}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Overview;
