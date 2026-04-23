import * as XLSX from 'xlsx';
import type { Initiative } from '../types';

const COLUMNS: Array<{ header: string; key: keyof Initiative | 'fallback'; width: number }> = [
  { header: 'ID', key: 'demandNumber', width: 18 },
  { header: 'Name', key: 'name', width: 42 },
  { header: 'Category', key: 'category', width: 20 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Owner', key: 'owner', width: 24 },
  { header: 'Urgency', key: 'urgency', width: 12 },
  { header: 'Budget', key: 'budget', width: 14 },
  { header: 'Demand Number', key: 'demandNumber', width: 18 },
  { header: 'Implementer', key: 'implementer', width: 22 },
  { header: 'Description', key: 'description', width: 44 },
  { header: 'Current Process', key: 'currentProcess', width: 34 },
  { header: 'Enhanced Process', key: 'enhancedProcess', width: 34 },
  { header: 'Comments', key: 'comments', width: 30 },
  { header: 'Log Date', key: 'logDate', width: 18 },
  { header: 'Log Description', key: 'logDescription', width: 36 },
  { header: 'Severity', key: 'severity', width: 14 },
  { header: 'Last Updated', key: 'updatedAt', width: 22 },
];

function formatDate(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function resolveValue(initiative: Initiative, col: (typeof COLUMNS)[number], idx: number): string {
  if (idx === 0) return initiative.demandNumber || initiative.id;
  const key = col.key;
  if (key === 'fallback') return '';
  const value = initiative[key];
  if (value == null) return '';
  if (key === 'logDate' || key === 'updatedAt') return formatDate(String(value));
  return String(value);
}

export function exportInitiativesToXlsx(initiatives: Initiative[], filename: string) {
  const headerRow = COLUMNS.map((c) => c.header);
  const dataRows = initiatives.map((i) => COLUMNS.map((c, idx) => resolveValue(i, c, idx)));
  const aoa: (string | number)[][] = [headerRow, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  (ws as unknown as { '!cols': { wch: number }[] })['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));
  (ws as unknown as { '!freeze': unknown })['!freeze'] = { xSplit: 0, ySplit: 1 };

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (!cell) continue;
    cell.s = {
      fill: { patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        bottom: { style: 'medium', color: { rgb: '2563EB' } },
      },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Initiatives');
  XLSX.writeFile(wb, filename, { cellStyles: true });
}

export function exportSingleInitiativeToXlsx(
  initiative: Initiative,
  logs: Array<{ logDate: string; logDescription: string; logSeverity: string; status: string }>,
  filename: string,
) {
  const detailRows: (string | number)[][] = [
    ['Field', 'Value'],
    ['ID', initiative.demandNumber || initiative.id],
    ['Name', initiative.name],
    ['Category', initiative.category],
    ['Status', initiative.status],
    ['Urgency', initiative.urgency],
    ['Owner', initiative.owner],
    ['Implementer', initiative.implementer],
    ['Budget', initiative.budget],
    ['Demand Number', initiative.demandNumber],
    ['Description', initiative.description],
    ['Current Process', initiative.currentProcess],
    ['Enhanced Process', initiative.enhancedProcess],
    ['Comments', initiative.comments],
    ['Log Date', formatDate(initiative.logDate)],
    ['Severity', initiative.severity],
    ['Last Updated', formatDate(initiative.updatedAt)],
  ];

  const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
  (detailWs as unknown as { '!cols': { wch: number }[] })['!cols'] = [
    { wch: 22 },
    { wch: 60 },
  ];

  const logRows: (string | number)[][] = [
    ['Date', 'Severity', 'Status', 'Description'],
    ...logs.map((l) => [
      formatDate(l.logDate),
      l.logSeverity,
      l.status,
      l.logDescription,
    ]),
  ];
  const logWs = XLSX.utils.aoa_to_sheet(logRows);
  (logWs as unknown as { '!cols': { wch: number }[] })['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 60 },
  ];

  for (const ws of [detailWs, logWs]) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      const cell = ws[addr];
      if (!cell) continue;
      cell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: '007564' } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, detailWs, 'Initiative');
  XLSX.utils.book_append_sheet(wb, logWs, 'Audit Logs');
  XLSX.writeFile(wb, filename, { cellStyles: true });
}

export function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
