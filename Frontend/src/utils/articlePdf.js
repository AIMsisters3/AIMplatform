import { jsPDF } from 'jspdf';
import logoUrl from '../assets/lg.png';

// AIMsisters brand colors (Frontend/tailwind.config.js) as RGB for jsPDF,
// which doesn't understand CSS variables/hex-with-alpha.
const COLOR_INK = [45, 42, 74];       // --ink
const COLOR_PINK = [229, 72, 185];    // accent
const COLOR_DARK_BLUE = [30, 41, 90]; // a deliberately dark, distinct blue for the closing signature

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = 56;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Converts a loaded <img> into a PNG data URL via canvas, for
// doc.addImage(). Uploaded media is same-origin once APP_URL is
// configured correctly (see Backend/helpers/media_url.php), but a
// misconfigured host or a genuinely cross-origin image can still taint
// the canvas - callers must catch and skip that one image rather than
// fail the whole PDF.
function imageToDataUrl(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

// Turns the article's saved HTML (RichTextEditor's output - see that
// component's own comment on why it's plain HTML) into a flat sequence
// of typed blocks a PDF renderer can walk top to bottom. Deliberately
// simple: only the tags RichTextEditor itself can actually produce.
function parseArticleBlocks(html) {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const blocks = [];

  function textOf(el) {
    return el.textContent.replace(/\s+/g, ' ').trim();
  }

  Array.from(container.children).forEach((el) => {
    const tag = el.tagName;
    if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
      const text = textOf(el);
      if (text) blocks.push({ type: 'heading', level: Number(tag[1]), text });
    } else if (tag === 'BLOCKQUOTE') {
      const text = textOf(el);
      if (text) blocks.push({ type: 'quote', text });
    } else if (tag === 'UL' || tag === 'OL') {
      Array.from(el.querySelectorAll('li')).forEach((li, i) => {
        const text = textOf(li);
        if (text) blocks.push({ type: 'list-item', text, ordered: tag === 'OL', index: i + 1 });
      });
    } else if (tag === 'P' || tag === 'DIV') {
      // A paragraph can itself contain an inline <img> (RichTextEditor
      // inserts images as their own block-level <img>, but a pasted one
      // could land inside a <p>) - split it out as its own image block
      // so it can be embedded and page-broken independently of text.
      const img = el.querySelector('img');
      if (img) blocks.push({ type: 'image', src: img.getAttribute('src') });
      const text = textOf(el);
      if (text) blocks.push({ type: 'paragraph', text });
    } else if (tag === 'IMG') {
      blocks.push({ type: 'image', src: el.getAttribute('src') });
    }
  });

  return blocks;
}

/**
 * Generates a real, text-based PDF (not a screenshot) of a devotion or
 * news article, formatted as an official AIMsisters document. Returns
 * once the file has been handed to the browser's save dialog.
 */
export async function downloadArticlePdf(item) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = MARGIN;

  // ---- Header: logo, "AIMSISTERS ARTICLE" label, title, date ----
  try {
    const logoImg = await loadImageElement(logoUrl);
    const logoH = 32;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    doc.addImage(imageToDataUrl(logoImg), 'PNG', MARGIN, y, logoW, logoH);
  } catch {
    // Logo failed to load/decode — proceed without it rather than
    // failing the whole document.
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PINK);
  doc.text('AIMSISTERS ARTICLE', PAGE.width - MARGIN, y + 12, { align: 'right' });
  y += 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_INK);
  const titleLines = doc.splitTextToSize(item.title || 'Untitled', CONTENT_WIDTH);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 24 + 6;

  if (item.publish_date || item.created_at) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 130);
    const dateStr = new Date(item.publish_date || item.created_at)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(dateStr, PAGE.width - MARGIN, y, { align: 'right' });
  }
  y += 20;

  doc.setDrawColor(230, 230, 235);
  doc.line(MARGIN, y, PAGE.width - MARGIN, y);
  y += 24;

  // ---- Body ----
  const blocks = parseArticleBlocks(item.body);

  function ensureRoom(neededHeight) {
    if (y + neededHeight > PAGE.height - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      const size = block.level === 1 ? 16 : block.level === 2 ? 14 : 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(block.text, CONTENT_WIDTH);
      const blockHeight = lines.length * (size + 4);
      // A heading is never left as the very last thing on a page (spec:
      // "headings are not awkwardly separated from their paragraphs") -
      // if there isn't room for it plus at least one line of what
      // follows, push both to the next page together.
      ensureRoom(blockHeight + size + 20);
      doc.setTextColor(...COLOR_INK);
      doc.text(lines, MARGIN, y);
      y += blockHeight + 8;
    } else if (block.type === 'quote') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(block.text, CONTENT_WIDTH - 20);
      const blockHeight = lines.length * 15;
      ensureRoom(blockHeight + 16);
      doc.setDrawColor(...COLOR_PINK);
      doc.setLineWidth(2);
      doc.line(MARGIN, y - 10, MARGIN, y + blockHeight - 2);
      doc.setTextColor(90, 90, 100);
      doc.text(lines, MARGIN + 16, y);
      y += blockHeight + 14;
    } else if (block.type === 'list-item') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const bullet = block.ordered ? `${block.index}.` : '•';
      const lines = doc.splitTextToSize(block.text, CONTENT_WIDTH - 22);
      const blockHeight = lines.length * 15;
      ensureRoom(blockHeight);
      doc.setTextColor(...COLOR_INK);
      doc.text(bullet, MARGIN, y);
      doc.text(lines, MARGIN + 18, y);
      y += blockHeight + 4;
    } else if (block.type === 'paragraph') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(block.text, CONTENT_WIDTH);
      const blockHeight = lines.length * 15;
      ensureRoom(blockHeight);
      doc.setTextColor(...COLOR_INK);
      doc.text(lines, MARGIN, y);
      y += blockHeight + 12;
    } else if (block.type === 'image' && block.src) {
      try {
        const img = await loadImageElement(block.src);
        // Preserve aspect ratio, fit within the content width and never
        // exceed a sane max height (a very tall image otherwise couldn't
        // fit on any single page).
        const maxW = CONTENT_WIDTH;
        const maxH = PAGE.height - MARGIN * 2 - 40;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const scale = Math.min(maxW / w, maxH / h, 1);
        w *= scale;
        h *= scale;
        ensureRoom(h + 16);
        const dataUrl = imageToDataUrl(img);
        doc.addImage(dataUrl, 'PNG', MARGIN + (CONTENT_WIDTH - w) / 2, y, w, h);
        y += h + 16;
      } catch {
        // Image couldn't be loaded/decoded (network hiccup, or blocked
        // by the browser's canvas cross-origin policy) - the rest of the
        // article's real text still generates correctly, so skip just
        // this image rather than aborting the whole download.
      }
    }
  }

  // ---- Closing signature ----
  ensureRoom(40);
  y += 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_DARK_BLUE);
  doc.text('by the AIMsisters', PAGE.width / 2, y, { align: 'center' });

  const fileSlug = (item.slug || item.title || 'article').toString().slice(0, 60);
  doc.save(`${fileSlug}.pdf`);
}
