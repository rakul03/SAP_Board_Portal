import html2canvas from 'html2canvas';
import { renderAsync } from 'docx-preview';
import { jsPDF } from 'jspdf';
import type { Initiative, MemoDraft } from '../types';
import memoTemplateUrl from '../template/MEMO template- 1.docx?url';

export const MEMO_TEMPLATE_PATH = 'src/template/MEMO template- 1.docx';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function withLineBreaks(value: string): string {
  return escapeHtml(value || '-').replace(/\n/g, '<br />');
}

function setParagraphContent(paragraph: Element | undefined, html: string) {
  if (!paragraph) return;
  paragraph.innerHTML = html;
  (paragraph as HTMLElement).style.whiteSpace = 'pre-wrap';
}

function findParagraph(paragraphs: HTMLElement[], matcher: (text: string) => boolean): HTMLElement | undefined {
  return paragraphs.find((paragraph) => matcher((paragraph.textContent || '').replace(/\s+/g, ' ').trim()));
}

function nextContentParagraph(paragraphs: HTMLElement[], index: number): HTMLElement | undefined {
  for (let i = index + 1; i < paragraphs.length; i += 1) {
    const text = (paragraphs[i].textContent || '').trim();
    if (text) return paragraphs[i];
  }
  return undefined;
}

function populateSnapshotTable(root: HTMLElement, initiative: Initiative) {
  const cells = Array.from(root.querySelectorAll('td'));
  if (cells.length < 9) return;

  const entries = [
    ['Initiative', initiative.name],
    ['Category', initiative.category],
    ['Owner', initiative.owner || 'Unassigned'],
    ['Implementer', initiative.implementer || '-'],
    ['Demand Number', initiative.demandNumber || initiative.id],
    ['Status', initiative.status],
    ['Urgency', initiative.urgency],
    ['Budget', initiative.budget || '-'],
    ['Last Updated', new Date(initiative.updatedAt).toLocaleDateString()],
  ];

  entries.forEach(([label, value], index) => {
    cells[index].innerHTML = `
      <div style="font-family: Dubai, Arial, sans-serif; font-size: 11pt; line-height: 1.35;">
        <div style="font-weight: 700; margin-bottom: 4px;">${escapeHtml(label)}</div>
        <div>${escapeHtml(value)}</div>
      </div>
    `;
  });
}

function applyTemplateValues(root: HTMLElement, initiative: Initiative, draft: MemoDraft) {
  const paragraphs = Array.from(root.querySelectorAll('p')) as HTMLElement[];
  const toFromParagraph = findParagraph(paragraphs, (text) => text.includes('TO:') && text.includes('FROM:'));
  const dateRefParagraph = findParagraph(paragraphs, (text) => text.includes('DATE:') && text.includes('REF:'));
  const subjectParagraph = findParagraph(paragraphs, (text) => text.includes('Subject:'));

  setParagraphContent(
    toFromParagraph,
    `
      <span style="display:inline-block; width:49%;"><strong>TO:</strong> ${escapeHtml(draft.to || '-')}</span>
      <span style="display:inline-block; width:49%; text-align:right;"><strong>FROM:</strong> ${escapeHtml(draft.from || '-')}</span>
    `,
  );

  setParagraphContent(
    dateRefParagraph,
    `
      <span style="display:inline-block; width:49%;"><strong>DATE:</strong> ${escapeHtml(draft.date || '-')}</span>
      <span style="display:inline-block; width:49%; text-align:right;"><strong>REF:</strong> ${escapeHtml(draft.reference || '-')}</span>
    `,
  );

  setParagraphContent(subjectParagraph, `<strong>Subject:</strong> ${escapeHtml(draft.subject || '-')}`);

  const introIndex = paragraphs.findIndex((paragraph) => (paragraph.textContent || '').includes('1.0 Introduction'));
  const bodyIndex = paragraphs.findIndex((paragraph) => (paragraph.textContent || '').includes('2.0 Body'));
  const conclusionIndex = paragraphs.findIndex((paragraph) => (paragraph.textContent || '').includes('Conclusion:'));
  const attachmentIndex = paragraphs.findIndex((paragraph) => (paragraph.textContent || '').includes('Attachment:'));
  const workshopDescriptionParagraph = findParagraph(paragraphs, (text) => text === 'Workshop Description');
  const tableHeadingParagraph = findParagraph(paragraphs, (text) => text.includes('2.1 Tables'));

  setParagraphContent(nextContentParagraph(paragraphs, introIndex), withLineBreaks(draft.introduction));
  setParagraphContent(nextContentParagraph(paragraphs, bodyIndex), withLineBreaks(draft.body));
  setParagraphContent(nextContentParagraph(paragraphs, conclusionIndex), withLineBreaks(draft.conclusion));
  setParagraphContent(nextContentParagraph(paragraphs, attachmentIndex), withLineBreaks(draft.attachment));
  setParagraphContent(workshopDescriptionParagraph, `<strong>${escapeHtml(initiative.name)}</strong>`);
  setParagraphContent(tableHeadingParagraph, '<em>2.1 Initiative Details</em>');

  populateSnapshotTable(root, initiative);
}

export async function renderMemoTemplate(
  container: HTMLElement,
  initiative: Initiative,
  draft: MemoDraft,
): Promise<HTMLElement> {
  const response = await fetch(memoTemplateUrl);
  if (!response.ok) {
    throw new Error(`Unable to load memo template from ${MEMO_TEMPLATE_PATH}.`);
  }

  const buffer = await response.arrayBuffer();
  container.innerHTML = '';

  await renderAsync(buffer, container, undefined, {
    inWrapper: true,
    breakPages: true,
    ignoreLastRenderedPageBreak: false,
    useBase64URL: true,
  });

  const docRoot = (container.querySelector('.docx') || container.firstElementChild) as HTMLElement | null;
  if (!docRoot) {
    throw new Error(`Memo template ${MEMO_TEMPLATE_PATH} did not render correctly.`);
  }

  applyTemplateValues(docRoot, initiative, draft);
  return docRoot;
}

export async function exportRenderedTemplateToPdf(root: HTMLElement, fileName: string) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const target = (root.querySelector('.docx-wrapper') as HTMLElement | null) || root;
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const pages = Array.from(target.querySelectorAll('section.docx')) as HTMLElement[];
  const captureTargets = pages.length > 0 ? pages : [target];

  for (let index = 0; index < captureTargets.length; index += 1) {
    const page = captureTargets[index];
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: Math.max(page.scrollWidth, page.clientWidth, 900),
      windowHeight: Math.max(page.scrollHeight, page.clientHeight, 1200),
      scrollX: 0,
      scrollY: 0,
    });

    const imageData = canvas.toDataURL('image/png');
    if (index > 0) {
      pdf.addPage();
    }

    pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }

  const dataUri = pdf.output('datauristring');
  pdf.save(fileName);
  return dataUri;
}
