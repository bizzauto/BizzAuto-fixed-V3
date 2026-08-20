import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ============================================================
// PARSE EXCEL/CSV FILE INTO ROWS
// ============================================================
function parseFile(buffer: Buffer, filename: string): any[] {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  if (ext === 'pdf') {
    return []; // PDF parsing handled separately if needed
  }

  return [];
}

// Normalize column names for matching
function normalizeRow(row: any): any {
  const normalized: any = {};
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    normalized[k] = val;
  }
  return normalized;
}

// Map common column variations to standard fields
function mapFields(rows: any[], type: 'ledger' | 'bank'): any[] {
  const dateKeys = ['date', 'txn_date', 'transactiondate', 'entrydate', 'valuedate', 'postdate'];
  const amountKeys = ['amount', 'debit', 'credit', 'debitamount', 'creditamount', 'txnamount', 'value', 'balance'];
  const descKeys = ['description', 'narration', 'remarks', 'reference', 'ref', 'particulars', 'details', 'memo'];
  const partyKeys = ['party', 'partyname', 'name', 'customer', 'customername', 'supplier', 'vendor', 'account', 'accountname'];
  const typeKeys = ['type', 'txn_type', 'entrytype', 'dr_cr', 'drcr', 'mode'];

  return rows.map(row => {
    const n = normalizeRow(row);
    const dateKey = dateKeys.find(k => n[k] !== undefined && n[k] !== '');
    const amountKey = amountKeys.find(k => n[k] !== undefined && n[k] !== '' && !isNaN(parseFloat(String(n[k]).replace(/,/g, ''))));
    const descKey = descKeys.find(k => n[k] !== undefined && n[k] !== '');
    const partyKey = partyKeys.find(k => n[k] !== undefined && n[k] !== '');
    const typeKey = typeKeys.find(k => n[k] !== undefined && n[k] !== '');

    const rawAmount = amountKey ? String(n[amountKey]).replace(/,/g, '').trim() : '0';
    let amount = parseFloat(rawAmount);
    if (isNaN(amount)) amount = 0;

    // Determine if it's a credit or debit based on type column or sign
    let entryType = 'DEBIT';
    if (typeKey) {
      const t = String(n[typeKey]).toLowerCase();
      if (t === 'credit' || t === 'cr' || t === 'cr.' || t === '+') entryType = 'CREDIT';
    } else if (amount < 0) {
      entryType = 'CREDIT';
      amount = Math.abs(amount);
    }

    return {
      date: dateKey ? String(n[dateKey]) : '',
      amount,
      description: descKey ? String(n[descKey]).trim() : '',
      party: partyKey ? String(n[partyKey]).trim() : '',
      type: entryType,
      raw: row,
    };
  });
}

// ============================================================
// COMPARE TWO DATASETS
// ============================================================
function compareDatasets(ledger: any[], bank: any[]) {
  const matchedLedger = new Set<number>();
  const matchedBank = new Set<number>();
  const matched: any[] = [];
  const unmatchedLedger: any[] = [];
  const unmatchedBank: any[] = [];
  const amountMismatches: any[] = [];

  for (let bi = 0; bi < bank.length; bi++) {
    const b = bank[bi];
    let bestIdx = -1;
    let bestScore = 0;

    for (let li = 0; li < ledger.length; li++) {
      if (matchedLedger.has(li)) continue;
      const l = ledger[li];

      let score = 0;
      // Amount (40%)
      if (Math.abs(b.amount - l.amount) < 0.01) score += 0.4;
      else if (Math.abs(b.amount - l.amount) <= 1) score += 0.3;

      // Date (30%)
      const bDate = new Date(b.date);
      const lDate = new Date(l.date);
      if (!isNaN(bDate.getTime()) && !isNaN(lDate.getTime())) {
        const daysDiff = Math.abs(bDate.getTime() - lDate.getTime()) / 86400000;
        if (daysDiff === 0) score += 0.3;
        else if (daysDiff <= 3) score += 0.2;
        else if (daysDiff <= 7) score += 0.1;
      }

      // Description (30%)
      if (b.description && l.description) {
        const bWords = new Set(b.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
        const lWords = new Set(l.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
        const common = [...bWords].filter(w => lWords.has(w));
        const total = new Set([...bWords, ...lWords]);
        if (total.size > 0) score += 0.3 * (common.length / total.size);
      }

      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestIdx = li;
      }
    }

    if (bestIdx >= 0) {
      matchedLedger.add(bestIdx);
      matchedBank.add(bi);
      const l = ledger[bestIdx];
      const item: any = { bank: b, ledger: l, confidence: Math.round(bestScore * 100) };
      if (Math.abs(b.amount - l.amount) > 0.01) {
        item.amountDiff = b.amount - l.amount;
        amountMismatches.push(item);
      }
      matched.push(item);
    } else {
      unmatchedBank.push(b);
    }
  }

  for (let li = 0; li < ledger.length; li++) {
    if (!matchedLedger.has(li)) {
      unmatchedLedger.push(ledger[li]);
    }
  }

  return { matched, unmatchedLedger, unmatchedBank, amountMismatches };
}

// ============================================================
// PARTY-WISE REPORT
// ============================================================
function partyWiseReport(ledger: any[], bank: any[]) {
  const allRows = [
    ...ledger.map(r => ({ ...r, source: 'Ledger' })),
    ...bank.map(r => ({ ...r, source: 'Bank' })),
  ];

  const partyMap = new Map<string, any[]>();
  for (const row of allRows) {
    const party = row.party || 'Unknown';
    if (!partyMap.has(party)) partyMap.set(party, []);
    partyMap.get(party)!.push(row);
  }

  const reports: any[] = [];
  partyMap.forEach((rows, party) => {
    const ledgerRows = rows.filter(r => r.source === 'Ledger');
    const bankRows = rows.filter(r => r.source === 'Bank');
    const ledgerTotal = ledgerRows.reduce((s, r) => s + (r.type === 'DEBIT' ? r.amount : -r.amount), 0);
    const bankTotal = bankRows.reduce((s, r) => s + (r.type === 'DEBIT' ? r.amount : -r.amount), 0);

    reports.push({
      party,
      ledgerCount: ledgerRows.length,
      bankCount: bankRows.length,
      ledgerTotal: Math.round(ledgerTotal * 100) / 100,
      bankTotal: Math.round(bankTotal * 100) / 100,
      difference: Math.round((ledgerTotal - bankTotal) * 100) / 100,
      hasMismatch: Math.abs(ledgerTotal - bankTotal) > 1,
      rows,
    });
  });

  return reports.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

// ============================================================
// EXPORT TO EXCEL
// ============================================================
async function exportToExcel(data: any, fileName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = wb.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  const s = data.summary;
  const summaryRows = [
    { metric: 'Total Ledger Entries', value: s.totalLedger },
    { metric: 'Total Bank Entries', value: s.totalBank },
    { metric: 'Matched', value: s.matched },
    { metric: 'Unmatched Ledger', value: s.unmatchedLedger },
    { metric: 'Unmatched Bank', value: s.unmatchedBank },
    { metric: 'Amount Mismatches', value: s.amountMismatches },
    { metric: 'Match Rate', value: s.matchRate },
  ];
  summaryRows.forEach(r => summarySheet.addRow(r));

  // Matched Sheet
  if (data.matched?.length > 0) {
    const sheet = wb.addWorksheet('Matched');
    sheet.columns = [
      { header: 'Bank Date', key: 'bankDate', width: 14 },
      { header: 'Bank Description', key: 'bankDesc', width: 35 },
      { header: 'Bank Amount', key: 'bankAmount', width: 15 },
      { header: 'Ledger Date', key: 'ledgerDate', width: 14 },
      { header: 'Ledger Description', key: 'ledgerDesc', width: 35 },
      { header: 'Ledger Amount', key: 'ledgerAmount', width: 15 },
      { header: 'Confidence', key: 'confidence', width: 12 },
      { header: 'Amount Diff', key: 'diff', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };

    for (const m of data.matched) {
      const row = sheet.addRow({
        bankDate: m.bank.date,
        bankDesc: m.bank.description,
        bankAmount: m.bank.amount,
        ledgerDate: m.ledger.date,
        ledgerDesc: m.ledger.description,
        ledgerAmount: m.ledger.amount,
        confidence: m.confidence + '%',
        diff: m.amountDiff || 0,
      });
      if (m.amountDiff) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      }
    }
  }

  // Unmatched Bank Sheet
  if (data.unmatchedBank?.length > 0) {
    const sheet = wb.addWorksheet('Unmatched Bank');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Party', key: 'party', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    for (const u of data.unmatchedBank) {
      const row = sheet.addRow({ date: u.date, description: u.description, amount: u.amount, party: u.party, status: 'UNMATCHED' });
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    }
  }

  // Unmatched Ledger Sheet
  if (data.unmatchedLedger?.length > 0) {
    const sheet = wb.addWorksheet('Unmatched Ledger');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Party', key: 'party', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };

    for (const u of data.unmatchedLedger) {
      const row = sheet.addRow({ date: u.date, description: u.description, amount: u.amount, party: u.party, status: 'UNMATCHED' });
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
    }
  }

  // Party-wise Sheet
  if (data.partyWise?.length > 0) {
    const sheet = wb.addWorksheet('Party-wise Report');
    sheet.columns = [
      { header: 'Party / Customer / Supplier', key: 'party', width: 30 },
      { header: 'Ledger Entries', key: 'ledgerCount', width: 14 },
      { header: 'Bank Entries', key: 'bankCount', width: 14 },
      { header: 'Ledger Total', key: 'ledgerTotal', width: 15 },
      { header: 'Bank Total', key: 'bankTotal', width: 15 },
      { header: 'Difference', key: 'difference', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };

    for (const p of data.partyWise) {
      const row = sheet.addRow({
        party: p.party,
        ledgerCount: p.ledgerCount,
        bankCount: p.bankCount,
        ledgerTotal: p.ledgerTotal,
        bankTotal: p.bankTotal,
        difference: p.difference,
        status: p.hasMismatch ? 'MISMATCH' : 'OK',
      });
      if (p.hasMismatch) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        row.getCell('status').font = { bold: true, color: { argb: 'FFDC2626' } };
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// EXPORT TO PDF
// ============================================================
function exportToPDF(data: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const blue = '#2563EB';
    const red = '#DC2626';
    const green = '#16A34A';
    const orange = '#EA580C';

    // Title
    doc.fontSize(20).fillColor(blue).text('CA Copilot - File Comparison Report', { align: 'center' });
    doc.moveDown(0.5);

    // Summary
    doc.fontSize(14).fillColor('#000').text('Summary');
    doc.fontSize(10);
    const s = data.summary;
    doc.text(`Ledger Entries: ${s.totalLedger}  |  Bank Entries: ${s.totalBank}  |  Matched: ${s.matched}  |  Unmatched Ledger: ${s.unmatchedLedger}  |  Unmatched Bank: ${s.unmatchedBank}  |  Match Rate: ${s.matchRate}`);
    doc.moveDown(1);

    // Unmatched Bank
    if (data.unmatchedBank?.length > 0) {
      doc.fontSize(14).fillColor(red).text(`Unmatched Bank Entries (${data.unmatchedBank.length})`);
      doc.fontSize(8).fillColor('#000');
      for (const u of data.unmatchedBank.slice(0, 30)) {
        doc.text(`  ${u.date}  |  ${u.description?.slice(0, 50)}  |  ₹${u.amount.toLocaleString('en-IN')}  |  ${u.party || '-'}`);
      }
      doc.moveDown(1);
    }

    // Unmatched Ledger
    if (data.unmatchedLedger?.length > 0) {
      doc.fontSize(14).fillColor(orange).text(`Unmatched Ledger Entries (${data.unmatchedLedger.length})`);
      doc.fontSize(8).fillColor('#000');
      for (const u of data.unmatchedLedger.slice(0, 30)) {
        doc.text(`  ${u.date}  |  ${u.description?.slice(0, 50)}  |  ₹${u.amount.toLocaleString('en-IN')}  |  ${u.party || '-'}`);
      }
      doc.moveDown(1);
    }

    // Party-wise
    if (data.partyWise?.length > 0) {
      doc.fontSize(14).fillColor('#7C3AED').text('Party-wise Report');
      doc.fontSize(8).fillColor('#000');
      for (const p of data.partyWise.slice(0, 20)) {
        const status = p.hasMismatch ? ' [MISMATCH]' : '';
        doc.text(`  ${p.party}  |  Ledger: ₹${p.ledgerTotal.toLocaleString('en-IN')} (${p.ledgerCount})  |  Bank: ₹${p.bankTotal.toLocaleString('en-IN')} (${p.bankCount})  |  Diff: ₹${p.difference.toLocaleString('en-IN')}${status}`);
      }
    }

    doc.end();
  });
}

// ============================================================
// API: COMPARE FILES
// ============================================================
router.post('/compare', authenticate, upload.fields([
  { name: 'ledger', maxCount: 3 },
  { name: 'bank', maxCount: 3 },
]), async (req: AuthRequest, res: any) => {
  try {
    const files = req.files as any;
    const ledgerFiles = files?.ledger || [];
    const bankFiles = files?.bank || [];

    if (ledgerFiles.length === 0 && bankFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Upload at least one ledger or bank file' });
    }

    // Parse all ledger files
    let allLedger: any[] = [];
    for (const f of ledgerFiles) {
      const rows = parseFile(f.buffer, f.originalname);
      allLedger = allLedger.concat(mapFields(rows, 'ledger'));
    }

    // Parse all bank files
    let allBank: any[] = [];
    for (const f of bankFiles) {
      const rows = parseFile(f.buffer, f.originalname);
      allBank = allBank.concat(mapFields(rows, 'bank'));
    }

    // Compare
    const comparison = compareDatasets(allLedger, allBank);

    // Party-wise report
    const partyWise = partyWiseReport(allLedger, allBank);

    const summary = {
      totalLedger: allLedger.length,
      totalBank: allBank.length,
      matched: comparison.matched.length,
      unmatchedLedger: comparison.unmatchedLedger.length,
      unmatchedBank: comparison.unmatchedBank.length,
      amountMismatches: comparison.amountMismatches.length,
      matchRate: allBank.length > 0 ? ((comparison.matched.length / allBank.length) * 100).toFixed(1) + '%' : 'N/A',
      totalPartyWise: partyWise.length,
    };

    // Store for export
    const exportData = { summary, ...comparison, partyWise };

    res.json({
      success: true,
      data: {
        summary,
        matched: comparison.matched.slice(0, 100),
        unmatchedBank: comparison.unmatchedBank.slice(0, 100),
        unmatchedLedger: comparison.unmatchedLedger.slice(0, 100),
        amountMismatches: comparison.amountMismatches.slice(0, 50),
        partyWise: partyWise.slice(0, 50),
        recommendations: generateRecommendations(comparison, partyWise),
        _exportData: exportData,
      }
    });
  } catch (error: any) {
    console.error('File compare error:', error);
    res.status(500).json({ success: false, error: 'File comparison failed', details: error.message });
  }
});

// ============================================================
// API: EXPORT COMPARISON AS EXCEL
// ============================================================
router.post('/export/excel', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { exportData } = req.body;
    if (!exportData) return res.status(400).json({ success: false, error: 'No data to export' });

    const buffer = await exportToExcel(exportData, 'comparison');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ca-copilot-comparison-${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ success: false, error: 'Excel export failed', details: error.message });
  }
});

// ============================================================
// API: EXPORT COMPARISON AS PDF
// ============================================================
router.post('/export/pdf', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { exportData } = req.body;
    if (!exportData) return res.status(400).json({ success: false, error: 'No data to export' });

    const buffer = await exportToPDF(exportData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ca-copilot-comparison-${Date.now()}.pdf"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('PDF export error:', error);
    res.status(500).json({ success: false, error: 'PDF export failed', details: error.message });
  }
});

function generateRecommendations(comparison: any, partyWise: any[]): string[] {
  const recs: string[] = [];
  if (comparison.unmatchedBank.length > 0) recs.push(`${comparison.unmatchedBank.length} bank entries have no matching ledger entry. Verify against source documents.`);
  if (comparison.unmatchedLedger.length > 0) recs.push(`${comparison.unmatchedLedger.length} ledger entries have no matching bank entry. Check if recorded correctly.`);
  if (comparison.amountMismatches.length > 0) recs.push(`${comparison.amountMismatches.length} entries have amount differences. Investigate for rounding or posting errors.`);
  const mismatchedParties = partyWise.filter(p => p.hasMismatch);
  if (mismatchedParties.length > 0) recs.push(`${mismatchedParties.length} parties have balance mismatches: ${mismatchedParties.slice(0, 5).map(p => p.party).join(', ')}`);
  if (recs.length === 0) recs.push('All entries are reconciled. No issues found.');
  return recs;
}

export default router;
