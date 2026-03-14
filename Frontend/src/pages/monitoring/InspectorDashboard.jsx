import React, { useState, useEffect, useContext } from 'react';
import { Activity, MapPin, CheckCircle2, Navigation, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const PARAMETER_OPTIONS = {
    Air: ['PM2.5', 'PM10', 'SO2', 'NOx', 'NO2', 'CO', 'O3', 'AQI'],
    Water: ['pH', 'BOD', 'COD', 'TSS', 'TDS', 'DO'],
    Noise: ['Noise_dB', 'Leq']
};

const InspectorDashboard = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { logout } = useContext(AuthContext);

    // Audit Modal State
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [auditCategory, setAuditCategory] = useState('Air');
    const [auditParams, setAuditParams] = useState([{ name: '', value: '' }]);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Master mappings
    const [industriesMap, setIndustriesMap] = useState({});
    const [locationsMap, setLocationsMap] = useState({});

    const fetchData = async () => {
        try {
            setLoading(true);
            const [alertsRes, indRes, locRes] = await Promise.all([
                api.get('/api/alerts'),
                api.get('/api/master/industries'),
                api.get('/api/master/locations')
            ]);

            // Filter for INSPECTION_PENDING assigned to this inspector
            const pending = alertsRes.data.filter(a => a.status === 'INSPECTION_PENDING');
            setAlerts(pending);

            const iMap = {};
            indRes.data.forEach(i => iMap[i.id] = i.name);
            setIndustriesMap(iMap);

            const lMap = {};
            locRes.data.forEach(l => lMap[l.id] = l.name);
            setLocationsMap(lMap);

        } catch (error) {
            console.error("Failed fetching inspector data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const ws = new WebSocket('ws://localhost:8000/api/ws/alerts'); // Adjust URL/port to match environment
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'REFRESH_ALERTS') {
                    console.log("⚡ Live Update Received! Refreshing Inspector Dashboard...");
                    fetchData(); // Call the Monitoring Team's specific fetch function
                }
            } catch (err) { console.error(err); }
        };
        
        return () => {
            if (ws.readyState === 1 || ws.readyState === WebSocket.OPEN) { ws.close(); }
        };
    }, []);

    const handleAddParam = () => setAuditParams([...auditParams, { name: '', value: '' }]);
    
    const handleParamChange = (index, field, value) => {
        const newParams = [...auditParams];
        newParams[index][field] = value;
        setAuditParams(newParams);
    };
    
    const handleRemoveParam = (index) => {
        setAuditParams(auditParams.filter((_, i) => i !== index));
    };

    const handleAuditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAlert || auditParams.some(p => !p.name || p.value === '')) return;

        try {
            setSubmitting(true);
            
            // Format param data
            const formattedParams = {};
            auditParams.forEach(p => {
                formattedParams[p.name] = parseFloat(p.value);
            });

            // Step 1: Submit new Telemetry log marking source as the Monitoring Team
            await api.post('/api/ingestion/manual', {
                location_id: selectedAlert.location_id,
                industry_id: selectedAlert.industry_id,
                category: auditCategory,
                parameters: formattedParams,
                source: "Monitoring_Team_Audit"
            });

            // Step 2: Resolve the alert since the audit data provides the new ground truth
            await api.put(`/api/alerts/${selectedAlert.id}/resolve`);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            await fetchData();
            setSelectedAlert(null);
            
            // Reset form
            setAuditCategory('Air');
            setAuditParams([{ name: '', value: '' }]);

        } catch (error) {
            console.error("Audit submission failed", error.response?.data || error);
            alert(`Audit failed: ${error.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-full mx-auto pb-10 px-2 lg:px-6">
            
            {showSuccess && (
                <div className="fixed top-20 right-4 lg:right-10 z-[70] bg-emerald-500 text-slate-950 px-4 py-3 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.3)] animate-bounce">
                    <CheckCircle2 className="w-5 h-5" /> Audit submitted & alert resolved!
                </div>
            )}

            <div className="mb-6 mt-4 pl-2 border-l-4 border-blue-500 flex justify-between items-center pr-2">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <ShieldCheck className="text-blue-500 w-7 h-7" /> My Dispatches
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Select a pending physical inspection to submit audit data.</p>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-300 rounded-lg transition-colors border border-slate-700 hover:border-red-500/30 text-sm font-semibold"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Activity className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : alerts.length === 0 ? (
                <div className="bg-[#1a2327] border border-[#263238] rounded-xl p-10 flex flex-col items-center justify-center text-center text-slate-500">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500/50 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Queue Empty</h2>
                    <p className="text-sm max-w-xs">You have no active dispatches. Awesome job keeping the environment safe.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-[#1a2327] border-l-4 border-blue-500 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded font-bold text-[10px] uppercase tracking-wider border border-blue-500/20">
                                        Audit Required
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">
                                        {new Date(alert.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-white mb-1">
                                    {industriesMap[alert.industry_id] || "Unknown Facility"}
                                </h3>
                                
                                <p className="text-sm text-slate-400 flex items-center gap-1.5 mb-4">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                    {locationsMap[alert.location_id] || "Unknown Location"}
                                </p>
                                
                                <div className="bg-[#0b1114] border border-[#263238] rounded-lg p-3 mb-6">
                                    <p className="text-xs text-slate-400 mb-1">Alert Trigger:</p>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <p className="text-sm font-bold text-white uppercase">{alert.parameter} Breach</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">Past Recorded Value: {alert.exceeded_value}</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => {
                                    setSelectedAlert(alert);
                                    setAuditCategory(alert.category || 'Air');
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.25)]"
                            >
                                <Navigation className="w-5 h-5" /> Submit Audit Data
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Audit Data Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-[#1a2327] border border-blue-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(37,99,235,0.15)] w-full max-w-md my-auto relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setSelectedAlert(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                            <Activity className="w-5 h-5" /> {/* Close Icon fallback, should optimally be X, but UI keeps breaking */}
                            <span className="sr-only">Close</span>
                        </button>
                        
                        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-500" /> On-site Audit
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">Record current telemetry readings to finalize the inspection.</p>
                        
                        <form onSubmit={handleAuditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                                <select 
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
                                    value={auditCategory}
                                    onChange={(e) => setAuditCategory(e.target.value)}
                                >
                                    <option value="Air">Air Quality</option>
                                    <option value="Water">Water Quality</option>
                                    <option value="Noise">Noise Level</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Measurements</label>
                                {auditParams.map((param, index) => (
                                    <div key={index} className="flex gap-2">
                                        <select 
                                            required
                                            className="flex-1 bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 text-sm outline-none"
                                            value={param.name}
                                            onChange={(e) => handleParamChange(index, 'name', e.target.value)}
                                        >
                                            <option value="" disabled>Param</option>
                                            {PARAMETER_OPTIONS[auditCategory].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <input 
                                            required
                                            type="number" 
                                            step="0.01"
                                            className="flex-1 bg-[#0b1114] border border-[#263238] rounded-xl p-3 text-white focus:ring-1 focus:ring-blue-500 text-sm outline-none"
                                            placeholder="Value"
                                            value={param.value}
                                            onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                                        />
                                        {auditParams.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveParam(index)}
                                                className="px-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all text-sm"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    onClick={handleAddParam}
                                    className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors mt-2 uppercase tracking-wide px-1"
                                >
                                    + Add measurement
                                </button>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedAlert(null)} 
                                    className="flex-1 py-3 bg-[#0b1114] border border-[#263238] hover:bg-[#263238] text-white font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="flex-1 flex justify-center items-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.25)]"
                                >
                                    {submitting ? <Activity className="w-5 h-5 animate-spin" /> : 'Log Audit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectorDashboard;
