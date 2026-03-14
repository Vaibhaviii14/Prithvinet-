import { Download, FileText, Loader2 } from 'lucide-react';
import { useExport } from '../hooks/useExport';

/**
 * ExportButtons — drop-in CSV + PDF export buttons.
 *
 * Props:
 *   data      {object[]}                          — the already-filtered dataset to export
 *   columns   {Array<{header:string, key:string}>} — column definitions
 *   filename  {string}                             — base filename, e.g. "citizen-reports"
 *   title     {string}                             — PDF document title
 */
export default function ExportButtons({ data, columns, filename, title }) {
  const { exportCSV, exportPDF, csvLoading, pdfLoading } = useExport(columns, filename, title);

  const btnBase =
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const csvStyle =
    `${btnBase} border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/60`;
  const pdfStyle =
    `${btnBase} border-slate-500/30 hover:bg-slate-500/10 hover:border-slate-500/50`;

  return (
    <div className="flex items-center gap-2">
      {/* CSV */}
      <button
        onClick={() => exportCSV(data)}
        disabled={csvLoading}
        className={csvStyle}
        style={{ color: csvLoading ? undefined : 'var(--text-secondary)' }}
        title="Export to CSV"
      >
        {csvLoading
          ? <Loader2 size={13} className="animate-spin" />
          : <Download size={13} className="text-emerald-500" />}
        <span className={csvLoading ? '' : 'text-emerald-600'}>
          {csvLoading ? 'Exporting…' : 'CSV'}
        </span>
      </button>

      {/* PDF */}
      <button
        onClick={() => exportPDF(data)}
        disabled={pdfLoading}
        className={pdfStyle}
        style={{ color: 'var(--text-secondary)' }}
        title="Export to PDF"
      >
        {pdfLoading
          ? <Loader2 size={13} className="animate-spin" />
          : <FileText size={13} className="text-rose-400" />}
        <span className={pdfLoading ? '' : 'text-rose-400'}>
          {pdfLoading ? 'Exporting…' : 'PDF'}
        </span>
      </button>
    </div>
  );
}
