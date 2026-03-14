import React, { useState, useEffect } from 'react';
import { Activity, Cloud, Droplets, Volume2, UploadCloud, AlertTriangle, Clock, MessageSquare, Plus, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../api/axios';
import SubmitLogModal from '../../components/forms/SubmitLogModal';
import IndustryComplianceChart from '../../components/IndustryComplianceChart';

const IndustryOverview = () => {
    const [healthScore, setHealthScore] = useState({ score: 100, status: "Excellent Standing", color: "text-emerald-500", stroke: "#00E676" });
    const [alerts, setAlerts] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [chartKeys, setChartKeys] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    
    const PARAMETER_OPTIONS = {
        Air: ["PM10", "PM2.5", "SO2", "NO2", "CO", "O3", "NH3", "Pb", "Benzene", "BaP"],
        Water: ["pH", "BOD", "COD", "TSS", "TDS", "Oil & Grease", "Lead", "Arsenic", "Mercury"],
        Noise: ["Day Time (dB)", "Night Time (dB)"]
    };

    const filteredKeys = selectedCategory === "All" 
        ? chartKeys 
        : chartKeys.filter(k => PARAMETER_OPTIONS[selectedCategory]?.includes(k));
    
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [loadingChart, setLoadingChart] = useState(true);
    
    // Log Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Respond Modal State
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [responseNote, setResponseNote] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    
    // Success Toast
    const [showToast, setShowToast] = useState(false);

    const fetchData = async () => {
        try {
            setLoadingAlerts(true);
            setLoadingChart(true);

            // Fetch Alerts
            const alertsRes = await api.get('/api/alerts');
            const myAlerts = alertsRes.data.filter(a => ['UNRESOLVED', 'ACTION_TAKEN', 'INSPECTION_PENDING'].includes(a.status));
            setAlerts(myAlerts);
            
            // Calculate Real Compliance Percentage
            const limitsRes = await api.get('/api/master/limits');
            const limitsMap = {};
            limitsRes.data.forEach(l => { limitsMap[l.parameter] = l.max_allowed_value; });

            const logsRes = await api.get('/api/ingestion/logs');
            let totalReadings = 0;
            let compliantReadings = 0;

            logsRes.data.forEach(log => {
                if (log.parameters) {
                    Object.entries(log.parameters).forEach(([param, val]) => {
                        totalReadings++;
                        if (limitsMap[param] === undefined || val <= limitsMap[param]) {
                            compliantReadings++;
                        }
                    });
                }
            });

            let calculatedScore = 100;
            if (totalReadings > 0) {
                calculatedScore = Math.round((compliantReadings / totalReadings) * 100);
            }

            const hasUnresolved = myAlerts.some(a => a.status === 'UNRESOLVED');
            const hasActionTaken = myAlerts.some(a => a.status === 'ACTION_TAKEN' || a.status === 'INSPECTION_PENDING');
            
            let statusText = "Excellent Standing";
            let colorCls = "text-emerald-500";
            let strokeColor = "#00E676";

            if (calculatedScore < 80 || hasUnresolved) {
                statusText = "Action Required";
                colorCls = "text-red-500";
                strokeColor = "#ef4444";
            } else if (calculatedScore < 95 || hasActionTaken) {
                statusText = "Needs Improvement";
                colorCls = "text-yellow-500";
                strokeColor = "#f59e0b";
            }
            
            setHealthScore({ score: calculatedScore, status: statusText, color: colorCls, stroke: strokeColor });

        } catch (error) {
            console.error("Failed fetching industry data", error);
        } finally {
            setLoadingAlerts(false);
            setLoadingChart(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogSubmitSuccess = () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        fetchData(); // Refresh Data seamlessly
    };

    const handleRespond = async (e) => {
        e.preventDefault();
        if (!selectedAlert || !responseNote.trim()) return;
        
        try {
            setSubmittingNote(true);
            await api.put(`/api/alerts/${selectedAlert.id}/respond`, {
                response_note: responseNote
            });
            
            // Re-fetch data to recalculate health & alert list naturally
            await fetchData();
            setSelectedAlert(null);
            setResponseNote('');
        } catch (error) {
            console.error("Failed to respond to alert", error.response?.data || error);
            alert(`Failed: ${error.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmittingNote(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 relative">
            
            {showToast && (
                <div className="fixed top-16 right-4 lg:right-10 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.3)] animate-bounce">
                    <CheckCircle2 className="w-5 h-5" /> Submissions received successfully!
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-white">Dashboard Overview</h1>
                <p className="text-sm text-slate-400 mt-1">Manage compliance, submit logs, and track emissions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Log Submission Section */}
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="text-emerald-500 w-5 h-5" /> Data Ingestion
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">Submit mandatory daily telemetrics.</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(0,230,118,0.25)] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)]"
                            >
                                <UploadCloud className="w-5 h-5" /> Upload Daily Logs
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[#0b1114] border border-[#263238] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors">
                                <Cloud className="w-8 h-8 text-blue-400 mb-2" />
                                <span className="text-sm font-bold text-slate-300">Air</span>
                            </div>
                            <div className="bg-[#0b1114] border border-[#263238] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/5 transition-colors">
                                <Droplets className="w-8 h-8 text-cyan-400 mb-2" />
                                <span className="text-sm font-bold text-slate-300">Water</span>
                            </div>
                            <div className="bg-[#0b1114] border border-[#263238] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-colors">
                                <Volume2 className="w-8 h-8 text-purple-400 mb-2" />
                                <span className="text-sm font-bold text-slate-300">Noise</span>
                            </div>
                        </div>
                    </div>

                    {/* Industry Compliance Chart */}
                    <IndustryComplianceChart />
                </div>

                {/* Right Column */}
                <div className="space-y-6 flex flex-col">
                    {/* Compliance Ring Widget */}
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-6 w-full text-left">Compliance Health</h2>
                        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" className="stroke-[#0b1114]" strokeWidth="12" fill="none" />
                                <circle 
                                    cx="80" cy="80" r="70" 
                                    className="transition-all duration-1000 ease-in-out" 
                                    stroke={healthScore.stroke} 
                                    strokeWidth="12" 
                                    fill="none" 
                                    strokeDasharray="440" 
                                    strokeDashoffset={440 - (440 * healthScore.score) / 100}
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-white">{healthScore.score}%</span>
                            </div>
                        </div>
                        <h3 className={`text-xl font-bold ${healthScore.color}`}>{healthScore.status}</h3>
                        <p className="text-sm text-slate-400 mt-2 px-4">Based on regulatory thresholds and pending alerts.</p>
                    </div>

                    {/* Alerts Panel */}
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl flex flex-col flex-1 min-h-[400px]">
                        <div className="p-4 border-b border-[#263238]">
                            <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase">Escalation Status</h2>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-4">
                            {loadingAlerts ? (
                                <Activity className="w-6 h-6 animate-spin text-emerald-500 mx-auto mt-10" />
                            ) : alerts.length === 0 ? (
                                <div className="text-center mt-12 text-slate-500">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50 text-emerald-500" />
                                    <p>All clear. No active alerts.</p>
                                </div>
                            ) : (
                                alerts.map(alert => {
                                    // SPLICED: Safe check for AI Anomaly
                                    const isAnomaly = alert?.type === 'statistical_anomaly' || alert?.alert_type === 'STATISTICAL_ANOMALY';
                                    
                                    return (
                                        <div key={alert.id} className={`bg-[#0b1114] border rounded-xl p-4 transition-colors ${isAnomaly ? 'border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5' : 'border-[#263238] hover:border-slate-600'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    {isAnomaly ? (
                                                        <Activity className="w-5 h-5 text-amber-500" />
                                                    ) : alert.status === 'UNRESOLVED' ? (
                                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                                    ) : (
                                                        <Clock className="w-5 h-5 text-yellow-500" />
                                                    )}
                                                    <h4 className={`font-bold text-sm ${isAnomaly ? 'text-amber-500' : 'text-white'}`}>
                                                        {isAnomaly ? 'Statistical Anomaly' : `${alert.parameter} Breach`}
                                                    </h4>
                                                </div>
                                                <span className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            
                                            <div className="mb-4">
                                                <p className={`text-xs ${isAnomaly ? 'text-amber-500 font-medium' : 'text-slate-400'}`}>
                                                    {isAnomaly ? (
                                                        alert.message || "Anomaly detected in data baseline."
                                                    ) : (
                                                        <>Recorded Limit Exceeded: <span className="text-red-400 font-bold">{alert.exceeded_value}</span></>
                                                    )}
                                                </p>
                                            </div>

                                            {alert.status === 'UNRESOLVED' ? (
                                                <>
                                                    {alert.ro_feedback && (
                                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mb-3">
                                                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Response Rejected by RO</p>
                                                            <p className="text-xs text-slate-300">"{alert.ro_feedback}"</p>
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => setSelectedAlert(alert)}
                                                        className={`w-full py-2 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isAnomaly ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-slate-900' : 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/30'}`}
                                                    >
                                                        <MessageSquare className="w-4 h-4" /> Respond to Alert
                                                    </button>
                                                </>
                                            ) : alert.status === 'INSPECTION_PENDING' ? (
                                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                                    <h5 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <Activity className="w-4 h-4" /> Physical Inspection Dispatched
                                                    </h5>
                                                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                                        Notice: A physical site inspection has been initiated by the Regional Office. Please cooperate with the monitoring team when they arrive at your facility.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                                    <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-1">Pending RO Verification</p>
                                                    <p className="text-xs text-slate-300 italic">"{alert.industry_response}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Log Modal */}
            <SubmitLogModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={handleLogSubmitSuccess} 
            />

            {/* Respond Modal Inline for Overview */}
            {selectedAlert && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative">
                        <button onClick={() => setSelectedAlert(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h2 className="text-xl font-bold text-white mb-2">Submit Corrective Action</h2>
                        <p className="text-sm text-slate-400 mb-6">Provide actions taken for the {selectedAlert.type === 'statistical_anomaly' || selectedAlert.alert_type === 'STATISTICAL_ANOMALY' ? 'statistical anomaly' : `${selectedAlert.parameter} breach`}.</p>
                        
                        <form onSubmit={handleRespond}>
                            <textarea
                                required
                                rows="4"
                                className="w-full bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white focus:ring-1 focus:ring-emerald-500 resize-none mb-4"
                                value={responseNote}
                                onChange={(e) => setResponseNote(e.target.value)}
                                placeholder="Describe your response..."
                            ></textarea>
                            
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setSelectedAlert(null)} className="px-4 py-2 font-semibold text-slate-400 text-sm">Cancel</button>
                                <button type="submit" disabled={submittingNote} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm flex items-center gap-2">
                                    {submittingNote ? <Activity className="w-4 h-4 animate-spin" /> : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndustryOverview;