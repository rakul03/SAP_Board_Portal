import type { MemoDraft } from '../types';
import memoHeaderUrl from '../template/assets/memo-header.jpg';
import memoFooterUrl from '../template/assets/memo-footer.jpg';
import styles from './MemoPreview.module.css';

interface MemoPreviewProps {
  draft: MemoDraft;
}

export function MemoPreview({ draft }: MemoPreviewProps) {
  return (
    <div className={styles.page}>
      <img src={memoHeaderUrl} alt="" className={styles.headerImg} />

      <div className={styles.body}>
        {/* To / From / Date / Ref grid */}
        <div className={styles.metaGrid}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>To</span>
            <span className={styles.metaColon}>:</span>
            <span className={styles.metaValue}>{draft.to || <em className={styles.placeholder}>—</em>}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>From</span>
            <span className={styles.metaColon}>:</span>
            <span className={styles.metaValue}>{draft.from || <em className={styles.placeholder}>—</em>}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Date</span>
            <span className={styles.metaColon}>:</span>
            <span className={styles.metaValue}>{draft.date || <em className={styles.placeholder}>—</em>}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Reference</span>
            <span className={styles.metaColon}>:</span>
            <span className={styles.metaValue}>{draft.reference || <em className={styles.placeholder}>—</em>}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Subject */}
        <div className={styles.subjectRow}>
          <span className={styles.metaLabel}>Subject</span>
          <span className={styles.metaColon}>:</span>
          <span className={styles.subjectValue}>
            {draft.subject || <em className={styles.placeholder}>Subject goes here</em>}
          </span>
        </div>

        <div className={styles.divider} />

        {/* 1.0 Introduction */}
        <div className={styles.section}>
          <p className={styles.sectionHeading}>1.0&nbsp;&nbsp;Introduction</p>
          <p className={styles.sectionText}>
            {draft.introduction || <em className={styles.placeholder}>Introduction content...</em>}
          </p>
        </div>

        {/* 2.0 Body */}
        <div className={styles.section}>
          <p className={styles.sectionHeading}>2.0&nbsp;&nbsp;Body</p>
          <p className={styles.sectionText}>
            {draft.body || <em className={styles.placeholder}>Body content...</em>}
          </p>

          {/* 2.1 Table */}
          {draft.table && draft.table.headers.length > 0 && (
            <div className={styles.tableSection}>
              <p className={styles.subHeading}>2.1&nbsp;&nbsp;Table</p>
              <table className={styles.memoTable}>
                <thead>
                  <tr>
                    {draft.table.headers.map((h, i) => (
                      <th key={i}>{h || `Column ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.table.rows.length > 0 ? (
                    draft.table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{cell || <em className={styles.placeholder}>—</em>}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={draft.table.headers.length} className={styles.tableEmpty}>
                        No rows added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conclusion */}
        <div className={styles.section}>
          <p className={styles.sectionHeading}>Conclusion</p>
          <p className={styles.sectionText}>
            {draft.conclusion || <em className={styles.placeholder}>Conclusion content...</em>}
          </p>
        </div>

        {/* Attachment */}
        {draft.attachment && (
          <div className={styles.section}>
            <p className={styles.sectionHeading}>Attachment</p>
            <p className={styles.sectionText}>{draft.attachment}</p>
          </div>
        )}
      </div>

      <div className={styles.footerArea}>
        <img src={memoFooterUrl} alt="" className={styles.footerImg} />
        <p className={styles.confidential}>DEWA-Confidential</p>
      </div>
    </div>
  );
}
