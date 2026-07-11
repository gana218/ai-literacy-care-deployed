/**
 * pdfExtract — 브라우저에서 PDF의 텍스트를 문단 배열로 추출한다.
 *
 * 크롬 확장 뷰어(extension/pdf/viewer.js)의 itemsToParagraphs 로직을 그대로 이식해
 * 웹 업로드와 확장이 **동일한 방식**으로 content[]를 만든다(파이프라인 공유).
 * PDF 파일 자체는 서버로 올라가지 않고 브라우저에서만 텍스트를 뽑는다.
 */
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
}

// pdf.js 텍스트 아이템 → 문단 재구성.
// y좌표로 줄 분리, 빈 줄로 문단 분리, 하이픈(-) 줄바꿈 병합.
function itemsToParagraphs(items: PdfTextItem[]): string[] {
  const lines: string[] = [];
  let cur = '';
  let lastY: number | null = null;
  for (const item of items) {
    if (typeof item.str !== 'string') continue; // marked-content 등은 스킵
    const y: number | null = item.transform ? item.transform[5] : lastY;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
      lines.push(cur.trim());
      cur = '';
    }
    cur += item.str || '';
    if (item.hasEOL) {
      lines.push(cur.trim());
      cur = '';
    }
    lastY = y;
  }
  if (cur.trim()) lines.push(cur.trim());

  const paras: string[] = [];
  let buf = '';
  for (const ln of lines) {
    if (!ln) {
      if (buf.trim()) {
        paras.push(buf.trim());
        buf = '';
      }
      continue;
    }
    if (buf.endsWith('-')) buf = buf.slice(0, -1) + ln;
    else buf += (buf ? ' ' : '') + ln;
  }
  if (buf.trim()) paras.push(buf.trim());
  return paras.filter((p) => p.length > 0);
}

/** PDF 파일에서 문단 배열을 추출한다. 텍스트 레이어가 없으면 빈 배열. */
export async function extractPdfParagraphs(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const allParas: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const text = await page.getTextContent();
    allParas.push(...itemsToParagraphs(text.items as PdfTextItem[]));
  }
  return allParas.filter((p) => p.length > 0);
}
