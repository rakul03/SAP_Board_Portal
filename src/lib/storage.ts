import type { AuditLog, Initiative, MemoRecord, Owner } from '../types';

export const STORAGE_KEYS = {
  initiatives: 'sap_initiatives',
  auditLogs: 'sap_audit_logs',
  owners: 'sap_owners',
  favorites: 'sap_favorites',
  memos: 'sap_memos',
  theme: 'theme',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const MEMO_HISTORY_LIMIT = 25;

function stripMemoBinaries(records: MemoRecord[]): MemoRecord[] {
  return records.map(({ pdfDataUri: _pdfDataUri, ...rest }) => rest);
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    /quota/i.test(err.message)
  );
}

function saveMemos(records: MemoRecord[]): void {
  const trimmed = stripMemoBinaries(records).slice(0, MEMO_HISTORY_LIMIT);
  try {
    write(STORAGE_KEYS.memos, trimmed);
    return;
  } catch (err) {
    if (!isQuotaError(err)) throw err;
  }
  for (let keep = trimmed.length - 1; keep >= 1; keep -= 1) {
    try {
      write(STORAGE_KEYS.memos, trimmed.slice(0, keep));
      return;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEYS.memos);
  } catch {
    /* swallow */
  }
}

function loadMemos(): MemoRecord[] {
  const records = read<MemoRecord[]>(STORAGE_KEYS.memos, []);
  const hadBinaries = records.some((r) => typeof r.pdfDataUri === 'string' && r.pdfDataUri.length > 0);
  if (hadBinaries) {
    const cleaned = stripMemoBinaries(records);
    try {
      write(STORAGE_KEYS.memos, cleaned);
    } catch {
      /* swallow — cleanup is best-effort */
    }
    return cleaned;
  }
  return records;
}

export const storage = {
  loadInitiatives: () => read<Initiative[]>(STORAGE_KEYS.initiatives, []),
  saveInitiatives: (v: Initiative[]) => write(STORAGE_KEYS.initiatives, v),
  loadAuditLogs: () => read<AuditLog[]>(STORAGE_KEYS.auditLogs, []),
  saveAuditLogs: (v: AuditLog[]) => write(STORAGE_KEYS.auditLogs, v),
  loadOwners: () => read<Owner[]>(STORAGE_KEYS.owners, []),
  saveOwners: (v: Owner[]) => write(STORAGE_KEYS.owners, v),
  loadFavorites: () => read<string[]>(STORAGE_KEYS.favorites, []),
  saveFavorites: (v: string[]) => write(STORAGE_KEYS.favorites, v),
  loadMemos,
  saveMemos,
};

export function generateInitiativeId(existing: Initiative[]): string {
  const nums = existing
    .map((i) => {
      const match = /^INIT-(\d+)$/.exec(i.id);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `INIT-${max + 1}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
