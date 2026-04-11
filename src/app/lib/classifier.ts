/**
 * classifier.ts — Lightweight NLP classification for expense descriptions
 * 
 * Uses keyword matching and TF-IDF inspired scoring to categorize text.
 * Implements a 70% confidence threshold as requested.
 */

export interface ClassificationResult {
  category: string;
  confidence: number;
}

const CATEGORIES = [
  "Food & Dining",
  "Education",
  "Healthcare",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Others"
];

// Extracted from train.csv
const TRAINING_DATA: Record<string, string[]> = {
  "Food & Dining": [
    "swiggy", "zomato", "lunch", "dinner", "breakfast", "coffee", "dhaba", "food", 
    "starbucks", "latte", "tea", "snacks", "ice cream", "parlor", "groceries", "supermart"
  ],
  "Education": [
    "pocket money", "tuition", "fees", "math", "textbook", "guides", "pens", 
    "pencils", "stationaries", "university", "semester", "donation", "institution", "student", "organization"
  ],
  "Healthcare": [
    "apollo", "hospital", "consultation", "emergency", "room", "icu", "dental", 
    "surgery", "medical", "bills", "tests", "pharmacy", "tablets", "syrup", "physiotherapy", "treatment"
  ],
  "Transportation": [
    "uber", "ride", "office", "metro", "train", "pass", "recharge", "flight", 
    "tickets", "mumbai", "petrol", "pump", "fuel", "ola", "airport", "bus", "hometown"
  ],
  "Shopping": [
    "amazon", "prime", "shopping", "zara", "clothing", "store", "smartphone", "purchase", "flipkart", "online"
  ],
  "Bills & Utilities": [
    "electricity", "utility", "bill", "water", "tax", "jio", "mobile", "broadband", "wifi"
  ],
  "Entertainment": [
    "netflix", "subscription", "movie", "theater", "tickets", "spotify", "premium", "music"
  ]
};

/**
 * Preprocess text: lowercase and remove punctuation.
 */
function preprocess(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

export function classifyExpense(description: string): ClassificationResult {
  const tokens = preprocess(description);
  
  if (tokens.length === 0) {
    return { category: "Others", confidence: 0 };
  }

  const scores: Record<string, number> = {};
  
  // Initialize scores
  CATEGORIES.forEach(cat => scores[cat] = 0);

  // Simple keyword matching with weight
  tokens.forEach(token => {
    Object.entries(TRAINING_DATA).forEach(([category, keywords]) => {
      if (keywords.some(k => k.includes(token) || token.includes(k))) {
        scores[category] += 1;
      }
    });
  });

  // Find best match
  let bestCategory = "Others";
  let maxScore = 0;
  let totalScore = 0;

  Object.entries(scores).forEach(([category, score]) => {
    totalScore += score;
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  });

  // Calculate confidence
  const confidence = totalScore > 0 ? (maxScore / totalScore) : 0;

  // 70% confidence threshold rule
  if (confidence < 0.70 || maxScore === 0) {
    return { category: "Others", confidence };
  }

  return { category: bestCategory, confidence };
}
