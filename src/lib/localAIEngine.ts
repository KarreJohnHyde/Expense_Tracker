/**
 * LocalAIEngine — fully client-side financial intelligence.
 * No OpenAI, no Supabase edge function, no network required.
 * Works entirely on the user's local expense data.
 */

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod?: string;
  source?: string;
}

interface CategoryStat {
  total: number;
  count: number;
  avg: number;
  pct: number;
}

// ─── Data helpers ────────────────────────────────────────────────────────────

function now() { return new Date(); }
function startOfMonth(d = now()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfLastMonth() {
  const d = now();
  return new Date(d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(), d.getMonth() === 0 ? 11 : d.getMonth() - 1, 1);
}
function endOfLastMonth() { return new Date(startOfMonth().getTime() - 1); }

function fmt(n: number) { return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function pct(n: number) { return `${n.toFixed(1)}%`; }

function dayName(d: number) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d];
}

function categoryStats(expenses: Expense[]): Record<string, CategoryStat> {
  const total = expenses.reduce((s, e) => s + e.amount, 0) || 1;
  const map: Record<string, { total: number; count: number }> = {};
  expenses.forEach(e => {
    if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
    map[e.category].total += e.amount;
    map[e.category].count += 1;
  });
  const result: Record<string, CategoryStat> = {};
  Object.entries(map).forEach(([cat, s]) => {
    result[cat] = { total: s.total, count: s.count, avg: s.total / s.count, pct: (s.total / total) * 100 };
  });
  return result;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length);
}

// ─── Analysis functions ───────────────────────────────────────────────────────

function analyzeSpending(expenses: Expense[]) {
  if (!expenses.length) return '📭 No expense data found. Add some expenses first to get analysis!';

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const avg = total / expenses.length;
  const cats = categoryStats(expenses);
  const sorted = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);
  const top3 = sorted.slice(0, 3);

  // Day-of-week pattern
  const dayTotals: Record<number, number> = {};
  expenses.forEach(e => {
    const d = new Date(e.date).getDay();
    dayTotals[d] = (dayTotals[d] || 0) + e.amount;
  });
  const peakDay = Object.entries(dayTotals).sort((a, b) => +b[1] - +a[1])[0];

  // Month-over-month
  const thisMonth = expenses.filter(e => new Date(e.date) >= startOfMonth());
  const lastMonth = expenses.filter(e => new Date(e.date) >= startOfLastMonth() && new Date(e.date) <= endOfLastMonth());
  const thisTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
  const lastTotal = lastMonth.reduce((s, e) => s + e.amount, 0);
  const momChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
  const trend = momChange > 10 ? '📈 spending is rising' : momChange < -10 ? '📉 spending is falling' : '📊 spending is steady';

  let r = `## 📊 Deep Spending Analysis\n\n`;
  r += `**Overview:** ${expenses.length} transactions totalling ${fmt(total)}\n`;
  r += `**Average per transaction:** ${fmt(avg)}\n\n`;

  r += `### 🏆 Top Spending Categories\n`;
  top3.forEach(([cat, s], i) => {
    r += `${i + 1}. **${cat}** — ${fmt(s.total)} (${pct(s.pct)}) · ${s.count} txns · avg ${fmt(s.avg)}\n`;
  });

  r += `\n### 📅 Month-over-Month\n`;
  r += `- This month: ${fmt(thisTotal)} (${thisMonth.length} txns)\n`;
  r += `- Last month: ${fmt(lastTotal)} (${lastMonth.length} txns)\n`;
  r += `- Trend: ${trend} (${momChange >= 0 ? '+' : ''}${pct(momChange)})\n`;

  if (peakDay) {
    r += `\n### 📆 Peak Spending Day\n`;
    r += `You spend the most on **${dayName(+peakDay[0])}s** — plan accordingly!\n`;
  }

  return r;
}

function buildBudgetPlan(expenses: Expense[]) {
  if (!expenses.length) return '📭 No expense data found. Add some expenses to generate a budget plan!';

  const months: Record<string, number> = {};
  expenses.forEach(e => {
    const m = e.date.slice(0, 7);
    months[m] = (months[m] || 0) + e.amount;
  });
  const monthValues = Object.values(months);
  const avgMonthly = monthValues.length ? monthValues.reduce((a, b) => a + b, 0) / monthValues.length : 0;

  const cats = categoryStats(expenses);
  const sorted = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);

  let r = `## 📋 Personalized Budget Plan\n\n`;
  r += `Based on your **${Object.keys(months).length} months** of data, your avg monthly spend is **${fmt(avgMonthly)}**.\n\n`;

  r += `### 🎯 Recommended Monthly Allocations\n`;
  sorted.forEach(([cat, s]) => {
    const monthlyAvg = s.total / (Object.keys(months).length || 1);
    const suggested = monthlyAvg * 0.9; // 10% reduction target
    r += `- **${cat}:** ${fmt(suggested)}/mo _(currently averaging ${fmt(monthlyAvg)})_\n`;
  });

  const savingsTarget = avgMonthly * 0.2;
  r += `\n### 💰 Savings Goal\n`;
  r += `Target **${pct(20)}** savings = **${fmt(savingsTarget)}/month**\n`;
  r += `Suggested total budget: **${fmt(avgMonthly * 0.8)}/month**\n\n`;

  r += `### ✅ Action Steps\n`;
  r += `1. Set up auto-transfer of ${fmt(savingsTarget)} on payday\n`;
  r += `2. Review your top 3 categories weekly\n`;
  r += `3. Use the 50-30-20 rule: Needs/Wants/Savings\n`;
  r += `4. Track daily using this app — awareness reduces spending by 15-20%\n`;

  return r;
}

function detectAnomalies(expenses: Expense[]) {
  if (!expenses.length) return '📭 No expense data to scan for anomalies.';

  const amounts = expenses.map(e => e.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const sd = stdDev(amounts);
  const threshold = mean + 2 * sd;

  const anomalies = expenses.filter(e => e.amount > threshold)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Duplicate detection (same amount + description within 7 days)
  const duplicates: Expense[] = [];
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const di = Math.abs(new Date(expenses[i].date).getTime() - new Date(expenses[j].date).getTime()) / 86400000;
      if (di <= 7 && expenses[i].amount === expenses[j].amount && expenses[i].description.toLowerCase() === expenses[j].description.toLowerCase()) {
        duplicates.push(expenses[j]);
      }
    }
  }

  const riskScore = Math.min(anomalies.length * 15 + duplicates.length * 10, 100);
  const level = riskScore > 60 ? '🔴 High' : riskScore > 30 ? '🟡 Medium' : '🟢 Low';

  let r = `## 🚨 Anomaly & Risk Detection\n\n`;
  r += `**Risk Score:** ${riskScore}/100 · Risk Level: ${level}\n`;
  r += `**Statistical threshold:** ${fmt(threshold)} (mean ${fmt(mean)} + 2σ)\n\n`;

  if (anomalies.length) {
    r += `### ⚠️ High-Value Outliers (${anomalies.length} found)\n`;
    anomalies.forEach(e => {
      r += `- ${e.date} · **${e.description}** · ${fmt(e.amount)} · ${e.category}\n`;
    });
  } else {
    r += `### ✅ No High-Value Outliers\nAll transactions are within normal statistical range.\n`;
  }

  if (duplicates.length) {
    r += `\n### 🔁 Possible Duplicate Charges (${duplicates.length})\n`;
    duplicates.slice(0, 3).forEach(e => {
      r += `- ${e.date} · **${e.description}** · ${fmt(e.amount)}\n`;
    });
    r += `_Review these for potential double-billing._\n`;
  }

  r += `\n### 🛡️ Recommendations\n`;
  if (riskScore > 30) {
    r += `- Review the flagged transactions above\n- Enable transaction alerts on your bank app\n- Consider setting daily spend limits\n`;
  } else {
    r += `- Your spending appears normal ✅\n- Continue monitoring regularly\n`;
  }

  return r;
}

function forecastSpending(expenses: Expense[]) {
  if (expenses.length < 5) return '📭 Need at least 5 expenses to generate a forecast. Add more data!';

  const dayOfMonth = now().getDate();
  const daysInMonth = new Date(now().getFullYear(), now().getMonth() + 1, 0).getDate();

  const thisMonth = expenses.filter(e => new Date(e.date) >= startOfMonth());
  const spentSoFar = thisMonth.reduce((s, e) => s + e.amount, 0);
  const dailyRate = spentSoFar / dayOfMonth;
  const projectedEnd = dailyRate * daysInMonth;
  const remaining = projectedEnd - spentSoFar;

  // 3-month trend
  const recentMonths: Record<string, number> = {};
  expenses.forEach(e => {
    const m = e.date.slice(0, 7);
    recentMonths[m] = (recentMonths[m] || 0) + e.amount;
  });
  const monthVals = Object.entries(recentMonths).sort().slice(-3).map(m => m[1]);
  const avgLast3 = monthVals.length ? monthVals.reduce((a, b) => a + b, 0) / monthVals.length : 0;
  const nextMonthForecast = avgLast3 * 1.05; // +5% seasonal buffer

  let r = `## 🔮 Financial Forecast\n\n`;
  r += `### 📆 This Month Projection\n`;
  r += `- Spent so far (day ${dayOfMonth}): **${fmt(spentSoFar)}**\n`;
  r += `- Daily burn rate: **${fmt(dailyRate)}/day**\n`;
  r += `- Projected month-end total: **${fmt(projectedEnd)}**\n`;
  r += `- Estimated remaining spend: **${fmt(remaining)}** over ${daysInMonth - dayOfMonth} days\n\n`;

  r += `### 📈 Next Month Forecast\n`;
  r += `- Based on last 3 months avg: **${fmt(avgLast3)}**\n`;
  r += `- Forecasted next month: **${fmt(nextMonthForecast)}** _(+5% seasonal buffer)_\n\n`;

  const cats = categoryStats(thisMonth);
  const topCat = Object.entries(cats).sort((a, b) => b[1].total - a[1].total)[0];
  if (topCat) {
    r += `### 🔍 Key Driver\n`;
    r += `**${topCat[0]}** is your biggest current-month category at ${fmt(topCat[1].total)} (${pct(topCat[1].pct)})\n\n`;
  }

  r += `### 💡 Savings Opportunity\n`;
  const saveable = projectedEnd * 0.15;
  r += `Reducing discretionary spend by 15% could save **${fmt(saveable)}** this month.\n`;

  return r;
}

function behavioralInsights(expenses: Expense[]) {
  if (!expenses.length) return '📭 No expense data found for behavioral analysis.';

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const cats = categoryStats(expenses);

  // Impulse detection: evening + weekend + non-essential categories
  const impulsive = expenses.filter(e => {
    const d = new Date(e.date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const nonEssential = ['Shopping', 'Entertainment', 'Food & Dining', 'Others'].includes(e.category);
    return isWeekend && nonEssential;
  });
  const impulseTotal = impulsive.reduce((s, e) => s + e.amount, 0);
  const impulsePct = total > 0 ? (impulseTotal / total) * 100 : 0;

  // Payment method bias
  const methodMap: Record<string, number> = {};
  expenses.forEach(e => {
    const m = e.paymentMethod || 'Cash';
    methodMap[m] = (methodMap[m] || 0) + e.amount;
  });
  const topMethod = Object.entries(methodMap).sort((a, b) => b[1] - a[1])[0];

  // Category concentration (HHI)
  const hhi = Object.values(cats).reduce((acc, s) => acc + (s.pct / 100) ** 2, 0);
  const diversification = hhi < 0.25 ? 'Well-diversified' : hhi < 0.5 ? 'Moderately concentrated' : 'Highly concentrated';

  let r = `## 🧠 Behavioral Finance Insights\n\n`;

  r += `### 🛍️ Impulse Spending Detector\n`;
  r += `Weekend non-essential spending: **${fmt(impulseTotal)}** (${pct(impulsePct)} of total)\n`;
  if (impulsePct > 30) {
    r += `_⚠️ High impulse tendency — consider a 24-hour rule before purchases above ${fmt(1000)}_\n`;
  } else {
    r += `_✅ Impulse spending is within healthy range_\n`;
  }

  r += `\n### 💳 Payment Behaviour\n`;
  if (topMethod) {
    r += `Preferred payment: **${topMethod[0]}** (${fmt(topMethod[1])})\n`;
    if (topMethod[0].toLowerCase().includes('credit')) {
      r += `_⚠️ Heavy credit card use — watch for revolving debt risk_\n`;
    } else if (topMethod[0].toLowerCase() === 'cash') {
      r += `_💡 Cash users typically spend 15-20% less than card users_\n`;
    }
  }

  r += `\n### 📊 Spending Diversification\n`;
  r += `HHI Score: ${hhi.toFixed(3)} → **${diversification}**\n`;
  if (hhi > 0.4) {
    const dominant = Object.entries(cats).sort((a, b) => b[1].pct - a[1].pct)[0];
    r += `Your spending is heavily weighted toward **${dominant[0]}** (${pct(dominant[1].pct)})\n`;
  }

  r += `\n### 🎯 Behavioural Nudges\n`;
  r += `1. **Automation bias:** Set auto-savings before spending — "pay yourself first"\n`;
  r += `2. **Anchoring:** Use last month's spend as your mental anchor, not income\n`;
  r += `3. **Loss aversion:** Frame savings as "keeping" money, not "losing" spending power\n`;
  r += `4. **Present bias:** Schedule weekly finance reviews to counteract short-term thinking\n`;

  return r;
}

function categoryDeepDive(expenses: Expense[]) {
  if (!expenses.length) return '📭 No expense data found for category analysis.';

  const cats = categoryStats(expenses);
  const sorted = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  let r = `## 📊 Category Deep Dive\n\n`;
  r += `**Total across ${sorted.length} categories:** ${fmt(total)}\n\n`;

  sorted.forEach(([cat, s]) => {
    const bar = '█'.repeat(Math.round(s.pct / 5)) + '░'.repeat(20 - Math.round(s.pct / 5));
    r += `### ${cat}\n`;
    r += `\`${bar}\` ${pct(s.pct)}\n`;
    r += `- Total: **${fmt(s.total)}** · Transactions: **${s.count}** · Avg: **${fmt(s.avg)}**\n`;

    // Category-specific tips
    if (cat === 'Food & Dining' && s.pct > 30) r += `_💡 Tip: Meal prepping can cut food spend by 20-30%_\n`;
    if (cat === 'Entertainment' && s.pct > 20) r += `_💡 Tip: Review streaming subscriptions — avg user has 3+ unused_\n`;
    if (cat === 'Shopping' && s.pct > 25) r += `_💡 Tip: Try a 30-day shopping list rule before any non-essentials_\n`;
    if (cat === 'Transportation' && s.pct > 20) r += `_💡 Tip: Carpooling or monthly passes could cut this by 25%_\n`;
    r += '\n';
  });

  return r;
}

function quickTotal(expenses: Expense[], timeLabel: string) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  if (!expenses.length) return `No expenses found ${timeLabel}.`;
  return `💰 You spent **${fmt(total)}** ${timeLabel} across **${expenses.length} transactions**.\nAverage per transaction: ${fmt(total / expenses.length)}`;
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

export function processLocalAI(message: string, expenses: Expense[]): string {
  const q = message.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|namaste|vanakkam|namaskar|wassup)/.test(q)) {
    const n = expenses.length;
    return `👋 Hello! I'm your **AI CFO**, fully powered by your ${n} expense records.\n\nI can help you with:\n- 📊 **Deep Analysis** — spending patterns & trends\n- 📋 **Budget Plan** — personalized monthly allocations\n- 🚨 **Anomaly Check** — unusual or duplicate charges\n- 🔮 **Forecast** — predict next month's spend\n- 🧠 **Behavioral Insights** — psychology of your spending\n- 📊 **Category Dive** — per-category breakdown\n\nJust ask naturally or tap one of the quick chips below!`;
  }

  // Time-filtered totals
  const thisMonth = expenses.filter(e => new Date(e.date) >= startOfMonth());
  const today = expenses.filter(e => new Date(e.date).toDateString() === now().toDateString());
  const last7 = expenses.filter(e => new Date(e.date) >= new Date(now().getTime() - 7 * 86400000));

  if (/today/.test(q)) return quickTotal(today, 'today');
  if (/this month|current month/.test(q)) return quickTotal(thisMonth, 'this month');
  if (/last 7 days|last week|past week/.test(q)) return quickTotal(last7, 'in the last 7 days');

  // Category queries
  const knownCats = ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'healthcare', 'education', 'travel'];
  for (const kw of knownCats) {
    if (q.includes(kw)) {
      const catMatch = expenses.filter(e => e.category.toLowerCase().includes(kw) || e.description.toLowerCase().includes(kw));
      if (catMatch.length) return quickTotal(catMatch, `on ${kw}`);
    }
  }

  // Main intents
  if (/deep analysis|spending pattern|how am i doing|analysis|analyze/.test(q)) return analyzeSpending(expenses);
  if (/budget plan|budget|50.30.20|allocat/.test(q)) return buildBudgetPlan(expenses);
  if (/anomal|unusual|suspicious|fraud|duplicate|risk/.test(q)) return detectAnomalies(expenses);
  if (/forecast|predict|next month|projection/.test(q)) return forecastSpending(expenses);
  if (/behav|psycholog|impulse|habit|bias/.test(q)) return behavioralInsights(expenses);
  if (/category|categor|deep dive/.test(q)) return categoryDeepDive(expenses);

  // Total / summary
  if (/total|how much|spent|spend|summary|overview|report/.test(q)) return quickTotal(expenses, 'overall');

  // Highest expense
  if (/highest|biggest|largest|most expensive/.test(q)) {
    if (!expenses.length) return '📭 No expenses found.';
    const max = expenses.reduce((a, b) => a.amount > b.amount ? a : b);
    return `🔝 Your biggest expense is **${fmt(max.amount)}** — "${max.description}" on ${max.date} (${max.category})`;
  }

  // Audit / trust score
  if (/audit|trust score|integrity/.test(q)) {
    const withReceipt = expenses.filter(e => (e as any).receiptImage || (e as any).source === 'receipt_scan');
    const score = expenses.length > 0 ? Math.round((withReceipt.length / expenses.length) * 100) : 100;
    return `🔍 **Financial Integrity Audit**\n\n- Trust Score: **${score}/100**\n- Verified with receipts: **${withReceipt.length}**\n- Total transactions: **${expenses.length}**\n\n${score > 70 ? '✅ Strong financial documentation!' : '⚠️ Consider uploading receipts for more transactions to improve your trust score.'}`;
  }

  // Fallback
  return `I analyzed your **${expenses.length} expenses** but couldn't match a specific query.\n\nTry asking:\n- "Deep analysis of my spending"\n- "Build me a budget plan"\n- "Check for anomalies"\n- "Forecast next month"\n- "How much on food?"\n- "What's my biggest expense?"`;
}
