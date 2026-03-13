import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Activity, MessageSquare, CheckCircle, X } from 'lucide-react';
import api from '../../api/axios';

const IndustryAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [responseNote, setResponseNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/alerts');
            // Show UNRESOLVED and ACTION_TAKEN
            setAlerts(res.data.filter(a => ['UNRESOLVED', 'ACTION_TAKEN'].includes(a.status)));
        } catch (error) {
            console.error("Failed fetching alerts", error.response?.data || error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleRespond = async (e) => {
        e.preventDefault();
        if (!selectedAlert || !responseNote.trim()) return;
        
        try {
            setSubmitting(true);
            const res = await api.put(`/api/alerts/${selectedAlert.id}/respond`, {
                response_note: responseNote
            });
            
            // Immediately update the UI locally
            setAlerts(prev => prev.map(a => 
                a.id === selectedAlert.id ? { ...a, status: 'ACTION_TAKEN', industry_response: responseNote } : a
            ));
            
            setSelectedAlert(null);
            setResponseNote('');
        } catch (error) {
            console.error("Failed to respond to alert", error.response?.data || error);
            alert(`Failed to submit response: ${error.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <AlertTriangle className="text-emerald-500 w-8 h-8" />
                        Compliance Alerts
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Manage active breaches and submit corrective actions.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Activity className="text-emerald-500 animate-spin w-8 h-8" />
                </div>
            ) : alerts.length === 0 ? (
                <div className="bg-[#1a2327] border border-[#263238] rounded-xl flex flex-col items-center justify-center h-64 text-slate-500">
                    <CheckCircle className="w-16 h-16 text-emerald-500/50 mb-4" />
                    <p className="text-lg">No active compliance alerts.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-[#1a2327] border border-[#263238] rounded-xl overflow-hidden shadow-lg flex flex-col relative transition-transform hover:scale-[1.01]">
                            {/* Color Bar */}
                            <div className={`h-1.5 w-full ${alert.status === 'UNRESOLVED' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                            
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{alert.category || 'Emission Breach'}</h3>
                                        <p className="text-xs font-mono text-slate-400 mt-1">Param: {alert.parameter} • {new Date(alert.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {alert.status === 'UNRESOLVED' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Action Required
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                <Clock className="w-3.5 h-3.5" /> Pending RO Review
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="bg-[#0b1114] p-3 rounded-lg border border-[#263238] mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Measured Value</p>
                                        <p className="text-xl font-black text-red-400">{alert.exceeded_value}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Allowed Limit</p>
                                        <p className="text-xl font-bold text-slate-300">{alert.allowed_value}</p>
                                    </div>
                                </div>
                                
                                {alert.status === 'ACTION_TAKEN' && alert.industry_response && (
                                    <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 mb-4 text-sm mt-auto">
                                        <p className="text-emerald-500/80 font-semibold mb-1 flex items-center gap-1.5">
                                            <MessageSquare className="w-4 h-4" /> Your Response
                                        </p>
                                        <p className="text-slate-300 italic">"{alert.industry_response}"</p>
                                    </div>
                                )}

                                {alert.status === 'UNRESOLVED' && alert.ro_feedback && (
                                    <div className="bg-rose-500/5 p-3 rounded-lg border border-rose-500/20 mb-4 text-sm mt-auto">
                                        <p className="text-rose-500 font-bold mb-1 uppercase tracking-wider text-[10px]">
                                            Response Rejected by RO
                                        </p>
                                        <p className="text-slate-300 italic">"{alert.ro_feedback}"</p>
                                    </div>
                                )}

                                {alert.status === 'UNRESOLVED' && (
                                    <button
                                        onClick={() => setSelectedAlert(alert)}
                                        className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-[#0b1114] font-bold rounded-lg border border-emerald-500/30 transition-all text-sm shadow-sm hover:shadow-[0_0_15px_rgba(0,230,118,0.4)]"
                                    >
                                        <MessageSquare className="w-4 h-4" /> Respond to Alert
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Respond Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-2xl w-full max-w-lg relative">
                        <button 
                            onClick={() => setSelectedAlert(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                            Submit Corrective Action
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Provide details on the actions taken to mitigate the {selectedAlert.parameter} breach.
                        </p>
                        
                        <form onSubmit={handleRespond} className="space-y-4">
                            <div>
                                <textarea
                                    required
                                    rows="4"
                                    placeholder="Describe your actions here..."
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                ></textarea>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedAlert(null)}
                                    className="px-4 py-2 font-semibold text-slate-400 hover:text-white transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0b1114] font-bold rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                                >
                                    {submitting ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndustryAlerts;
