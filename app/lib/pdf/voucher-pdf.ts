import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Generic voucher/invoice PDF layout, shared by every voucher type.
 * Each posting engine's page only needs to supply a title, party
 * details, and a list of line items — the header, footer, and table
 * chrome are identical everywhere so every voucher type looks
 * consistent when a customer receives it.
 */

export interface VoucherPdfLineItem {
  label: string;
  detail?: string;
  amount: number;
}

export interface VoucherPdfInput {
  agencyName: string;
  agencyAddress?: string;
  agencyPhone?: string;
  agencyEmail?: string;

  voucherTypeLabel: string; // "Ticket Voucher", "Visa Voucher", etc.
  voucherNo: string;
  voucherDate: string;
  status: string;

  partyLabel: string; // "Billed To" / "Customer"
  partyName: string;
  partyPhone?: string;
  partyEmail?: string;
  partyAddress?: string;

  fields: { label: string; value: string }[]; // PNR, sector, hotel name, etc.
  lineItems: VoucherPdfLineItem[];
  totalAmount: number;
  notes?: string;
  currencyCode?: string;
}

const PAGE_WIDTH = 595.28; // A4 points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

function money(n: number, currencyCode?: string) {
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
}

export async function generateVoucherPdf(input: VoucherPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const slate900 = rgb(0.06, 0.09, 0.16);
  const slate600 = rgb(0.28, 0.34, 0.45);
  const slate400 = rgb(0.58, 0.64, 0.72);
  const slate100 = rgb(0.95, 0.96, 0.97);
  const emerald700 = rgb(0.02, 0.4, 0.34);
  const emerald50 = rgb(0.92, 0.98, 0.96);

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 60) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  // --- Header: agency name + voucher type/no/date on the right ---
  page.drawText(input.agencyName, { x: MARGIN, y, size: 18, font: fontBold, color: slate900 });
  y -= 16;
  if (input.agencyAddress) {
    page.drawText(input.agencyAddress, { x: MARGIN, y, size: 9, font, color: slate600 });
    y -= 12;
  }
  const contactBits = [input.agencyPhone, input.agencyEmail].filter(Boolean).join("  ·  ");
  if (contactBits) {
    page.drawText(contactBits, { x: MARGIN, y, size: 9, font, color: slate600 });
  }

  // Right-aligned voucher meta block
  const rightX = PAGE_WIDTH - MARGIN;
  let ry = PAGE_HEIGHT - MARGIN;
  const rightText = (str: string, size: number, bold = false, color = slate900) => {
    const f = bold ? fontBold : font;
    const w = f.widthOfTextAtSize(str, size);
    page.drawText(str, { x: rightX - w, y: ry, size, font: f, color });
    ry -= size + 4;
  };
  rightText(input.voucherTypeLabel.toUpperCase(), 12, true);
  rightText(`No. ${input.voucherNo}`, 10);
  rightText(input.voucherDate, 10);
  rightText(input.status.toUpperCase(), 9, false, input.status === "posted" ? emerald700 : slate400);

  y -= 26;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 24;

  // --- Party block ---
  page.drawText(input.partyLabel.toUpperCase(), { x: MARGIN, y, size: 8, font: fontBold, color: slate400 });
  y -= 14;
  page.drawText(input.partyName, { x: MARGIN, y, size: 12, font: fontBold, color: slate900 });
  y -= 15;
  for (const line of [input.partyPhone, input.partyEmail, input.partyAddress].filter(Boolean) as string[]) {
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: slate600 });
    y -= 12;
  }

  y -= 10;

  // --- Fields grid (PNR, sector, hotel, etc.) ---
  if (input.fields.length > 0) {
    const colWidth = (PAGE_WIDTH - 2 * MARGIN) / 3;
    let col = 0;
    let rowStartY = y;
    for (const f of input.fields) {
      const x = MARGIN + col * colWidth;
      if (col === 0) rowStartY = y;
      page.drawText(f.label.toUpperCase(), { x, y: rowStartY, size: 7, font: fontBold, color: slate400 });
      page.drawText(f.value || "—", { x, y: rowStartY - 11, size: 9, font, color: slate900 });
      col++;
      if (col === 3) {
        col = 0;
        y = rowStartY - 30;
      }
    }
    if (col !== 0) y -= 30;
    y -= 10;
  }

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 20;

  // --- Line items table ---
  const tableX = MARGIN;
  const amountColX = PAGE_WIDTH - MARGIN - 90;

  page.drawText("DESCRIPTION", { x: tableX, y, size: 8, font: fontBold, color: slate400 });
  page.drawText("AMOUNT", { x: amountColX, y, size: 8, font: fontBold, color: slate400 });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 16;

  for (const item of input.lineItems) {
    ensureSpace(28);
    page.drawText(item.label, { x: tableX, y, size: 10, font, color: slate900 });
    const amountStr = money(item.amount, input.currencyCode);
    const amountW = fontBold.widthOfTextAtSize(amountStr, 10);
    page.drawText(amountStr, { x: PAGE_WIDTH - MARGIN - amountW, y, size: 10, font: fontBold, color: slate900 });
    y -= 13;
    if (item.detail) {
      page.drawText(item.detail, { x: tableX, y, size: 8, font, color: slate600 });
      y -= 13;
    }
    y -= 5;
  }

  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 22;

  // --- Total ---
  ensureSpace(60);
  page.drawRectangle({
    x: PAGE_WIDTH - MARGIN - 190,
    y: y - 8,
    width: 190,
    height: 30,
    color: emerald50,
  });
  page.drawText("TOTAL", { x: PAGE_WIDTH - MARGIN - 180, y: y + 2, size: 9, font: fontBold, color: emerald700 });
  const totalStr = money(input.totalAmount, input.currencyCode);
  const totalW = fontBold.widthOfTextAtSize(totalStr, 13);
  page.drawText(totalStr, { x: PAGE_WIDTH - MARGIN - 10 - totalW, y: y - 1, size: 13, font: fontBold, color: emerald700 });
  y -= 40;

  // --- Notes ---
  if (input.notes) {
    ensureSpace(40);
    page.drawText("NOTES", { x: MARGIN, y, size: 8, font: fontBold, color: slate400 });
    y -= 12;
    page.drawText(input.notes.slice(0, 200), { x: MARGIN, y, size: 9, font, color: slate600 });
    y -= 20;
  }

  // --- Footer on last page ---
  page.drawText(
    `Generated by Rayan Solutions on ${new Date().toISOString().slice(0, 10)}. This is a system-generated document.`,
    { x: MARGIN, y: MARGIN - 20, size: 7, font, color: slate400 }
  );

  return pdfDoc.save();
}
