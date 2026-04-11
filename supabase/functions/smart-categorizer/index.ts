/**
 * smart-categorizer — Supabase Edge Function (Deno)
 *
 * Edge-based NLP categorization service:
 *   1. Multi-strategy keyword + bigram + frequency analysis
 *   2. Confidence scoring with explanation
 *   3. Batch categorization for bulk imports
 *   4. Receipt text parsing from OCR output
 *
 * Runs at the edge for low-latency responses worldwide.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Category Knowledge Base ────────────────────────────────────────────────

const CATEGORY_KNOWLEDGE: Record<string, { keywords: string[]; weight: number }> = {
  "Food & Dining": {
    keywords: [
      "swiggy", "zomato", "food", "lunch", "dinner", "breakfast", "coffee", "tea",
      "restaurant", "cafe", "pizza", "burger", "biryani", "grocery", "groceries",
      "mcdonalds", "kfc", "dominos", "subway", "starbucks", "bakery", "dairy",
      "milk", "bread", "fruit", "vegetable", "meat", "fish", "snack", "juice",
      "instamart", "blinkit", "zepto", "bigbasket", "canteen", "mess",
      "haldiram", "chaayos", "dunkin", "barista", "ice cream", "sweet"
    ],
    weight: 1.0,
  },
  "Transportation": {
    keywords: [
      "uber", "ola", "rapido", "taxi", "cab", "ride", "bus", "metro", "train",
      "fuel", "petrol", "diesel", "parking", "flight", "ticket", "toll", "fastag",
      "auto", "rickshaw", "irctc", "indigo", "vistara", "airline", "airport",
      "commute", "carpool", "shuttle", "servicing", "tyre", "mechanic"
    ],
    weight: 1.0,
  },
  "Shopping": {
    keywords: [
      "amazon", "flipkart", "myntra", "shopping", "clothes", "shoes", "electronics",
      "laptop", "phone", "smartphone", "zara", "h&m", "nike", "adidas", "croma",
      "nykaa", "ajio", "ikea", "furniture", "watch", "jewellery", "perfume",
      "headphones", "earbuds", "iphone", "samsung", "gift", "mall"
    ],
    weight: 1.0,
  },
  "Bills & Utilities": {
    keywords: [
      "electricity", "bill", "water", "gas", "internet", "broadband", "recharge",
      "mobile", "dth", "rent", "maintenance", "airtel", "jio", "bsnl", "wifi",
      "cylinder", "lpg", "society", "emi", "loan", "insurance", "maid"
    ],
    weight: 1.0,
  },
  "Entertainment": {
    keywords: [
      "netflix", "movie", "cinema", "spotify", "theater", "pvr", "inox",
      "bookmyshow", "subscription", "gaming", "steam", "playstation", "xbox",
      "disney", "hotstar", "concert", "event", "party", "youtube premium"
    ],
    weight: 1.0,
  },
  "Healthcare": {
    keywords: [
      "hospital", "doctor", "pharmacy", "medicine", "medical", "health", "gym",
      "fitness", "cultfit", "apollo", "surgery", "clinic", "dental", "yoga",
      "vaccine", "xray", "mri", "pharmeasy", "1mg", "practo", "protein"
    ],
    weight: 1.0,
  },
  "Education": {
    keywords: [
      "course", "school", "college", "udemy", "coursera", "tuition", "fee",
      "exam", "certification", "hostel", "book", "textbook", "coaching",
      "byju", "unacademy", "vedantu", "library", "scholarship", "thesis"
    ],
    weight: 1.0,
  },
  "Investments & Savings": {
    keywords: [
      "mutual fund", "sip", "stock", "share", "equity", "nifty", "sensex",
      "fixed deposit", "fd", "ppf", "nps", "gold", "silver", "crypto",
      "bitcoin", "ethereum", "zerodha", "groww", "demat", "portfolio"
    ],
    weight: 1.2,
  },
  "Travel & Holidays": {
    keywords: [
      "hotel", "resort", "airbnb", "oyo", "makemytrip", "goibibo", "trip",
      "travel", "holiday", "vacation", "passport", "visa", "trekking",
      "camping", "safari", "cruise", "tourism", "sightseeing", "luggage"
    ],
    weight: 1.1,
  },
};

// ── Categorization Logic ───────────────────────────────────────────────────

interface CategorizeResult {
  category: string;
  confidence: number;
  matchedKeywords: string[];
  explanation: string;
}

function categorize(description: string): CategorizeResult {
  const lower = description.toLowerCase().replace(/[^\w\s]/g, "");
  const tokens = lower.split(/\s+/).filter((w) => w.length > 1);
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }

  const allTerms = [...tokens, ...bigrams];
  const scores: Record<string, { score: number; matches: string[] }> = {};

  for (const [category, { keywords, weight }] of Object.entries(CATEGORY_KNOWLEDGE)) {
    scores[category] = { score: 0, matches: [] };
    for (const term of allTerms) {
      for (const kw of keywords) {
        if (kw === term || kw.includes(term) || term.includes(kw)) {
          const isBigram = term.includes(" ") ? 2.0 : 1.0;
          scores[category].score += weight * isBigram;
          if (!scores[category].matches.includes(kw)) {
            scores[category].matches.push(kw);
          }
        }
      }
    }
  }

  let best = "Others";
  let maxScore = 0;
  let totalScore = 0;
  let matchedKeywords: string[] = [];

  for (const [cat, { score, matches }] of Object.entries(scores)) {
    totalScore += score;
    if (score > maxScore) {
      maxScore = score;
      best = cat;
      matchedKeywords = matches;
    }
  }

  const confidence = totalScore > 0 ? Math.round((maxScore / totalScore) * 100) / 100 : 0;

  if (confidence < 0.5 || maxScore === 0) {
    return {
      category: "Others",
      confidence,
      matchedKeywords: [],
      explanation: "No strong category match found. Classified as Others.",
    };
  }

  return {
    category: best,
    confidence,
    matchedKeywords,
    explanation: `Matched ${matchedKeywords.length} keyword(s): ${matchedKeywords.slice(0, 5).join(", ")}. Confidence: ${(confidence * 100).toFixed(0)}%.`,
  };
}

// ── Receipt Text Parsing ───────────────────────────────────────────────────

interface ParsedReceipt {
  merchant: string | null;
  total: string | null;
  date: string | null;
  items: string[];
  category: string;
  confidence: number;
}

function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // Extract merchant (usually first meaningful line)
  const merchant = lines.length > 0 ? lines[0] : null;

  // Extract total
  let total: string | null = null;
  for (const line of lines) {
    const match = line.match(/(?:total|amount|grand total|net|payable)[:\s]*[₹$]?\s*([\d,]+\.?\d*)/i);
    if (match) {
      total = match[1].replace(/,/g, "");
      break;
    }
  }

  // Extract date
  let date: string | null = null;
  for (const line of lines) {
    const dateMatch = line.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
    if (dateMatch) {
      date = dateMatch[1];
      break;
    }
  }

  // Extract itemised lines (lines with amounts)
  const items = lines.filter((l) => /\d+\.\d{2}/.test(l) && !/total|amount|tax|gst/i.test(l));

  // Categorize based on content
  const result = categorize(text);

  return {
    merchant,
    total,
    date,
    items: items.slice(0, 10),
    category: result.category,
    confidence: result.confidence,
  };
}

// ── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    let result: unknown;

    switch (action) {
      case "categorize": {
        const { description } = body;
        if (!description) {
          return new Response(
            JSON.stringify({ error: "description is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = categorize(description);
        break;
      }

      case "batch": {
        const { descriptions } = body;
        if (!Array.isArray(descriptions)) {
          return new Response(
            JSON.stringify({ error: "descriptions array is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = { results: descriptions.map((d: string) => categorize(d)) };
        break;
      }

      case "parse-receipt": {
        const { text } = body;
        if (!text) {
          return new Response(
            JSON.stringify({ error: "text is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = parseReceiptText(text);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
