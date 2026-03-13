import React, { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, Search, Activity, X, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import AddRegionalOfficeForm from '../../components/forms/AddRegionalOfficeForm';

const Offices = () => {
    const [offices, setOffices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRO, setSelectedRO] = useState(null);
    const [loading, setLoading] = useState(true);

    const [editFormData, setEditFormData] = useState({
        name: '',
        region_id: '',
        jurisdiction_districts: ''
    });

    const [toastMessage, setToastMessage] = useState(null);

    const triggerToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchROs = async () => {
        try {
            const res = await api.get('/api/master/regional-offices');
            setOffices(res.data || []);
        } catch (err) {
            console.error("Failed to fetch ROs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchROs();
    }, []);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditModalOpen(false);
        setSelectedRO(null);
        fetchROs(); // Refresh the list after closing
    };

    const handleEditClick = (office) => {
        setSelectedRO(office);
        setEditFormData({
            name: office.name || '',
            region_id: office.region_id || '',
            jurisdiction_districts: office.jurisdiction_districts ? office.jurisdiction_districts.join(', ') : ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            // Convert comma separated string back to array if needed by backend, assuming standard format
            const payload = {
                name: editFormData.name,
                region_id: editFormData.region_id,
                jurisdiction_districts: editFormData.jurisdiction_districts.split(',').map(d => d.trim()).filter(d => d)
            };

            await api.put(`/api/master/regional-offices/${selectedRO.id}`, payload, { headers });
            triggerToast("Regional Office updated successfully");
            handleCloseModal();
        } catch (error) {
            console.error("Failed to update RO:", error);
            alert("Failed to update RO. Please check console.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Regional Office? This action cannot be undone.")) return;
        
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            await api.delete(`/api/master/regional-offices/${id}`, { headers });
            triggerToast("Regional Office deleted successfully");
            
            // Remove from local state to avoid extra fetch
            setOffices(offices.filter(ro => ro.id !== id));
        } catch (error) {
            console.error("Failed to delete RO:", error);
            alert("Failed to delete RO. Please check console.");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto relative">
            
            {/* Toast Notification Overlay */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-[#1a2d22] border border-emerald-500/50 text-emerald-500 px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(28,203,91,0.2)] flex items-center gap-2 font-semibold">
                        {toastMessage}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Building2 className="text-emerald-500 w-8 h-8" />
                        Regional Offices
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Manage CECB regional headquarters and monitoring centers.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,230,118,0.2)] hover:shadow-[0_0_20px_rgba(0,230,118,0.4)] flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Add New RO
                </button>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Total ROs</p>
                        <p className="text-3xl font-black text-white mt-1">{offices.length}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-500">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-[#1a2327] border border-[#263238] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#263238] bg-slate-900/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" placeholder="Search offices..." className="w-full bg-[#0b1114] border border-[#263238] text-sm text-slate-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-emerald-500 animate-pulse">Loading regional offices...</div>
                ) : (
                    <div className="divide-y divide-[#263238]">
                        {offices.map((office) => (
                            <div key={office.id} className="p-6 hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-[#263238] flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-500/50 transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{office.name}</h3>
                                        {office.jurisdiction_districts && (
                                            <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" /> {office.jurisdiction_districts.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#00E676]"></span>
                                        ACTIVE
                                    </span>
                                    <button 
                                        onClick={() => handleEditClick(office)}
                                        className="text-sm text-slate-500 hover:text-emerald-500 font-semibold px-3 py-1.5 rounded-lg border border-transparent hover:border-emerald-500/30 transition-all"
                                    >
                                        Manage
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(office.id)}
                                        className="text-slate-500 hover:text-red-500 p-1.5 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                                        title="Delete Regional Office"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 p-1 bg-[#1a2327] rounded-full border border-[#263238]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <AddRegionalOfficeForm />
                    </div>
                </div>
            )}

            {isEditModalOpen && selectedRO && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200 bg-[#11181c] border border-[#263238] rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-[#263238] bg-[#151c21] flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-500" /> Edit Regional Office
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">RO Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editFormData.name}
                                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                                    className="w-full bg-[#151c21] border border-[#263238] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Region ID / Key</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editFormData.region_id}
                                    onChange={e => setEditFormData({...editFormData, region_id: e.target.value})}
                                    className="w-full bg-[#151c21] border border-[#263238] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Districts (Comma Separated)</label>
                                <input 
                                    type="text" 
                                    value={editFormData.jurisdiction_districts}
                                    onChange={e => setEditFormData({...editFormData, jurisdiction_districts: e.target.value})}
                                    className="w-full bg-[#151c21] border border-[#263238] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                    placeholder="Raipur, Bilaspur, Bhilai"
                                />
                            </div>
                            <button 
                                type="submit"
                                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(0,230,118,0.2)] hover:shadow-[0_0_20px_rgba(0,230,118,0.4)]"
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Offices;
