import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';

let ocrWorkerPromise = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return ocrWorkerPromise;
}

/**
 * Group PDF.js text items into horizontal lines (top-to-bottom, left-to-right)
 * and return normalized token objects with PDF coordinates.
 */
function normalizeTextItems(items) {
  const tokens = [];
  for (const item of items || []) {
    const raw = (item.str || '').trim();
    if (!raw) continue;
    const x = Array.isArray(item.transform) ? item.transform[4] : (item.x || 0);
    const y = Array.isArray(item.transform) ? item.transform[5] : (item.y || 0);
    tokens.push({ str: raw, x, y });
  }
  // Sort top-to-bottom (higher y first in PDF coordinates), then left-to-right (lower x first)
  tokens.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 4) return b.y - a.y;
    return a.x - b.x;
  });
  return tokens;
}

/**
 * Reconstruct readable lines from sorted PDF.js tokens.
 */
function buildLines(tokens) {
  const lines = [];
  for (const tok of tokens) {
    const lastLine = lines[lines.length - 1];
    if (lastLine && Math.abs(lastLine.y - tok.y) <= 4) {
      lastLine.tokens.push(tok);
    } else {
      lines.push({ y: tok.y, tokens: [tok] });
    }
  }
  return lines.map((line) => {
    line.tokens.sort((a, b) => a.x - b.x);
    return line.tokens.map((t) => t.str).join(' ');
  });
}

/**
 * Extract demand number and invoice number from PDF.js Page 1 text items.
 *
 * Strategy (in order):
 * 1. Regex on reconstructed lines: `dt. DD-Mon-YY <demand_no>`
 * 2. Coordinate fallback: all-digit token directly below "Other References"
 * 3. Fallback: explicit `DEM-YYYY-NNN` pattern in page text
 *
 * @param {Array} items - `textContent.items` from PDF.js `page.getTextContent()`
 * @returns {{ demandNum: number | null, demandFull: string | null, invoiceNo: string, method: string | null }}
 */
export function extractDemandFromPageItems(items) {
  const tokens = normalizeTextItems(items);
  const lines = buildLines(tokens);
  const fullText = lines.join('\n');

  const invMatch = fullText.match(/\b([A-Z]{2,6}\/\d{2}-\d{2}\/\d+)\b/i);
  const invoiceNo = invMatch ? invMatch[1] : '';

  // Method 1: Reference line date followed by demand number (e.g. "FBI/26-27/1901 dt. 26-Nov-26 178")
  for (const line of lines) {
    const m = line.match(/\bdt\.?\s*\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}\s+(\d{1,6})\b/i);
    if (m) {
      return {
        demandNum: parseInt(m[1], 10),
        demandFull: null,
        invoiceNo,
        method: 'ref-line'
      };
    }
  }

  // Method 2: Coordinate fallback below "Other References"
  let anchor = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^other\s+references?:?$/i.test(t.str)) {
      anchor = t;
      break;
    }
    if (
      /^other$/i.test(t.str) &&
      i + 1 < tokens.length &&
      /^references?:?$/i.test(tokens[i + 1].str) &&
      Math.abs(tokens[i + 1].y - t.y) <= 6
    ) {
      anchor = t;
      break;
    }
  }

  if (anchor) {
    let bestCandidate = null;
    let bestDy = Infinity;
    for (const c of tokens) {
      if (!/^\d{1,6}$/.test(c.str)) continue;
      const dy = anchor.y - c.y; // PDF y increases upward, so below = positive dy
      const dx = Math.abs(c.x - anchor.x);
      if (dy > 0 && dy < 45 && dx < 65 && dy < bestDy) {
        bestDy = dy;
        bestCandidate = c;
      }
    }
    if (bestCandidate) {
      return {
        demandNum: parseInt(bestCandidate.str, 10),
        demandFull: null,
        invoiceNo,
        method: 'other-references-pos'
      };
    }
  }

  // Method 3: Explicit DEM-YYYY-NNN anywhere in page 1 text
  const demMatch = fullText.match(/\bDEM[-_ ]?(\d{4}|\d{2})[-_ ]?(\d+)\b/i);
  if (demMatch) {
    const year = demMatch[1].length === 2 ? `20${demMatch[1]}` : demMatch[1];
    const num = demMatch[2];
    return {
      demandNum: parseInt(num, 10),
      demandFull: `DEM-${year}-${num}`,
      invoiceNo,
      method: 'dem-text'
    };
  }

  return { demandNum: null, demandFull: null, invoiceNo, method: null };
}

/**
 * Extract demand number and invoice number from Tesseract.js OCR output.
 */
export function extractDemandFromOcrData(ocrData) {
  const text = ocrData?.text || '';
  const words = ocrData?.words || [];

  const invMatch = text.match(/\b([A-Z]{2,6}\/\d{2}-\d{2}\/\d+)\b/i);
  const invoiceNo = invMatch ? invMatch[1] : '';

  // Method 1: Regex on OCR text lines
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/\b(?:dt\.?|dl\.?)\s*\d{1,2}[-/][A-Za-z0-9]{3}[-/]\d{2,4}\s+(\d{1,6})\b/i);
    if (m) {
      return {
        demandNum: parseInt(m[1], 10),
        demandFull: null,
        invoiceNo,
        method: 'ocr-ref-line'
      };
    }
  }

  // Method 2: Word bounding-box position below "Other References" (canvas top-down y)
  let anchor = null;
  for (let i = 0; i < words.length; i++) {
    const wText = (words[i].text || '').trim();
    const nextText = i + 1 < words.length ? (words[i + 1].text || '').trim() : '';
    if (/^other$/i.test(wText) && /^referenc/i.test(nextText)) {
      anchor = words[i];
      break;
    }
  }

  if (anchor && anchor.bbox) {
    let best = null;
    let bestDy = Infinity;
    for (const w of words) {
      const txt = (w.text || '').trim();
      if (!/^\d{1,6}$/.test(txt) || !w.bbox) continue;
      const dy = w.bbox.y0 - anchor.bbox.y1;
      const dx = Math.abs(w.bbox.x0 - anchor.bbox.x0);
      if (dy > 0 && dy < 90 && dx < 100 && dy < bestDy) {
        bestDy = dy;
        best = txt;
      }
    }
    if (best) {
      return {
        demandNum: parseInt(best, 10),
        demandFull: null,
        invoiceNo,
        method: 'ocr-other-references-pos'
      };
    }
  }

  // Method 3: Explicit DEM-YYYY-NNN in OCR text
  const demMatch = text.match(/\bDEM[-_ ]?(\d{4}|\d{2})[-_ ]?(\d+)\b/i);
  if (demMatch) {
    const year = demMatch[1].length === 2 ? `20${demMatch[1]}` : demMatch[1];
    const num = demMatch[2];
    return {
      demandNum: parseInt(num, 10),
      demandFull: `DEM-${year}-${num}`,
      invoiceNo,
      method: 'ocr-dem-text'
    };
  }

  return { demandNum: null, demandFull: null, invoiceNo, method: null };
}

/**
 * Render top 38% of PDF Page 1 to a canvas and run Tesseract OCR.
 */
async function ocrPdfPageOneHeader(page) {
  if (typeof document === 'undefined') {
    return { demandNum: null, demandFull: null, invoiceNo: '', method: null };
  }
  const viewport = page.getViewport({ scale: 2.0 });
  const cropHeight = Math.ceil(viewport.height * 0.38);

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const worker = await getOcrWorker();
  const { data } = await worker.recognize(canvas);
  return extractDemandFromOcrData(data);
}

/**
 * Read Page 1 of a PDF File/Blob/Uint8Array and extract demand & invoice references.
 * Tries text extraction first, and falls back to browser OCR if scanned/image-only.
 */
export async function extractDemandFromPdf(fileOrBytes) {
  try {
    const data =
      fileOrBytes instanceof Uint8Array
        ? fileOrBytes
        : new Uint8Array(await fileOrBytes.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    let result = extractDemandFromPageItems(textContent.items);

    if (result.demandNum === null && !result.demandFull && typeof document !== 'undefined') {
      const ocrResult = await ocrPdfPageOneHeader(page);
      if (ocrResult.demandNum !== null || ocrResult.demandFull) {
        result = ocrResult;
      } else if (ocrResult.invoiceNo && !result.invoiceNo) {
        result = { ...result, invoiceNo: ocrResult.invoiceNo };
      }
    }

    if (typeof pdf.cleanup === 'function') {
      await pdf.cleanup();
    }
    return result;
  } catch (err) {
    console.warn('extractDemandFromPdf error:', err);
    return { demandNum: null, demandFull: null, invoiceNo: '', method: null };
  }
}

/**
 * Merge multiple PDF Files (or Uint8Arrays) into a single PDF File.
 */
export async function mergePdfFiles(files, outputFileName) {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const bytes =
      file instanceof Uint8Array
        ? file
        : new Uint8Array(await file.arrayBuffer());
    const srcPdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }
  const mergedBytes = await mergedPdf.save();
  if (typeof File !== 'undefined') {
    return new File([mergedBytes], outputFileName, { type: 'application/pdf' });
  }
  return mergedBytes;
}
