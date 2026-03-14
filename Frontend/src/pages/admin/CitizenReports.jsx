import { useState, useEffect } from 'react';
import { ClipboardList, MapPin, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import ExportButtons from '../../components/ExportButtons';

const EXPORT_COLUMNS = [
  { header: 'Tracking ID',  key: 'tracking_id'  },
  { header: 'Category',     key: 'category'     },
  { header: 'Location',     key: 'location'     },
  { header: 'Severity',     key: 'severity'     },
  { header: 'Description',  key: 'description'  },
  { header: 'Status',       key: 'status'       },
  { header: 'Submitted At', key: 'submitted_at' },
  { header: 'Anonymous',    key: 'anonymous'    },
];

const SEVERITY_LABELS = { 1: 'Minor', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Critical' };
const SEVERITY_COLORS = {
  1: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  2: 'bg-lime-500/10 text-lime-600 border-lime-500/30',
  3: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  4: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  5: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};
const CATEGORY_COLORS = {
  air: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  water: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  noise: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  dumping: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  other: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
};

export default function CitizenReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/public/incident-reports');
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch citizen reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.category === filter);

  const counts = reports.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <ClipboardList className="text-emerald-500 w-8 h-8" />
            Citizen Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            All pollution incidents reported by citizens — {reports.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={filtered}
            columns={EXPORT_COLUMNS}
            filename="citizen-reports"
            title="Citizen Reports — Export"
          />
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:bg-emerald-500/10 hover:text-emerald-600"
            style={{ borderColor: 'var(--border-accent)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['air', 'water', 'noise', 'dumping', 'other'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? 'all' : cat)}
            className={`glass-card p-4 text-center rounded-xl border transition-all ${filter === cat ? 'ring-2 ring-emerald-500' : ''}`}
          >
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{counts[cat] || 0}</p>
            <p className="text-xs font-semibold capitalize mt-1" style={{ color: 'var(--text-secondary)' }}>{cat}</p>
          </button>
        ))}
      </div>

      {/* Report cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 rounded-xl animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-16 flex flex-col items-center gap-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500/40" />
          <p style={{ color: 'var(--text-secondary)' }}>No reports found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className="glass-card neon-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Left: badges */}
              <div className="flex flex-col gap-2 shrink-0 min-w-[120px]">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${CATEGORY_COLORS[report.category] || CATEGORY_COLORS.other}`}>
                  {report.category}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${SEVERITY_COLORS[report.severity] || SEVERITY_COLORS[3]}`}>
                  {SEVERITY_LABELS[report.severity] || report.severity}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                  {report.tracking_id}
                </span>
              </div>

              {/* Middle: content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {report.location}
                  </span>
                </div>
                <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {report.description}
                </p>
                {report.anonymous && (
                  <span className="text-[10px] font-bold text-slate-400 mt-1 inline-block">Anonymous submission</span>
                )}
              </div>

              {/* Right: meta */}
              <div className="flex flex-col items-end gap-2 shrink-0 text-right">
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={12} />
                  {new Date(report.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  report.status === 'received'
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                }`}>
                  {report.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
