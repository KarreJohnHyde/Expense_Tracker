/**
 * financial-intelligence — Supabase Edge Function (Deno)
 *
 * Advanced edge-computed financial analytics including:
 *   1. Spending Anomaly Detection (Z-score based)
 *   2. Predictive Budget Forecasting (linear regression)
 *   3. K-Means Expense Clustering
 *   4. Category Trend Analysis
 *
 * All computation runs on Supabase's Edge network (Deno Deploy),
 * keeping heavy analytics off the client's browser.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Statistical helpers ────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// ── Anomaly Detection (Z-Score) ────────────────────────────────────────────

interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface Anomaly {
  expense: Expense;
  zScore: number;
  severity: "mild" | "moderate" | "severe";
  reason: string;
}

function detectAnomalies(expenses: Expense[]): Anomaly[] {
  if (expenses.length < 3) return [];

  const amounts = expenses.map((e) => e.amount);
  const m = mean(amounts);
  const sd = stddev(amounts);
  if (sd === 0) return [];

  const anomalies: Anomaly[] = [];

  for (const exp of expenses) {
    const z = (exp.amount - m) / sd;
    if (Math.abs(z) >= 1.5) {
      const severity: Anomaly["severity"] =
        Math.abs(z) >= 3 ? "severe" : Math.abs(z) >= 2.5 ? "moderate" : "mild";
      anomalies.push({
        expense: exp,
        zScore: Math.round(z * 100) / 100,
        severity,
        reason:
          z > 0
            ? `₹${exp.amount} is ${z.toFixed(1)}σ above average spend of ₹${m.toFixed(0)}`
            : `₹${exp.amount} is ${Math.abs(z).toFixed(1)}σ below average spend of ₹${m.toFixed(0)}`,
      });
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

// ── Predictive Budget Forecast (Linear Regression) ─────────────────────────

interface ForecastResult {
  predictedNextMonth: number;
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number;
  monthlyTotals: { month: string; total: number }[];
}

function forecastBudget(expenses: Expense[]): ForecastResult {
  // Group by month
  const monthMap = new Map<string, number>();
  for (const exp of expenses) {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + exp.amount);
  }

  const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const monthlyTotals = sorted.map(([month, total]) => ({ month, total }));

  if (sorted.length < 2) {
    const lastTotal = sorted.length > 0 ? sorted[sorted.length - 1][1] : 0;
    return {
      predictedNextMonth: lastTotal,
      trend: "stable",
      trendPercentage: 0,
      monthlyTotals,
    };
  }

  // Simple linear regression: y = mx + b
  const n = sorted.length;
  const xs = sorted.map((_, i) => i);
  const ys = sorted.map(([_, v]) => v);
  const xMean = mean(xs);
  const yMean = mean(ys);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const predicted = Math.max(0, Math.round(slope * n + intercept));
  const lastTotal = ys[ys.length - 1];
  const trendPct = lastTotal > 0 ? ((predicted - lastTotal) / lastTotal) * 100 : 0;

  return {
    predictedNextMonth: predicted,
    trend: trendPct > 5 ? "increasing" : trendPct < -5 ? "decreasing" : "stable",
    trendPercentage: Math.round(trendPct * 10) / 10,
    monthlyTotals,
  };
}

// ── K-Means Clustering ─────────────────────────────────────────────────────

interface Cluster {
  centroid: number;
  label: string;
  count: number;
  expenses: Expense[];
  avgAmount: number;
}

function kMeansCluster(expenses: Expense[], k = 3, maxIter = 50): Cluster[] {
  if (expenses.length < k) {
    return [
      {
        centroid: mean(expenses.map((e) => e.amount)),
        label: "All Expenses",
        count: expenses.length,
        expenses,
        avgAmount: mean(expenses.map((e) => e.amount)),
      },
    ];
  }

  const amounts = expenses.map((e) => e.amount);
  const sorted = [...amounts].sort((a, b) => a - b);

  // Initialize centroids to evenly spaced percentiles
  let centroids: number[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i / k) * sorted.length);
    centroids.push(sorted[idx]);
  }

  let assignments: number[] = new Array(amounts.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each expense to the nearest centroid
    const newAssignments = amounts.map((amt) => {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = Math.abs(amt - centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      return bestCluster;
    });

    // Check convergence
    if (newAssignments.every((v, i) => v === assignments[i])) break;
    assignments = newAssignments;

    // Recalculate centroids
    for (let c = 0; c < k; c++) {
      const members = amounts.filter((_, i) => assignments[i] === c);
      if (members.length > 0) centroids[c] = mean(members);
    }
  }

  // Build cluster results
  const clusters: Cluster[] = centroids
    .map((centroid, c) => {
      const members = expenses.filter((_, i) => assignments[i] === c);
      return {
        centroid: Math.round(centroid),
        label: "",
        count: members.length,
        expenses: members,
        avgAmount: Math.round(mean(members.map((e) => e.amount))),
      };
    })
    .sort((a, b) => a.centroid - b.centroid);

  // Label clusters
  const labels = ["Low-Value", "Medium-Value", "High-Value"];
  clusters.forEach((c, i) => {
    c.label = labels[i] || `Cluster ${i + 1}`;
  });

  return clusters;
}

// ── Category Trend Analysis ────────────────────────────────────────────────

interface CategoryTrend {
  category: string;
  currentMonth: number;
  lastMonth: number;
  changePercent: number;
  direction: "up" | "down" | "stable";
}

function analyzeCategoryTrends(expenses: Expense[]): CategoryTrend[] {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
  const prevYear = curMonth === 0 ? curYear - 1 : curYear;

  const catMap: Record<string, { cur: number; prev: number }> = {};

  for (const exp of expenses) {
    const d = new Date(exp.date);
    const m = d.getMonth();
    const y = d.getFullYear();
    if (!catMap[exp.category]) catMap[exp.category] = { cur: 0, prev: 0 };

    if (m === curMonth && y === curYear) catMap[exp.category].cur += exp.amount;
    else if (m === prevMonth && y === prevYear) catMap[exp.category].prev += exp.amount;
  }

  return Object.entries(catMap)
    .map(([category, { cur, prev }]) => {
      const change = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;
      return {
        category,
        currentMonth: Math.round(cur),
        lastMonth: Math.round(prev),
        changePercent: Math.round(change * 10) / 10,
        direction: (change > 5 ? "up" : change < -5 ? "down" : "stable") as CategoryTrend["direction"],
      };
    })
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// ── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { expenses, action } = await req.json();

    if (!expenses || !Array.isArray(expenses)) {
      return new Response(
        JSON.stringify({ error: "expenses array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "anomalies":
        result = { anomalies: detectAnomalies(expenses) };
        break;

      case "forecast":
        result = { forecast: forecastBudget(expenses) };
        break;

      case "cluster":
        result = { clusters: kMeansCluster(expenses) };
        break;

      case "trends":
        result = { trends: analyzeCategoryTrends(expenses) };
        break;

      case "full":
      default:
        // Return everything for maximum intelligence
        result = {
          anomalies: detectAnomalies(expenses),
          forecast: forecastBudget(expenses),
          clusters: kMeansCluster(expenses),
          trends: analyzeCategoryTrends(expenses),
          computedAt: new Date().toISOString(),
          edgeRegion: Deno.env.get("DENO_REGION") || "unknown",
        };
        break;
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

export {};

