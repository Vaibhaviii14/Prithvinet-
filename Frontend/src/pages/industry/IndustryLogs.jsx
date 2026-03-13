import React, { useState, useEffect } from 'react';
import { FileText, Search, Activity, CheckCircle2, Filter } from 'lucide-react';
import api from '../../api/axios';

const IndustryLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                let url = '/api/ingestion/logs';
                if (categoryFilter) {
                    url += `?category=${categoryFilter}`;
                }
                const res = await api.get(url);
                setLogs(res.data);
            } catch (err) {
                console.error("Failed to fetch industry logs", err.response?.data || err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [categoryFilter]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
                        <FileText className="text-emerald-500 w-8 h-8" />
                        My Submission History
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Review historical manual and IoT telemetry data.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-slate-500" />
                        </div>
                        <select 
                            className="block w-full pl-10 pr-3 py-2 border border-[#263238] rounded-xl bg-[#1a2327] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm appearance-none"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            <option value="Air">Air Quality</option>
                            <option value="Water">Water Quality</option>
                            <option value="Noise">Noise Levels</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-[#1a2327] border border-[#263238] rounded-2xl shadow-sm overflow-hidden text-sm">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0b1114] border-b border-[#263238] text-slate-400 font-semibold tracking-wide uppercase text-xs">
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Source</th>
                                <th className="p-4">Location ID</th>
                                <th className="p-4">Parameters</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#263238]">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-500">
                                        <Activity className="w-8 h-8 mx-auto mb-4 animate-spin text-emerald-500" />
                                        Loading Historical Logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-500">
                                        <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-50" />
                                        No log submissions found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 whitespace-nowrap text-slate-300">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                                                ${log.category === 'Air' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                                  log.category === 'Water' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 
                                                  'bg-purple-500/10 text-purple-400 border-purple-500/20'}`
                                            }>
                                                {log.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300">
                                            {log.source || 'Manual'}
                                        </td>
                                        <td className="p-4 text-slate-400 font-mono text-xs">
                                            {log.location_id?.slice(-8)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(log.parameters || {}).map(([key, val]) => (
                                                    <span key={key} className="inline-flex bg-[#0b1114] border border-[#263238] rounded px-2 py-1 text-[11px] font-mono">
                                                        <span className="text-slate-500 mr-1">{key}:</span>
                                                        <span className="text-emerald-400 font-bold">{val}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IndustryLogs;
