import { useState, useEffect } from 'react';
import { Download, Loader2, FileDown, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

const TIMEFRAME_OPTIONS = [
  { label: 'Last 7 Days',  value: '7'   },
  { label: 'Last 14 Days', value: '14'  },
  { label: 'Last 30 Days', value: '30'  },
  { label: 'All Time',     value: 'all' },
];

const CSV_COLUMNS = [
  { header: 'Timestamp',           key: 'timestamp'          },
  { header: 'Source',              key: 'source'             },
  { header: 'Category',            key: 'category'           },
  { header: 'Location',            key: 'location_name'      },
  { header: 'Industry',            key: 'industry_name'      },
  { header: 'Industry Type',       key: 'industry_type'      },
  { header: 'Parameters Summary',  key: 'parameters_summary' },
];

function downloadCSV(data, filename) {
  const headers = CSV_COLUMNS.map(c => c.header);
  const rows = data.map(row =>
    CSV_COLUMNS.map(c => {
      const v = row[c.key];
      if (v === null || v === undefined) return '';
      if (typeof v === 'boolean') return v ? 'Yes' : 'No';
      return String(v);
    })
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  XLSX.writeFile(wb, filename);
}

const selectClass =
  'w-full theme-input rounded-xl px-4 py-3 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

export default function ROExport() {
  const [category, setCategory]         = useState('');
  const [target, setTarget]             = useState('');
  const [days, setDays]                 = useState('');
  const [targetOptions, setTargetOptions] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState(null); // { type: 'empty'|'error'|'success', message }

  const [debugData, setDebugData] = useState(null);

  const runDebug = async () => {
    try {
      const res = await api.get('/api/reports/export-debug');
      setDebugData(res.data);
    } catch (e) {
      setDebugData({ error: String(e) });
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch target options whenever category changes
  useEffect(() => {
    setTarget('');
    setTargetOptions([]);
    if (!category) return;

    const fetchTargets = async () => {
      setTargetLoading(true);
      try {
        const url = category === 'region'
          ? '/api/master/regional-offices/mine'
          : '/api/master/industries';
        const res = await api.get(url);
        setTargetOptions(res.data || []);
      } catch {
        showToast('error', 'Failed to load options. Please try again.');
      } finally {
        setTargetLoading(false);
      }
    };
    fetchTargets();
  }, [category]);

  const canExport = category && target && days;

  const handleExport = async () => {
    if (!canExport) return;
    setLoading(true);
    try {
      const res = await api.get('/api/reports/export', {
        params: { category, target, days },
      });
      const data = res.data;

      if (!data || data.length === 0) {
        showToast('empty', 'No data available for this selection in the specified timeframe.');
        return;
      }

      const dateStamp = new Date().toISOString().slice(0, 10);
      const targetLabel = targetOptions.find(o => o.id === target || o.name === target)?.name || target;
      downloadCSV(data, `export-${category}-${targetLabel}-${dateStamp}.csv`);
      showToast('success', `${data.length} record${data.length !== 1 ? 's' : ''} exported successfully.`);
    } catch {
      showToast('error', 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toastColors = {
    empty:   'bg-amber-500/10 border-amber-500/40 text-amber-500',
    error:   'bg-rose-500/10 border-rose-500/40 text-rose-500',
    success: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500',
  };
  const ToastIcon = { empty: AlertCircle, error: AlertCircle, success: CheckCircle2 };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-10">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <FileDown className="text-emerald-500 w-8 h-8" />
          Export Data
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Build a custom export of incident reports by selecting a pivot, target, and timeframe.
        </p>
      </div>

      {/* Export card */}
      <div className="glass-card neon-border p-8 space-y-6">

        {/* Step 1 — Category */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-emerald-500">
            Step 1 — Pivot Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a category…</option>
              <option value="region">Region</option>
              <option value="industry">Industry</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500" />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Choose whether to pivot the export by geographic region or by industry type.
          </p>
        </div>

        {/* Step 2 — Target */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-emerald-500">
            Step 2 — {category === 'region' ? 'Region' : category === 'industry' ? 'Industry' : 'Target'}
          </label>
          <div className="relative">
            <select
              value={target}
              onChange={e => setTarget(e.target.value)}
              disabled={!category || targetLoading}
              className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">
                {targetLoading ? 'Loading…' : !category ? 'Select a category first…' : `Select a ${category}…`}
              </option>
              {targetOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            {targetLoading
              ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" />
              : <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500" />
            }
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {category === 'region'
              ? 'Reports will be filtered by location matching the selected region.'
              : category === 'industry'
              ? 'Reports will be filtered by the pollution category matching the selected industry type.'
              : 'Populated after selecting a category above.'}
          </p>
        </div>

        {/* Step 3 — Timeframe */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-emerald-500">
            Step 3 — Timeframe
          </label>
          <div className="relative">
            <select
              value={days}
              onChange={e => setDays(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a timeframe…</option>
              {TIMEFRAME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500" />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: 'var(--border-accent)' }} />

        {/* Summary */}
        {canExport && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm space-y-1">
            <p className="font-semibold text-emerald-500">Export summary</p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Pivot: <span className="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{category}</span>
              {' · '}
              Target: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {targetOptions.find(o => o.id === target || o.name === target)?.name || target}
              </span>
              {' · '}
              Timeframe: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {TIMEFRAME_OPTIONS.find(o => o.value === days)?.label}
              </span>
            </p>
          </div>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={!canExport || loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all
            bg-emerald-600 hover:bg-emerald-500 text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Exporting…</>
            : <><Download size={16} /> Export to CSV</>
          }
        </button>

      </div>

      {/* Debug panel */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Debug — last 5 reports in DB</h3>
          <button
            onClick={runDebug}
            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-all"
          >
            Fetch
          </button>
        </div>
        {debugData && (
          <pre className="text-xs overflow-auto max-h-64 rounded-lg p-3 bg-black/20" style={{ color: 'var(--text-secondary)' }}>
            {JSON.stringify(debugData, null, 2)}
          </pre>
        )}
      </div>

      {/* Info card */}
      <div className="glass-card p-6 space-y-3">
        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>About this export</h3>
        <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Exports pollution log readings from industries in your jurisdiction.</li>
          <li>Region pivot fetches all logs from every industry assigned to the selected regional office.</li>
          <li>Industry pivot fetches all logs from that specific industry.</li>
          <li>Columns: Timestamp, Source, Category, Location, Industry, Industry Type, Parameters Summary.</li>
          <li>The downloaded file is a <code className="text-emerald-500 text-xs">.csv</code> compatible with Excel and Google Sheets.</li>
        </ul>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-lg text-sm font-semibold transition-all ${toastColors[toast.type]}`}>
          {(() => { const Icon = ToastIcon[toast.type]; return <Icon size={16} className="shrink-0" />; })()}
          {toast.message}
        </div>
      )}

    </div>
  );
}
