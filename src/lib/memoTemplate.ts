import { jsPDF } from 'jspdf';
import type { Initiative, MemoDraft, MemoTable } from '../types';
import memoTemplateUrl from '../template/MEMO template- 1.docx?url';
import memoHeaderUrl from '../template/assets/memo-header.jpg';
import memoFooterUrl from '../template/assets/memo-footer.jpg';

export const MEMO_TEMPLATE_PATH = 'src/template/MEMO template- 1.docx';
export const MEMO_TEMPLATE_URL = memoTemplateUrl;

const PAGE_W = 595.28;
const PAGE_H = 841.89;

const MARGIN_L = 40;
const MARGIN_R = 40;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const HEADER_IMG_W = 1242;
const HEADER_IMG_H = 171;
const HEADER_DRAW_W = PAGE_W;
const HEADER_DRAW_H = (HEADER_IMG_H / HEADER_IMG_W) * HEADER_DRAW_W;

const FOOTER_IMG_W = 2276;
const FOOTER_IMG_H = 101;
const FOOTER_DRAW_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_DRAW_H = (FOOTER_IMG_H / FOOTER_IMG_W) * FOOTER_DRAW_W;

const FOOTER_TEXT_H = 14;
const FOOTER_GAP = 4;

const CONTENT_TOP = HEADER_DRAW_H + 18;
const CONTENT_BOTTOM = PAGE_H - (FOOTER_DRAW_H + FOOTER_TEXT_H + FOOTER_GAP + 16);

type CachedImage = { dataUrl: string; format: 'JPEG' | 'PNG' };

let cachedHeader: Promise<CachedImage> | null = null;
let cachedFooter: Promise<CachedImage> | null = null;

async function fetchImageAsDataUrl(url: string): Promise<CachedImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load template asset: ${url}`);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { dataUrl, format: 'JPEG' };
}

function getHeaderImage() {
  if (!cachedHeader) cachedHeader = fetchImageAsDataUrl(memoHeaderUrl);
  return cachedHeader;
}

function getFooterImage() {
  if (!cachedFooter) cachedFooter = fetchImageAsDataUrl(memoFooterUrl);
  return cachedFooter;
}

function drawFrame(doc: jsPDF, header: CachedImage, footer: CachedImage) {
  doc.addImage(header.dataUrl, header.format, 0, 0, HEADER_DRAW_W, HEADER_DRAW_H, undefined, 'FAST');

  const footerY = PAGE_H - FOOTER_DRAW_H - FOOTER_TEXT_H - FOOTER_GAP - 12;
  doc.addImage(
    footer.dataUrl,
    footer.format,
    MARGIN_L,
    footerY,
    FOOTER_DRAW_W,
    FOOTER_DRAW_H,
    undefined,
    'FAST',
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('DEWA-Confidential', PAGE_W / 2, PAGE_H - 12, { align: 'center' });
}

interface Cursor {
  y: number;
}

function newPage(doc: jsPDF, cursor: Cursor, header: CachedImage, footer: CachedImage) {
  doc.addPage();
  drawFrame(doc, header, footer);
  cursor.y = CONTENT_TOP;
}

function ensureSpace(
  doc: jsPDF,
  cursor: Cursor,
  needed: number,
  header: CachedImage,
  footer: CachedImage,
) {
  if (cursor.y + needed > CONTENT_BOTTOM) {
    newPage(doc, cursor, header, footer);
  }
}

function drawWrappedText(
  doc: jsPDF,
  cursor: Cursor,
  text: string,
  opts: { font: 'normal' | 'bold' | 'italic'; size: number; lineHeight: number; width?: number; x?: number },
  header: CachedImage,
  footer: CachedImage,
) {
  const width = opts.width ?? CONTENT_W;
  const x = opts.x ?? MARGIN_L;
  doc.setFont('helvetica', opts.font);
  doc.setFontSize(opts.size);
  doc.setTextColor(34, 34, 34);

  const paragraphs = (text || '-').split(/\r?\n/);
  paragraphs.forEach((paragraph, paraIdx) => {
    const lines = doc.splitTextToSize(paragraph || ' ', width) as string[];
    lines.forEach((line) => {
      ensureSpace(doc, cursor, opts.lineHeight, header, footer);
      doc.text(line, x, cursor.y + opts.size * 0.85);
      cursor.y += opts.lineHeight;
    });
    if (paraIdx < paragraphs.length - 1) {
      cursor.y += opts.lineHeight * 0.35;
    }
  });
}

function drawLabeledInline(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  align: 'left' | 'right',
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const labelText = `${label} `;
  const valueText = value || '-';
  if (align === 'left') {
    doc.text(labelText, x, y);
    const labelWidth = doc.getTextWidth(labelText);
    doc.setFont('helvetica', 'normal');
    doc.text(valueText, x + labelWidth, y);
  } else {
    doc.setFont('helvetica', 'normal');
    const valueWidth = doc.getTextWidth(valueText);
    doc.setFont('helvetica', 'bold');
    const labelWidth = doc.getTextWidth(labelText);
    const startX = x - valueWidth - labelWidth;
    doc.text(labelText, startX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valueText, startX + labelWidth, y);
  }
}

function drawSectionHeading(
  doc: jsPDF,
  cursor: Cursor,
  heading: string,
  header: CachedImage,
  footer: CachedImage,
) {
  ensureSpace(doc, cursor, 26, header, footer);
  cursor.y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 64, 36);
  doc.text(heading, MARGIN_L, cursor.y + 10);
  cursor.y += 18;
}

function drawUserTable(
  doc: jsPDF,
  cursor: Cursor,
  table: MemoTable,
  header: CachedImage,
  footer: CachedImage,
) {
  const headers = table.headers.length > 0 ? table.headers : ['Column 1'];
  const rows = table.rows.length > 0 ? table.rows : [headers.map(() => '')];

  const colCount = headers.length;
  const colW = CONTENT_W / colCount;
  const cellPadX = 8;
  const cellPadY = 6;
  const fontSize = 10;
  const lineGap = 3;

  const measureRowHeight = (cells: string[], font: 'normal' | 'bold') => {
    doc.setFont('helvetica', font);
    doc.setFontSize(fontSize);
    let maxLines = 1;
    for (let c = 0; c < colCount; c += 1) {
      const text = cells[c] ?? '';
      const lines = doc.splitTextToSize(text || ' ', colW - cellPadX * 2) as string[];
      if (lines.length > maxLines) maxLines = lines.length;
    }
    return cellPadY * 2 + maxLines * fontSize + (maxLines - 1) * lineGap;
  };

  const drawRow = (
    cells: string[],
    options: { isHeader: boolean },
  ) => {
    const font: 'normal' | 'bold' = options.isHeader ? 'bold' : 'normal';
    const rowH = measureRowHeight(cells, font);
    ensureSpace(doc, cursor, rowH, header, footer);

    if (options.isHeader) {
      doc.setFillColor(15, 64, 36);
      doc.setDrawColor(15, 64, 36);
      doc.rect(MARGIN_L, cursor.y, CONTENT_W, rowH, 'FD');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(210, 210, 210);
      doc.rect(MARGIN_L, cursor.y, CONTENT_W, rowH, 'FD');
    }

    for (let c = 1; c < colCount; c += 1) {
      doc.setDrawColor(options.isHeader ? 30 : 220, options.isHeader ? 80 : 220, options.isHeader ? 50 : 220);
      const x = MARGIN_L + colW * c;
      doc.line(x, cursor.y, x, cursor.y + rowH);
    }

    doc.setFont('helvetica', font);
    doc.setFontSize(fontSize);
    doc.setTextColor(options.isHeader ? 255 : 25, options.isHeader ? 255 : 25, options.isHeader ? 255 : 25);

    for (let c = 0; c < colCount; c += 1) {
      const text = cells[c] ?? '';
      const lines = doc.splitTextToSize(text || ' ', colW - cellPadX * 2) as string[];
      let lineY = cursor.y + cellPadY + fontSize;
      for (const line of lines) {
        doc.text(line, MARGIN_L + colW * c + cellPadX, lineY);
        lineY += fontSize + lineGap;
      }
    }

    cursor.y += rowH;
  };

  drawRow(headers, { isHeader: true });
  for (const row of rows) {
    drawRow(row, { isHeader: false });
  }
  cursor.y += 6;
}

export async function buildMemoPdf(initiative: Initiative, draft: MemoDraft): Promise<jsPDF> {
  const [header, footer] = await Promise.all([getHeaderImage(), getFooterImage()]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const cursor: Cursor = { y: CONTENT_TOP };
  drawFrame(doc, header, footer);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 64, 36);
  doc.text('MEMO', PAGE_W / 2, cursor.y + 18, { align: 'center' });
  cursor.y += 36;

  doc.setDrawColor(15, 64, 36);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_L, cursor.y, PAGE_W - MARGIN_R, cursor.y);
  cursor.y += 14;

  const rowY1 = cursor.y + 10;
  drawLabeledInline(doc, 'TO:', draft.to, MARGIN_L, rowY1, 'left');
  drawLabeledInline(doc, 'FROM:', draft.from, PAGE_W - MARGIN_R, rowY1, 'right');
  cursor.y += 22;

  const rowY2 = cursor.y + 10;
  drawLabeledInline(doc, 'DATE:', draft.date, MARGIN_L, rowY2, 'left');
  drawLabeledInline(doc, 'REF:', draft.reference, PAGE_W - MARGIN_R, rowY2, 'right');
  cursor.y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  const subjectLabel = 'Subject: ';
  const subjectValue = draft.subject || '-';
  const subjectLabelW = doc.getTextWidth(subjectLabel);
  doc.setFont('helvetica', 'normal');
  const subjectValueW = doc.getTextWidth(subjectValue);
  const subjectStartX = (PAGE_W - (subjectLabelW + subjectValueW)) / 2;
  doc.setFont('helvetica', 'bold');
  doc.text(subjectLabel, subjectStartX, cursor.y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(subjectValue, subjectStartX + subjectLabelW, cursor.y + 12);
  cursor.y += 26;

  drawSectionHeading(doc, cursor, '1.0 Introduction', header, footer);
  drawWrappedText(
    doc,
    cursor,
    draft.introduction,
    { font: 'normal', size: 11, lineHeight: 15 },
    header,
    footer,
  );

  drawSectionHeading(doc, cursor, '2.0 Body', header, footer);
  drawWrappedText(
    doc,
    cursor,
    draft.body,
    { font: 'normal', size: 11, lineHeight: 15 },
    header,
    footer,
  );

  cursor.y += 6;
  ensureSpace(doc, cursor, 20, header, footer);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(25, 25, 25);
  doc.text(initiative.name || 'Workshop Description', MARGIN_L, cursor.y + 10);
  cursor.y += 18;

  ensureSpace(doc, cursor, 18, header, footer);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('2.1 Table', MARGIN_L, cursor.y + 10);
  cursor.y += 16;

  drawUserTable(doc, cursor, draft.table, header, footer);

  drawSectionHeading(doc, cursor, 'Conclusion', header, footer);
  drawWrappedText(
    doc,
    cursor,
    draft.conclusion,
    { font: 'normal', size: 11, lineHeight: 15 },
    header,
    footer,
  );

  drawSectionHeading(doc, cursor, 'Attachment', header, footer);
  drawWrappedText(
    doc,
    cursor,
    draft.attachment,
    { font: 'normal', size: 11, lineHeight: 15 },
    header,
    footer,
  );

  return doc;
}

export async function exportMemoToPdf(
  initiative: Initiative,
  draft: MemoDraft,
  fileName: string,
): Promise<string> {
  const doc = await buildMemoPdf(initiative, draft);
  const dataUri = doc.output('datauristring');
  doc.save(fileName);
  return dataUri;
}

export async function renderMemoTemplate(
  container: HTMLElement,
  initiative: Initiative,
  draft: MemoDraft,
): Promise<HTMLElement> {
  const [header, footer] = await Promise.all([getHeaderImage(), getFooterImage()]);

  const fmt = (s: string) => (s || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = (s: string) =>
    fmt(s)
      .split(/\r?\n/)
      .map((line) => `<p style="margin:0 0 6px;">${line || '&nbsp;'}</p>`)
      .join('');

  const tableHeaders = draft.table?.headers?.length ? draft.table.headers : ['Column 1'];
  const tableRows = draft.table?.rows?.length ? draft.table.rows : [tableHeaders.map(() => '')];

  container.innerHTML = `
    <div style="background:#fff; color:#222; font-family: 'Helvetica', Arial, sans-serif;
                width:794px; margin:0 auto; padding:0; box-shadow:0 2px 10px rgba(0,0,0,.08);">
      <img src="${header.dataUrl}" style="display:block; width:100%;" alt="DEWA header" />
      <div style="padding:18px 40px 120px 40px; position:relative; min-height:900px;">
        <h1 style="text-align:center; font-size:22pt; color:#0f4024; margin:8px 0 10px;">MEMO</h1>
        <hr style="border:none; border-top:1px solid #0f4024; margin:0 0 14px;" />
        <div style="display:flex; justify-content:space-between; font-size:11pt; margin-bottom:8px;">
          <div><strong>TO:</strong> ${fmt(draft.to)}</div>
          <div><strong>FROM:</strong> ${fmt(draft.from)}</div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11pt; margin-bottom:14px;">
          <div><strong>DATE:</strong> ${fmt(draft.date)}</div>
          <div><strong>REF:</strong> ${fmt(draft.reference)}</div>
        </div>
        <div style="text-align:center; font-size:12pt; margin:10px 0 18px;">
          <strong>Subject:</strong> ${fmt(draft.subject)}
        </div>
        <h3 style="font-size:12pt; color:#0f4024; margin:14px 0 6px;">1.0 Introduction</h3>
        <div style="font-size:11pt; line-height:1.55;">${paragraphs(draft.introduction)}</div>
        <h3 style="font-size:12pt; color:#0f4024; margin:14px 0 6px;">2.0 Body</h3>
        <div style="font-size:11pt; line-height:1.55;">${paragraphs(draft.body)}</div>
        <p style="font-size:11pt; font-weight:700; margin:10px 0 4px;">${fmt(initiative.name)}</p>
        <p style="font-size:11pt; font-style:italic; color:#555; margin:0 0 8px;">2.1 Table</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10.5pt;">
          <thead>
            <tr>
              ${tableHeaders
                .map(
                  (h) =>
                    `<th style="background:#0f4024; color:#fff; text-align:left; padding:6px 8px; border:1px solid #0f4024;">${fmt(h)}</th>`,
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows
              .map(
                (row) =>
                  `<tr>${tableHeaders
                    .map(
                      (_, c) =>
                        `<td style="padding:6px 8px; border:1px solid #d2d2d2; vertical-align:top;">${fmt(row[c] ?? '')}</td>`,
                    )
                    .join('')}</tr>`,
              )
              .join('')}
          </tbody>
        </table>
        <h3 style="font-size:12pt; color:#0f4024; margin:14px 0 6px;">Conclusion</h3>
        <div style="font-size:11pt; line-height:1.55;">${paragraphs(draft.conclusion)}</div>
        <h3 style="font-size:12pt; color:#0f4024; margin:14px 0 6px;">Attachment</h3>
        <div style="font-size:11pt; line-height:1.55;">${paragraphs(draft.attachment)}</div>
      </div>
      <div style="padding:0 40px 16px;">
        <img src="${footer.dataUrl}" style="display:block; width:100%;" alt="DEWA footer" />
        <div style="text-align:center; font-size:9pt; padding:4px 0 0;">DEWA-Confidential</div>
      </div>
    </div>
  `;

  return container.firstElementChild as HTMLElement;
}
