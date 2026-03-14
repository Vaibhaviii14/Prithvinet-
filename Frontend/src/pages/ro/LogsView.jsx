import React, { useState, useEffect } from 'react';
import { List, Search, Filter } from 'lucide-react';
import api from '../../api/axios';
import ExportButtons from '../../components/ExportButtons';

const EXPORT_COLUMNS = [
  { header: 'Time',                key: 'timestamp'          },
  { header: 'Source',              key: 'source'             },
  { header: 'Category',            key: 'category'           },
  { header: 'Location ID',         key: 'location_id'        },
  { header: 'Industry ID',         key: 'industry_id'        },
  { header: 'Parameters Summary',  key: 'parameters_summary' },
];

const flattenLog = (log) => ({
  ...log,
  parameters_summary: log.parameters
    ? Object.entries(log.parameters).map(([k, v]) => `${k}: ${v}`).join(', ')
    : '',
});

const LogsView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
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
    }, [filterCategory]);

    const filteredLogs = logs.filter(log =>
        searchQuery
            ? (log.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               JSON.stringify(log.parameters || {}).toLowerCase().includes(searchQuery.toLowerCase()))
            : true
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <List className="text-emerald-500 w-8 h-8" />
                        Inspections & Logs
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>View all submissions in your jurisdiction.</p>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {/* Header Actions */}
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="theme-input w-full text-sm rounded-lg pl-10 pr-4 py-2.5 font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="w-5 h-5 text-slate-400 shrink-0" />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="theme-input w-full md:w-48 text-sm rounded-lg px-4 py-2.5 font-medium appearance-none"
                        >
                            <option value="">All Categories</option>
                            <option value="Air">Air</option>
                            <option value="Water">Water</option>
                            <option value="Noise">Noise</option>
                        </select>
                        <ExportButtons
                            data={filteredLogs.map(flattenLog)}
                            columns={EXPORT_COLUMNS}
                            filename="inspection-logs"
                            title="Inspections & Logs — Export"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-emerald-500 animate-pulse">Loading logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>No logs found matching criteria.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-accent)' }}>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Time</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Source</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Category</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Parameters</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => (
                                    <tr key={log.id || log._id} className="hover:bg-emerald-500/5 transition-colors" style={{ borderBottom: '1px solid var(--border-accent)' }}>
                                        <td className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {log.source || 'Unknown'}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                {log.category || 'General'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <div className="truncate max-w-[200px] md:max-w-sm">
                                                {log.parameters
                                                    ? Object.entries(log.parameters).map(([k, v]) => `${k}: ${v}`).join(', ')
                                                    : '—'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black tracking-wider border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                NORMAL
                                            </span>
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
