import express from 'express';
import cors from 'cors';
import ngrok from '@ngrok/ngrok';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'local-db.json');
const TWELVEDATA_KEY = process.env.TWELVEDATA_API_KEY || process.env.MARKET_DATA_API_KEY;

// ── Local DB (mirrors DynamoDB) ──────────────────────────────────────
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ expenses: [], budgets: [], webhookLogs: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { expenses: [], budgets: [], webhookLogs: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── App Setup ────────────────────────────────────────────────────────
const app = express();
const port = 3001;
let publicUrl = `http://localhost:${port}`;
let serverStatus = 'starting';

// ── Market Data Proxy Cache ─────────────────────────────────────────
const MARKET_CACHE = new Map();
const MARKET_CACHE_TTL = 15000; // 15 seconds

function getMarketCache(key) {
  const entry = MARKET_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MARKET_CACHE_TTL) {
    MARKET_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setMarketCache(key, data) {
  MARKET_CACHE.set(key, { timestamp: Date.now(), data });
}

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Middleware: Request logging ──────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Webhook Info ─────────────────────────────────────────────────────
app.get('/api/webhook-info', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ url: publicUrl, status: serverStatus, port });
});

// ── Webhook Logs (last 20) ───────────────────────────────────────────
app.get('/api/webhook-logs', (req, res) => {
  const db = readDB();
  res.set('Cache-Control', 'no-store');
  res.json({ logs: (db.webhookLogs || []).slice(0, 20) });
});

// ── Market Data Proxy (Twelve Data) ─────────────────────────────────
app.get('/quote', async (req, res) => {
  if (!TWELVEDATA_KEY) {
    return res.status(400).json({ status: 'error', message: 'Missing TWELVEDATA_API_KEY in .env' });
  }

  const { symbol, exchange, mic_code, type, prepost } = req.query;
  if (!symbol) {
    return res.status(400).json({ status: 'error', message: 'Missing symbol parameter' });
  }

  const url = new URL('https://api.twelvedata.com/quote');
  url.searchParams.set('symbol', symbol.toString());
  if (exchange) url.searchParams.set('exchange', exchange.toString());
  if (mic_code) url.searchParams.set('mic_code', mic_code.toString());
  if (type) url.searchParams.set('type', type.toString());
  if (prepost) url.searchParams.set('prepost', prepost.toString());
  url.searchParams.set('apikey', TWELVEDATA_KEY);

  const cacheKey = `quote:${url.searchParams.toString()}`;
  const cached = getMarketCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    if (!response.ok || data?.status === 'error') {
      return res.status(400).json(data);
    }
    setMarketCache(cacheKey, data);
    res.set('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'Market data error' });
  }
});

app.get('/time_series', async (req, res) => {
  if (!TWELVEDATA_KEY) {
    return res.status(400).json({ status: 'error', message: 'Missing TWELVEDATA_API_KEY in .env' });
  }

  const { symbol, interval, outputsize, order } = req.query;
  if (!symbol || !interval) {
    return res.status(400).json({ status: 'error', message: 'Missing symbol or interval parameter' });
  }

  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol.toString());
  url.searchParams.set('interval', interval.toString());
  if (outputsize) url.searchParams.set('outputsize', outputsize.toString());
  if (order) url.searchParams.set('order', order.toString());
  url.searchParams.set('apikey', TWELVEDATA_KEY);

  const cacheKey = `series:${url.searchParams.toString()}`;
  const cached = getMarketCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    if (!response.ok || data?.status === 'error') {
      return res.status(400).json(data);
    }
    setMarketCache(cacheKey, data);
    res.set('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'Market data error' });
  }
});

// ── Health Check (GET /v1/webhooks/sms-sync) ─────────────────────────
app.get('/v1/webhooks/sms-sync', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Expense Tracker Webhook</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; max-width: 480px; width: 90%; text-align: center; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { font-size: 24px; font-weight: 700; color: #10b981; margin-bottom: 8px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
        .badge { display: inline-block; background: #10b981/20; border: 1px solid #10b981; color: #10b981; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
        pre { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; text-align: left; font-size: 12px; color: #34d399; overflow-x: auto; }
        .note { font-size: 12px; color: #64748b; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">🚀</div>
        <h1>Webhook Endpoint Active</h1>
        <div class="badge">✅ ONLINE</div>
        <p>This endpoint accepts <strong>POST</strong> requests with bank SMS payloads for auto-categorization.</p>
        <pre>{
  "sender": "HP-HDFCBK",
  "text": "Rs.5000 debited from A/c XX1234",
  "timestamp": "${new Date().toISOString()}"
}</pre>
        <p class="note">Use this URL in your Tasker/Shortcuts automation app. Visiting in a browser only shows this status page.</p>
      </div>
    </body>
    </html>
  `);
});

// ── SMS Sync Webhook (POST) ──────────────────────────────────────────
app.post('/v1/webhooks/sms-sync', (req, res) => {
  const token = req.query.token;
  const payload = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Missing security token' });
  }

  const logEntry = {
    id: crypto.randomUUID(),
    token: token.toString().slice(0, 20) + '...',
    sender: payload.sender || 'Unknown',
    text: payload.text || '',
    timestamp: new Date().toISOString(),
    status: 'received',
  };

  console.log('\n--- 🚀 NEW WEBHOOK RECEIVED ---');
  console.log(`Sender: ${logEntry.sender}`);
  console.log(`Text: ${logEntry.text}`);
  console.log('--------------------------------\n');

  const db = readDB();
  db.webhookLogs = [logEntry, ...(db.webhookLogs || [])].slice(0, 50);
  writeDB(db);

  res.status(200).json({ success: true, message: 'SMS received and logged', id: logEntry.id });
});

// ── Expenses CRUD (mirrors AWS Lambda + DynamoDB) ────────────────────
app.get('/expenses', (req, res) => {
  const db = readDB();
  res.json({ expenses: db.expenses || [] });
});

app.post('/expenses', (req, res) => {
  const db = readDB();
  const expense = {
    id: `exp_${crypto.randomUUID()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  db.expenses = [expense, ...(db.expenses || [])];
  writeDB(db);
  res.status(201).json(expense);
});

app.put('/expenses/:id', (req, res) => {
  const db = readDB();
  const idx = db.expenses.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Expense not found' });
  db.expenses[idx] = { ...db.expenses[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeDB(db);
  res.json(db.expenses[idx]);
});

app.delete('/expenses/:id', (req, res) => {
  const db = readDB();
  db.expenses = db.expenses.filter(e => e.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ── Budgets CRUD ─────────────────────────────────────────────────────
app.get('/budgets', (req, res) => {
  const db = readDB();
  res.json({ budgets: db.budgets || [] });
});

app.post('/budgets', (req, res) => {
  const db = readDB();
  const budget = { id: `bud_${crypto.randomUUID()}`, ...req.body };
  db.budgets = [budget, ...(db.budgets || [])];
  writeDB(db);
  res.status(201).json(budget);
});

app.put('/budgets/:id', (req, res) => {
  const db = readDB();
  const idx = db.budgets.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Budget not found' });
  db.budgets[idx] = { ...db.budgets[idx], ...req.body };
  writeDB(db);
  res.json(db.budgets[idx]);
});

app.delete('/budgets/:id', (req, res) => {
  const db = readDB();
  db.budgets = db.budgets.filter(b => b.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.delete('/budgets/clear', (req, res) => {
  const db = readDB();
  db.budgets = [];
  writeDB(db);
  res.json({ success: true });
});

// ── AI Categorization (local heuristic, mirrors Lambda) ──────────────
app.post('/ai/categorize', (req, res) => {
  const { description = '', amount = 0 } = req.body;
  const text = description.toLowerCase();

  const rules = [
    { keywords: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'grocery', 'bigbasket', 'blinkit'], category: 'Food & Dining' },
    { keywords: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'metro', 'bus', 'train', 'flight', 'cab', 'auto', 'transport'], category: 'Transportation' },
    { keywords: ['amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'shoes', 'mall', 'meesho', 'ajio'], category: 'Shopping' },
    { keywords: ['bill', 'electricity', 'water', 'gas', 'broadband', 'internet', 'recharge', 'mobile', 'dth', 'subscription'], category: 'Bills & Utilities' },
    { keywords: ['netflix', 'prime', 'hotstar', 'spotify', 'movie', 'cinema', 'pvr', 'inox', 'entertainment', 'game'], category: 'Entertainment' },
    { keywords: ['hospital', 'doctor', 'pharmacy', 'medicine', 'clinic', 'apollo', 'health', 'gym', 'fitness'], category: 'Healthcare' },
    { keywords: ['udemy', 'coursera', 'school', 'college', 'course', 'book', 'education', 'tuition', 'fees'], category: 'Education' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return res.json({ category: rule.category, confidence: 0.88 });
    }
  }

  res.json({ category: 'Others', confidence: 0.5 });
});

// ── Analytics ────────────────────────────────────────────────────────
app.get('/analytics', (req, res) => {
  const db = readDB();
  const expenses = db.expenses || [];
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const categories = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const topCategory = Object.keys(categories).sort((a, b) => categories[b] - categories[a])[0] || 'N/A';

  res.json({
    totalExpenses: total,
    monthlyAverage: total / 12,
    topCategory,
    transactionCount: expenses.length,
  });
});

// ── AI Insights (local mock) ─────────────────────────────────────────
app.get('/ai/insights', (req, res) => {
  res.json({
    insights: [
      { type: 'warning', title: 'High Food Spending', message: 'Your food & dining expenses are above average.', category: 'Food & Dining', potentialSavings: 1200 },
      { type: 'tip', title: 'Switch to Public Transport', message: 'You could save ₹1,500/month by using metro.', category: 'Transportation', potentialSavings: 1500 },
      { type: 'success', title: 'Bills Under Control', message: 'Great job! Your utility bills are 15% below budget.', category: 'Bills & Utilities' },
    ],
  });
});

// ── Start Server ─────────────────────────────────────────────────────
app.listen(port, async () => {
  serverStatus = 'online';
  console.log(`\n✅ Local webhook server listening at http://localhost:${port}`);
  console.log(`📊 Local DB: ${DB_FILE}\n`);

  if (!process.env.NGROK_AUTHTOKEN) {
    console.warn(`⚠️  NGROK_AUTHTOKEN is missing in .env – running in local-only mode`);
    return;
  }

  let retries = 3;
  let connected = false;
  while (retries > 0 && !connected) {
    try {
      const listener = await ngrok.forward({ addr: port, authtoken: process.env.NGROK_AUTHTOKEN });
      publicUrl = listener.url();
      serverStatus = 'tunnel-active';
      connected = true;
      console.log(`\n======================================================`);
      console.log(`🌍 PUBLIC INTERNET TUNNEL (NGROK) ACTIVE`);
      console.log(`Webhook URL: ${publicUrl}/v1/webhooks/sms-sync`);
      console.log(`Health Check: ${publicUrl}/v1/webhooks/sms-sync (GET)`);
      console.log(`======================================================\n`);
    } catch (err) {
      // ERR_NGROK_334: existing endpoint – force-close all sessions and retry once
      if (err.errorCode === 'ERR_NGROK_334' && retries === 3) {
        console.log('⟳ Closing stale ngrok session and retrying...');
        try { await ngrok.kill(); } catch {}
        await new Promise(r => setTimeout(r, 3000));
        retries--;
        continue;
      }
      retries--;
      if (retries === 0) {
        console.error('❌ Failed to establish ngrok tunnel:', err.message);
        console.log('ℹ️  Running in local-only mode. Webhook URL:', `http://localhost:${port}/v1/webhooks/sms-sync`);
      } else {
        console.log(`⟳ Retrying ngrok (${retries} left)...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
});
