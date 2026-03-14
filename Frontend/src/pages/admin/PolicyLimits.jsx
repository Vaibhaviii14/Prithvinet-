import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, ShieldAlert, Sliders, Wind, Droplet, VolumeX, ListPlus, X } from 'lucide-react';
import api from '../../api/axios';

const AIR_PARAMS = ["PM10", "PM2.5", "SO2", "NO2", "CO", "O3", "NH3", "Pb", "Benzene", "BaP"];
const WATER_PARAMS = ["pH", "BOD", "COD", "TSS", "TDS", "Oil & Grease", "Lead", "Arsenic", "Mercury"];
const NOISE_PARAMS = ["Day Time (dB)", "Night Time (dB)"];

const PolicyLimits = () => {
    const [existingLimits, setExistingLimits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    // Form State
    const [step, setStep] = useState(1);
    const [category, setCategory] = useState('');
    const [parameterDrop, setParameterDrop] = useState('');
    const [customParameter, setCustomParameter] = useState('');
    const [maxValue, setMaxValue] = useState('');
    const [unit, setUnit] = useState('');
    const [discoveredParams, setDiscoveredParams] = useState({});

    const fetchLimits = async () => {
        try {
            setLoading(true);
            const [limitsRes, alertsRes] = await Promise.all([
                api.get('/api/master/limits'),
                api.get('/api/alerts')
            ]);
            
            setExistingLimits(limitsRes.data || []);
            
            // Extract unique custom parameters that don't have limits yet from LIMIT_MISSING alerts
            const customFromAlerts = alertsRes.data.filter(a => a.alert_type === 'LIMIT_MISSING' && a.status === 'UNRESOLVED');
            const discovery = { Air: [], Water: [], Noise: [] };
            
            customFromAlerts.forEach(alert => {
                if (alert.category && alert.parameter && !discovery[alert.category].includes(alert.parameter)) {
                    // Only add if not already in the hardcoded list
                    const hardcoded = { Air: AIR_PARAMS, Water: WATER_PARAMS, Noise: NOISE_PARAMS }[alert.category];
                    if (!hardcoded.includes(alert.parameter)) {
                        discovery[alert.category].push(alert.parameter);
                    }
                }
            });
            setDiscoveredParams(discovery);
        } catch (error) {
            console.error("Failed fetching master limits or alerts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLimits();
    }, []);

    // Auto-fill Logic
    useEffect(() => {
        const currentPath = window.location.search;
        const params = new URLSearchParams(currentPath);
        const urlCat = params.get('category');
        const urlParam = params.get('parameter');
        const urlUnit = params.get('unit');

        if (urlCat && urlParam && !category) {
            setCategory(urlCat);
            setParameterDrop(urlParam);
            if (urlUnit) setUnit(urlUnit);
            setStep(3);
        }
    }, [existingLimits]);

    useEffect(() => {
        if (!category) return;

        const currentParam = parameterDrop === 'Other' ? customParameter.trim() : parameterDrop;
        if (!currentParam) {
            // Reset if they back out
            setMaxValue('');
            setUnit('');
            return;
        }

        const exactMatch = existingLimits.find(
            limit => limit.category === category && limit.parameter.toLowerCase() === currentParam.toLowerCase()
        );

        if (exactMatch) {
            setMaxValue(exactMatch.max_allowed_value);
            setUnit(exactMatch.unit);
        } else {
            // Check discovered units
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('parameter') === currentParam && urlParams.get('unit')) {
                setUnit(urlParams.get('unit'));
            } else {
                setMaxValue('');
                setUnit('');
            }
        }
    }, [parameterDrop, customParameter, category, existingLimits]);

    const handleCategorySelect = (selectedCat) => {
        setCategory(selectedCat);
        setParameterDrop('');
        setCustomParameter('');
        setStep(2);
    };

    const handleParamSelect = (e) => {
        const val = e.target.value;
        setParameterDrop(val);
        if (val !== 'Other') {
            setStep(3);
        }
    };

    const handleCustomParamChange = (e) => {
        setCustomParameter(e.target.value);
        if (e.target.value.trim().length > 1) {
            setStep(3); // unlock next inputs
        } else {
            setStep(2);
        }
    };

    const getDropdownOptions = () => {
        const discovered = discoveredParams[category] || [];
        switch (category) {
            case 'Air': return [...AIR_PARAMS, ...discovered];
            case 'Water': return [...WATER_PARAMS, ...discovered];
            case 'Noise': return [...NOISE_PARAMS, ...discovered];
            default: return [];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const finalParam = parameterDrop === 'Other' ? customParameter.trim() : parameterDrop;

        if (!category || !finalParam || !maxValue || !unit) {
            alert('Please complete all fields.');
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                category,
                parameter: finalParam,
                max_allowed_value: parseFloat(maxValue),
                unit
            };

            await api.post('/api/master/limits', payload);

            // Show Success
            setToast(`Policy for ${finalParam} successfully updated!`);
            setTimeout(() => setToast(null), 4000);

            // Reset Form smoothly
            setCategory('');
            setParameterDrop('');
            setCustomParameter('');
            setMaxValue('');
            setUnit('');
            setStep(1);

            // Refetch to populate right-side table
            await fetchLimits();

        } catch (error) {
            console.error('Failed to upsert limit policy', error.response?.data || error);
            alert(`Error: ${error.response?.data?.detail || 'Failed to update policy'}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Grouping helper for the table
    const groupedLimits = existingLimits.reduce((acc, limit) => {
        if (!acc[limit.category]) acc[limit.category] = [];
        acc[limit.category].push(limit);
        return acc;
    }, {});

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 relative">

            {toast && (
                <div className="fixed top-20 right-4 lg:right-10 z-[100] bg-emerald-500 text-slate-950 px-5 py-3 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.3)] animate-bounce">
                    <CheckCircle2 className="w-5 h-5" /> {toast}
                </div>
            )}

            <div className="mb-8 border-b border-[#263238] pb-6">
                <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                    <ShieldAlert className="text-emerald-500 w-8 h-8" />
                    Policy & Prescribed Limits
                </h1>
                <p className="text-sm text-slate-400 mt-2">Globally define the automated compliance bounds for the entire state network.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column - Policy Form */}
                <div className="space-y-6">
                    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm overflow-hidden relative">
                        {loading && (
                            <div className="absolute inset-0 bg-[#1a2327]/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                <Activity className="w-8 h-8 text-emerald-500 animate-spin" />
                            </div>
                        )}

                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-emerald-500" /> Policy Configuration Ruleset
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Step 1: Category */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">1. Select Domain Area</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleCategorySelect('Air')}
                                        className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${category === 'Air' ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold' : 'bg-[#0b1114] border-[#263238] text-slate-400 hover:border-slate-500'}`}
                                    >
                                        <Wind className="w-6 h-6" /> Air
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCategorySelect('Water')}
                                        className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${category === 'Water' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold' : 'bg-[#0b1114] border-[#263238] text-slate-400 hover:border-slate-500'}`}
                                    >
                                        <Droplet className="w-6 h-6" /> Water
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCategorySelect('Noise')}
                                        className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${category === 'Noise' ? 'bg-purple-500/10 border-purple-500 text-purple-400 font-bold' : 'bg-[#0b1114] border-[#263238] text-slate-400 hover:border-slate-500'}`}
                                    >
                                        <VolumeX className="w-6 h-6" /> Noise
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Parameter Selection */}
                            <div className={`space-y-3 transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">2. Target Parameter</label>
                                <select
                                    value={parameterDrop}
                                    onChange={handleParamSelect}
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                                >
                                    <option value="" disabled>Select a predefined pollutant...</option>
                                    {getDropdownOptions().map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other (Custom)</option>
                                </select>

                                {parameterDrop === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Type custom parameter name (e.g. Iron)"
                                        value={customParameter}
                                        onChange={handleCustomParamChange}
                                        className="w-full bg-[#0b1114] border border-emerald-500/50 rounded-xl px-4 py-3 mt-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 shadow-[0_0_10px_rgba(0,230,118,0.1)]"
                                    />
                                )}
                            </div>

                            {/* Step 3: Thresholds */}
                            <div className={`space-y-4 transition-opacity duration-300 bg-[#0b1114] p-5 rounded-xl border border-[#263238] ${step >= 3 ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <ListPlus className="w-4 h-4 text-emerald-500" />
                                    <label className="text-xs font-bold text-emerald-500 uppercase tracking-widest">3. Set Strict Bounds</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Permissible Limit</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={maxValue}
                                            onChange={(e) => setMaxValue(e.target.value)}
                                            placeholder="e.g. 60"
                                            className="w-full bg-[#1a2327] border border-[#263238] rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Measurement Unit</label>
                                        <input
                                            type="text"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="e.g. µg/m³"
                                            className="w-full bg-[#1a2327] border border-[#263238] rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || step < 3 || !maxValue || !unit}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-[#0b1114] font-black rounded-xl transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] hover:shadow-[0_0_25px_rgba(0,230,118,0.5)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed uppercase tracking-wider text-sm"
                            >
                                {submitting ? <Activity className="w-5 h-5 animate-spin" /> : 'Save / Update Policy Rule'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column - Table of rules */}
                <div className="bg-[#1a2327] border border-[#263238] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px]">
                    <div className="p-5 border-b border-[#263238] bg-slate-900/30">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ListPlus className="text-emerald-500 w-5 h-5" /> Active Prescribed Limits
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        {/* Pending Discovery Alerts */}
                        {Object.values(discoveredParams).flat().length > 0 && (
                            <div className="mb-6 space-y-2">
                                {Object.entries(discoveredParams).map(([cat, params]) => 
                                    params.map(p => (
                                        <div key={`${cat}-${p}`} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between group animate-pulse hover:animate-none transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-500/20 rounded-lg">
                                                    <ShieldAlert className="w-5 h-5 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">Missing Policy: {p}</h4>
                                                    <p className="text-[10px] text-red-400 uppercase font-black">{cat} Segment</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setCategory(cat);
                                                    setParameterDrop(p);
                                                    setStep(3);
                                                }}
                                                className="text-[10px] bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                            >
                                                Fix Now
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <Activity className="w-8 h-8 text-emerald-500 animate-spin" />
                            </div>
                        ) : existingLimits.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
                                <p>No rules enforced yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {['Air', 'Water', 'Noise'].map(cat => {
                                    if (!groupedLimits[cat] || groupedLimits[cat].length === 0) return null;
                                    return (
                                        <div key={cat} className="space-y-3">
                                            <h3 className={`font-bold text-sm tracking-widest uppercase border-b pb-2
                                                ${cat === 'Air' ? 'text-blue-400 border-blue-500/20' :
                                                    cat === 'Water' ? 'text-cyan-400 border-cyan-500/20' : 'text-purple-400 border-purple-500/20'}`}
                                            >
                                                {cat} Quality Limits
                                            </h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {groupedLimits[cat].map(limit => (
                                                    <div key={limit.id} className="bg-[#0b1114] border border-[#263238] rounded-lg p-3 flex justify-between items-center hover:bg-white/5 transition-colors">
                                                        <span className="font-bold text-slate-300 text-sm">{limit.parameter}</span>
                                                        <div className="font-mono text-sm">
                                                            <span className="text-red-400 font-bold">{limit.max_allowed_value}</span>
                                                            <span className="text-slate-500 ml-1">{limit.unit}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PolicyLimits;
