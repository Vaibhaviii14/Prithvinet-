import React, { useState, useEffect } from 'react';
import { Users, Mail, Lock, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const OnboardTeamForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        entity_id: ''
    });

    const [locations, setLocations] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await api.get('/api/master/locations');
                setLocations(res.data || []);
            } catch (err) {
                console.error("Failed to fetch locations", err.response?.data || err);
                setError("Could not load monitoring locations. Please refresh the page.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchLocations();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const payload = {
                email: formData.email,
                password: formData.password,
                entity_id: formData.entity_id === "" ? null : formData.entity_id,
                role: 'monitoring_team'
            };

            await api.post('/api/auth/ro/onboard-team', payload);
            setSuccess(true);
            setFormData({ email: '', password: '', entity_id: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Error onboarding team:", err.response?.data || err);
            setError(
                typeof err.response?.data?.detail === "string"
                    ? err.response.data.detail
                    : JSON.stringify(err.response?.data?.detail) || "Failed to onboard team member."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="theme-modal rounded-xl p-6 shadow-sm max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Users className="w-5 h-5 text-emerald-500" /> Onboard Ground Staff
            </h2>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-500 max-h-24 overflow-y-auto">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-600">Team member boarded successfully!</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="theme-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                            placeholder="staff@prithvinet.gov.in"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Temporary Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="theme-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Assign to Station</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            name="entity_id"
                            value={formData.entity_id}
                            onChange={handleChange}
                            required
                            disabled={loadingData}
                            className="theme-input w-full pl-10 pr-10 py-2 rounded-lg text-sm appearance-none disabled:opacity-50"
                        >
                            <option value="" disabled>
                                {loadingData ? 'Loading stations...' : 'Select a Location'}
                            </option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting || loadingData}
                    className="mt-6 w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,230,118,0.2)] hover:shadow-[0_0_20px_rgba(0,230,118,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {submitting ? 'Onboarding Member...' : 'Register Team Member'}
                </button>
            </form>
        </div>
    );
};

export default OnboardTeamForm;
