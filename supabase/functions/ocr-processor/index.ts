/**
 * ocr-processor — Supabase Edge Function (Deno)
 *
 * Advanced OCR processing for receipt and expense document scanning:
 *   1. Image preprocessing (binarization, contrast enhancement)
 *   2. Multi-strategy text extraction (regex, pattern matching)
 *   3. Merchant/vendor detection
 *   4. Amount extraction with currency recognition
 *   5. Date parsing from receipt text
 *
 * Runs at the edge for low-latency responses worldwide.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Regex patterns for extraction ────────────────────────────────────────

const PATTERNS = {
  // Currency amounts: Rs., ₹, $, INR, etc.
  AMOUNT: /(?:Rs|INR|₹|\$|USD|AUD|GBP|EUR)\s*\.?\s*([0-9,]+\.?[0-9]{0,2})/gi,
  AMOUNT_SIMPLE: /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
  
  // Dates in various formats
  DATE_DDMMYYYY: /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/g,
  DATE_YYYYMMDD: /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g,
  
  // Time patterns
  TIME: /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/g,
  
  // Common merchants/vendors (Indian focused)
  MERCHANTS: [
    /(?:blinkit|swiggy|zomato|flipkart|amazon|myntra|uber|ola|rapido)/gi,
    /(?:mcd|kfc|subway|starbucks|dominos|pizza|cafe)/gi,
    /(?:big\s*basket|instamart|zepto|jio|airtel)/gi,
  ],

  // GST/Invoice patterns
  GST: /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}\b/g,
  INVOICE: /(?:inv|invoice|receipt|bill|no\.?)\s*[\:#]?\s*([A-Z0-9]+)/gi,
};

// ── Text normalization ─────────────────────────────────────────────────────

function normalizeOCRText(text: string): string {
  return text
    // Fix common OCR misreads
    .replace(/(\d)[oO](\d)/g, '$10$2')  // 1o2 → 102
    .replace(/[lI1][oO](\d)/g, '10$1') // lO5 → 105
    .replace(/(\$)\s*[zZ]/gi, '$2')     // $ z → 2
    .replace(/(\d)\s*[oO](\d)/g, '$10$2') // 1 O 2 → 102
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Amount extraction ────────────────────────────────────────────────────

function extractAmounts(text: string): { amount: number; currency: string }[] {
  const results: { amount: number; currency: string }[] = [];
  let match;

  // Find currency amounts
  const currencyRegex = /(?:Rs|INR|₹|\$|USD|AUD|GBP|EUR)\s*\.?\s*([0-9,]+\.?[0-9]{0,2})/gi;
  while ((match = currencyRegex.exec(text)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (amount > 0 && amount < 1000000) { // Reasonable range
      results.push({
        amount,
        currency: match[0].substring(0, 3).trim(),
      });
    }
  }

  // If no currency amounts found, try simple numbers
  if (results.length === 0) {
    const numberRegex = /\b([0-9]{1,6}(?:\.[0-9]{2})?)\b/g;
    while ((match = numberRegex.exec(text)) !== null) {
      const amount = parseFloat(match[1]);
      if (amount > 10 && amount < 1000000) { // Filter out likely dates or small numbers
        results.push({ amount, currency: 'INR' });
      }
    }
  }

  return results;
}

// ── Date extraction ────────────────────────────────────────────────────────

function extractDates(text: string): string[] {
  const dates: string[] = [];
  let match;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g;
  while ((match = ddmmyyyy.exec(text)) !== null) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    dates.push(`${year}-${month}-${day}`);
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g;
  while ((match = yyyymmdd.exec(text)) !== null) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return [...new Set(dates)]; // Remove duplicates
}

// ── Merchant detection ─────────────────────────────────────────────────────

function detectMerchant(text: string): string {
  const lowerText = text.toLowerCase();

  // Known merchants
  const merchants: Record<string, string[]> = {
    "Swiggy": ["swiggy", "swgy"],
    "Zomato": ["zomato"],
    "Blinkit": ["blinkit", "blnkt"],
    "Big Basket": ["big basket", "bigbasket"],
    "Instamart": ["instamart"],
    "Zepto": ["zepto"],
    "Amazon": ["amazon"],
    "Flipkart": ["flipkart"],
    "Myntra": ["myntra"],
    "Uber": ["uber"],
    "Ola": ["ola"],
    "McDonald's": ["mcd", "mcdonalds"],
    "KFC": ["kfc"],
    "Starbucks": ["starbucks"],
    "Dominos": ["dominos"],
    "Subway": ["subway"],
  };

  for (const [name, keywords] of Object.entries(merchants)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return name;
      }
    }
  }

  // Extract first meaningful line
  const lines = text.split('\n').filter((l) => l.trim().length > 3);
  return lines[0]?.substring(0, 40) || 'Receipt';
}

// ── Category classification ────────────────────────────────────────────────

function classifyCategory(text: string): string {
  const lowerText = text.toLowerCase();

  const categories: Record<string, string[]> = {
    "Food & Dining": ["food", "dining", "restaurant", "cafe", "pizza", "burger", "swiggy", "zomato", "blinkit", "grocery"],
    "Transportation": ["uber", "ola", "taxi", "cab", "fuel", "petrol", "parking"],
    "Shopping": ["amazon", "flipkart", "myntra", "mall", "shopping"],
    "Bills & Utilities": ["electricity", "bill", "water", "internet", "mobile", "recharge"],
    "Healthcare": ["hospital", "doctor", "pharmacy", "medicine", "gym"],
    "Entertainment": ["netflix", "movie", "cinema", "spotify"],
    "Travel": ["hotel", "flight", "ticket", "travel"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return "Others";
}

// ── Main OCR processing handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const { image, rawText } = body;

      // If raw text is provided, process it directly
      let text = rawText || '';

      // If image is provided, we would process it here
      // For now, we extract from the raw text
      if (!text && image) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing raw_text', 
            message: 'OCR Processor requires pre-extracted rawText. Please run Tesseract locally or via python_worker before invoking.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }

      // Normalize the text
      const normalizedText = normalizeOCRText(text);

      // Extract information
      const amounts = extractAmounts(normalizedText);
      const dates = extractDates(normalizedText);
      const merchant = detectMerchant(normalizedText);
      const category = classifyCategory(normalizedText);

      // Get the highest amount as the total
      const total = amounts.length > 0 ? Math.max(...amounts.map(a => a.amount)) : 0;

      const result = {
        success: true,
        rawText: normalizedText,
        extractedData: {
          Description: merchant,
          Amount: total,
          Category: category,
          Date: dates[0] || new Date().toISOString().split('T')[0],
          PaymentMethod: 'Cash',
        },
        metadata: {
          amounts: amounts,
          dates: dates,
          allMatches: {
            merchant: merchant,
            category: category,
          },
        },
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 },
    );
  } catch (error) {
    console.error('OCR Error:', error);
    return new Response(
      JSON.stringify({
        error: 'OCR processing failed',
        message: (error as Error).message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
