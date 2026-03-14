import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Users, Mail, Lock, Shield, Map, Factory, AlertCircle, CheckCircle2 } from 'lucide-react';

const UserManagement = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'ro',
        region_id: '',
        entity_id: ''
    });

    const [roList, setRoList] = useState([]);
    const [industryList, setIndustryList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [roRes, indRes] = await Promise.all([
                    api.get('/api/master/regional-offices'),
                    api.get('/api/master/industries')
                ]);
                setRoList(roRes.data || []);
                setIndustryList(indRes.data || []);
            } catch (err) {
                console.error("Failed to fetch master data", err);
                setError("Could not load master data. Please refresh the page.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchMasterData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updated = { ...prev, [name]: value };

            if (name === 'role' && value === 'ro') {
                updated.entity_id = '';
            }

            return updated;
        });
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
                role: formData.role,
                region_id: formData.region_id,
                entity_id: formData.role === 'ro' ? null : formData.entity_id || null
            };

            await api.post('/api/auth/admin/onboard-user', payload);

            setSuccess(true);

            setFormData({
                email: '',
                password: '',
                role: 'ro',
                region_id: '',
                entity_id: ''
            });

            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            console.error(err.response?.data);
            setError(err.response?.data?.detail || "Failed to onboard user. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
                <div className="text-sm text-slate-400">Account Onboarding Center</div>
            </div>

            {/* CENTERED CARD */}
            <div className="max-w-2xl mx-auto bg-[#1a2327] border border-[#263238] rounded-xl p-6 shadow-sm">

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-500" />
                    Onboard New User
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
                        <p className="text-sm text-emerald-400">User successfully onboarded!</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* EMAIL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Email Address
                        </label>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-4 w-4 text-slate-500" />
                            </div>

                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                                placeholder="user@prithvinet.gov.in"
                            />
                        </div>
                    </div>

                    {/* PASSWORD */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Temporary Password
                        </label>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-slate-500" />
                            </div>

                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-3 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-600"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* ROLE */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Account Role
                        </label>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Shield className="h-4 w-4 text-slate-500" />
                            </div>

                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-10 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                            >
                                <option value="ro">Regional Officer (RO)</option>
                                <option value="industry">Industry User</option>
                            </select>
                        </div>
                    </div>

                    {/* RO DROPDOWN */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Assign to Regional Office
                        </label>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Map className="h-4 w-4 text-slate-500" />
                            </div>

                            <select
                                name="region_id"
                                value={formData.region_id}
                                onChange={handleChange}
                                required
                                disabled={loadingData}
                                className="w-full pl-10 pr-10 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none disabled:opacity-50"
                            >
                                <option value="" disabled>
                                    {loadingData ? 'Loading ROs...' : 'Select a Regional Office'}
                                </option>

                                {roList.map((ro) => (
                                    <option key={ro.id} value={ro.id}>
                                        {ro.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* INDUSTRY */}
                    {formData.role === 'industry' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Assign to Industry
                            </label>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Factory className="h-4 w-4 text-slate-500" />
                                </div>

                                <select
                                    name="entity_id"
                                    value={formData.entity_id}
                                    onChange={handleChange}
                                    required
                                    disabled={loadingData}
                                    className="w-full pl-10 pr-10 py-2 bg-[#0b1114] border border-[#263238] rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none disabled:opacity-50"
                                >
                                    <option value="" disabled>
                                        {loadingData ? 'Loading Industries...' : 'Select an Industry'}
                                    </option>

                                    {industryList.map((ind) => (
                                        <option key={ind.id} value={ind.id}>
                                            {ind.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || loadingData}
                        className="mt-6 w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? 'Onboarding User...' : 'Onboard User'}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default UserManagement;