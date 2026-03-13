import React, { useState, useEffect } from 'react';
import { List, Search, Filter } from 'lucide-react';
import api from '../../api/axios';

const LogsView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                // Fetch using query parameter if a category is selected
                const url = filterCategory ? `/api/ingestion/logs?category=${filterCategory}` : '/api/ingestion/logs';
                const res = await api.get(url);
                setLogs(res.data || []);
            } catch (err) {
                console.error("Failed to fetch logs", err.response?.data || err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [filterCategory]); // Re-run effect whenever filterCategory changes

    // Local client-side search across fetched logs (for text filtering)
    const filteredLogs = logs.filter(log => 
        searchQuery 
            ? (log.message?.toLowerCase().includes(searchQuery.toLowerCase()) || JSON.stringify(log.payload).toLowerCase().includes(searchQuery.toLowerCase())) 
            : true
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <List className="text-emerald-500 w-8 h-8" />
                        Inspections & Logs
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">View all submissions in your jurisdiction.</p>
                </div>
            </div>

            <div className="bg-[#1a2327] border border-[#263238] rounded-2xl overflow-hidden shadow-sm">
                {/* Header Actions */}
                <div className="p-4 border-b border-[#263238] bg-slate-900/30 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0b1114] border border-[#263238] text-sm text-slate-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full md:w-48 bg-[#0b1114] border border-[#263238] text-sm text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium appearance-none"
                        >
                            <option value="">All Categories</option>
                            <option value="Air">Air</option>
                            <option value="Water">Water</option>
                            <option value="Noise">Noise</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-emerald-500 animate-pulse">Loading logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No logs found matching criteria.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#0b1114] border-b border-[#263238]">
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Message/Payload</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#263238]">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id || log._id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 text-sm text-slate-300">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-white">
                                            {log.source || 'Unknown'}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                {log.category || 'General'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400 max-w-sm" title={JSON.stringify(log.payload)}>
                                            <div className="truncate max-w-[200px] md:max-w-sm">
                                                {log.message || JSON.stringify(log.payload)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {log.severity === 'high' ? (
                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black tracking-wider border bg-red-500/10 text-red-500 border-red-500/20">HIGH ALERT</span>
                                            ) : (
                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black tracking-wider border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">NORMAL</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsView;
