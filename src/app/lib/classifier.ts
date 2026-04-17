/**
 * classifier.ts — Lightweight NLP classification 
 */

// @ts-ignore
import * as brain from 'brain.js';

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
  "Investments & Savings",
  "Travel & Holidays",
  "Others"
];

const TRAINING_DATA: Record<string, string[]> = {
  "Food & Dining": ["swiggy", "zomato", "lunch", "dinner", "breakfast", "coffee", "dhaba", "food", "starbucks", "mcdonalds", "kfc", "dominos", "pizza", "burger", "subway", "instamart", "blinkit", "zepto", "bigbasket"],
  "Education": ["tuition", "fees", "math", "textbook", "university", "semester", "college", "school", "hostel", "udemy", "coursera"],
  "Healthcare": ["hospital", "consultation", "medical", "pharmacy", "tablets", "clinic", "doctor", "medicine", "wellness", "gym"],
  "Transportation": ["uber", "ride", "metro", "train", "pass", "petrol", "pump", "fuel", "ola", "airport", "bus", "auto", "cab"],
  "Shopping": ["amazon", "prime", "shopping", "zara", "clothing", "flipkart", "myntra", "ajio", "meesho", "shoes", "apparel", "laptop"],
  "Bills & Utilities": ["electricity", "utility", "bill", "water", "jio", "mobile", "broadband", "wifi", "gas", "recharge", "airtel"],
  "Entertainment": ["netflix", "subscription", "movie", "theater", "spotify", "premium", "music", "hotstar", "cinema", "pvr", "inox"]
};

let neuralNet: any = null;
let isTraining = false;

// Create a simple bag-of-words vector from text
function encodeText(text: string) {
    const tokens = text.toLowerCase().split(/\s+/);
    const words: Record<string, number> = {};
    tokens.forEach(t => {
        if (t.length > 2) words[t] = 1;
    });
    return words;
}

async function buildNeuralNetwork() {
  if (neuralNet || isTraining) return;
  isTraining = true;
  
  // Use simple Feed-Forward Neural Network (much faster than LSTM)
  neuralNet = new brain.NeuralNetwork();
  
  const dataset: { input: Record<string, number>, output: Record<string, number> }[] = [];
  
  for (const [category, keywords] of Object.entries(TRAINING_DATA)) {
    for (const kw of keywords) {
      dataset.push({ 
        input: encodeText(kw), 
        output: { [category]: 1 } 
      });
    }
  }

  // Inject common combinations
  dataset.push({ input: encodeText("swiggy delivery"), output: { "Food & Dining": 1 } });
  dataset.push({ input: encodeText("amazon order"), output: { "Shopping": 1 } });

  console.log(`[ML] Training lightweight NeuralNetwork on ${dataset.length} vectors...`);
  
  setTimeout(() => {
     try {
       neuralNet.train(dataset, {
         iterations: 100,
         errorThresh: 0.01,
         log: false
       });
       console.log("[ML] Brain.js LW model active!");
     } catch (err) {
       console.error("[ML] Training failed", err);
     } finally {
       isTraining = false;
     }
  }, 100);
}

buildNeuralNetwork().catch(console.error);

export function classifyExpense(description: string): ClassificationResult {
  const text = description.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (!text || text.length < 2) return { category: 'Others', confidence: 0 };

  if (!neuralNet || isTraining) return nativeFallbackMatch(text);

  try {
     const output = neuralNet.run(encodeText(text));
     let bestCat = 'Others';
     let maxProb = 0;
     
     for (const [cat, prob] of Object.entries(output) as [string, number][]) {
        if (prob > maxProb) {
            maxProb = prob;
            bestCat = cat;
        }
     }
     
     if (maxProb > 0.4) {
        return { category: bestCat, confidence: maxProb };
     }
  } catch (e) {}
  
  return nativeFallbackMatch(text);
}

function nativeFallbackMatch(text: string): ClassificationResult {
  let highest = 0;
  let best = 'Others';
  for (const [category, keywords] of Object.entries(TRAINING_DATA)) {
    let score = 0;
    keywords.forEach(k => { if (text.includes(k)) score++ });
    if (score > highest) {
      highest = score;
      best = category;
    }
  }
  return { category: best, confidence: highest > 0 ? 0.70 : 0 };
}
