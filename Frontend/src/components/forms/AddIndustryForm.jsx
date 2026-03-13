import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Factory, Tags, Map, AlertCircle, CheckCircle2 } from 'lucide-react';

const AddIndustryForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        industry_type: '',
        region_id: ''
    });
    const [roList, setRoList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingROs, setFetchingROs] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchROs = async () => {
            try {
                const res = await api.get('/api/master/regional-offices');
                setRoList(res.data || []);
            } catch (err) {
                console.error("Failed to fetch ROs", err);
                setError("Could not load Regional Offices. Please refresh the page.");
            } finally {
                setFetchingROs(false);
            }
        };
        fetchROs();
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
            await api.post('/api/master/industries', formData);
            
            setSuccess(true);
            setFormData({ name: '', industry_type: '', region_id: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to register industry. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-[#1a2327] border border-[#263238] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Factory className="w-5 h-5 text-emerald-500" /> Register Industry
            </h2>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-400">Industry registered successfully!</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Industry Name</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Factory className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                            placeholder="e.g. Steel Plant Alpha"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Industry Type</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tags className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            name="industry_type"
                            value={formData.industry_type}
                            onChange={handleChange}
                            required
                            className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                            placeholder="e.g. Metallurgical, Chemical"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Assigned Regional Office</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Map className="h-4 w-4 text-slate-500" />
                        </div>
                        <select
                            name="region_id"
                            value={formData.region_id}
                            onChange={handleChange}
                            required
                            disabled={fetchingROs}
                            className="w-full pl-10 pr-10 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none disabled:opacity-50"
                        >
                            <option value="" disabled>
                                {fetchingROs ? 'Loading ROs...' : 'Select a Regional Office'}
                            </option>
                            {roList.map((ro) => (
                                <option key={ro.id} value={ro.id}>
                                    {ro.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || fetchingROs}
                className="mt-6 w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a2327] focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? 'Registering...' : 'Register Industry'}
            </button>
        </form>
    );
};

export default AddIndustryForm;
