import { api, Expense } from './api';

export interface ReconciliationMatch {
  expense: Expense;
  scanId: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'suggested';
}

export async function runReconciliationAudit() {
  const [expensesRes, scansRes] = await Promise.all([
    api.getExpenses(),
    api.getScans() // Assuming this exists in local storage
  ]);

  const expenses = expensesRes.expenses || [];
  const scans = (scansRes as any).scans || [];

  const matches: ReconciliationMatch[] = [];
  const unverified: Expense[] = [];

  expenses.forEach((expense: Expense) => {
    // If expense already has a receiptImage, it is verified
    if (expense.receiptImage) {
      // Find the corresponding scan if possible to link metadata
      return;
    }

    // Try to find a match in the loose Scans buffer
    let bestMatch: any = null;
    let maxConfidence = 0;

    scans.forEach((scan: any) => {
      let confidence = 0;
      
      // Rule 1: Amount Match (High Weight)
      if (Math.abs(scan.amount - expense.amount) < 0.01) {
        confidence += 70;
      }

      // Rule 2: Date Proximity (Medium Weight)
      const scanDate = new Date(scan.date).toDateString();
      const expDate = new Date(expense.date).toDateString();
      if (scanDate === expDate) {
        confidence += 20;
      }

      // Rule 3: Merchant fuzzy match
      const scanDesc = (scan.description || '').toLowerCase();
      const expDesc = (expense.description || '').toLowerCase();
      if (scanDesc && expDesc && (scanDesc.includes(expDesc) || expDesc.includes(scanDesc))) {
        confidence += 10;
      }

      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestMatch = scan;
      }
    });

    if (maxConfidence >= 70) {
      matches.push({
        expense,
        scanId: bestMatch.id,
        confidence: maxConfidence,
        matchType: maxConfidence >= 90 ? 'exact' : 'partial'
      });
    } else {
      unverified.push(expense);
    }
  });

  return { matches, unverified };
}
