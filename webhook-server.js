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
const FINANCE_INTEL_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const FINANCE_INTEL_CACHE_KEY = 'finance_intel';
const DIAMOND_PRICE_PER_CARAT_USD = Number(process.env.DIAMOND_PRICE_PER_CARAT_USD || process.env.VITE_DIAMOND_PRICE_PER_CARAT_USD || 6200);

function getMarketCache(key) {
  const entry = MARKET_CACHE.get(key);
  if (!entry) return null;
  const ttl = Number(entry.ttl || MARKET_CACHE_TTL);
  if (Date.now() - entry.timestamp > ttl) {
    MARKET_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setMarketCache(key, data, ttl = MARKET_CACHE_TTL) {
  MARKET_CACHE.set(key, { timestamp: Date.now(), data, ttl });
}

async function fetchWithTimeout(url, timeoutMs = 12000, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeXmlEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function extractTag(block, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const matched = block.match(regex);
  return decodeXmlEntities(matched?.[1] || '');
}

function parseRss(xml, maxItems = 10) {
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  return matches.slice(0, maxItems).map((match) => {
    const item = match[1];
    const title = extractTag(item, 'title').replace(/\s+/g, ' ');
    const link = extractTag(item, 'link');
    const pubDate = extractTag(item, 'pubDate');
    const source = extractTag(item, 'source');
    return {
      title,
      link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      source: source || (link ? new URL(link).hostname.replace(/^www\./, '') : 'finance'),
    };
  }).filter((item) => item.title && item.link);
}

async function fetchGoogleFinanceNews() {
  const queries = [
    'finance stock market banking ecommerce gold silver platinum diamond gdp per capita income',
    'nasdaq dow sp500 fed reserve rbi crude oil commodities macro economy',
  ];

  const jobs = queries.map(async (query) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetchWithTimeout(url, 12000, { headers: { Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } });
    if (!res.ok) throw new Error(`RSS request failed (${res.status})`);
    const text = await res.text();
    return parseRss(text, 8);
  });

  const settled = await Promise.allSettled(jobs);
  const merged = [];
  settled.forEach((entry) => {
    if (entry.status === 'fulfilled') {
      merged.push(...entry.value);
    }
  });

  const deduped = Array.from(new Map(merged.map((item) => [item.link, item])).values());
  return deduped
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10);
}

function formatCompactNumber(value, fractionDigits = 1) {
  return Number(value).toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: fractionDigits,
  });
}

async function fetchWorldBankMetric({ country, indicator, label, type = 'percent', note }) {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=60`;
  const res = await fetchWithTimeout(url, 12000, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`World Bank request failed (${res.status})`);
  const payload = await res.json();
  const series = Array.isArray(payload?.[1]) ? payload[1] : [];
  const latest = series.find((row) => row && row.value !== null && row.value !== undefined);
  if (!latest) throw new Error(`No World Bank data for ${country}:${indicator}`);
  const raw = Number(latest.value);

  let value = String(raw);
  if (type === 'percent') value = `${raw.toFixed(1)}%`;
  if (type === 'currency') value = `$${raw.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (type === 'number') value = raw.toLocaleString('en-US');

  return {
    key: `${country}_${indicator}`,
    label,
    value,
    note: `${note} (${latest.date})`,
    raw,
    source: 'World Bank',
  };
}

async function fetchNetWorthSnapshot() {
  const url = 'https://www.forbes.com/forbesapi/person/rtb/0/position/true.json?fields=personName,finalWorth,countryOfCitizenship,industries';
  const res = await fetchWithTimeout(url, 12000, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Forbes request failed (${res.status})`);
  const payload = await res.json();
  const people = Array.isArray(payload?.personList?.personsLists) ? payload.personList.personsLists : [];
  const top = people.slice(0, 100);
  const totalBillions = top.reduce((sum, person) => {
    const amount = Number(person?.finalWorth || 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return {
    combinedTop100Usd: Math.round(totalBillions * 1e9),
    combinedTop100Formatted: `$${formatCompactNumber(totalBillions, 2)}B`,
    leaders: top.slice(0, 5).map((person) => ({
      name: person.personName || 'Unknown',
      netWorthUsd: Math.round(Number(person.finalWorth || 0) * 1e9),
      netWorthFormatted: `$${Number(person.finalWorth || 0).toFixed(1)}B`,
      country: person.countryOfCitizenship || 'N/A',
    })),
    source: 'Forbes Real-Time Billionaires',
    asOf: new Date().toISOString(),
  };
}

async function buildFinanceIntelPayload() {
  const [newsResult, macroResult, netWorthResult] = await Promise.allSettled([
    fetchGoogleFinanceNews(),
    Promise.all([
      fetchWorldBankMetric({
        country: 'WLD',
        indicator: 'NY.GDP.MKTP.KD.ZG',
        label: 'World GDP Growth',
        type: 'percent',
        note: 'Annual growth',
      }),
      fetchWorldBankMetric({
        country: 'IN',
        indicator: 'NY.GDP.MKTP.KD.ZG',
        label: 'India GDP Growth',
        type: 'percent',
        note: 'Annual growth',
      }),
      fetchWorldBankMetric({
        country: 'US',
        indicator: 'NY.GDP.MKTP.KD.ZG',
        label: 'US GDP Growth',
        type: 'percent',
        note: 'Annual growth',
      }),
      fetchWorldBankMetric({
        country: 'IN',
        indicator: 'NY.GDP.PCAP.CD',
        label: 'India Per-Capita Income',
        type: 'currency',
        note: 'Current US$',
      }),
      fetchWorldBankMetric({
        country: 'US',
        indicator: 'NY.GDP.PCAP.CD',
        label: 'US Per-Capita Income',
        type: 'currency',
        note: 'Current US$',
      }),
    ]),
    fetchNetWorthSnapshot(),
  ]);

  const macro = macroResult.status === 'fulfilled' ? macroResult.value : [];
  const news = newsResult.status === 'fulfilled' && newsResult.value.length > 0 ? newsResult.value : [];
  const netWorth = netWorthResult.status === 'fulfilled' ? netWorthResult.value : null;

  return {
    asOf: new Date().toISOString(),
    news,
    macro,
    netWorth,
    resources: {
      diamond: {
        perCaratUsd: DIAMOND_PRICE_PER_CARAT_USD,
        source: process.env.DIAMOND_PRICE_PER_CARAT_USD ? 'env' : 'default',
      },
    },
    providerStatus: {
      news: newsResult.status,
      macro: macroResult.status,
      netWorth: netWorthResult.status,
    },
  };
}

app.use(cors({ 
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-token', 'x-api-key', 'ngrok-skip-browser-warning']
}));
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

app.get('/market/news-macro', async (req, res) => {
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const cached = !forceRefresh ? getMarketCache(FINANCE_INTEL_CACHE_KEY) : null;
  if (cached) {
    res.set('Cache-Control', 'no-store');
    return res.json({ ...cached, cache: 'hit' });
  }

  try {
    const payload = await buildFinanceIntelPayload();
    setMarketCache(FINANCE_INTEL_CACHE_KEY, payload, FINANCE_INTEL_CACHE_TTL);
    res.set('Cache-Control', 'no-store');
    return res.json({ ...payload, cache: 'miss' });
  } catch (err) {
    const fallback = {
      asOf: new Date().toISOString(),
      news: [],
      macro: [],
      netWorth: null,
      resources: {
        diamond: {
          perCaratUsd: DIAMOND_PRICE_PER_CARAT_USD,
          source: process.env.DIAMOND_PRICE_PER_CARAT_USD ? 'env' : 'default',
        },
      },
      providerStatus: {
        news: 'rejected',
        macro: 'rejected',
        netWorth: 'rejected',
      },
      cache: 'miss',
      error: err.message || 'Failed to fetch finance intelligence',
    };
    return res.status(502).json(fallback);
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
  "headers": { "x-webhook-token": "exp_your_secret_token" },
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
  const headerToken = req.headers['x-webhook-token'] || req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  const bearerToken = typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const queryToken = req.query.token;
  const token = (typeof headerToken === 'string' && headerToken.trim())
    || bearerToken
    || (typeof queryToken === 'string' && queryToken.trim())
    || '';
  const payload = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Missing security token. Send x-webhook-token header or Bearer token.' });
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
