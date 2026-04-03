export interface ParsedTransaction {
  amount: number;
  type: 'credit' | 'debit';
  bank: string;
  accountLast4: string;
  date: string;
  balance?: number;
  reference?: string;
  merchant?: string;
  rawMessage: string;
}

// ─── Amount capture helpers ─────────────────────────────────────────────────
// Matches "Rs.", "Rs", "INR", "₹" followed by an amount like 1,234.56
const AMT = `(?:Rs\\.?|INR|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)`;

// ─── Account extraction helpers ──────────────────────────────────────────────
// Matches last 4 digits from masked account strings like XXXXXXXX0206 or XX5678
const ACCT_SUFFIX = `(?:[Xx*]+|\\*+)(\\d{4})`;

// ─── Bank-specific & generic patterns  ──────────────────────────────────────
// Patterns are tested in order; first match wins.
// Each entry: { regex, type, amtGroup, acctGroup }
const PATTERNS: Array<{
  regex: RegExp;
  type: 'credit' | 'debit';
  /** capture group index (1-based) for the amount */
  amtGroup: number;
  /** capture group index (1-based) for last-4 digits of sender/receiver account, or 0 */
  acctGroup: number;
}> = [
  // ── SBI / Generic UPI transfer: "Your a/c no. XXXXXXXX0206 is debited for Rs.600.00 on ..." ──
  {
    regex: new RegExp(
      `a\\/c\\s+no\\.?\\s*(?:[Xx*]+)(\\d{4})\\s+is\\s+debited\\s+for\\s+${AMT}`,
      'i'
    ),
    type: 'debit',
    amtGroup: 2,
    acctGroup: 1,
  },
  // ── SBI / Generic UPI transfer: "Your a/c no. XXXXXXXX0206 is credited for Rs.600.00 on ..." ──
  {
    regex: new RegExp(
      `a\\/c\\s+no\\.?\\s*(?:[Xx*]+)(\\d{4})\\s+is\\s+credited\\s+(?:for|with|by)\\s+${AMT}`,
      'i'
    ),
    type: 'credit',
    amtGroup: 2,
    acctGroup: 1,
  },
  // ── HDFC / ICICI: "Rs.5000.00 debited from A/c XX1234" ──
  {
    regex: new RegExp(`${AMT}\\s+debited\\s+from\\s+(?:A\\/c|account|a\\/c)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 2,
  },
  // ── HDFC / ICICI: "Rs.5000.00 credited to A/c XX1234" ──
  {
    regex: new RegExp(`${AMT}\\s+credited\\s+to\\s+(?:your\\s+)?(?:A\\/c|account|a\\/c)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 2,
  },
  // ── Generic debited/credited amount first, no account ──
  {
    regex: new RegExp(`${AMT}\\s+(?:has\\s+been\\s+|is\\s+)?debited`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },
  {
    regex: new RegExp(`${AMT}\\s+(?:has\\s+been\\s+|is\\s+)?credited`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },
  // ── "debited by Rs." / "credited by Rs." ──
  {
    regex: new RegExp(`debited\\s+(?:by\\s+)?${AMT}`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },
  {
    regex: new RegExp(`credited\\s+(?:by\\s+|with\\s+)?${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },
  // ── Kotak / Axis: "spent Rs. / paid Rs." ──
  {
    regex: new RegExp(`${AMT}\\s+(?:spent|paid|transferred|sent)\\b`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },
  // ── "received Rs." ──
  {
    regex: new RegExp(`(?:received|deposited)\\s+${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },
  // ── POS/ATM withdrawal ──
  {
    regex: new RegExp(`${AMT}\\s+(?:withdrawn|withdrawal)`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },
  // ── "debit of Rs." / "credit of Rs." ──
  {
    regex: new RegExp(`debit\\s+of\\s+${AMT}`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },
  {
    regex: new RegExp(`credit\\s+of\\s+${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },
];

// ─── Supporting regexes ──────────────────────────────────────────────────────
const BALANCE_REGEX =
  /(?:Avl?\.?\s*Bal(?:ance)?|Available\s*Bal(?:ance)?|Bal(?:ance)?\s*(?:is|:))\s*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

const DATE_REGEXES = [
  // DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY
  /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/,
  // "27-Mar-26" or "27 Mar 2026"
  /\b(\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[-\s]\d{2,4})\b/i,
  // "Mar 27, 2026"
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})\b/i,
];

// UPI Ref, IMPS Ref, Txn ID, Ref No, etc.
const UPI_REF_REGEX =
  /(?:UPI\s*Ref(?:\s*No\.?\s*)?|IMPS\s*Ref(?:\s*No\.?\s*)?|Ref(?:\s*No\.?\s*)?:?\s*|Txn\s*(?:ID|No)?\s*:?\s*)([\w\d]{6,})/i;

// Merchant name after "at " (POS transactions)
const MERCHANT_REGEX = /(?:at|for)\s+([A-Z][A-Z0-9 &\-_.]{2,30}?)(?:\s+on|\s+dated|\s+using|\s*\.|\s*-SB|\s*$)/i;

// ─── Bank sender IDs ─────────────────────────────────────────────────────────
const BANK_KEYWORDS: Record<string, string> = {
  SBIINB: 'State Bank of India',
  SBICRD: 'State Bank of India',
  SBIPSG: 'State Bank of India',
  SBIUPI: 'State Bank of India',
  'VM-SBI': 'State Bank of India',
  'AD-SBI': 'State Bank of India',
  'BZ-SBI': 'State Bank of India',
  SBI: 'State Bank of India',
  HDFCBK: 'HDFC Bank',
  HDFCB: 'HDFC Bank',
  HDFC: 'HDFC Bank',
  ICICIB: 'ICICI Bank',
  ICICI: 'ICICI Bank',
  AXISBK: 'Axis Bank',
  AXISB: 'Axis Bank',
  AXIS: 'Axis Bank',
  KOTAKB: 'Kotak Mahindra Bank',
  KOTAK: 'Kotak Mahindra Bank',
  PNBSMS: 'Punjab National Bank',
  PNB: 'Punjab National Bank',
  BOBSMS: 'Bank of Baroda',
  BOB: 'Bank of Baroda',
  IOBSMS: 'Indian Overseas Bank',
  IOB: 'Indian Overseas Bank',
  CNRBNK: 'Canara Bank',
  CANARA: 'Canara Bank',
  UNBNK: 'Union Bank',
  UNION: 'Union Bank',
  IDBIB: 'IDBI Bank',
  IDBI: 'IDBI Bank',
  YESBK: 'Yes Bank',
  YES: 'Yes Bank',
  INDBNK: 'IndusInd Bank',
  INDUSIND: 'IndusInd Bank',
  FEDBK: 'Federal Bank',
  FEDERAL: 'Federal Bank',
  BOISMS: 'Bank of India',
  BOI: 'Bank of India',
  CENTBK: 'Central Bank of India',
  CENTRAL: 'Central Bank of India',
  SBMSMS: 'State Bank of Mysore',
  RBLBK: 'RBL Bank',
  RBL: 'RBL Bank',
  DCBBNK: 'DCB Bank',
  DCB: 'DCB Bank',
  PAYTM: 'Paytm Payments Bank',
  AIRTEL: 'Airtel Payments Bank',
  FINO: 'Fino Payments Bank',
  JIOFINANCE: 'Jio Finance',
  NSDLJI: 'NSDL Payments Bank',
};

function detectBank(message: string): string {
  const upper = message.toUpperCase();
  // Check longer/more-specific keys first to avoid partial matches
  const sorted = Object.entries(BANK_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, name] of sorted) {
    if (upper.includes(key)) return name;
  }
  return 'Unknown Bank';
}

/**
 * Normalize a raw date string to YYYY-MM-DD.
 * Handles DD-MM-YYYY, DD/MM/YYYY, DD-Mon-YY, DD Mon YYYY formats.
 */
function normalizeDate(raw: string): string {
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Try DD-Mon-YY or DD-Mon-YYYY (e.g. "16-03-2026" OR "27-Mar-26")
  const monMatch = raw.match(/^(\d{1,2})[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[-\s](\d{2,4})$/i);
  if (monMatch) {
    const day = monMatch[1].padStart(2, '0');
    const mon = MONTHS[monMatch[2].toLowerCase().slice(0, 3)];
    let year = monMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${mon}-${day}`;
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const numMatch = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, '0');
    const mon = numMatch[2].padStart(2, '0');
    let year = numMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${mon}-${day}`;
  }

  // Try Mon DD, YYYY
  const monFirstMatch = raw.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monFirstMatch) {
    const mon = MONTHS[monFirstMatch[1].toLowerCase().slice(0, 3)];
    const day = monFirstMatch[2].padStart(2, '0');
    return `${monFirstMatch[3]}-${mon}-${day}`;
  }

  // Fallback: try JS Date
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { /* ignore */ }

  return new Date().toISOString().split('T')[0];
}

export function parseBankSMS(message: string): ParsedTransaction | null {
  for (const pattern of PATTERNS) {
    const match = message.match(pattern.regex);
    if (!match) continue;

    const rawAmt = match[pattern.amtGroup];
    if (!rawAmt) continue;
    const amount = parseFloat(rawAmt.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    // Account last 4 digits
    let accountLast4 = '';
    if (pattern.acctGroup > 0 && match[pattern.acctGroup]) {
      accountLast4 = match[pattern.acctGroup];
    } else {
      // Try to find any masked account in the message
      const acctMatch = message.match(new RegExp(ACCT_SUFFIX, 'i'));
      if (acctMatch) accountLast4 = acctMatch[1];
    }

    const bank = detectBank(message);

    // Date extraction
    let date = new Date().toISOString().split('T')[0];
    for (const dr of DATE_REGEXES) {
      const dm = message.match(dr);
      if (dm) {
        date = normalizeDate(dm[1] ?? dm[0]);
        break;
      }
    }

    // Balance
    let balance: number | undefined;
    const balMatch = message.match(BALANCE_REGEX);
    if (balMatch) {
      balance = parseFloat(balMatch[1].replace(/,/g, ''));
    }

    // Reference
    let reference: string | undefined;
    const refMatch = message.match(UPI_REF_REGEX);
    if (refMatch) reference = refMatch[1];

    // Merchant (POS)
    let merchant: string | undefined;
    const merMatch = message.match(MERCHANT_REGEX);
    if (merMatch) merchant = merMatch[1].trim();

    return {
      amount,
      type: pattern.type,
      bank,
      accountLast4,
      date,
      balance,
      reference,
      merchant,
      rawMessage: message,
    };
  }
  return null;
}

/**
 * Split a multi-SMS blob and parse each one.
 * Supports blank-line separated, numbered (1. 2. 3.) and single messages.
 */
export function parseMultipleSMS(text: string): ParsedTransaction[] {
  // Split on blank lines OR numbered prefixes like "1." at start of line
  const messages = text
    .split(/\n{2,}|\r\n{2,}|(?=\n\d+\.\s)/)
    .map(m => m.replace(/^\d+\.\s*/, '').trim())
    .filter(m => m.length > 10);

  // Also try the whole text as a single message if splitting finds nothing
  const toTry = messages.length > 0 ? messages : [text.trim()];

  const results: ParsedTransaction[] = [];
  for (const msg of toTry) {
    const parsed = parseBankSMS(msg);
    if (parsed) results.push(parsed);
  }
  return results;
}
