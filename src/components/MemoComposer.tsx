import {
  ChevronDown,
  Download,
  FileText,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Initiative, MemoDraft, MemoTable } from '../types';
import {
  createMemoDraft,
  ensureMemoTable,
  exportMemo,
  getLatestMemo,
  saveMemoRecord,
  type MemoExportFormat,
} from '../lib/memo';
import { MemoPreview } from './MemoPreview';
import styles from './MemoComposer.module.css';

interface CurrentUserLike {
  displayName: string;
  jobTitle: string;
}

interface MemoComposerProps {
  initiative: Initiative;
  currentUser: CurrentUserLike | null;
  onCancel: () => void;
  onGenerated: (fileName: string) => void;
}

export function MemoComposer({ initiative, currentUser, onCancel, onGenerated }: MemoComposerProps) {
  const latestMemo = useMemo(() => getLatestMemo(initiative.id), [initiative.id]);
  const initialDraft = useMemo(() => {
    const base = latestMemo?.draft ?? createMemoDraft(initiative, currentUser);
    return ensureMemoTable(base, initiative);
  }, [initiative, currentUser, latestMemo]);

  const [draft, setDraft] = useState<MemoDraft>(initialDraft);
  const [exportingAs, setExportingAs] = useState<MemoExportFormat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isExportMenuOpen]);

  const updateField = (field: keyof MemoDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetDefaults = () => {
    setDraft(ensureMemoTable(createMemoDraft(initiative, currentUser), initiative));
  };

  const updateTable = (mutator: (table: MemoTable) => MemoTable) => {
    setDraft((prev) => ({ ...prev, table: mutator(prev.table) }));
  };

  const updateHeader = (colIdx: number, value: string) => {
    updateTable((t) => ({
      ...t,
      headers: t.headers.map((h, i) => (i === colIdx ? value : h)),
    }));
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    updateTable((t) => ({
      ...t,
      rows: t.rows.map((row, r) =>
        r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row,
      ),
    }));
  };

  const addRow = () => {
    updateTable((t) => ({
      ...t,
      rows: [...t.rows, t.headers.map(() => '')],
    }));
  };

  const removeRow = (rowIdx: number) => {
    updateTable((t) => ({
      ...t,
      rows: t.rows.filter((_, i) => i !== rowIdx),
    }));
  };

  const addColumn = () => {
    updateTable((t) => ({
      headers: [...t.headers, `Column ${t.headers.length + 1}`],
      rows: t.rows.map((row) => [...row, '']),
    }));
  };

  const removeColumn = (colIdx: number) => {
    updateTable((t) => {
      if (t.headers.length <= 1) return t;
      return {
        headers: t.headers.filter((_, i) => i !== colIdx),
        rows: t.rows.map((row) => row.filter((_, i) => i !== colIdx)),
      };
    });
  };

  const handleExport = async (format: MemoExportFormat) => {
    setIsExportMenuOpen(false);
    try {
      setExportingAs(format);
      setErrorMessage(null);
      const { fileName } = await exportMemo(initiative, draft, format);
      saveMemoRecord(initiative, draft, fileName);
      onGenerated(fileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      setErrorMessage(message);
    } finally {
      setExportingAs(null);
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <span className={styles.badge}>Licenses Memo</span>
          <p>
            Fill in the fields on the left — the preview on the right updates live. When satisfied, use Export to download.
          </p>
        </div>
        <button type="button" className="secondary-btn" onClick={resetDefaults}>
          <RefreshCcw size={14} />
          Reset Defaults
        </button>
      </div>

      {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

      {/* Main two-column layout */}
      <div className={styles.layout}>

        {/* LEFT: form + table editor */}
        <section className={styles.editorPane}>

          {/* Header fields */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardEyebrow}>Memo Details</span>
            </div>
            <div className={styles.headerGrid}>
              <Field label="To">
                <input value={draft.to} onChange={(e) => updateField('to', e.target.value)} className={styles.input} />
              </Field>
              <Field label="From">
                <input value={draft.from} onChange={(e) => updateField('from', e.target.value)} className={styles.input} />
              </Field>
              <Field label="Date">
                <input value={draft.date} onChange={(e) => updateField('date', e.target.value)} className={styles.input} />
              </Field>
              <Field label="Reference">
                <input value={draft.reference} onChange={(e) => updateField('reference', e.target.value)} className={styles.input} />
              </Field>
            </div>
            <Field label="Subject">
              <input value={draft.subject} onChange={(e) => updateField('subject', e.target.value)} className={styles.input} />
            </Field>
          </div>

          {/* Text fields */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardEyebrow}>Content</span>
            </div>
            <Field label="1.0 Introduction">
              <textarea
                rows={4}
                value={draft.introduction}
                onChange={(e) => updateField('introduction', e.target.value)}
                className={styles.textarea}
              />
            </Field>
            <Field label="2.0 Body">
              <textarea
                rows={6}
                value={draft.body}
                onChange={(e) => updateField('body', e.target.value)}
                className={styles.textarea}
              />
            </Field>
            <Field label="Conclusion">
              <textarea
                rows={3}
                value={draft.conclusion}
                onChange={(e) => updateField('conclusion', e.target.value)}
                className={styles.textarea}
              />
            </Field>
            <Field label="Attachment">
              <textarea
                rows={2}
                value={draft.attachment}
                onChange={(e) => updateField('attachment', e.target.value)}
                className={styles.textarea}
              />
            </Field>
          </div>

          {/* Table editor */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardEyebrow}>2.1 Table</span>
              <div className={styles.tableActions}>
                <button type="button" className="secondary-btn" onClick={addColumn}>
                  <Plus size={12} /> Column
                </button>
                <button type="button" className="secondary-btn" onClick={addRow}>
                  <Plus size={12} /> Row
                </button>
              </div>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.editableTable}>
                <thead>
                  <tr>
                    {draft.table.headers.map((header, colIdx) => (
                      <th key={colIdx}>
                        <div className={styles.tableHeadCell}>
                          <input
                            value={header}
                            onChange={(e) => updateHeader(colIdx, e.target.value)}
                            placeholder={`Column ${colIdx + 1}`}
                            className={styles.tableHeadInput}
                          />
                          {draft.table.headers.length > 1 && (
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => removeColumn(colIdx)}
                              title="Remove column"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className={styles.tableActionsCol} />
                  </tr>
                </thead>
                <tbody>
                  {draft.table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {draft.table.headers.map((_, colIdx) => (
                        <td key={colIdx}>
                          <input
                            value={row[colIdx] ?? ''}
                            onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                            className={styles.tableCellInput}
                          />
                        </td>
                      ))}
                      <td className={styles.tableActionsCol}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => removeRow(rowIdx)}
                          title="Remove row"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {draft.table.rows.length === 0 && (
                    <tr>
                      <td colSpan={draft.table.headers.length + 1} className={styles.tableEmpty}>
                        No rows yet — click Row to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* RIGHT: live preview */}
        <aside className={styles.previewPane}>
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.cardEyebrow}>Live Preview</span>
              <p className={styles.previewHint}>Updates as you type</p>
            </div>
            <FileText size={16} />
          </div>
          <div className={styles.previewScroll}>
            <MemoPreview draft={draft} />
          </div>
        </aside>
      </div>

      {/* Footer actions */}
      <div className={styles.actions}>
        <button type="button" className="secondary-btn" onClick={onCancel}>
          Cancel
        </button>
        <div className={styles.exportWrap} ref={exportMenuRef}>
          <button
            type="button"
            className="liquid-btn"
            onClick={() => setIsExportMenuOpen((open) => !open)}
            disabled={!!exportingAs || !draft.subject.trim()}
            aria-haspopup="menu"
            aria-expanded={isExportMenuOpen}
          >
            <Download size={14} />
            {exportingAs === 'pdf'
              ? 'Exporting PDF...'
              : exportingAs === 'word'
                ? 'Exporting Word...'
                : 'Export'}
            <ChevronDown size={14} />
          </button>
          {isExportMenuOpen && (
            <div className={styles.exportMenu} role="menu">
              <button
                type="button"
                role="menuitem"
                className={styles.exportMenuItem}
                onClick={() => handleExport('word')}
              >
                <FileText size={14} />
                <div>
                  <strong>Word (.docx)</strong>
                  <span>Editable document with template header &amp; footer</span>
                </div>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.exportMenuItem}
                onClick={() => handleExport('pdf')}
              >
                <FileText size={14} />
                <div>
                  <strong>PDF (.pdf)</strong>
                  <span>Print-ready, with template header &amp; footer</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
