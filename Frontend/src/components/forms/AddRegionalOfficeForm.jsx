import React, { useState } from 'react';
import api from '../../api/axios';
import { Building, MapPin, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

const AddRegionalOfficeForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        jurisdiction_districts: '',
        contact_email: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Split by comma and trim each district
            const districtsArray = formData.jurisdiction_districts
                .split(',')
                .map((d) => d.trim())
                .filter(d => d.length > 0);

            const payload = {
                name: formData.name,
                jurisdiction_districts: districtsArray,
                contact_email: formData.contact_email
            };

            await api.post('/api/master/regional-offices', payload);
            
            setSuccess(true);
            setFormData({ name: '', jurisdiction_districts: '', contact_email: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to create Regional Office. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-[#1a2327] border border-[#263238] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-500" /> Add Regional Office
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
                    <p className="text-sm text-emerald-400">Regional Office created successfully!</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">RO Name</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                            placeholder="e.g. Indore RO"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Jurisdiction Districts</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            name="jurisdiction_districts"
                            value={formData.jurisdiction_districts}
                            onChange={handleChange}
                            required
                            className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                            placeholder="Comma-separated (e.g. Indore, Dhar)"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Contact Email</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            required
                            className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                            placeholder="ro@prithvinet.gov.in"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a2327] focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? 'Submitting...' : 'Register Regional Office'}
            </button>
        </form>
    );
};

export default AddRegionalOfficeForm;
