import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * useExport — shared CSV + PDF export hook.
 *
 * @param {Array<{header: string, key: string}>} columns  Column definitions
 * @param {string} filename   Base filename without extension (e.g. "citizen-reports")
 * @param {string} title      Document title used in PDF header
 */
export function useExport(columns, filename, title) {
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const dateStamp = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ── CSV ──────────────────────────────────────────────────────────────────
  const exportCSV = (data) => {
    setCsvLoading(true);
    try {
      const headers = columns.map(c => c.header);
      const rows = data.map(row => columns.map(c => {
        const val = row[c.key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
      }));

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
      XLSX.writeFile(wb, `${filename}-${dateStamp()}.csv`);
    } catch (err) {
      console.error('CSV export failed', err);
      alert('CSV export failed. Please try again.');
    } finally {
      setCsvLoading(false);
    }
  };

  // ── PDF ──────────────────────────────────────────────────────────────────
  const exportPDF = (data) => {
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      // Header block
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 0, pageW, 48, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PrithviNet Gov', 40, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(title, 40, 36);

      // Date line
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(
        `Exported: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}   |   Records: ${data.length}`,
        40, 64
      );

      const head = [columns.map(c => c.header)];
      const body = data.length === 0
        ? [['No data available']]
        : data.map(row => columns.map(c => {
            const val = row[c.key];
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            return String(val);
          }));

      autoTable(doc, {
        head,
        body,
        startY: 76,
        styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
        headStyles: { fillColor: [15, 23, 42], textColor: [16, 185, 129], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0: { cellWidth: 'auto' } },
        margin: { left: 40, right: 40 },
        didDrawPage: (hookData) => {
          const total = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${hookData.pageNumber} of ${total}`,
            pageW - 40,
            doc.internal.pageSize.getHeight() - 16,
            { align: 'right' }
          );
        },
      });

      doc.save(`${filename}-${dateStamp()}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  return { exportCSV, exportPDF, csvLoading, pdfLoading };
}
