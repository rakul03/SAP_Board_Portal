import * as XLSX from 'xlsx';
import type { AuditLog, Initiative } from '../types';

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

function sortLogsDescending(logs: AuditLog[]): AuditLog[] {
  return [...logs].sort((a, b) => +new Date(b.logDate) - +new Date(a.logDate));
}

type SheetCell = XLSX.CellObject & {
  s?: Record<string, unknown>;
  l?: { Target: string; Tooltip?: string };
};

type SheetLike = XLSX.WorkSheet & {
  '!cols'?: { wch: number }[];
  '!rows'?: { hpt: number }[];
  '!merges'?: XLSX.Range[];
  '!freeze'?: { xSplit?: number; ySplit?: number };
  '!autofilter'?: { ref: string };
};

function cellAddress(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

function getCell(ws: SheetLike, row: number, col: number): SheetCell {
  const addr = cellAddress(row, col);
  if (!ws[addr]) {
    ws[addr] = { t: 's', v: '' } as SheetCell;
  }
  return ws[addr] as SheetCell;
}

function setCell(ws: SheetLike, row: number, col: number, value: string | number, style?: Record<string, unknown>) {
  const cell = getCell(ws, row, col);
  cell.v = value;
  cell.t = typeof value === 'number' ? 'n' : 's';
  if (style) cell.s = style;
}

function setFormula(
  ws: SheetLike,
  row: number,
  col: number,
  formula: string,
  value: string | number,
  style?: Record<string, unknown>,
) {
  const cell = getCell(ws, row, col);
  cell.f = formula;
  cell.v = value;
  cell.t = typeof value === 'number' ? 'n' : 's';
  if (style) cell.s = style;
}

function mergeRange(ws: SheetLike, startRow: number, startCol: number, endRow: number, endCol: number) {
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
}

function styleBlock(
  ws: SheetLike,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  style: Record<string, unknown>,
) {
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = startCol; c <= endCol; c += 1) {
      const cell = getCell(ws, r, c);
      cell.s = style;
    }
  }
}

function makeBar(count: number, max: number, width = 18): string {
  if (max <= 0) return ''.padEnd(width, '░');
  const filled = Math.max(1, Math.round((count / max) * width));
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
}

function makeCardStyle(fill: string, textColor = 'FFFFFF') {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: fill } },
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: textColor } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: fill } },
      bottom: { style: 'thin', color: { rgb: fill } },
      left: { style: 'thin', color: { rgb: fill } },
      right: { style: 'thin', color: { rgb: fill } },
    },
  };
}

function makeSoftStyle(fill: string, textColor = '0F172A') {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: fill } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: textColor } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: fill } },
      bottom: { style: 'thin', color: { rgb: fill } },
      left: { style: 'thin', color: { rgb: fill } },
      right: { style: 'thin', color: { rgb: fill } },
    },
  };
}

function makeVisualStyle(fill: string, textColor = 'FFFFFF') {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: fill } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: textColor } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: fill } },
      bottom: { style: 'thin', color: { rgb: fill } },
      left: { style: 'thin', color: { rgb: fill } },
      right: { style: 'thin', color: { rgb: fill } },
    },
  };
}

const DASHBOARD_PALETTE = ['007564', '2563EB', '10B981', '7C3AED', 'D97706', 'DC2626', '0F766E', '1D4ED8'];
const STATUS_PALETTE: Record<string, string> = {
  Active: '10B981',
  Pending: 'F59E0B',
  Delayed: 'EF4444',
  Completed: '3B82F6',
};
const SEVERITY_PALETTE: Record<string, string> = {
  High: 'DC2626',
  Medium: 'D97706',
  Low: '10B981',
  Information: '2563EB',
};
const CHART_PALETTE = ['0F766E', '2563EB', '7C3AED', 'D97706', '10B981', 'EF4444', '1D4ED8', '14B8A6'];

function setSheetRef(ws: SheetLike, maxRow: number, maxCol: number) {
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: maxRow, c: maxCol },
  });
}

function buildAuditLogSheet(logs: AuditLog[]) {
  const rows: (string | number)[][] = [
    ['Initiative', 'Log Date', 'Severity', 'Status', 'Description', 'Category', 'Owner'],
    ...logs.map((log) => [
      log.initiativeName || log.initiativeId,
      formatDate(log.logDate),
      log.logSeverity,
      log.status,
      log.logDescription,
      log.category || '',
      log.ownerName || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  (ws as unknown as { '!cols': { wch: number }[] })['!cols'] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 60 },
    { wch: 16 },
    { wch: 20 },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (!cell) continue;
    cell.s = {
      fill: { patternType: 'solid', fgColor: { rgb: '0F766E' } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        bottom: { style: 'medium', color: { rgb: '10B981' } },
      },
    };
  }

  return ws;
}

export function exportInitiativesToXlsx(
  initiatives: Initiative[],
  filename: string,
  auditLogs: AuditLog[] = [],
) {
  const latestLogByInitiative = new Map<string, AuditLog>();
  const sortedLogs = sortLogsDescending(auditLogs);
  for (const log of sortedLogs) {
    if (!latestLogByInitiative.has(log.initiativeId)) {
      latestLogByInitiative.set(log.initiativeId, log);
    }
  }

  const headerRow = COLUMNS.map((c) => c.header);
  const dataRows = initiatives.map((i) =>
    COLUMNS.map((c, idx) => {
      if (idx === 0) return i.demandNumber || i.id;
      if (c.key === 'logDate') return latestLogByInitiative.get(i.id)?.logDate || i.logDate || '';
      if (c.key === 'logDescription') return latestLogByInitiative.get(i.id)?.logDescription || i.logDescription || '';
      if (c.key === 'severity') return latestLogByInitiative.get(i.id)?.logSeverity || i.severity || '';
      return resolveValue(i, c, idx);
    }),
  );
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
  const initiativeIds = new Set(initiatives.map((initiative) => initiative.id));
  const filteredLogs = auditLogs.filter((log) => initiativeIds.has(log.initiativeId));
  if (filteredLogs.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildAuditLogSheet(filteredLogs), 'Audit Logs');
  }
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

export function exportDashboardReportToXlsx(
  initiatives: Initiative[],
  auditLogs: Array<{ logDate: string; logDescription: string; logSeverity: string; status: string }>,
  owners: Array<{ name?: string | null }>,
  filename: string,
) {
  const counts = {
    Active: initiatives.filter((i) => i.status === 'Active').length,
    Pending: initiatives.filter((i) => i.status === 'Pending').length,
    Delayed: initiatives.filter((i) => i.status === 'Delayed').length,
    Completed: initiatives.filter((i) => i.status === 'Completed').length,
  };

  const severityCounts = {
    High: auditLogs.filter((l) => l.logSeverity === 'High').length,
    Medium: auditLogs.filter((l) => l.logSeverity === 'Medium').length,
    Low: auditLogs.filter((l) => l.logSeverity === 'Low').length,
    Information: auditLogs.filter((l) => l.logSeverity === 'Information').length,
  };

  const categoryCounts = new Map<string, number>();
  initiatives.forEach((initiative) => {
    categoryCounts.set(initiative.category, (categoryCounts.get(initiative.category) ?? 0) + 1);
  });

  const ownerCounts = new Map<string, number>();
  owners.forEach((owner) => {
    if (owner.name) ownerCounts.set(owner.name, 0);
  });
  initiatives.forEach((initiative) => {
    if (!initiative.owner) return;
    ownerCounts.set(initiative.owner, (ownerCounts.get(initiative.owner) ?? 0) + 1);
  });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthCreated = initiatives.filter((i) => new Date(i.updatedAt) >= monthStart).length;
  const thisMonthCompleted = initiatives.filter(
    (i) => i.status === 'Completed' && new Date(i.updatedAt) >= monthStart,
  ).length;

  const statusRows: (string | number)[][] = [
    ['Status', 'Count'],
    ['Active', counts.Active],
    ['Pending', counts.Pending],
    ['Delayed', counts.Delayed],
    ['Completed', counts.Completed],
  ];

  const categoryRows: (string | number)[][] = [
    ['Category', 'Count'],
    ...Array.from(categoryCounts.entries()).map(([category, count]) => [category, count]),
  ];

  const ownerRows: (string | number)[][] = [
    ['Owner', 'Count'],
    ...Array.from(ownerCounts.entries())
      .map(([owner, count]) => [owner, count])
      .filter(([, count]) => Number(count) > 0),
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet([]);
  const statusWs = XLSX.utils.aoa_to_sheet(statusRows);
  const categoryWs = XLSX.utils.aoa_to_sheet(categoryRows);
  const ownerWs = XLSX.utils.aoa_to_sheet(ownerRows);
  const initiativesWs = XLSX.utils.aoa_to_sheet([
    COLUMNS.map((c) => c.header),
    ...initiatives.map((i) => COLUMNS.map((c, idx) => resolveValue(i, c, idx))),
  ]);
  const activityWs = XLSX.utils.aoa_to_sheet([
    ['Date', 'Severity', 'Status', 'Description'],
    ...auditLogs.map((l) => [formatDate(l.logDate), l.logSeverity, l.status, l.logDescription]),
  ]);

  const sheets = [summaryWs, statusWs, categoryWs, ownerWs, initiativesWs, activityWs];
  const names = ['Dashboard', 'Status', 'Categories', 'Owners', 'Initiatives', 'Audit Logs'];

  const summary = summaryWs as SheetLike;
  summary['!cols'] = [
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 2, hidden: true }, { wch: 22, hidden: true }, { wch: 14, hidden: true }, { wch: 18, hidden: true },
    { wch: 22, hidden: true }, { wch: 14, hidden: true }, { wch: 18, hidden: true }, { wch: 22, hidden: true },
    { wch: 14, hidden: true },
  ];
  summary['!rows'] = [
    { hpt: 24 }, { hpt: 26 }, { hpt: 20 }, { hpt: 18 },
    { hpt: 26 }, { hpt: 38 }, { hpt: 22 }, { hpt: 22 },
    { hpt: 12 }, { hpt: 26 }, { hpt: 26 }, { hpt: 26 },
    { hpt: 26 }, { hpt: 12 }, { hpt: 24 }, { hpt: 24 },
    { hpt: 24 }, { hpt: 24 }, { hpt: 24 }, { hpt: 24 },
    { hpt: 12 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 },
    { hpt: 22 }, { hpt: 22 }, { hpt: 12 }, { hpt: 22 },
    { hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 },
  ];
  summary['!freeze'] = { ySplit: 4 };
  summary['!autofilter'] = { ref: 'A15:H35' };

  const titleStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } },
    font: { name: 'Calibri', sz: 20, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const subtitleStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '123B34' } },
    font: { name: 'Calibri', sz: 11, italic: true, color: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const navStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    },
  };
  const navStyles = [
    makeSoftStyle('D1FAE5', '065F46'),
    makeSoftStyle('DBEAFE', '1D4ED8'),
    makeSoftStyle('FEF3C7', '92400E'),
    makeSoftStyle('EDE9FE', '6D28D9'),
    makeSoftStyle('CCFBF1', '0F766E'),
    makeSoftStyle('FEE2E2', 'B91C1C'),
  ];
  const statusStyles: Record<string, Record<string, unknown>> = {
    Active: makeSoftStyle('D1FAE5', '065F46'),
    Pending: makeSoftStyle('FEF3C7', '92400E'),
    Delayed: makeSoftStyle('FEE2E2', 'B91C1C'),
    Completed: makeSoftStyle('DBEAFE', '1D4ED8'),
  };
  const severityStyles: Record<string, Record<string, unknown>> = {
    High: makeSoftStyle('FEE2E2', 'B91C1C'),
    Medium: makeSoftStyle('FEF3C7', '92400E'),
    Low: makeSoftStyle('D1FAE5', '065F46'),
    Information: makeSoftStyle('DBEAFE', '1D4ED8'),
  };
  const sectionStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '0F766E' } },
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const labelStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'D9F0EC' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const tableHeaderStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(summary, 0, 0, 'SAP PORTFOLIO DASHBOARD', titleStyle);
  mergeRange(summary, 0, 0, 0, 7);
  setCell(summary, 1, 0, `Generated ${new Date().toLocaleString()}`, subtitleStyle);
  mergeRange(summary, 1, 0, 1, 7);

  const navLinks = [
    { label: 'Dashboard', target: "#'Dashboard'!A1" },
    { label: 'Status', target: "#'Status'!A1" },
    { label: 'Categories', target: "#'Categories'!A1" },
    { label: 'Owners', target: "#'Owners'!A1" },
    { label: 'Initiatives', target: "#'Initiatives'!A1" },
    { label: 'Audit Logs', target: "#'Audit Logs'!A1" },
  ];
  navLinks.forEach((link, idx) => {
    setCell(summary, 3, idx, link.label, navStyles[idx] ?? navStyle);
    getCell(summary, 3, idx).l = { Target: link.target, Tooltip: `Open ${link.label} sheet` };
  });

  const legendChips = [
    { label: 'Active', fill: STATUS_PALETTE.Active, text: 'FFFFFF' },
    { label: 'Pending', fill: STATUS_PALETTE.Pending, text: '0F172A' },
    { label: 'Delayed', fill: STATUS_PALETTE.Delayed, text: 'FFFFFF' },
    { label: 'High Risk', fill: SEVERITY_PALETTE.High, text: 'FFFFFF' },
    { label: 'Medium', fill: SEVERITY_PALETTE.Medium, text: '0F172A' },
    { label: 'Low / Info', fill: CHART_PALETTE[2], text: 'FFFFFF' },
  ];
  legendChips.forEach((chip, idx) => {
    const style = makeVisualStyle(chip.fill, chip.text);
    setCell(summary, 2, idx, chip.label, style);
  });

  const totalInitiatives = initiatives.length;
  const completedCount = counts.Completed;
  const ownerCount = new Set(initiatives.map((i) => i.owner).filter(Boolean)).size;
  const createdCount = thisMonthCreated;
  const activityCount = auditLogs.length;
  const completionRate = totalInitiatives > 0 ? Math.round((completedCount / totalInitiatives) * 100) : 0;
  const activityRate = auditLogs.length > 0 ? Math.round((severityCounts.High / auditLogs.length) * 100) : 0;

  const kpis = [
    { label: 'Total Initiatives', value: totalInitiatives, detail: 'All tracked records' },
    { label: 'Active', value: counts.Active, detail: `${Math.round((counts.Active / Math.max(totalInitiatives, 1)) * 100)}% of portfolio` },
    { label: 'Completed', value: completedCount, detail: `${completionRate}% completion rate` },
    { label: 'Owners', value: ownerCount, detail: 'Distinct initiative owners' },
    { label: 'Pending', value: counts.Pending, detail: 'Waiting for review' },
    { label: 'Delayed', value: counts.Delayed, detail: 'Needs attention' },
    { label: 'Created This Month', value: createdCount, detail: `${thisMonthCompleted} completed this month` },
    { label: 'Audit Logs', value: activityCount, detail: `${activityRate}% high severity` },
  ];

  const cardRanges: Array<[number, number, number, number]> = [
    [5, 0, 8, 1], [5, 2, 8, 3], [5, 4, 8, 5], [5, 6, 8, 7],
    [10, 0, 13, 1], [10, 2, 13, 3], [10, 4, 13, 5], [10, 6, 13, 7],
  ];
  const cardAccents = DASHBOARD_PALETTE;
  kpis.forEach((kpi, idx) => {
    const [sr, sc, er, ec] = cardRanges[idx];
    const style = makeCardStyle(cardAccents[idx]);
    const lightFills = ['ECFDF5', 'EFF6FF', 'F0FDF4', 'F5F3FF', 'FFFBEB', 'FEF2F2', 'F0FDFA', 'EEF2FF'];
    const fillStyle = {
      ...style,
      fill: { patternType: 'solid', fgColor: { rgb: lightFills[idx] } },
    };
    styleBlock(summary, sr, sc, er, ec, fillStyle);
    setCell(summary, sr, sc, kpi.label, { ...fillStyle, font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: cardAccents[idx] } } });
    mergeRange(summary, sr, sc, sr, ec);
    const kpiFormulas = [
      `COUNTA('Initiatives'!$B$2:$B$1048576)`,
      `COUNTIF('Initiatives'!$D$2:$D$1048576,"Active")`,
      `COUNTIF('Initiatives'!$D$2:$D$1048576,"Completed")`,
      `COUNTA(UNIQUE(FILTER('Initiatives'!$E$2:$E$1048576,'Initiatives'!$E$2:$E$1048576<>"")))`,
      `COUNTIF('Initiatives'!$D$2:$D$1048576,"Pending")`,
      `COUNTIF('Initiatives'!$D$2:$D$1048576,"Delayed")`,
      `COUNTIFS('Initiatives'!$Q$2:$Q$1048576,">="&EOMONTH(TODAY(),-1)+1)`,
      `COUNTA('Audit Logs'!$A$2:$A$1048576)`,
    ];
    setFormula(summary, sr + 1, sc, kpiFormulas[idx], kpi.value, {
      ...fillStyle,
      font: { name: 'Calibri', sz: 20, bold: true, color: { rgb: cardAccents[idx] } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    mergeRange(summary, sr + 1, sc, sr + 2, ec);
    setCell(summary, sr + 3, sc, kpi.detail, {
      ...fillStyle,
      font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '475569' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    });
    mergeRange(summary, sr + 3, sc, er, ec);
  });

  setCell(summary, 15, 0, 'Portfolio Status', sectionStyle);
  mergeRange(summary, 15, 0, 15, 7);
  setCell(summary, 16, 0, 'Status', tableHeaderStyle);
  setCell(summary, 16, 1, 'Count', tableHeaderStyle);
  setCell(summary, 16, 2, 'Visual', tableHeaderStyle);
  mergeRange(summary, 16, 2, 16, 7);

  const maxStatus = Math.max(counts.Active, counts.Pending, counts.Delayed, counts.Completed, 1);
  const statusOrder = ['Active', 'Pending', 'Delayed', 'Completed'] as const;
  statusOrder.forEach((status, idx) => {
    const count = counts[status];
    const row = 17 + idx;
    const rowStyle = statusStyles[status] ?? labelStyle;
    setCell(summary, row, 0, status, rowStyle);
    setFormula(summary, row, 1, `COUNTIF('Initiatives'!$D$2:$D$1048576,"${status}")`, count, rowStyle);
    const barFormula = `REPT("█",ROUND(B${row + 1}/MAX($B$18:$B$21)*24,0))&REPT("░",24-ROUND(B${row + 1}/MAX($B$18:$B$21)*24,0))&" "&TEXT(B${row + 1}/MAX($B$18:$B$21),"0%")`;
    setFormula(summary, row, 2, barFormula, `${makeBar(Number(count), maxStatus, 24)} ${Math.round((Number(count) / maxStatus) * 100)}%`, {
      ...makeVisualStyle(STATUS_PALETTE[status], 'FFFFFF'),
      font: { name: 'Courier New', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    mergeRange(summary, row, 2, row, 7);
  });

  setCell(summary, 22, 0, 'Top Categories', sectionStyle);
  mergeRange(summary, 22, 0, 22, 3);
  setCell(summary, 22, 4, 'Top Owners', sectionStyle);
  mergeRange(summary, 22, 4, 22, 7);

  const categoryTop = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ownerTop = Array.from(ownerCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const categoryMax = Math.max(...categoryTop.map(([, count]) => count), 1);
  const ownerMax = Math.max(...ownerTop.map(([, count]) => count), 1);

  setCell(summary, 23, 0, 'Category', tableHeaderStyle);
  setCell(summary, 23, 1, 'Count', tableHeaderStyle);
  setCell(summary, 23, 2, 'Visual', tableHeaderStyle);
  mergeRange(summary, 23, 2, 23, 3);
  setCell(summary, 23, 4, 'Owner', tableHeaderStyle);
  setCell(summary, 23, 5, 'Count', tableHeaderStyle);
  setCell(summary, 23, 6, 'Visual', tableHeaderStyle);
  mergeRange(summary, 23, 6, 23, 7);

  categoryTop.forEach(([name, count], idx) => {
    const row = 24 + idx;
    const chartColor = CHART_PALETTE[idx % CHART_PALETTE.length];
    const soft = makeSoftStyle(idx % 2 === 0 ? 'E0F2FE' : 'ECFDF5', idx % 2 === 0 ? '0C4A6E' : '065F46');
    setFormula(summary, row, 0, `IFERROR(INDEX($L$2#,ROW()-23),"")`, name, soft);
    setFormula(summary, row, 1, `IF(A${row + 1}="","",COUNTIF('Initiatives'!$C:$C,A${row + 1}))`, count, soft);
    setFormula(summary, row, 2, `IF(A${row + 1}="","",REPT("█",ROUND(B${row + 1}/MAX($B$24:$B$28)*12,0))&REPT("░",12-ROUND(B${row + 1}/MAX($B$24:$B$28)*12,0))&" "&TEXT(B${row + 1}/MAX($B$24:$B$28),"0%"))`, `${makeBar(count, categoryMax, 12)} ${Math.round((count / categoryMax) * 100)}%`, {
      ...makeVisualStyle(chartColor, 'FFFFFF'),
      font: { name: 'Courier New', sz: 10, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    mergeRange(summary, row, 2, row, 3);
  });

  ownerTop.forEach(([name, count], idx) => {
    const row = 24 + idx;
    const chartColor = CHART_PALETTE[(idx + 2) % CHART_PALETTE.length];
    const soft = makeSoftStyle(idx % 2 === 0 ? 'EEF2FF' : 'FDF2F8', idx % 2 === 0 ? '3730A3' : '9D174D');
    setFormula(summary, row, 4, `IFERROR(INDEX($P$2#,ROW()-23),"")`, name, soft);
    setFormula(summary, row, 5, `IF(E${row + 1}="","",COUNTIF('Initiatives'!$E:$E,E${row + 1}))`, count, soft);
    setFormula(summary, row, 6, `IF(E${row + 1}="","",REPT("█",ROUND(F${row + 1}/MAX($F$24:$F$28)*12,0))&REPT("░",12-ROUND(F${row + 1}/MAX($F$24:$F$28)*12,0))&" "&TEXT(F${row + 1}/MAX($F$24:$F$28),"0%"))`, `${makeBar(count, ownerMax, 12)} ${Math.round((count / ownerMax) * 100)}%`, {
      ...makeVisualStyle(chartColor, 'FFFFFF'),
      font: { name: 'Courier New', sz: 10, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    mergeRange(summary, row, 6, row, 7);
  });

  setCell(summary, 30, 0, 'Audit Severity', sectionStyle);
  mergeRange(summary, 30, 0, 30, 7);
  setCell(summary, 31, 0, 'Severity', tableHeaderStyle);
  setCell(summary, 31, 1, 'Count', tableHeaderStyle);
  setCell(summary, 31, 2, 'Visual', tableHeaderStyle);
  mergeRange(summary, 31, 2, 31, 7);

  [
    ['High', severityCounts.High],
    ['Medium', severityCounts.Medium],
    ['Low', severityCounts.Low],
    ['Information', severityCounts.Information],
  ].forEach(([severity, count], idx) => {
    const row = 32 + idx;
    const severityKey = String(severity);
    const rowStyle = severityStyles[severityKey] ?? labelStyle;
    setCell(summary, row, 0, severityKey, rowStyle);
    setFormula(summary, row, 1, `COUNTIF('Audit Logs'!$B$2:$B$1048576,"${severityKey}")`, count as number, rowStyle);
    const severityFill = SEVERITY_PALETTE[severityKey] ?? '64748B';
    setFormula(summary, row, 2, `REPT("█",ROUND(B${row + 1}/MAX($B$33:$B$36)*24,0))&REPT("░",24-ROUND(B${row + 1}/MAX($B$33:$B$36)*24,0))&" "&B${row + 1}`, `${makeBar(Number(count), Math.max(severityCounts.High, severityCounts.Medium, severityCounts.Low, severityCounts.Information, 1), 24)} ${count}`, {
      ...makeVisualStyle(severityFill, 'FFFFFF'),
      font: { name: 'Courier New', sz: 10, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    mergeRange(summary, row, 2, row, 7);
  });

  // Hidden formula helpers for dynamic SORT / SORTBY / UNIQUE ranking
  setCell(summary, 1, 9, 'Helper', { fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } });
  setFormula(
    summary,
    2,
    9,
    `SORT(UNIQUE(FILTER('Initiatives'!$C$2:$C$1048576,'Initiatives'!$C$2:$C$1048576<>"")))`,
    categoryTop.length > 0 ? categoryTop[0][0] : '',
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    10,
    `COUNTIF('Initiatives'!$C$2:$C$1048576,J2#)`,
    categoryTop.length > 0 ? categoryTop[0][1] : 0,
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    11,
    `SORTBY(J2#,K2#,-1)`,
    categoryTop.length > 0 ? categoryTop[0][0] : '',
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    12,
    `COUNTIF('Initiatives'!$C$2:$C$1048576,L2#)`,
    categoryTop.length > 0 ? categoryTop[0][1] : 0,
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    13,
    `SORT(UNIQUE(FILTER('Initiatives'!$E$2:$E$1048576,'Initiatives'!$E$2:$E$1048576<>"")))`,
    ownerTop.length > 0 ? ownerTop[0][0] : '',
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    14,
    `COUNTIF('Initiatives'!$E$2:$E$1048576,N2#)`,
    ownerTop.length > 0 ? ownerTop[0][1] : 0,
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    15,
    `SORTBY(N2#,O2#,-1)`,
    ownerTop.length > 0 ? ownerTop[0][0] : '',
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );
  setFormula(
    summary,
    2,
    16,
    `COUNTIF('Initiatives'!$E$2:$E$1048576,P2#)`,
    ownerTop.length > 0 ? ownerTop[0][1] : 0,
    { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Calibri', sz: 9, color: { rgb: 'FFFFFF' } } },
  );

  setSheetRef(summary, 35, 16);

  const statusSummaryWs = statusWs as SheetLike;
  const categorySummaryWs = categoryWs as SheetLike;
  const ownerSummaryWs = ownerWs as SheetLike;
  const initiativesSummaryWs = initiativesWs as SheetLike;
  const activitySummaryWs = activityWs as SheetLike;

  [statusSummaryWs, categorySummaryWs, ownerSummaryWs, initiativesSummaryWs, activitySummaryWs].forEach((ws) => {
    ws['!freeze'] = { ySplit: 1 };
    ws['!autofilter'] = { ref: ws['!ref'] ?? 'A1' };
  });

  statusSummaryWs['!cols'] = [{ wch: 18 }, { wch: 12 }];
  categorySummaryWs['!cols'] = [{ wch: 28 }, { wch: 12 }];
  ownerSummaryWs['!cols'] = [{ wch: 28 }, { wch: 12 }];
  initiativesSummaryWs['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));
  activitySummaryWs['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 60 }];

  [statusSummaryWs, categorySummaryWs, ownerSummaryWs, initiativesSummaryWs, activitySummaryWs].forEach((ws) => {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const headerCell = ws[cellAddress(0, c)];
      if (!headerCell) continue;
      headerCell.s = tableHeaderStyle;
    }
  });

  setSheetRef(statusSummaryWs, statusRows.length - 1, 1);
  setSheetRef(categorySummaryWs, categoryRows.length - 1, 1);
  setSheetRef(ownerSummaryWs, ownerRows.length - 1, 1);
  setSheetRef(initiativesSummaryWs, initiatives.length, COLUMNS.length - 1);
  setSheetRef(activitySummaryWs, auditLogs.length, 3);

  const wb = XLSX.utils.book_new();
  wb.Workbook = {
    CalcPr: {
      calcMode: 'auto',
      fullCalcOnLoad: true,
      forceFullCalc: true,
    },
  } as never;
  sheets.forEach((ws, idx) => {
    XLSX.utils.book_append_sheet(wb, ws, names[idx]);
  });
  XLSX.writeFile(wb, filename, { cellStyles: true });
}

export function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
