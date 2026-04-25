import JSZip from 'jszip';
import type { Initiative, MemoDraft, MemoTable } from '../types';
import memoTemplateUrl from '../template/MEMO template- 1.docx?url';

let cachedTemplate: Promise<ArrayBuffer> | null = null;

async function loadTemplateBuffer(): Promise<ArrayBuffer> {
  if (!cachedTemplate) {
    cachedTemplate = (async () => {
      const response = await fetch(memoTemplateUrl);
      if (!response.ok) throw new Error('Unable to load memo template (.docx).');
      return response.arrayBuffer();
    })();
  }
  return cachedTemplate;
}

function escapeXml(value: string): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const FONT_RPR = '<w:rFonts w:ascii="Dubai" w:hAnsi="Dubai" w:cs="Dubai"/>';

function paragraphText(paragraphXml: string): string {
  const matches = [...paragraphXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches.map((m) => m[1]).join('');
}

function getParagraphs(xml: string): string[] {
  const matches = xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g);
  return matches ?? [];
}

function rebuildParagraph(originalXml: string, runsXml: string): string {
  const openTagMatch = originalXml.match(/^<w:p\b[^>]*>/);
  const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
  const pPrMatch = originalXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  return `${openTag}${pPr}${runsXml}</w:p>`;
}

function findParagraph(
  paragraphs: string[],
  predicate: (text: string) => boolean,
): { index: number; xml: string } | null {
  for (let i = 0; i < paragraphs.length; i += 1) {
    const text = paragraphText(paragraphs[i]);
    if (predicate(text)) {
      return { index: i, xml: paragraphs[i] };
    }
  }
  return null;
}

function runsForText(text: string, opts: { bold?: boolean; italic?: boolean } = {}): string {
  const lines = (text || '').split(/\r?\n/);
  const rPr = `<w:rPr>${FONT_RPR}${opts.bold ? '<w:b/><w:bCs/>' : ''}${opts.italic ? '<w:i/><w:iCs/>' : ''}<w:lang w:val="en-AE"/></w:rPr>`;
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return `<w:r>${rPr}<w:t xml:space="preserve"> </w:t></w:r>`;
  }
  return lines
    .map((line, idx) => {
      const safe = escapeXml(line || ' ');
      const breakTag = idx < lines.length - 1 ? '<w:br/>' : '';
      return `<w:r>${rPr}<w:t xml:space="preserve">${safe}</w:t>${breakTag}</w:r>`;
    })
    .join('');
}

function labeledRunPair(label: string, value: string): string {
  return (
    `<w:r><w:rPr>${FONT_RPR}<w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(label)} </w:t></w:r>` +
    `<w:r><w:rPr>${FONT_RPR}</w:rPr><w:t xml:space="preserve">${escapeXml(value || '-')}</w:t></w:r>`
  );
}

function twoColumnHeaderRunsXml(
  label1: string,
  value1: string,
  label2: string,
  value2: string,
): string {
  return (
    labeledRunPair(label1, value1) +
    `<w:r><w:rPr>${FONT_RPR}</w:rPr><w:tab/></w:r>` +
    labeledRunPair(label2, value2)
  );
}

function twoColumnHeaderParagraph(
  originalXml: string,
  label1: string,
  value1: string,
  label2: string,
  value2: string,
): string {
  const openTagMatch = originalXml.match(/^<w:p\b[^>]*>/);
  const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
  const pPr = `<w:pPr><w:tabs><w:tab w:val="right" w:pos="10800"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:rPr>${FONT_RPR}</w:rPr></w:pPr>`;
  const runs = twoColumnHeaderRunsXml(label1, value1, label2, value2);
  return `${openTag}${pPr}${runs}</w:p>`;
}

function subjectParagraph(originalXml: string, subject: string): string {
  const openTagMatch = originalXml.match(/^<w:p\b[^>]*>/);
  const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
  const pPr = `<w:pPr><w:jc w:val="center"/><w:spacing w:line="276" w:lineRule="auto"/><w:rPr>${FONT_RPR}</w:rPr></w:pPr>`;
  const runs =
    `<w:r><w:rPr>${FONT_RPR}<w:b/></w:rPr><w:t xml:space="preserve">Subject: </w:t></w:r>` +
    `<w:r><w:rPr>${FONT_RPR}</w:rPr><w:t xml:space="preserve">${escapeXml(subject || '-')}</w:t></w:r>`;
  return `${openTag}${pPr}${runs}</w:p>`;
}

function buildTableXml(table: MemoTable): string {
  const headers = table.headers.length ? table.headers : ['Column 1'];
  const rows = table.rows.length ? table.rows : [headers.map(() => '')];
  const colCount = Math.max(headers.length, 1);
  const cellW = Math.floor(10700 / colCount);

  const grid = `<w:tblGrid>${headers.map(() => `<w:gridCol w:w="${cellW}"/>`).join('')}</w:tblGrid>`;

  const headerRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${headers
    .map(
      (h) => `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${cellW}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="0F4024"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:rPr>${FONT_RPR}<w:b/><w:color w:val="FFFFFF"/></w:rPr></w:pPr>
            <w:r>
              <w:rPr>${FONT_RPR}<w:b/><w:color w:val="FFFFFF"/></w:rPr>
              <w:t xml:space="preserve">${escapeXml(h)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`,
    )
    .join('')}</w:tr>`;

  const bodyRows = rows
    .map((row) => {
      const cells = headers
        .map((_, idx) => {
          const value = row[idx] ?? '';
          const lines = (value || ' ').split(/\r?\n/);
          const runs = lines
            .map((line, i) => {
              const breakTag = i < lines.length - 1 ? '<w:br/>' : '';
              return `<w:r><w:rPr>${FONT_RPR}</w:rPr><w:t xml:space="preserve">${escapeXml(line || ' ')}</w:t>${breakTag}</w:r>`;
            })
            .join('');
          return `
            <w:tc>
              <w:tcPr><w:tcW w:w="${cellW}" w:type="dxa"/></w:tcPr>
              <w:p>
                <w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:rPr>${FONT_RPR}</w:rPr></w:pPr>
                ${runs}
              </w:p>
            </w:tc>`;
        })
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');

  return `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>
    ${grid}
    ${headerRow}
    ${bodyRows}
  </w:tbl>`;
}

function replaceFirstOccurrence(haystack: string, needle: string, replacement: string): string {
  const idx = haystack.indexOf(needle);
  if (idx === -1) return haystack;
  return haystack.slice(0, idx) + replacement + haystack.slice(idx + needle.length);
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function exportMemoToWord(
  initiative: Initiative,
  draft: MemoDraft,
  fileName: string,
): Promise<void> {
  void initiative;
  const buffer = await loadTemplateBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Template document.xml is missing.');

  let xml = await docFile.async('string');
  let paragraphs = getParagraphs(xml);

  const replaceParagraph = (oldXml: string, newXml: string) => {
    xml = replaceFirstOccurrence(xml, oldXml, newXml);
    paragraphs = getParagraphs(xml);
  };

  // TO / FROM row
  const toFrom = findParagraph(paragraphs, (text) => {
    const n = normalize(text);
    return n.includes('to:') && n.includes('from:');
  });
  if (toFrom) {
    replaceParagraph(
      toFrom.xml,
      twoColumnHeaderParagraph(toFrom.xml, 'TO:', draft.to, 'FROM:', draft.from),
    );
  }

  // DATE / REF row
  const dateRef = findParagraph(paragraphs, (text) => {
    const n = normalize(text);
    return n.includes('date:') && n.includes('ref:');
  });
  if (dateRef) {
    replaceParagraph(
      dateRef.xml,
      twoColumnHeaderParagraph(dateRef.xml, 'DATE:', draft.date, 'REF:', draft.reference),
    );
  }

  // Subject (centered)
  const subject = findParagraph(paragraphs, (text) => normalize(text).startsWith('subject:'));
  if (subject) {
    replaceParagraph(subject.xml, subjectParagraph(subject.xml, draft.subject));
  }

  // Section bodies (paragraph immediately after the heading paragraph)
  const replaceBodyAfter = (predicate: (text: string) => boolean, content: string) => {
    const heading = findParagraph(paragraphs, predicate);
    if (!heading) return;
    const next = paragraphs[heading.index + 1];
    if (next) {
      replaceParagraph(next, rebuildParagraph(next, runsForText(content)));
      return;
    }
    const inserted = `<w:p><w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:rPr>${FONT_RPR}</w:rPr></w:pPr>${runsForText(content)}</w:p>`;
    xml = replaceFirstOccurrence(xml, heading.xml, heading.xml + inserted);
    paragraphs = getParagraphs(xml);
  };

  replaceBodyAfter(
    (text) => normalize(text).startsWith('1.0 introduction'),
    draft.introduction,
  );
  replaceBodyAfter((text) => normalize(text).startsWith('2.0 body'), draft.body);
  replaceBodyAfter((text) => normalize(text).startsWith('conclusion:'), draft.conclusion);
  replaceBodyAfter((text) => normalize(text).startsWith('attachment:'), draft.attachment);

  // Replace the existing 2.1 table with the user-defined table
  xml = xml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/, () => buildTableXml(draft.table));

  zip.file('word/document.xml', xml);

  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  const url = URL.createObjectURL(outBlob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
