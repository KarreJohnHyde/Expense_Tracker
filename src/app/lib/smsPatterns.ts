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
// Amount-first without currency prefix (used after "of" or bare numbers)
const AMT_BARE = `([\\d,]+(?:\\.\\d{1,2})?)`;

// ─── Account extraction helpers ───────────────────────────────────────────────
// Masked account with X/x/* prefix: XXXXXXXX1234, XX1234, **1234
const ACCT_SUFFIX = `(?:[Xx*]{2,}|XX|xx)(\\d{4})`;


// ─── Bank-specific & generic patterns ─────────────────────────────────────────
// Patterns tested in order; first match wins.
const PATTERNS: Array<{
  regex: RegExp;
  type: 'credit' | 'debit';
  /** 1-based capture group index for amount */
  amtGroup: number;
  /** 1-based capture group index for last-4 account digits; 0 = not present */
  acctGroup: number;
  label?: string; // for debug
}> = [

  // ══════════════════════════════════════════════════════════════════
  //  DEBIT — account-embedded patterns (most specific first)
  // ══════════════════════════════════════════════════════════════════

  // SBI: "Your a/c no. XXXXXXXX0206 is debited for Rs.600.00"
  {
    label: 'SBI a/c debited',
    regex: new RegExp(
      `a\\/c\\s+no\\.?\\s*(?:[Xx*]+)(\\d{4})\\s+is\\s+debited\\s+(?:for\\s+)?${AMT}`,
      'i'
    ),
    type: 'debit',
    amtGroup: 2,
    acctGroup: 1,
  },

  // HDFC/ICICI/Axis: "Rs.5000 debited from A/c XX1234" OR "A/c XX1234 debited Rs.5000"
  {
    label: 'Amount debited from A/c',
    regex: new RegExp(
      `${AMT}\\s+debited\\s+from\\s+(?:your\\s+)?(?:A\\/c|account|a\\/c|acct|card)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // "A/c XX1234 debited Rs.5000"
  {
    label: 'A/c debited amount',
    regex: new RegExp(
      `(?:A\\/c|account|a\\/c|acct)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})\\s+(?:is\\s+|has\\s+been\\s+)?debited\\s+(?:with\\s+|for\\s+|by\\s+)?${AMT}`,
      'i'
    ),
    type: 'debit',
    amtGroup: 2,
    acctGroup: 1,
  },

  // Kotak/Yes: "Your card ending 1234 was used for Rs.500"
  {
    label: 'Card used for amount',
    regex: new RegExp(
      `(?:card|credit card|debit card)\\s+(?:ending\\s+|no\\.?\\s*)?(?:[Xx*]*)(\\d{4})\\s+(?:was\\s+|is\\s+)?(?:used|charged)\\s+(?:for\\s+|at\\s+)?${AMT}`,
      'i'
    ),
    type: 'debit',
    amtGroup: 2,
    acctGroup: 1,
  },

  // PNB/BOB/Canara: "INR 500.00 debited from acct XX1234"
  {
    label: 'INR debited from acct',
    regex: new RegExp(
      `INR\\s+${AMT_BARE}\\s+(?:has\\s+been\\s+|is\\s+)?debited\\s+(?:from\\s+)?(?:your\\s+)?(?:a\\/c|account|acct|card)?\\s*(?:[Xx*]*)(\\d{4})`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // IndusInd / Federal: "Debit of Rs.500 from A/c XX1234"
  {
    label: 'Debit of Rs from A/c',
    regex: new RegExp(
      `[Dd]ebit\\s+of\\s+${AMT}\\s+from\\s+(?:A\\/c|account|acct)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // RBL/DCB/Paytm: "payment of Rs.500 done from A/c XX1234"
  {
    label: 'Payment from A/c',
    regex: new RegExp(
      `payment\\s+of\\s+${AMT}\\s+(?:done\\s+|made\\s+)?from\\s+(?:your\\s+)?(?:A\\/c|account|acct|card)\\s*(?:no\\.?\\s*)?(?:[Xx*]*)(\\d{4})`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // Axis: "Rs.500 spent on your Axis Bank Card XX1234"
  {
    label: 'Spent on card',
    regex: new RegExp(
      `${AMT}\\s+(?:spent|used)\\s+(?:on\\s+)?(?:your\\s+)?(?:[\\w\\s]+\\s+)?(?:card|Card)\\s*(?:no\\.?\\s*)?(?:[Xx*]*)(\\d{4})`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // UPI debit with VPA/ref: "Rs.500 debited via UPI ... Ref 123456"
  {
    label: 'Debited via UPI',
    regex: new RegExp(
      `${AMT}\\s+(?:has\\s+been\\s+|is\\s+)?debited\\s+(?:from\\s+your\\s+a\\/c\\s+)?(?:via\\s+UPI|using\\s+UPI|through\\s+UPI)?`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // ══════════════════════════════════════════════════════════════════
  //  CREDIT — account-embedded patterns
  // ══════════════════════════════════════════════════════════════════

  // SBI: "Your a/c no. XXXXXXXX0206 is credited for/with Rs.600.00"
  {
    label: 'SBI a/c credited',
    regex: new RegExp(
      `a\\/c\\s+no\\.?\\s*(?:[Xx*]+)(\\d{4})\\s+is\\s+credited\\s+(?:for|with|by)\\s+${AMT}`,
      'i'
    ),
    type: 'credit',
    amtGroup: 2,
    acctGroup: 1,
  },

  // HDFC/ICICI: "Rs.5000 credited to A/c XX1234"
  {
    label: 'Amount credited to A/c',
    regex: new RegExp(
      `${AMT}\\s+credited\\s+(?:to|in|into)\\s+(?:your\\s+)?(?:A\\/c|account|a\\/c|acct)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})`,
      'i'
    ),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // "A/c XX1234 credited with Rs.5000"
  {
    label: 'A/c credited with amount',
    regex: new RegExp(
      `(?:A\\/c|account|a\\/c|acct)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})\\s+(?:is\\s+|has\\s+been\\s+)?credited\\s+(?:with\\s+|for\\s+|by\\s+)?${AMT}`,
      'i'
    ),
    type: 'credit',
    amtGroup: 2,
    acctGroup: 1,
  },

  // "INR 500.00 credited to acct XX1234"
  {
    label: 'INR credited to acct',
    regex: new RegExp(
      `INR\\s+${AMT_BARE}\\s+(?:has\\s+been\\s+|is\\s+)?credited\\s+(?:to\\s+|in\\s+)?(?:your\\s+)?(?:a\\/c|account|acct)?\\s*(?:[Xx*]*)(\\d{4})`,
      'i'
    ),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // "Credit of Rs.500 to A/c XX1234"
  {
    label: 'Credit of Rs to A/c',
    regex: new RegExp(
      `[Cc]redit\\s+of\\s+${AMT}\\s+(?:to|in|into)\\s+(?:A\\/c|account|acct)\\s*(?:no\\.?\\s*)?(?:[Xx*]+)(\\d{4})`,
      'i'
    ),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // "received Rs.500 in A/c XX1234"
  {
    label: 'Received in A/c',
    regex: new RegExp(
      `(?:received|deposited|transferred)\\s+${AMT}\\s+(?:in|to|into)\\s+(?:your\\s+)?(?:A\\/c|account|acct)\\s*(?:no\\.?\\s*)?(?:[Xx*]*)(\\d{4})`,
      'i'
    ),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 2,
  },

  // ══════════════════════════════════════════════════════════════════
  //  DEBIT — generic (no account in pattern)
  // ══════════════════════════════════════════════════════════════════

  // "Rs.500 debited" / "Rs.500 has been debited"
  {
    label: 'Generic amount debited',
    regex: new RegExp(`${AMT}\\s+(?:has\\s+been\\s+|is\\s+|was\\s+)?debited`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "debited by Rs.500" / "debited for Rs.500" / "debited with Rs.500"
  {
    label: 'Debited by amount',
    regex: new RegExp(`debited\\s+(?:by\\s+|for\\s+|with\\s+)?${AMT}`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // Debit of Rs. (no account)
  {
    label: 'Debit of amount',
    regex: new RegExp(`debit\\s+of\\s+${AMT}`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "spent Rs.500" / "paid Rs.500" / "transferred Rs.500" / "sent Rs.500"
  {
    label: 'Spent/paid/transferred amount',
    regex: new RegExp(
      `(?:spent|paid|payment\\s+of|transferred|sent|withdrawn|withdrawal\\s+of)\\s+${AMT}`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "Rs.500 spent/paid/transferred/withdrawn"
  {
    label: 'Amount spent/paid',
    regex: new RegExp(
      `${AMT}\\s+(?:spent|paid|transferred|sent|withdrawn|charged)\\b`,
      'i'
    ),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // ATM withdrawal: "withdrawn Rs.500 at ATM"
  {
    label: 'ATM withdrawal',
    regex: new RegExp(`${AMT}\\s+(?:withdrawn|withdrawal)`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "transaction of Rs.500 debited/processed"
  {
    label: 'Transaction of amount',
    regex: new RegExp(`transaction\\s+of\\s+${AMT}\\s+(?:debited|processed|done)`, 'i'),
    type: 'debit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // ══════════════════════════════════════════════════════════════════
  //  CREDIT — generic (no account in pattern)
  // ══════════════════════════════════════════════════════════════════

  // "Rs.500 credited" / "Rs.500 has been credited"
  {
    label: 'Generic amount credited',
    regex: new RegExp(`${AMT}\\s+(?:has\\s+been\\s+|is\\s+|was\\s+)?credited`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "credited by Rs.500" / "credited with Rs.500"
  {
    label: 'Credited by amount',
    regex: new RegExp(`credited\\s+(?:by\\s+|with\\s+|for\\s+)?${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // Credit of Rs. (no account)
  {
    label: 'Credit of amount',
    regex: new RegExp(`credit\\s+of\\s+${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "received Rs.500" / "deposited Rs.500"
  {
    label: 'Received/deposited amount',
    regex: new RegExp(`(?:received|deposited)\\s+${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // "Rs.500 received/deposited/refunded"
  {
    label: 'Amount received/refunded',
    regex: new RegExp(`${AMT}\\s+(?:received|deposited|refunded|reversed|added)\\b`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },

  // Refund: "refund of Rs.500"
  {
    label: 'Refund of amount',
    regex: new RegExp(`refund\\s+of\\s+${AMT}`, 'i'),
    type: 'credit',
    amtGroup: 1,
    acctGroup: 0,
  },
];

// ─── Supporting regexes ──────────────────────────────────────────────────────
const BALANCE_REGEX =
  /(?:Avl?\.?\s*Bal(?:ance)?|Available\s*Bal(?:ance)?|Bal(?:ance)?\s*(?:is|:|=)|Closing\s*Bal(?:ance)?|Current\s*Bal(?:ance)?)\s*(?:Rs\.?|INR|₹)?\s*([,\d]+(?:\.\d{1,2})?)/i;

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
  /(?:UPI\s*Ref(?:\s*No\.?\s*)?|IMPS\s*Ref(?:\s*No\.?\s*)?|Ref(?:\s*No\.?\s*)?:?\s*|Txn\s*(?:ID|No)?:?\s*)([A-Za-z0-9]{6,})/i;

// Merchant name after "at " (POS transactions)
const MERCHANT_REGEX =
  /(?:at|for|to|from)\s+([A-Z][A-Z0-9 &\-_.]{2,30}?)(?:\s+on|\s+dated|\s+using|\s+via|\s*\.\s*|\s*[-–]\s*SB|\s*$)/i;

// ─── Bank sender IDs ──────────────────────────────────────────────────────────
const BANK_KEYWORDS: Record<string, string> = {
  // State Bank of India
  SBIINB: 'State Bank of India',
  SBICRD: 'State Bank of India',
  SBIPSG: 'State Bank of India',
  SBIUPI: 'State Bank of India',
  'VM-SBI': 'State Bank of India',
  'AD-SBI': 'State Bank of India',
  'BZ-SBI': 'State Bank of India',
  'HP-SBI': 'State Bank of India',
  SBI: 'State Bank of India',

  // HDFC Bank
  HDFCBK: 'HDFC Bank',
  HDFCB: 'HDFC Bank',
  'HP-HDFCBK': 'HDFC Bank',
  'AD-HDFCBK': 'HDFC Bank',
  HDFC: 'HDFC Bank',

  // ICICI Bank
  ICICIB: 'ICICI Bank',
  'HP-ICICI': 'ICICI Bank',
  'AD-ICICI': 'ICICI Bank',
  ICICI: 'ICICI Bank',

  // Axis Bank
  AXISBK: 'Axis Bank',
  AXISB: 'Axis Bank',
  'HP-AXIS': 'Axis Bank',
  'AD-AXIS': 'Axis Bank',
  AXIS: 'Axis Bank',

  // Kotak Mahindra Bank
  KOTAKB: 'Kotak Mahindra Bank',
  KOTAK: 'Kotak Mahindra Bank',
  'KOTAK811': 'Kotak Mahindra Bank',

  // Punjab National Bank
  PNBSMS: 'Punjab National Bank',
  PNBINB: 'Punjab National Bank',
  PNB: 'Punjab National Bank',

  // Bank of Baroda
  BOBSMS: 'Bank of Baroda',
  BOBINB: 'Bank of Baroda',
  BOB: 'Bank of Baroda',

  // Indian Overseas Bank
  IOBSMS: 'Indian Overseas Bank',
  IOB: 'Indian Overseas Bank',

  // Canara Bank
  CNRBNK: 'Canara Bank',
  CANBNK: 'Canara Bank',
  CANARA: 'Canara Bank',

  // Union Bank of India
  UNBNK: 'Union Bank of India',
  UBISMS: 'Union Bank of India',
  UNION: 'Union Bank of India',

  // IDBI Bank
  IDBIB: 'IDBI Bank',
  IDBISMS: 'IDBI Bank',
  IDBI: 'IDBI Bank',

  // Yes Bank
  YESBK: 'Yes Bank',
  YESBNK: 'Yes Bank',
  YES: 'Yes Bank',

  // IndusInd Bank
  INDBNK: 'IndusInd Bank',
  INDUSB: 'IndusInd Bank',
  INDUSIND: 'IndusInd Bank',

  // Federal Bank
  FEDBK: 'Federal Bank',
  FEDBNK: 'Federal Bank',
  FEDERAL: 'Federal Bank',

  // Bank of India
  BOISMS: 'Bank of India',
  BOI: 'Bank of India',

  // Central Bank of India
  CENTBK: 'Central Bank of India',
  CBISMS: 'Central Bank of India',
  CENTRAL: 'Central Bank of India',

  // State Bank of Mysore / SBM
  SBMSMS: 'State Bank of Mysore',
  SBM: 'State Bank of Mysore',

  // RBL Bank
  RBLBK: 'RBL Bank',
  RBLBNK: 'RBL Bank',
  RBL: 'RBL Bank',

  // DCB Bank
  DCBBNK: 'DCB Bank',
  DCB: 'DCB Bank',

  // South Indian Bank
  SIBSMS: 'South Indian Bank',
  SIB: 'South Indian Bank',

  // Karnataka Bank
  KTKBNK: 'Karnataka Bank',
  KTK: 'Karnataka Bank',

  // Bandhan Bank
  BNDHNB: 'Bandhan Bank',
  BANDHAN: 'Bandhan Bank',

  // IDFC First Bank
  IDFCBK: 'IDFC First Bank',
  IDFCFB: 'IDFC First Bank',
  IDFC: 'IDFC First Bank',

  // UCO Bank
  UCOBK: 'UCO Bank',
  UCOSMS: 'UCO Bank',
  UCO: 'UCO Bank',

  // Indian Bank
  INDBNKF: 'Indian Bank',
  INDBANK: 'Indian Bank',
  // "INDBNK" already mapped to IndusInd - careful order matters

  // Allahabad Bank (now Indian Bank)
  ALLBNK: 'Allahabad Bank',
  ALLAHABAD: 'Allahabad Bank',

  // Vijaya Bank (now Bank of Baroda)
  VIJAYA: 'Vijaya Bank',

  // Dena Bank (now Bank of Baroda)
  DENA: 'Dena Bank',

  // Syndicate Bank (now Canara Bank)
  SYNBK: 'Syndicate Bank',

  // Corporation Bank (now Union Bank)
  CORBNK: 'Corporation Bank',

  // Andhra Bank (now Union Bank)
  ANDBNK: 'Andhra Bank',

  // Oriental Bank of Commerce (now Punjab National Bank)
  OBCSMS: 'Oriental Bank of Commerce',
  OBC: 'Oriental Bank of Commerce',

  // United Bank of India (now Punjab National Bank)
  UBIBNK: 'United Bank of India',
  UBI: 'United Bank of India',

  // Lakshmi Vikas Bank
  LVBSMS: 'Lakshmi Vilas Bank',
  LVB: 'Lakshmi Vilas Bank',

  // Tamilnad Mercantile Bank
  TMBSMS: 'Tamilnad Mercantile Bank',
  TMB: 'Tamilnad Mercantile Bank',

  // Kerala Gramin Bank / etc (regional)
  KGB: 'Kerala Gramin Bank',

  // Payments Banks
  PAYTM: 'Paytm Payments Bank',
  PAYTMB: 'Paytm Payments Bank',
  AIRTELB: 'Airtel Payments Bank',
  AIRTEL: 'Airtel Payments Bank',
  FINO: 'Fino Payments Bank',
  FINOPB: 'Fino Payments Bank',
  JIOFINANCE: 'Jio Finance',
  JIOFIN: 'Jio Finance',
  NSDLJI: 'NSDL Payments Bank',
  NSDL: 'NSDL Payments Bank',

  // Credit card issuers (non-bank)
  AMEX: 'American Express',
  CITIBANK: 'Citibank',
  CITI: 'Citibank',
  HSBC: 'HSBC Bank',
  SCBL: 'Standard Chartered Bank',
  SCBNK: 'Standard Chartered Bank',

  // UPI generic
  UPIBNK: 'UPI',
  NPCI: 'NPCI',
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

// ─── Test helper (dev only) ─────────────────────────────────────────────────
export function testSMSPatterns(): void {
  const TEST_MESSAGES = [
    // SBI
    'Your a/c no. XXXXXXXX0206 is debited for Rs.600.00 on 03-Apr-26. UPI Ref 423456789012.',
    'Your a/c no. XXXXXXXX1234 is credited with Rs.5000.00 on 04-Apr-26.',
    // HDFC
    'Rs.5000.00 debited from A/c XX1234 on 04-Apr-26. Avl Bal Rs.12345.67.',
    'Rs.2500.00 credited to A/c XX1234 on 04-Apr-26. Avl Bal Rs.17345.67.',
    // ICICI
    'A/c XX1234 debited Rs.1500.00 on 04/04/26. UPI Ref No. 112233445566.',
    'INR 3000.00 credited to your A/c XX5678 on 04-Apr-26.',
    // Axis
    'Rs.999 spent on your Axis Bank Card XX4321 at Amazon on 04-Apr-26.',
    'INR 500.00 has been debited from Acct XX9876 via UPI. Bal: Rs.8900.',
    // Kotak
    'Your card ending 5678 was used for Rs.1200 at Swiggy on 04-Apr-26.',
    // PNB
    'INR 750.00 debited. Available Balance: INR 22,500.00.',
    // Generic
    'Rs.300 has been debited from your account. Ref 998877665544.',
    'Rs.1000 is credited to your account. Thank you.',
    'Payment of Rs.450 done from A/c XX6543. Avl Bal Rs.5400.',
    'Debit of Rs.200 from A/c XX1111 on 04-Apr-2026.',
    'Credit of Rs.8000 to A/c XX2222. Ref 776655443322.',
    'Received Rs.2000 in A/c XX3333 via UPI from John.',
    'Refund of Rs.599 credited to your account on 04-04-26.',
    'Rs.500 withdrawn at SBI ATM on 04-Apr-26.',
  ];

  console.group('🧪 SMS Pattern Tests');
  for (const msg of TEST_MESSAGES) {
    const result = parseBankSMS(msg);
    if (result) {
      console.log(
        `✅ [${result.type.toUpperCase()}] Rs.${result.amount} | ${result.bank} | Acct:${result.accountLast4 || 'N/A'} | Bal:${result.balance ?? 'N/A'} | Ref:${result.reference ?? 'N/A'}`,
        '\n   MSG:', msg.slice(0, 80)
      );
    } else {
      console.warn('❌ NO MATCH:', msg.slice(0, 80));
    }
  }
  console.groupEnd();
}
