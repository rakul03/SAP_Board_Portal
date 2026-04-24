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

export const storage = {
  loadInitiatives: () => read<Initiative[]>(STORAGE_KEYS.initiatives, []),
  saveInitiatives: (v: Initiative[]) => write(STORAGE_KEYS.initiatives, v),
  loadAuditLogs: () => read<AuditLog[]>(STORAGE_KEYS.auditLogs, []),
  saveAuditLogs: (v: AuditLog[]) => write(STORAGE_KEYS.auditLogs, v),
  loadOwners: () => read<Owner[]>(STORAGE_KEYS.owners, []),
  saveOwners: (v: Owner[]) => write(STORAGE_KEYS.owners, v),
  loadFavorites: () => read<string[]>(STORAGE_KEYS.favorites, []),
  saveFavorites: (v: string[]) => write(STORAGE_KEYS.favorites, v),
  loadMemos: () => read<MemoRecord[]>(STORAGE_KEYS.memos, []),
  saveMemos: (v: MemoRecord[]) => write(STORAGE_KEYS.memos, v),
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
