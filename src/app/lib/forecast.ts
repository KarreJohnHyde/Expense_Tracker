export interface SeriesPoint {
  time: string;
  value: number;
}

export interface ForecastPoint {
  time: string;
  actual: number | null;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

export interface ForecastMeta {
  intervalMs: number;
  slope: number;
  stdev: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const meanX = (n - 1) / 2;
  const meanY = mean(values);
  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    const x = i - meanX;
    const y = values[i] - meanY;
    num += x * y;
    den += x * x;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function buildForecast(series: SeriesPoint[], horizon: number): { data: ForecastPoint[]; meta: ForecastMeta } {
  if (series.length === 0) {
    return { data: [], meta: { intervalMs: 3600000, slope: 0, stdev: 0 } };
  }

  const times = series.map((p) => new Date(p.time).getTime()).filter(t => Number.isFinite(t));
  const values = series.map((p) => p.value);
  const lastTime = times[times.length - 1] || Date.now();
  const intervalMs = times.length >= 2 ? Math.max(1, times[times.length - 1] - times[times.length - 2]) : 3600000;

  const { slope, intercept } = linearRegression(values);
  const residuals = values.map((v, i) => v - (intercept + slope * i));
  const residualMean = mean(residuals);
  const variance = residuals.length
    ? residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / residuals.length
    : 0;
  const stdev = Math.sqrt(variance);

  const data: ForecastPoint[] = series.map((point, idx) => ({
    time: new Date(times[idx] || lastTime).toISOString(),
    actual: point.value,
    predicted: point.value,
    upperBound: point.value,
    lowerBound: point.value,
  }));

  const n = values.length;
  for (let i = 1; i <= horizon; i++) {
    const predicted = intercept + slope * (n - 1 + i);
    const uncertainty = stdev * Math.sqrt(i + 1);
    const t = lastTime + intervalMs * i;
    data.push({
      time: new Date(t).toISOString(),
      actual: null,
      predicted,
      upperBound: predicted + uncertainty,
      lowerBound: predicted - uncertainty,
    });
  }

  return {
    data,
    meta: { intervalMs, slope, stdev },
  };
}
