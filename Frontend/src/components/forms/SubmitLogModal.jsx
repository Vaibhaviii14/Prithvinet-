import React, { useState, useEffect } from 'react';
import { Plus, X, UploadCloud, Activity, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

const SubmitLogModal = ({ isOpen, onClose, onSuccess }) => {
    const PARAMETER_OPTIONS = {
        Air: ["PM10", "PM2.5", "SO2", "NO2", "CO", "O3", "NH3", "Pb", "Benzene", "BaP"],
        Water: ["pH", "BOD", "COD", "TSS", "TDS", "Oil & Grease", "Lead", "Arsenic", "Mercury"],
        Noise: ["Day Time (dB)", "Night Time (dB)"]
    };

    const [submitting, setSubmitting] = useState(false);
    const [locations, setLocations] = useState([]);

    const getLocalDatetimeString = () => {
        const now = new Date();
        const localTz = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localTz.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState({
        location_id: '',
        category: 'Air',
        source: '',
        timestamp: getLocalDatetimeString()
    });

    const [parameters, setParameters] = useState([{ key: '', value: '', unit: '', isCustom: false }]);

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, timestamp: getLocalDatetimeString() }));
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const filterRegion = user?.role !== 'super_admin' ? user?.region_id : null;
            fetchLocations(null, filterRegion);
        }
    }, [isOpen]);

    const fetchLocations = async (industryId, regionId) => {
        try {
            let url = '/api/master/locations';
            const params = new URLSearchParams();
            if (industryId) params.append('industry_id', industryId);
            if (regionId) params.append('region_id', regionId);
            if (params.toString()) url += `?${params.toString()}`;
            const res = await api.get(url);
            setLocations(res.data);
        } catch (err) {
            console.error('Failed to fetch locations', err);
        }
    };

    const handleParamChange = (index, field, val) => {
        const newParams = [...parameters];
        if (field === 'key' && val === 'CUSTOM_OPTION') {
            newParams[index].isCustom = true;
            newParams[index].key = '';
        } else if (field === 'revertCustom') {
            newParams[index].isCustom = false;
            newParams[index].key = '';
        } else {
            newParams[index][field] = val;
        }
        setParameters(newParams);
    };

    const addParameter = () => {
        setParameters([...parameters, { key: '', value: '', unit: '', isCustom: false }]);
    };

    const removeParameter = (index) => {
        const newParams = Object.assign([], parameters);
        newParams.splice(index, 1);
        setParameters(newParams);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paramObj = {};
        const unitObj = {};
        parameters.forEach(p => {
            if (p.key.trim() && p.value !== '') {
                paramObj[p.key.trim()] = parseFloat(p.value);
                if (p.unit.trim()) unitObj[p.key.trim()] = p.unit.trim();
            }
        });

        if (Object.keys(paramObj).length === 0) {
            alert('Please add at least one valid parameter (e.g., SO2 = 45.5).');
            return;
        }

        try {
            setSubmitting(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const industry_id = user?.entity_id || '';

            const payload = {
                location_id: formData.location_id,
                industry_id,
                category: formData.category,
                parameters: paramObj,
                parameter_units: unitObj,
                source: formData.source,
                timestamp: new Date(formData.timestamp).toISOString()
            };

            await api.post('/api/ingestion/manual', payload);
            onSuccess();
            onClose();
            setParameters([{ key: '', value: '', unit: '', isCustom: false }]);
            setFormData({ ...formData, source: '' });
        } catch (error) {
            console.error('Submission failed', error.response?.data || error);
            alert(`Failed to submit logs: ${error.response?.data?.detail || 'Unknown error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="theme-modal rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b theme-modal-header">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <UploadCloud className="text-emerald-500 w-5 h-5" />
                        Digital Log Submission
                    </h2>
                    <button onClick={onClose} className="hover:text-emerald-500 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    <form id="log-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Location Sensor</label>
                                <select
                                    required
                                    className="theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                                    value={formData.location_id}
                                    onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                                >
                                    <option value="" disabled>Select Location...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Category</label>
                                <select
                                    required
                                    className="theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                >
                                    <option value="Air">Air Quality</option>
                                    <option value="Water">Water Quality</option>
                                    <option value="Noise">Noise Level</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Source Description</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Main Boiler Exhaust"
                                    className="theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                                    value={formData.source}
                                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Timestamp</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                                    value={formData.timestamp}
                                    onChange={(e) => setFormData({...formData, timestamp: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Parameters block */}
                        <div className="border border-black/10 dark:border-white/10 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Measured Parameters</label>
                                <button type="button" onClick={addParameter} className="text-xs text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Row
                                </button>
                            </div>

                            <div className="space-y-3">
                                {parameters.map((param, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex-1">
                                            {param.isCustom ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Custom param name..."
                                                        className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                                                        value={param.key}
                                                        onChange={(e) => handleParamChange(i, 'key', e.target.value)}
                                                    />
                                                    <button type="button" onClick={() => handleParamChange(i, 'revertCustom')} className="p-1 text-slate-400 hover:text-emerald-500" title="Back to list">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <select
                                                    required
                                                    className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                                                    value={param.key}
                                                    onChange={(e) => handleParamChange(i, 'key', e.target.value)}
                                                >
                                                    <option value="" disabled>Select Parameter...</option>
                                                    {PARAMETER_OPTIONS[formData.category]?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                    <option value="CUSTOM_OPTION">Other (Custom)...</option>
                                                </select>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                step="any"
                                                required
                                                placeholder="Value"
                                                className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                                                value={param.value}
                                                onChange={(e) => handleParamChange(i, 'value', e.target.value)}
                                            />
                                        </div>
                                        {param.isCustom && (
                                            <div className="w-24">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Unit"
                                                    className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                                                    value={param.unit}
                                                    onChange={(e) => handleParamChange(i, 'unit', e.target.value)}
                                                />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeParameter(i)}
                                            disabled={parameters.length === 1}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t theme-modal-header flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 font-semibold transition-colors text-sm hover:text-emerald-500"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Cancel
                    </button>
                    <button
                        form="log-form"
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-all text-sm disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                    >
                        {submitting ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Submit Log
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmitLogModal;
