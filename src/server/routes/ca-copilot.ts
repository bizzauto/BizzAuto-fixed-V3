import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================================
// BANK RECONCILIATION - Score-based matching like Python engine
// ============================================================

router.post('/bank-reconciliation/upload', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { statementData, accountName, period } = req.body;
    const businessId = req.user.businessId;

    if (!statementData || !Array.isArray(statementData)) {
      return res.status(400).json({ success: false, error: 'statementData array is required' });
    }

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        businessId,
        ...(period?.start && period?.end ? {
          date: { gte: new Date(period.start), lte: new Date(period.end) }
        } : {})
      },
      orderBy: { date: 'asc' }
    });

    const AMOUNT_TOLERANCE = 0.50;
    const DATE_TOLERANCE_DAYS = 3;
    const matched: any[] = [];
    const unmatchedBank: any[] = [];
    const matchedLedgerIds = new Set<string>();
    const duplicateGroups: any[][] = [];

    // Detect duplicates in bank statement
    const seen = new Map<string, any[]>();
    for (const txn of statementData) {
      const key = `${txn.amount}-${new Date(txn.date).toDateString()}-${(txn.reference || '').slice(0, 20).toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(txn);
    }
    seen.forEach((txns) => {
      if (txns.length > 1) duplicateGroups.push(txns);
    });

    for (const txn of statementData) {
      let bestMatch: any = null;
      let bestScore = 0;

      for (const le of ledgerEntries) {
        if (matchedLedgerIds.has(le.id)) continue;

        let score = 0;

        // Amount match (40% weight)
        const txnAmt = Math.abs(txn.amount);
        const leAmt = le.amount;
        if (Math.abs(txnAmt - leAmt) < 0.01) score += 0.4;
        else if (Math.abs(txnAmt - leAmt) <= AMOUNT_TOLERANCE) score += 0.3;

        // Date proximity (30% weight)
        if (le.date) {
          const daysDiff = Math.abs((new Date(txn.date).getTime() - new Date(le.date).getTime()) / 86400000);
          if (daysDiff === 0) score += 0.3;
          else if (daysDiff <= DATE_TOLERANCE_DAYS) score += 0.2;
          else if (daysDiff <= 7) score += 0.1;
        }

        // Description similarity (30% weight)
        if (txn.reference && le.description) {
          const txnWords = new Set(txn.reference.toLowerCase().split(/\s+/));
          const leWords = new Set(le.description.toLowerCase().split(/\s+/));
          const common = [...txnWords].filter(w => leWords.has(w as string));
          const total = new Set([...txnWords, ...leWords]);
          if (total.size > 0) score += 0.3 * (common.length / total.size);
        }

        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestMatch = le;
        }
      }

      if (bestMatch) {
        matched.push({ statement: txn, ledger: bestMatch, confidence: Math.round(bestScore * 100) });
        matchedLedgerIds.add(bestMatch.id);

        if (Math.abs(Math.abs(txn.amount) - bestMatch.amount) > AMOUNT_TOLERANCE) {
          matched[matched.length - 1].amountDiscrepancy = Math.abs(txn.amount) - bestMatch.amount;
        }
      } else {
        unmatchedBank.push({ statement: txn, reason: 'No matching ledger entry found' });
      }
    }

    const unmatchedLedger = ledgerEntries.filter(le => !matchedLedgerIds.has(le.id));

    // Generate recommendations
    const recommendations: string[] = [];
    if (unmatchedBank.length > 0) recommendations.push('Review unmatched bank entries - these may need to be recorded in the ledger.');
    if (matched.some(m => m.amountDiscrepancy)) recommendations.push('Investigate amount mismatches - check for rounding differences or posting errors.');
    if (duplicateGroups.length > 0) recommendations.push('Verify duplicate transactions - ensure they are not erroneously recorded twice.');
    if (unmatchedLedger.length > 0) recommendations.push('Review unmatched ledger entries - verify against source documents.');
    if (recommendations.length === 0) recommendations.push('All transactions are reconciled. No issues found.');

    res.json({
      success: true,
      data: {
        summary: {
          totalBankTransactions: statementData.length,
          totalLedgerEntries: ledgerEntries.length,
          matched: matched.length,
          unmatchedBank: unmatchedBank.length,
          unmatchedLedger: unmatchedLedger.length,
          duplicates: duplicateGroups.length,
          matchRate: statementData.length > 0 ? ((matched.length / statementData.length) * 100).toFixed(1) + '%' : '0%'
        },
        matched,
        unmatchedBank,
        unmatchedLedger: unmatchedLedger.map(le => ({ id: le.id, date: le.date, amount: le.amount, description: le.description, type: le.type })),
        duplicateGroups: duplicateGroups.map(g => ({ count: g.length, amount: g[0].amount, reference: g[0].reference, dates: g.map((t: any) => t.date) })),
        recommendations
      }
    });
  } catch (error: any) {
    console.error('Bank reconciliation error:', error);
    res.status(500).json({ success: false, error: 'Bank reconciliation failed', details: error.message });
  }
});

// ============================================================
// INVOICE MATCHING - Score-based like Python engine
// ============================================================

router.get('/invoice-matching', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    const where: any = { businessId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    } as any);

    const paid = invoices.filter((i: any) => i.status === 'PAID');
    const unpaid = invoices.filter((i: any) => i.status === 'UNPAID' || i.status === 'PENDING');
    const overdue = invoices.filter((i: any) => {
      if (i.status === 'PAID') return false;
      return new Date(i.createdAt) < new Date();
    });

    // Detect duplicates
    const invSeen = new Map<string, any[]>();
    for (const inv of invoices) {
      const key = `${(inv.invoiceNumber || '').toUpperCase()}-${inv.amount}`;
      if (!invSeen.has(key)) invSeen.set(key, []);
      invSeen.get(key)!.push(inv);
    }
    const duplicateGroups = [...invSeen.values()].filter(g => g.length > 1);

    const recommendations: string[] = [];
    if (overdue.length > 0) recommendations.push(`${overdue.length} invoices are overdue. Follow up with customers for payment.`);
    if (duplicateGroups.length > 0) recommendations.push('Duplicate invoices detected - verify and remove if erroneous.');
    if (unpaid.length > invoices.length * 0.5 && invoices.length > 5) recommendations.push('High ratio of unpaid invoices. Review credit policies.');
    if (recommendations.length === 0) recommendations.push('All invoices are matched and up to date.');

    res.json({
      success: true,
      data: {
        summary: { total: invoices.length, paid: paid.length, unpaid: unpaid.length, overdue: overdue.length, duplicates: duplicateGroups.length },
        paid: paid.slice(0, 50).map((i: any) => ({ id: i.id, number: i.invoiceNumber, amount: i.amount, paidAt: i.paidAt })),
        unpaid: unpaid.slice(0, 50).map((i: any) => ({ id: i.id, number: i.invoiceNumber, amount: i.amount, createdAt: i.createdAt })),
        overdue: overdue.map((i: any) => ({ id: i.id, number: i.invoiceNumber, amount: i.amount, createdAt: i.createdAt, daysOverdue: Math.ceil((Date.now() - new Date(i.createdAt!).getTime()) / 86400000) })),
        duplicates: duplicateGroups.map(g => ({ count: g.length, number: g[0].invoiceNumber, amount: g[0].amount })),
        recommendations
      }
    });
  } catch (error: any) {
    console.error('Invoice matching error:', error);
    res.status(500).json({ success: false, error: 'Invoice matching failed', details: error.message });
  }
});

// ============================================================
// GST RECONCILIATION - GSTR-1 / GSTR-2B style
// ============================================================

router.post('/gst-reconciliation', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { period, gstReturns } = req.body;

    const startDate = period?.start ? new Date(period.start) : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const endDate = period?.end ? new Date(period.end) : new Date();

    const invoices = await prisma.invoice.findMany({
      where: { businessId, createdAt: { gte: startDate, lte: endDate } },
    } as any);

    const totalSales = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalTaxCollected = invoices.reduce((sum, i) => sum + ((i.amount || 0) * 0.18), 0);
    const cgst = totalSales * 0.09;
    const sgst = totalSales * 0.09;
    const igst = totalSales * 0.18;

    const bookData = {
      totalSales,
      totalInvoices: invoices.length,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalTax: Math.round(totalTaxCollected * 100) / 100
    };

    const discrepancies: any[] = [];
    const recommendations: string[] = [];

    if (gstReturns && gstReturns.totalSales) {
      if (Math.abs((gstReturns.totalSales || 0) - bookData.totalSales) > 1) {
        const diff = bookData.totalSales - (gstReturns.totalSales || 0);
        discrepancies.push({ field: 'Total Sales', bookValue: bookData.totalSales, returnValue: gstReturns.totalSales, difference: diff, severity: Math.abs(diff) > 10000 ? 'HIGH' : 'MEDIUM' });
      }
      if (Math.abs((gstReturns.cgst || 0) - bookData.cgst) > 1) {
        discrepancies.push({ field: 'CGST', bookValue: bookData.cgst, returnValue: gstReturns.cgst, difference: bookData.cgst - (gstReturns.cgst || 0), severity: 'MEDIUM' });
      }
      if (Math.abs((gstReturns.sgst || 0) - bookData.sgst) > 1) {
        discrepancies.push({ field: 'SGST', bookValue: bookData.sgst, returnValue: gstReturns.sgst, difference: bookData.sgst - (gstReturns.sgst || 0), severity: 'MEDIUM' });
      }
      if (gstReturns.igst && Math.abs(gstReturns.igst - bookData.igst) > 1) {
        discrepancies.push({ field: 'IGST', bookValue: bookData.igst, returnValue: gstReturns.igst, difference: bookData.igst - gstReturns.igst, severity: 'MEDIUM' });
      }
    }

    if (discrepancies.length > 0) {
      recommendations.push('Tax rate discrepancies found. Verify HSN codes and applicable rates.');
      recommendations.push('Recheck tax calculations before filing returns.');
    }
    if (!gstReturns || Object.values(gstReturns).every(v => !v)) {
      recommendations.push('Enter GST return data to compare against books.');
    }
    if (recommendations.length === 0) {
      recommendations.push('GST reconciliation complete. All records match.');
    }

    res.json({
      success: true,
      data: {
        bookData,
        gstReturns: gstReturns || null,
        discrepancies,
        isReconciled: discrepancies.length === 0 && gstReturns,
        period: { start: startDate, end: endDate },
        recommendations
      }
    });
  } catch (error: any) {
    console.error('GST reconciliation error:', error);
    res.status(500).json({ success: false, error: 'GST reconciliation failed', details: error.message });
  }
});

// ============================================================
// LEDGER SCRUTINY - AI-powered like Python engine
// ============================================================

router.get('/ledger-scrutiny', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    const where: any = { businessId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.ledgerEntry.findMany({ where, orderBy: { date: 'asc' } });

    const HIGH_VALUE_THRESHOLD = 100000;
    const ROUND_THRESHOLD = 3;
    const REPEATED_THRESHOLD = 3;
    const findings: any[] = [];
    let riskScore = 0;

    // 1. Duplicate detection
    const amountDateMap = new Map<string, any[]>();
    for (const e of entries) {
      const key = `${e.amount}-${new Date(e.date).toDateString()}-${e.type}`;
      if (!amountDateMap.has(key)) amountDateMap.set(key, []);
      amountDateMap.get(key)!.push(e);
    }
    amountDateMap.forEach((dupes) => {
      if (dupes.length > 1) {
        findings.push({ type: 'DUPLICATE', severity: 'HIGH', message: `${dupes.length} duplicate entries of ₹${dupes[0].amount} on same date`, entryIds: dupes.map(d => d.id), amount: dupes[0].amount });
        riskScore += dupes.length * 2;
      }
    });

    // 2. High value entries
    for (const e of entries) {
      if (e.amount >= HIGH_VALUE_THRESHOLD) {
        findings.push({ type: 'HIGH_VALUE', severity: 'MEDIUM', message: `High value entry: ₹${e.amount.toLocaleString('en-IN')}`, entryId: e.id, amount: e.amount, description: e.description });
        riskScore += 1;
      }
    }

    // 3. Round amount detection
    const roundAmounts = entries.filter(e => {
      const amt = Math.abs(e.amount);
      if (amt < 1000) return false;
      const trailingZeros = (amt.toString().match(/0+$/) || [''])[0].length;
      return trailingZeros >= ROUND_THRESHOLD;
    });
    if (roundAmounts.length > 0) {
      findings.push({ type: 'ROUND_AMOUNTS', severity: 'LOW', message: `${roundAmounts.length} round-amount entries detected`, count: roundAmounts.length, percentage: ((roundAmounts.length / (entries.length || 1)) * 100).toFixed(0) });
      riskScore += roundAmounts.length * 0.5;
    }

    // 4. Repeated descriptions
    const descGroups = new Map<string, any[]>();
    for (const e of entries) {
      const key = (e.description || '').trim().toLowerCase().slice(0, 50);
      if (key.length < 3) continue;
      if (!descGroups.has(key)) descGroups.set(key, []);
      descGroups.get(key)!.push(e);
    }
    descGroups.forEach((group, desc) => {
      if (group.length >= REPEATED_THRESHOLD) {
        findings.push({ type: 'REPEATED_ENTRY', severity: 'MEDIUM', message: `"${desc}" appears ${group.length} times`, description: desc, count: group.length, totalAmount: group.reduce((s, e) => s + e.amount, 0) });
        riskScore += 1.5;
      }
    });

    // 5. Backdated entries
    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].date).getTime();
      const currDate = new Date(entries[i].date).getTime();
      if (prevDate > currDate) {
        findings.push({ type: 'BACKDATED', severity: 'MEDIUM', message: `Entry backdated: ₹${entries[i].amount}`, entryId: entries[i].id, date: entries[i].date });
        riskScore += 1;
      }
    }

    // 6. Missing descriptions
    const noDesc = entries.filter(e => !e.description || e.description.trim().length < 3);
    if (noDesc.length > 0) {
      findings.push({ type: 'MISSING_DESCRIPTION', severity: 'LOW', message: `${noDesc.length} entries have missing/short descriptions`, count: noDesc.length });
      riskScore += noDesc.length * 0.2;
    }

    // 7. Suspicious keywords
    const suspiciousKeywords = ['cash', 'petty', 'misc', 'adjustment', 'journal', 'suspense'];
    const suspicious = entries.filter(e => suspiciousKeywords.some(w => (e.description || '').toLowerCase().includes(w)));
    if (suspicious.length > 0) {
      findings.push({ type: 'SUSPICIOUS_KEYWORDS', severity: 'MEDIUM', message: `${suspicious.length} entries with suspicious keywords`, count: suspicious.length });
      riskScore += suspicious.length * 1;
    }

    riskScore = Math.min(100, riskScore);

    const totalIncome = entries.filter(e => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0);

    const recommendations: string[] = [];
    if (riskScore > 60) recommendations.push('HIGH RISK: Immediate detailed audit recommended.');
    else if (riskScore > 30) recommendations.push('MEDIUM RISK: Enhanced scrutiny recommended.');
    if (findings.some(f => f.type === 'SUSPICIOUS_KEYWORDS')) recommendations.push('Investigate suspicious transactions with supporting documentation.');
    if (findings.some(f => f.type === 'HIGH_VALUE')) recommendations.push('Verify high-value entries with corresponding invoices/agreements.');
    if (findings.some(f => f.type === 'ROUND_AMOUNTS')) recommendations.push('Multiple round-amount entries may indicate estimation or manipulation.');
    if (findings.some(f => f.type === 'REPEATED_ENTRY')) recommendations.push('Repeated entries detected - verify each occurrence is legitimate.');
    if (recommendations.length === 0) recommendations.push('Ledger scrutiny complete. No significant issues found.');

    res.json({
      success: true,
      data: {
        summary: {
          totalEntries: entries.length,
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          anomaliesFound: findings.length,
          highSeverity: findings.filter(f => f.severity === 'HIGH').length,
          mediumSeverity: findings.filter(f => f.severity === 'MEDIUM').length,
          lowSeverity: findings.filter(f => f.severity === 'LOW').length,
          riskScore: Math.round(riskScore)
        },
        findings,
        period: { start: entries[0]?.date, end: entries[entries.length - 1]?.date },
        recommendations
      }
    });
  } catch (error: any) {
    console.error('Ledger scrutiny error:', error);
    res.status(500).json({ success: false, error: 'Ledger scrutiny failed', details: error.message });
  }
});

// ============================================================
// AI AUDIT ASSISTANT
// ============================================================

router.post('/ai-audit/query', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { businessId },
      orderBy: { date: 'desc' },
      take: 500
    });

    const invoices = await prisma.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    } as any);

    const totalIncome = entries.filter(e => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0);
    const paidInvoices = invoices.filter(i => i.status === 'PAID');
    const unpaidInvoices = invoices.filter(i => i.status !== 'PAID');

    const q = query.toLowerCase();
    let answer = '';

    if (q.includes('income') || q.includes('revenue') || q.includes('earnings')) {
      const incomeEntries = entries.filter(e => e.type === 'INCOME');
      answer = `Total income: ₹${totalIncome.toLocaleString('en-IN')} from ${incomeEntries.length} entries. Average per entry: ₹${(totalIncome / (incomeEntries.length || 1)).toFixed(0)}.`;
      const monthlyIncome = incomeEntries.reduce((acc, e) => { const m = new Date(e.date).toISOString().slice(0, 7); acc[m] = (acc[m] || 0) + e.amount; return acc; }, {} as Record<string, number>);
      const months = Object.entries(monthlyIncome).sort().slice(-3);
      if (months.length > 0) answer += ` Last 3 months: ${months.map(([m, v]) => `${m}: ₹${v.toLocaleString('en-IN')}`).join(', ')}.`;
    } else if (q.includes('expense') || q.includes('cost') || q.includes('spending')) {
      const expenseEntries = entries.filter(e => e.type === 'EXPENSE');
      answer = `Total expenses: ₹${totalExpenses.toLocaleString('en-IN')} from ${expenseEntries.length} entries. Expense ratio: ${((totalExpenses / (totalIncome || 1)) * 100).toFixed(1)}% of income.`;
      const topCats = expenseEntries.reduce((acc, e) => { const c = e.category || 'Uncategorized'; acc[c] = (acc[c] || 0) + e.amount; return acc; }, {} as Record<string, number>);
      const cats = Object.entries(topCats).sort(([, a], [, b]) => b - a).slice(0, 5);
      if (cats.length > 0) answer += ` Top categories: ${cats.map(([c, v]) => `${c}: ₹${v.toLocaleString('en-IN')}`).join(', ')}.`;
    } else if (q.includes('unpaid') || q.includes('pending') || q.includes('receivable')) {
      const total = unpaidInvoices.reduce((s, i) => s + (i.amount || 0), 0);
      answer = `${unpaidInvoices.length} unpaid invoices worth ₹${total.toLocaleString('en-IN')}. Paid: ${paidInvoices.length} invoices worth ₹${paidInvoices.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString('en-IN')}.`;
    } else if (q.includes('profit') || q.includes('loss') || q.includes('net') || q.includes('balance')) {
      const net = totalIncome - totalExpenses;
      answer = `Net ${net >= 0 ? 'profit' : 'loss'}: ₹${Math.abs(net).toLocaleString('en-IN')}. Income: ₹${totalIncome.toLocaleString('en-IN')}, Expenses: ₹${totalExpenses.toLocaleString('en-IN')}.`;
    } else if (q.includes('overdue') || q.includes('late')) {
      const overdue = unpaidInvoices.filter((i: any) => i.createdAt && new Date(i.createdAt) < new Date());
      const total = overdue.reduce((s: number, i: any) => s + (i.amount || 0), 0);
      answer = `${overdue.length} overdue invoices worth ₹${total.toLocaleString('en-IN')}.`;
    } else if (q.includes('summary') || q.includes('overview') || q.includes('snapshot')) {
      answer = `Business Summary:\n• Total Income: ₹${totalIncome.toLocaleString('en-IN')}\n• Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}\n• Net Balance: ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}\n• Ledger Entries: ${entries.length}\n• Invoices: ${invoices.length} (${paidInvoices.length} paid, ${unpaidInvoices.length} unpaid)`;
    } else {
      answer = `Based on ${entries.length} ledger entries and ${invoices.length} invoices: Total Income ₹${totalIncome.toLocaleString('en-IN')}, Total Expenses ₹${totalExpenses.toLocaleString('en-IN')}, Net ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}. Ask about income, expenses, unpaid invoices, profit/loss, or overdue items for specific details.`;
    }

    res.json({ success: true, data: { query, answer, context: { totalIncome, totalExpenses, entries: entries.length, invoices: invoices.length } } });
  } catch (error: any) {
    console.error('AI audit query error:', error);
    res.status(500).json({ success: false, error: 'AI audit query failed', details: error.message });
  }
});

// ============================================================
// CA REPORTS
// ============================================================

router.get('/reports', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    const where: any = { businessId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.ledgerEntry.findMany({ where, orderBy: { date: 'asc' } });
    const invoices = await prisma.invoice.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } } as any);

    const totalIncome = entries.filter(e => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0);

    const categoryBreakdown = entries.reduce((acc, e) => {
      const cat = e.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { income: 0, expense: 0 };
      if (e.type === 'INCOME') acc[cat].income += e.amount;
      else acc[cat].expense += e.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    const monthlyData = entries.reduce((acc, e) => {
      const month = new Date(e.date).toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      if (e.type === 'INCOME') acc[month].income += e.amount;
      else acc[month].expense += e.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    const gstData = {
      totalSales: totalIncome,
      cgst: Math.round(totalIncome * 0.09 * 100) / 100,
      sgst: Math.round(totalIncome * 0.09 * 100) / 100,
      igst: Math.round(totalIncome * 0.18 * 100) / 100,
      totalTax: Math.round(totalIncome * 0.18 * 100) / 100
    };

    res.json({
      success: true,
      data: {
        period: { start: where.date?.gte || null, end: where.date?.lte || null },
        summary: {
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          totalEntries: entries.length,
          totalInvoices: invoices.length,
          profitMargin: totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) + '%' : '0%'
        },
        categoryBreakdown,
        monthlyData,
        gstSummary: gstData,
        topExpenses: entries.filter(e => e.type === 'EXPENSE').sort((a, b) => b.amount - a.amount).slice(0, 10).map(e => ({ date: e.date, amount: e.amount, description: e.description, category: e.category })),
        topIncome: entries.filter(e => e.type === 'INCOME').sort((a, b) => b.amount - a.amount).slice(0, 10).map(e => ({ date: e.date, amount: e.amount, description: e.description, category: e.category })),
        invoiceSummary: {
          total: invoices.length,
          paid: invoices.filter(i => i.status === 'PAID').length,
          unpaid: invoices.filter(i => i.status !== 'PAID').length,
          totalAmount: invoices.reduce((s, i) => s + (i.amount || 0), 0),
          overdueAmount: invoices.filter((i: any) => i.status !== 'PAID' && new Date(i.createdAt) < new Date()).reduce((s: number, i: any) => s + (i.amount || 0), 0)
        }
      }
    });
  } catch (error: any) {
    console.error('CA reports error:', error);
    res.status(500).json({ success: false, error: 'CA reports generation failed', details: error.message });
  }
});

export default router;
