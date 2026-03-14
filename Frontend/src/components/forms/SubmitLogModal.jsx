import React, { useState, useEffect } from 'react';
import { Plus, X, UploadCloud, Activity, CheckCircle, Search } from 'lucide-react';
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
            fetchLocations();
        }
    }, [isOpen]);

    const fetchLocations = async () => {
        try {
            // Fetch locations from master API
            const res = await api.get('/api/master/locations');
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
        
        // Clean parameters array into objects
        const paramObj = {};
        const unitObj = {};
        parameters.forEach(p => {
            if (p.key.trim() && p.value !== '') {
                paramObj[p.key.trim()] = parseFloat(p.value);
                if (p.unit.trim()) {
                    unitObj[p.key.trim()] = p.unit.trim();
                }
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
                industry_id: industry_id,
                category: formData.category,
                parameters: paramObj,
                parameter_units: unitObj,
                source: formData.source,
                timestamp: new Date(formData.timestamp).toISOString()
            };

            await api.post('/api/ingestion/manual', payload);
            
            // Show Success Notification
            onSuccess();
            onClose();
            
            // Reset state
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
            <div className="bg-[#1a2327] border border-[#263238] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#263238] bg-[#1a2327]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <UploadCloud className="text-emerald-500 w-5 h-5" />
                        Digital Log Submission
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    <form id="log-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Location Sensor</label>
                                <select 
                                    required
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                                <select 
                                    required
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Source description</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. Main Boiler Exhaust"
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    value={formData.source}
                                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Timestamp</label>
                                <input 
                                    type="datetime-local"
                                    required
                                    className="w-full bg-[#0b1114] border border-[#263238] rounded-xl px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    value={formData.timestamp}
                                    onChange={(e) => setFormData({...formData, timestamp: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="border border-[#263238] bg-[#0b1114] rounded-xl p-4">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Measured Parameters</label>
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
                                                        className="w-full bg-[#1a2327] border border-[#263238] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                        value={param.key}
                                                        onChange={(e) => handleParamChange(i, 'key', e.target.value)}
                                                    />
                                                    <button type="button" onClick={() => handleParamChange(i, 'revertCustom')} className="p-1 text-slate-500 hover:text-emerald-400" title="Back to list">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <select 
                                                    required
                                                    className="w-full bg-[#1a2327] border border-[#263238] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                                                className="w-full bg-[#1a2327] border border-[#263238] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                value={param.value}
                                                onChange={(e) => handleParamChange(i, 'value', e.target.value)}
                                            />
                                        </div>
                                        {param.isCustom && (
                                            <div className="w-24">
                                                <input 
                                                    type="text"
                                                    required
                                                    placeholder="Unit (e.g. mg/L)"
                                                    className="w-full bg-[#1a2327] border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                    value={param.unit}
                                                    onChange={(e) => handleParamChange(i, 'unit', e.target.value)}
                                                />
                                            </div>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={() => removeParameter(i)}
                                            disabled={parameters.length === 1}
                                            className="p-2 text-slate-500 hover:text-red-500 transition-colors disabled:opacity-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>
                
                <div className="p-4 border-t border-[#263238] bg-[#1a2327] flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 font-semibold text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        form="log-form"
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0b1114] font-bold rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(0,230,118,0.2)]"
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
