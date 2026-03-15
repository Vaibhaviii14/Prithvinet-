import { useState, useEffect, useContext } from 'react';
import { Globe, LogOut, Activity, AlertTriangle, CheckCircle2, X, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import bgDark from '../../assets/bg/prithvinet-bg.png';

// dot config per status
const STATUS_DOT = {
    UNRESOLVED:         { color: 'bg-red-500',    shadow: 'shadow-[0_0_6px_2px_rgba(239,68,68,0.6)]',   label: 'Breach' },
    INSPECTION_PENDING: { color: 'bg-blue-500',   shadow: 'shadow-[0_0_6px_2px_rgba(59,130,246,0.6)]',  label: 'Dispatched' },
    RESOLVED:           { color: 'bg-emerald-500',shadow: 'shadow-[0_0_6px_2px_rgba(16,185,129,0.6)]',  label: 'Resolved' },
    STILL_BREACHING:    { color: 'bg-red-500',    shadow: 'shadow-[0_0_6px_2px_rgba(239,68,68,0.6)]',   label: 'Still Breaching' },
};

const InspectorDashboard = () => {
    const { user, logout } = useContext(AuthContext);

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [industriesMap, setIndustriesMap] = useState({});
    const [locationsMap, setLocationsMap] = useState({});

    // DB-driven dropdown data
    const [dbCategories, setDbCategories] = useState([]);
    const [dbParamsByCategory, setDbParamsByCategory] = useState({});

    // Audit modal
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [auditCategory, setAuditCategory] = useState('');
    const [auditParams, setAuditParams] = useState([{ name: '', value: '' }]);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [auditResult, setAuditResult] = useState(null); // 'compliant' | 'breaching'

    const fetchData = async () => {
        try {
            const [alertRes, indRes, locRes, limitsRes] = await Promise.all([
                api.get('/api/alerts'),
                api.get('/api/master/industries'),
                api.get('/api/master/locations'),
                api.get('/api/master/limits'),
            ]);

            const iMap = {};
            (indRes.data || []).forEach(i => { iMap[i.id] = i.name; });
            setIndustriesMap(iMap);

            const lMap = {};
            (locRes.data || []).forEach(l => { lMap[l.id] = l.name; });
            setLocationsMap(lMap);

            const limits = limitsRes.data || [];
            const cats = [...new Set(limits.map(l => l.category))].sort();
            setDbCategories(cats);
            const paramMap = {};
            limits.forEach(l => {
                if (!paramMap[l.category]) paramMap[l.category] = [];
                if (!paramMap[l.category].includes(l.parameter)) paramMap[l.category].push(l.parameter);
            });
            setDbParamsByCategory(paramMap);

            setAlerts((alertRes.data || []).filter(a => a.status === 'INSPECTION_PENDING'));
        } catch (err) {
            console.error('Failed to fetch inspector data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/api/ws/alerts');
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'REFRESH_ALERTS') fetchData();
            } catch (err) { console.error(err); }
        };
        return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
    }, []);

    const openAuditModal = (alert) => {
        // Immediately flip dot to blue (dispatched) in local state
        setAlerts(prev => prev.map(a =>
            a.id === alert.id ? { ...a, _localStatus: 'INSPECTION_PENDING' } : a
        ));
        setSelectedAlert(alert);
        setAuditCategory('');
        setAuditParams([{ name: '', value: '' }]);
        setShowSuccess(false);
        setAuditResult(null);
    };

    const closeAuditModal = () => {
        setSelectedAlert(null);
        setAuditCategory('');
        setAuditParams([{ name: '', value: '' }]);
        setAuditResult(null);
    };

    const addParamRow = () => setAuditParams(prev => [...prev, { name: '', value: '' }]);
    const removeParamRow = (idx) => setAuditParams(prev => prev.filter((_, i) => i !== idx));
    const updateParam = (idx, field, val) => {
        setAuditParams(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
    };

    const handleSubmitAudit = async (e) => {
        e.preventDefault();
        if (!selectedAlert || !auditCategory) return;

        try {
            setSubmitting(true);

            const paramObj = {};
            auditParams.forEach(p => {
                if (p.name.trim() && p.value !== '') {
                    paramObj[p.name.trim()] = parseFloat(p.value) || 0;
                }
            });

            // Determine compliance for the breached parameter before submitting
            const breachedParam = selectedAlert.parameter;
            const limit = parseFloat(selectedAlert.allowed_value);
            const auditedValue = paramObj[breachedParam];
            const isCompliant = auditedValue !== undefined
                ? auditedValue <= limit
                : true; // if not measured, assume resolved

            if (Object.keys(paramObj).length > 0) {
                await api.post('/api/ingestion/manual', {
                    location_id: selectedAlert.location_id || '',
                    industry_id: selectedAlert.industry_id || '',
                    category: auditCategory,
                    parameters: paramObj,
                    source: 'Audit',
                });
            }

            await api.put(`/api/alerts/${selectedAlert.id}/resolve`);

            // Optimistically update dot color based on compliance
            const newLocalStatus = isCompliant ? 'RESOLVED' : 'STILL_BREACHING';
            setAlerts(prev => prev.map(a =>
                a.id === selectedAlert.id ? { ...a, _localStatus: newLocalStatus } : a
            ));
            setAuditResult(isCompliant ? 'compliant' : 'breaching');
            setShowSuccess(true);

            await fetchData();
            setTimeout(() => closeAuditModal(), 2000);
        } catch (err) {
            console.error('Failed to submit audit', err.response?.data || err);
            alert(`Failed to submit audit: ${err.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const pendingCount = alerts.length;

    return (
        <div className="relative h-screen font-sans overflow-hidden" style={{ backgroundColor: '#0b1114', color: '#94a3b8' }}>

            <div className="absolute inset-0 z-0 pointer-events-none">
                <img src={bgDark} alt="background" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#0b1114]/90"></div>
            </div>

            <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] pointer-events-none"></div>

            <div className="relative z-10 flex h-full">

                {/* Sidebar */}
                <aside className="w-64 flex flex-col" style={{ backgroundColor: 'rgba(26, 35, 39, 0.9)', borderRight: '1px solid #263238' }}>
                    <div className="backdrop-blur-md w-full h-full flex flex-col">
                        <div className="p-6 flex items-center gap-3" style={{ borderBottom: '1px solid #263238' }}>
                            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30 text-emerald-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-white">PrithviNet</h2>
                                <p className="text-xs text-emerald-400 font-medium">Monitoring Team</p>
                            </div>
                        </div>

                        <nav className="flex-1 py-6 px-4">
                            <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                                <AlertTriangle className="w-5 h-5" />
                                My Dispatches
                            </div>
                        </nav>

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

                {/* Main */}
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="h-16 flex items-center justify-between px-8 shrink-0 backdrop-blur-md"
                        style={{ backgroundColor: 'rgba(26, 35, 39, 0.9)', borderBottom: '1px solid #263238' }}>
                        <h1 className="text-lg font-semibold text-white">My Dispatches</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">
                                Logged in as <span className="text-emerald-400 font-bold">{user?.role?.toUpperCase()}</span>
                            </span>
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                {user?.role?.slice(0, 2)?.toUpperCase() || 'MT'}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-auto p-8">
                        <div className="space-y-6 max-w-5xl mx-auto">

                            {/* KPI */}
                            <div className="glass-card p-6 flex items-center justify-between max-w-xs">
                                <div>
                                    <p className="text-sm font-semibold text-slate-400">Pending Dispatches</p>
                                    <p className="text-3xl font-black mt-1 text-white">{pendingCount}</p>
                                </div>
                                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-red-500">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20 text-emerald-500 animate-pulse">
                                    Loading dispatches...
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-4" />
                                    <p>No dispatches assigned to you.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {alerts.map(alert => {
                                        const statusKey = alert._localStatus || alert.status || 'INSPECTION_PENDING';
                                        const dot = STATUS_DOT[statusKey] || STATUS_DOT.INSPECTION_PENDING;
                                        return (
                                            <div key={alert.id} className="glass-card p-5 rounded-xl border border-[#263238]">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        {/* Status dot */}
                                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot.color} ${dot.shadow} transition-all duration-500`} />
                                                        <div>
                                                            <h4 className="font-bold text-white text-sm">{alert.parameter}</h4>
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                {industriesMap[alert.industry_id] || `Industry #${alert.industry_id}`}
                                                                {alert.location_id && ` · ${locationsMap[alert.location_id] || `Loc #${alert.location_id}`}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider border
                                                        ${statusKey === 'RESOLVED'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : statusKey === 'STILL_BREACHING'
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        }`}>
                                                        {dot.label}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 mb-4 text-xs">
                                                    <div className="flex-1 bg-[#0b1114]/60 rounded-lg px-3 py-2 border border-[#263238]">
                                                        <p className="text-slate-500 mb-0.5">Breach Reading</p>
                                                        <p className="text-red-400 font-bold text-sm">{alert.exceeded_value}</p>
                                                    </div>
                                                    <div className="flex-1 bg-[#0b1114]/60 rounded-lg px-3 py-2 border border-[#263238]">
                                                        <p className="text-slate-500 mb-0.5">Allowed Limit</p>
                                                        <p className="text-slate-300 font-bold text-sm">{alert.allowed_value}</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => openAuditModal(alert)}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#0b1114] font-bold border border-emerald-500/30 rounded-lg transition-all text-sm"
                                                >
                                                    <Activity className="w-4 h-4" />
                                                    Submit Audit Data
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Audit Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="theme-modal rounded-2xl p-6 shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                        <button onClick={closeAuditModal} className="absolute top-4 right-4 text-slate-400 hover:text-emerald-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
                            <Activity className="text-emerald-500 w-5 h-5" />
                            Submit Audit Data
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Audit for <span className="text-white font-semibold">{selectedAlert.parameter}</span> breach
                            &nbsp;·&nbsp; limit: <span className="text-slate-300 font-semibold">{selectedAlert.allowed_value}</span>
                        </p>

                        {showSuccess ? (
                            <div className={`flex flex-col items-center justify-center py-8 ${auditResult === 'compliant' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {auditResult === 'compliant'
                                    ? <CheckCircle2 className="w-12 h-12 mb-3" />
                                    : <AlertTriangle className="w-12 h-12 mb-3" />
                                }
                                <p className="font-bold text-lg">
                                    {auditResult === 'compliant' ? 'Compliant — Alert Resolved' : 'Still Breaching — Alert Flagged'}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitAudit}>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Audit Category</label>
                                <select
                                    required
                                    className="theme-input w-full rounded-xl p-3 mb-5"
                                    value={auditCategory}
                                    onChange={(e) => {
                                        setAuditCategory(e.target.value);
                                        setAuditParams([{ name: '', value: '' }]);
                                    }}
                                >
                                    <option value="" disabled>Select category...</option>
                                    {dbCategories.length > 0
                                        ? dbCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                        : ['Air Quality', 'Water Quality', 'Noise', 'Soil', 'Other'].map(c =>
                                            <option key={c} value={c}>{c}</option>)
                                    }
                                </select>

                                <label className="block text-sm font-semibold text-slate-300 mb-2">Measured Parameters</label>
                                <div className="space-y-2 mb-4">
                                    {auditParams.map((param, idx) => {
                                        const paramOptions = dbParamsByCategory[auditCategory] || [];
                                        const isCustom = param.name !== '' && !paramOptions.includes(param.name);
                                        return (
                                            <div key={idx} className="flex gap-2 items-center">
                                                {paramOptions.length > 0 ? (
                                                    <div className="flex-1 flex gap-1">
                                                        <select
                                                            className="theme-input flex-1 rounded-lg p-2.5 text-sm"
                                                            value={isCustom ? '__custom__' : param.name}
                                                            onChange={(e) => {
                                                                updateParam(idx, 'name', e.target.value === '__custom__' ? '' : e.target.value);
                                                            }}
                                                        >
                                                            <option value="">Select parameter...</option>
                                                            {paramOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                                            <option value="__custom__">Other (Custom)</option>
                                                        </select>
                                                        {isCustom && (
                                                            <input
                                                                type="text"
                                                                placeholder="Custom name"
                                                                className="theme-input flex-1 rounded-lg p-2.5 text-sm"
                                                                value={param.name}
                                                                onChange={(e) => updateParam(idx, 'name', e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        placeholder="Parameter name"
                                                        className="theme-input flex-1 rounded-lg p-2.5 text-sm"
                                                        value={param.name}
                                                        onChange={(e) => updateParam(idx, 'name', e.target.value)}
                                                    />
                                                )}
                                                <input
                                                    type="number"
                                                    placeholder="Value"
                                                    className="theme-input w-28 rounded-lg p-2.5 text-sm"
                                                    value={param.value}
                                                    onChange={(e) => updateParam(idx, 'value', e.target.value)}
                                                />
                                                {auditParams.length > 1 && (
                                                    <button type="button" onClick={() => removeParamRow(idx)}
                                                        className="text-slate-500 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button type="button" onClick={addParamRow}
                                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 mb-6 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Add Parameter
                                </button>

                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={closeAuditModal}
                                        className="px-4 py-2 font-semibold text-sm text-slate-400 hover:text-white transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting}
                                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0b1114] font-bold rounded-lg text-sm flex items-center gap-2 transition-all">
                                        {submitting ? <Activity className="w-4 h-4 animate-spin" /> : 'Submit Audit'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectorDashboard;
