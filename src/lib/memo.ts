import type { Initiative, MemoDraft, MemoRecord, MemoTable } from '../types';
import { storage, uid } from './storage';
import { exportMemoToPdf } from './memoTemplate';
import { exportMemoToWord } from './memoWord';

export type MemoExportFormat = 'pdf' | 'word';

function buildDefaultTable(initiative: Initiative): MemoTable {
  return {
    headers: ['Field', 'Value'],
    rows: [
      ['Initiative', initiative.name || '-'],
      ['Category', initiative.category || '-'],
      ['Owner', initiative.owner || 'Unassigned'],
      ['Implementer', initiative.implementer || '-'],
      ['Demand Number', initiative.demandNumber || initiative.id],
      ['Status', initiative.status || '-'],
      ['Urgency', initiative.urgency || '-'],
      ['Budget', initiative.budget || '-'],
    ],
  };
}

export function ensureMemoTable(draft: MemoDraft, initiative: Initiative): MemoDraft {
  let next = draft;
  if (!next.table || !Array.isArray(next.table.headers) || !Array.isArray(next.table.rows)) {
    next = { ...next, table: buildDefaultTable(initiative) };
  }
  if (typeof next.conclusion !== 'string') {
    next = { ...next, conclusion: buildDefaultConclusion(initiative) };
  }
  return next;
}

interface CurrentUserLike {
  displayName: string;
  jobTitle: string;
}

function formatMemoDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '_');
}

function buildDefaultIntroduction(initiative: Initiative): string {
  return initiative.description?.trim()
    || `This memo is submitted for the ${initiative.name} initiative under the ${initiative.category} category.`;
}

function buildDefaultBody(initiative: Initiative): string {
  const parts = [
    initiative.currentProcess?.trim() && `Current process: ${initiative.currentProcess.trim()}`,
    initiative.enhancedProcess?.trim() && `Proposed enhancement: ${initiative.enhancedProcess.trim()}`,
    initiative.comments?.trim() && `Additional comments: ${initiative.comments.trim()}`,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  return `The initiative is currently marked as ${initiative.status} with ${initiative.urgency} urgency and is being coordinated by ${initiative.owner || 'the assigned team'}.`;
}

function buildDefaultConclusion(initiative: Initiative): string {
  return `Approval and support are requested to progress ${initiative.name} and complete the required licensing activities in line with the initiative timeline.`;
}

export function createMemoDraft(initiative: Initiative, currentUser?: CurrentUserLike | null): MemoDraft {
  return {
    initiativeId: initiative.id,
    to: initiative.owner || 'Concerned Stakeholders',
    from: currentUser?.jobTitle || currentUser?.displayName || 'CAIO',
    date: formatMemoDate(new Date()),
    reference: initiative.demandNumber || initiative.id,
    subject: `${initiative.name} - License Memo`,
    introduction: buildDefaultIntroduction(initiative),
    body: buildDefaultBody(initiative),
    conclusion: buildDefaultConclusion(initiative),
    attachment: initiative.comments?.trim() || `Initiative details for ${initiative.name}`,
    table: buildDefaultTable(initiative),
  };
}

export function getLatestMemo(initiativeId: string): MemoRecord | null {
  const memos = storage
    .loadMemos()
    .filter((memo) => memo.initiativeId === initiativeId)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return memos[0] || null;
}

export async function generateMemoPdf(
  initiative: Initiative,
  draft: MemoDraft,
): Promise<{ fileName: string; dataUri: string }> {
  const fileName = sanitizeFileName(`${draft.reference || initiative.id}_memo.pdf`);
  const dataUri = await exportMemoToPdf(initiative, draft, fileName);
  return { fileName, dataUri };
}

export async function exportMemo(
  initiative: Initiative,
  draft: MemoDraft,
  format: MemoExportFormat,
): Promise<{ fileName: string; dataUri: string | null }> {
  const baseName = sanitizeFileName(`${draft.reference || initiative.id}_memo`);
  if (format === 'word') {
    const fileName = `${baseName}.docx`;
    await exportMemoToWord(initiative, draft, fileName);
    return { fileName, dataUri: null };
  }
  const fileName = `${baseName}.pdf`;
  const dataUri = await exportMemoToPdf(initiative, draft, fileName);
  return { fileName, dataUri };
}

export function saveMemoRecord(
  initiative: Initiative,
  draft: MemoDraft,
  fileName: string,
): MemoRecord {
  const memos = storage.loadMemos();
  const now = new Date().toISOString();
  const nextRecord: MemoRecord = {
    id: uid('memo'),
    initiativeId: initiative.id,
    initiativeName: initiative.name,
    category: initiative.category,
    fileName,
    createdAt: now,
    updatedAt: now,
    draft,
  };

  storage.saveMemos([nextRecord, ...memos]);
  return nextRecord;
}
