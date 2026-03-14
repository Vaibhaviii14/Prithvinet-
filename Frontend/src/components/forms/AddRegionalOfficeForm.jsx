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
        <form onSubmit={handleSubmit} className="theme-modal rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Building className="w-5 h-5 text-emerald-500" /> Add Regional Office
            </h2>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-600">Regional Office created successfully!</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>RO Name</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Building className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="theme-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                            placeholder="e.g. Indore RO"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Jurisdiction Districts</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            name="jurisdiction_districts"
                            value={formData.jurisdiction_districts}
                            onChange={handleChange}
                            required
                            className="theme-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                            placeholder="Comma-separated (e.g. Indore, Dhar)"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Contact Email</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            required
                            className="theme-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                            placeholder="ro@prithvinet.gov.in"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.2)] hover:shadow-[0_0_20px_rgba(0,230,118,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {loading ? 'Submitting...' : 'Register Regional Office'}
            </button>
        </form>
    );
};

export default AddRegionalOfficeForm;
