import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Grid, AlertTriangle, Building2, Activity, CheckCircle2, X, Users, Send } from 'lucide-react';
import api from '../../api/axios';
import StatusMap from '../../components/maps/StatusMap';

const ROOverview = () => {
    const [stats, setStats] = useState({
        activeAlerts: 0,
        totalLocations: 0,
        totalIndustries: 0
    });
    const [heatmapData, setHeatmapData] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [loadingMap, setLoadingMap] = useState(true);
    
    // Reject Modal State
    const [selectedRejectAlert, setSelectedRejectAlert] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingReject, setSubmittingReject] = useState(false);

    // Dispatch Modal State
    const [dispatchModalAlert, setDispatchModalAlert] = useState(null);
    const [monitoringTeams, setMonitoringTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [submittingDispatch, setSubmittingDispatch] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch Master Data
            const [locRes, indRes, alertRes, hmRes, teamsRes] = await Promise.all([
                api.get('/api/master/locations'),
                api.get('/api/master/industries'),
                api.get('/api/alerts'),
                api.get('/api/reports/map-data'),
                api.get('/api/auth/users?role=monitoring_team')
            ]);
            
            // Unresolved alerts filter (status field is UNRESOLVED or ACTION_TAKEN)
            const unresolvedAlerts = alertRes.data.filter(a => ['UNRESOLVED', 'ACTION_TAKEN'].includes(a.status));
            
            setStats({
                totalLocations: locRes.data?.length || 0,
                totalIndustries: indRes.data?.length || 0,
                activeAlerts: unresolvedAlerts.length
            });

            // Alerts Panel
            setRecentAlerts(unresolvedAlerts.slice(0, 10)); // keep mostly top unresolved

            // Map
            setHeatmapData(hmRes.data || []);

            // Teams
            setMonitoringTeams(teamsRes.data || []);
        } catch (error) {
            console.error("Failed fetching RO Overview data", error.response?.data || error);
        } finally {
            setLoadingMap(false);
        }
    };
    
    const fetchMapData = async () => {
        try {
            const hmRes = await api.get('/api/reports/map-data');
            setHeatmapData(hmRes.data || []);
        } catch (error) {
            console.error("Map refresh failed", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleResolveAlert = async (alertId) => {
        try {
            const response = await api.put(`/api/alerts/${alertId}/resolve`);
            
            if (response.status === 200 || response.status === 204 || response.data) {
                // Remove from active list
                setRecentAlerts(prev => prev.filter(a => a.id !== alertId));
                setStats(prev => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));
                // Re-trigger the heatmap fetch
                fetchMapData();
            }
        } catch (err) {
            console.error("Failed resolving alert", err.response?.data || err);
            alert(`Failed to resolve alert: ${err.response?.data?.detail || 'Unknown error'}`);
        }
    };

    const handleRejectAlert = async (e) => {
        e.preventDefault();
        if (!selectedRejectAlert || !rejectionReason.trim()) return;
        
        try {
            setSubmittingReject(true);
            await api.put(`/api/alerts/${selectedRejectAlert.id}/reject`, {
                rejection_reason: rejectionReason
            });
            
            // Re-fetch data to reflect the changes
            await fetchData();
            setSelectedRejectAlert(null);
            setRejectionReason('');
        } catch (error) {
            console.error("Failed to reject alert", error.response?.data || error);
            alert(`Failed to reject alert: ${error.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmittingReject(false);
        }
    };

    const handleDispatchAlert = async (e) => {
        e.preventDefault();
        if (!dispatchModalAlert || !selectedTeamId) return;

        try {
            setSubmittingDispatch(true);
            await api.put(`/api/alerts/${dispatchModalAlert.id}/dispatch`, {
                monitoring_team_id: selectedTeamId
            });

            await fetchData();
            setDispatchModalAlert(null);
            setSelectedTeamId('');
        } catch (error) {
            console.error("Failed to dispatch alert", error.response?.data || error);
            alert(`Failed to dispatch alert: ${error.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmittingDispatch(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Grid className="text-emerald-500 w-8 h-8" />
                        Command Center
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Live environmental status across your jurisdiction.</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Total Locations</p>
                        <p className="text-3xl font-black text-white mt-1">{stats.totalLocations}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-500">
                        <MapPin className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Tracked Industries</p>
                        <p className="text-3xl font-black text-white mt-1">{stats.totalIndustries}</p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-blue-500">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Active Alerts</p>
                        <p className="text-3xl font-black text-white mt-1">{stats.activeAlerts}</p>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Heatmap */}
                <div className="lg:col-span-2 bg-[#1a2327] border border-[#263238] rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-[#263238] bg-slate-900/30 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="text-emerald-500 w-5 h-5" /> Local Live Map
                        </h2>
                    </div>
                    <div className="flex-1 w-full relative bg-[#0b1114]">
                        {loadingMap ? (
                            <div className="absolute inset-0 flex items-center justify-center text-emerald-500 animate-pulse">
                                Loading local telemetry...
                            </div>
                        ) : (
                            <StatusMap data={heatmapData} center={[23.2599, 77.4126]} zoom={10} />
                        )}
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-[#1a2327] border border-[#263238] rounded-xl flex flex-col h-[600px]">
                    <div className="p-4 border-b border-[#263238] bg-slate-900/30">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="text-red-500 w-5 h-5" /> Pending Alerts
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {recentAlerts.length === 0 && !loadingMap && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-4" />
                                <p>No active compliance alerts.</p>
                            </div>
                        )}
                        
                        {recentAlerts.map(alert => (
                            <div 
                                key={alert.id} 
                                className={`bg-[#0b1114] border-l-4 p-4 rounded-lg border border-r-[#263238] border-t-[#263238] border-b-[#263238] shadow-md transition-all ${
                                    alert.status === 'ACTION_TAKEN' ? 'border-l-yellow-500 bg-yellow-500/5' : 'border-l-red-500'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-white text-sm">Param: {alert.parameter}</h4>
                                        {alert.status === 'UNRESOLVED' ? (
                                            <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-red-500/30">Action Needed</span>
                                        ) : (
                                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-yellow-500/30">Action Taken</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap ml-2">
                                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-slate-400 mb-3">
                                    Breach reading of <span className="text-red-400 font-bold">{alert.exceeded_value}</span> (Limit: {alert.allowed_value})
                                </p>
                                
                                {alert.status === 'ACTION_TAKEN' && alert.industry_response && (
                                    <div className="bg-[#1a2327] rounded border border-[#263238] p-2.5 mb-3 text-xs">
                                        <p className="font-semibold text-emerald-500 mb-1">Industry Response:</p>
                                        <p className="text-slate-300 italic">"{alert.industry_response}"</p>
                                    </div>
                                )}
                                
                                {alert.status === 'ACTION_TAKEN' && (
                                    <div className="flex gap-2 w-full mt-3">
                                        <button
                                            onClick={() => setDispatchModalAlert(alert)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-[#0b1114] font-bold border border-blue-500/30 rounded-lg transition-all text-xs shadow-sm hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                                        >
                                            <Send className="w-4 h-4" /> Dispatch Inspector
                                        </button>
                                        <button
                                            onClick={() => setSelectedRejectAlert(alert)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[#0b1114] font-bold border border-rose-500/30 rounded-lg transition-all text-xs shadow-sm"
                                        >
                                            <X className="w-4 h-4" /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleResolveAlert(alert.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-[#0b1114] font-bold border border-emerald-500/30 rounded-lg transition-all text-xs shadow-sm"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Verify
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {selectedRejectAlert && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative">
                        <button onClick={() => setSelectedRejectAlert(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-500" /> Reject Response
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">Provide the reason for rejecting the industry's response to the {selectedRejectAlert.parameter} breach.</p>
                        
                        <form onSubmit={handleRejectAlert}>
                            <textarea
                                required
                                rows="4"
                                className="w-full bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white focus:ring-1 focus:ring-rose-500 resize-none mb-4 placeholder-slate-600"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Reason for Rejection..."
                            ></textarea>
                            
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setSelectedRejectAlert(null)} className="px-4 py-2 font-semibold text-slate-400 text-sm">Cancel</button>
                                <button type="submit" disabled={submittingReject} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-sm flex items-center gap-2">
                                    {submittingReject ? <Activity className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dispatch Modal */}
            {dispatchModalAlert && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative">
                        <button onClick={() => setDispatchModalAlert(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" /> Dispatch Inspector
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">Assign an active Monitoring Team member to physically inspect the facility for the {dispatchModalAlert.parameter} breach.</p>
                        
                        <form onSubmit={handleDispatchAlert}>
                            <select
                                required
                                className="w-full bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 mb-6"
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                            >
                                <option value="" disabled>Select a Monitoring Team Member...</option>
                                {monitoringTeams.map(member => (
                                    <option key={member.id} value={member.id}>{member.email}</option>
                                ))}
                            </select>
                            
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setDispatchModalAlert(null)} className="px-4 py-2 font-semibold text-slate-400 text-sm">Cancel</button>
                                <button type="submit" disabled={submittingDispatch} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm flex items-center gap-2">
                                    {submittingDispatch ? <Activity className="w-4 h-4 animate-spin" /> : 'Confirm Dispatch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ROOverview;
