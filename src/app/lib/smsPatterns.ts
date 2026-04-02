export interface ParsedTransaction {
  amount: number;
  type: 'credit' | 'debit';
  bank: string;
  accountLast4: string;
  date: string;
  balance?: number;
  reference?: string;
  rawMessage: string;
}

// Common Indian bank SMS patterns
const PATTERNS = [
  // Debited patterns
  {
    regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is )?debited\s*(?:from\s*(?:your\s*)?(?:A\/c|account|a\/c)\s*(?:no\.?\s*)?(?:[Xx*]+)?(\d{4}))?/i,
    type: 'debit' as const,
  },
  {
    regex: /debited\s*(?:by\s*)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:from\s*(?:A\/c|account)\s*(?:[Xx*]+)?(\d{4}))?/i,
    type: 'debit' as const,
  },
  {
    regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:spent|paid|transferred|sent)\s/i,
    type: 'debit' as const,
  },
  // Credited patterns
  {
    regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is )?credited\s*(?:to\s*(?:your\s*)?(?:A\/c|account|a\/c)\s*(?:no\.?\s*)?(?:[Xx*]+)?(\d{4}))?/i,
    type: 'credit' as const,
  },
  {
    regex: /credited\s*(?:by\s*)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*(?:to\s*(?:A\/c|account)\s*(?:[Xx*]+)?(\d{4}))?/i,
    type: 'credit' as const,
  },
  {
    regex: /(?:received|deposited)\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
    type: 'credit' as const,
  },
];

const BALANCE_REGEX = /(?:Avl?\s*Bal|Available\s*Balance|Avail(?:able)?\s*Bal(?:ance)?|Bal)\s*(?:is\s*)?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i;

const DATE_REGEX = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{2,4})/i;

const BANK_KEYWORDS: Record<string, string> = {
  'SBI': 'State Bank of India',
  'HDFC': 'HDFC Bank',
  'ICICI': 'ICICI Bank',
  'AXIS': 'Axis Bank',
  'KOTAK': 'Kotak Mahindra Bank',
  'PNB': 'Punjab National Bank',
  'BOB': 'Bank of Baroda',
  'IOB': 'Indian Overseas Bank',
  'CANARA': 'Canara Bank',
  'UNION': 'Union Bank',
  'IDBI': 'IDBI Bank',
  'YES': 'Yes Bank',
  'INDUSIND': 'IndusInd Bank',
  'FEDERAL': 'Federal Bank',
  'BOI': 'Bank of India',
  'PAYTM': 'Paytm Payments Bank',
  'AIRTEL': 'Airtel Payments Bank',
  'FINO': 'Fino Payments Bank',
  'JIOFINANCE': 'Jio Finance',
};

const UPI_REF_REGEX = /(?:UPI\s*Ref\s*(?:No\.?\s*)?:?\s*|Ref\s*(?:No\.?\s*)?:?\s*|txn\s*(?:id|no)?\s*:?\s*)(\w+)/i;

function detectBank(message: string): string {
  const upper = message.toUpperCase();
  for (const [key, name] of Object.entries(BANK_KEYWORDS)) {
    if (upper.includes(key)) return name;
  }
  return 'Unknown Bank';
}

export function parseBankSMS(message: string): ParsedTransaction | null {
  for (const pattern of PATTERNS) {
    const match = message.match(pattern.regex);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      const accountLast4 = match[2] || '';
      const bank = detectBank(message);

      // Extract date
      let date = new Date().toISOString().split('T')[0];
      const dateMatch = message.match(DATE_REGEX);
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split('T')[0];
          }
        } catch { /* use default */ }
      }

      // Extract balance
      let balance: number | undefined;
      const balMatch = message.match(BALANCE_REGEX);
      if (balMatch) {
        balance = parseFloat(balMatch[1].replace(/,/g, ''));
      }

      // Extract reference
      let reference: string | undefined;
      const refMatch = message.match(UPI_REF_REGEX);
      if (refMatch) {
        reference = refMatch[1];
      }

      return {
        amount,
        type: pattern.type,
        bank,
        accountLast4,
        date,
        balance,
        reference,
        rawMessage: message,
      };
    }
  }
  return null;
}

export function parseMultipleSMS(text: string): ParsedTransaction[] {
  // Split by newlines, treating double-newline or numbered lines as separators
  const messages = text
    .split(/\n{2,}|\r\n{2,}/)
    .map(m => m.trim())
    .filter(m => m.length > 10);

  const results: ParsedTransaction[] = [];
  for (const msg of messages) {
    const parsed = parseBankSMS(msg);
    if (parsed) results.push(parsed);
  }
  return results;
}
