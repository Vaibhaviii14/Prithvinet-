import React, { useState, useEffect, useContext } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Tag, Factory } from 'lucide-react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const AddLocationForm = () => {
    const { user } = useContext(AuthContext);
    
    const [formData, setFormData] = useState({
        name: '',
        type: 'Air',
        industry_id: '',
        latitude: '',
        longitude: ''
    });
    
    const [industries, setIndustries] = useState([]);
    const [loadingIndustries, setLoadingIndustries] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchIndustries = async () => {
            try {
                const res = await api.get('/api/master/industries');
                setIndustries(res.data || []);
            } catch (err) {
                console.error("Failed to fetch industries", err.response?.data || err);
            } finally {
                setLoadingIndustries(false);
            }
        };
        fetchIndustries();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                region_id: user?.region_id || "unassigned",
                industry_id: formData.industry_id === '' ? null : formData.industry_id,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude)
            };

            await api.post('/api/master/locations', payload);
            setSuccess(true);
            setFormData({ name: '', type: 'Air', industry_id: '', latitude: '', longitude: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Error submitting location:", err.response?.data || err);
            setError(
                typeof err.response?.data?.detail === "string"
                    ? err.response.data.detail
                    : JSON.stringify(err.response?.data?.detail) || "Failed to create monitoring location."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="theme-modal rounded-xl p-6 shadow-sm max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <MapPin className="w-5 h-5 text-emerald-500" /> New Sensor Location
            </h2>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-3 text-left">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-500 max-h-24 overflow-y-auto">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-600">Location added successfully!</p>
                </div>
            )}

            <div className="space-y-4 text-left">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Station Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="theme-input w-full px-3 py-2 rounded-lg text-sm"
                        placeholder="e.g. City Center AQI Station"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Monitor Type</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tag className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            className="theme-input w-full pl-10 pr-10 py-2 rounded-lg text-sm appearance-none"
                        >
                            <option value="Air">Air Quality</option>
                            <option value="Water">Water Quality</option>
                            <option value="Noise">Noise Levels</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Associated Industry (Optional)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Factory className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            name="industry_id"
                            value={formData.industry_id}
                            onChange={handleChange}
                            disabled={loadingIndustries}
                            className="theme-input w-full pl-10 pr-10 py-2 rounded-lg text-sm appearance-none disabled:opacity-50"
                        >
                            <option value="">Public / No Industry</option>
                            {industries.map(ind => (
                                <option key={ind.id} value={ind.id}>{ind.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Latitude</label>
                        <input
                            type="number"
                            step="any"
                            name="latitude"
                            value={formData.latitude}
                            onChange={handleChange}
                            required
                            className="theme-input w-full px-3 py-2 rounded-lg text-sm"
                            placeholder="e.g. 21.2787"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Longitude</label>
                        <input
                            type="number"
                            step="any"
                            name="longitude"
                            value={formData.longitude}
                            onChange={handleChange}
                            required
                            className="theme-input w-full px-3 py-2 rounded-lg text-sm"
                            placeholder="e.g. 81.8661"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.2)] hover:shadow-[0_0_20px_rgba(0,230,118,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {loading ? 'Submitting...' : 'Register Location'}
            </button>
        </form>
    );
};

export default AddLocationForm;
