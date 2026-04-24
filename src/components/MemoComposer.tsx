import { FileText, Lock, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Initiative, MemoDraft } from '../types';
import { createMemoDraft, generateMemoPdf, getLatestMemo, saveMemoRecord } from '../lib/memo';
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
    return latestMemo?.draft ?? createMemoDraft(initiative, currentUser);
  }, [initiative, currentUser, latestMemo]);

  const [draft, setDraft] = useState<MemoDraft>(initialDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPdf, setPreviewPdf] = useState<string | null>(latestMemo?.pdfDataUri ?? null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(latestMemo?.fileName ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const snapshot = [
    ['Initiative', initiative.name],
    ['Category', initiative.category],
    ['Owner', initiative.owner || 'Unassigned'],
    ['Implementer', initiative.implementer || '-'],
    ['Status', initiative.status],
    ['Urgency', initiative.urgency],
    ['Budget', initiative.budget || '-'],
    ['Demand Number', initiative.demandNumber || initiative.id],
  ];

  const updateField = (field: keyof MemoDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetDefaults = () => {
    setDraft(createMemoDraft(initiative, currentUser));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      const { fileName, dataUri } = await generateMemoPdf(initiative, draft);
      saveMemoRecord(initiative, draft, fileName, dataUri);
      setPreviewPdf(dataUri);
      setPreviewFileName(fileName);
      onGenerated(fileName);
    } catch (error: any) {
      setErrorMessage(error?.message || 'PDF generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <span className={styles.badge}>Licenses Memo</span>
          <p>
            The popup and generated PDF both use the approved memo template with your initiative details and editable memo inputs. Only the editable memo fields below can be changed.
          </p>
        </div>
        <button type="button" className="secondary-btn" onClick={resetDefaults}>
          <RefreshCcw size={14} />
          Reset Defaults
        </button>
      </div>

      {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

      <div className={styles.layout}>
        <section className={styles.editorPane}>
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

          <Field label="1.0 Introduction">
            <textarea
              rows={5}
              value={draft.introduction}
              onChange={(e) => updateField('introduction', e.target.value)}
              className={styles.textarea}
            />
          </Field>

          <Field label="2.0 Body">
            <textarea
              rows={8}
              value={draft.body}
              onChange={(e) => updateField('body', e.target.value)}
              className={styles.textarea}
            />
          </Field>

          <Field label="Conclusion">
            <textarea
              rows={4}
              value={draft.conclusion}
              onChange={(e) => updateField('conclusion', e.target.value)}
              className={styles.textarea}
            />
          </Field>

          <Field label="Attachment">
            <textarea
              rows={3}
              value={draft.attachment}
              onChange={(e) => updateField('attachment', e.target.value)}
              className={styles.textarea}
            />
          </Field>
        </section>

        <aside className={styles.sidePane}>
          <section className={styles.readOnlyCard}>
            <div className={styles.cardHead}>
              <div>
                <span className={styles.cardEyebrow}>Read Only</span>
                <h3>Initiative Snapshot</h3>
              </div>
              <Lock size={16} />
            </div>
            <div className={styles.snapshotTable}>
              {snapshot.map(([label, value]) => (
                <div key={label} className={styles.snapshotRow}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.previewCard}>
            <div className={styles.cardHead}>
              <div>
                <span className={styles.cardEyebrow}>Right Panel</span>
                <h3>PDF Preview</h3>
              </div>
              <FileText size={16} />
            </div>

            {previewPdf ? (
              <>
                <div className={styles.previewMeta}>
                  <span>{previewFileName || 'Generated memo PDF'}</span>
                </div>
                <iframe
                  className={styles.pdfFrame}
                  src={previewPdf}
                  title="Generated memo PDF preview"
                />
                <a className="secondary-btn" href={previewPdf} download={previewFileName || 'memo.pdf'}>
                  Download Current PDF
                </a>
              </>
            ) : (
              <div className={styles.previewEmpty}>
                <p>Generate the memo PDF to preview it here.</p>
              </div>
            )}
          </section>
        </aside>
      </div>

      <div className={styles.actions}>
        <button type="button" className="secondary-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="liquid-btn"
          onClick={handleGenerate}
          disabled={isGenerating || !draft.subject.trim()}
        >
          <FileText size={14} />
          {isGenerating ? 'Generating PDF...' : 'Generate PDF'}
        </button>
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
