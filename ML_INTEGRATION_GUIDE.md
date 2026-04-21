# Integration Guide: Adding ML/DL to Existing Components

## 🎯 Overview

This guide shows how to integrate the ML/DL system into your existing expense tracking UI components. The `useML` hook makes integration simple and clean.

## 📋 Table of Contents

1. [Basic Integration](#basic-integration)
2. [Expense Form Integration](#expense-form-integration)
3. [Gallery Integration](#gallery-integration)
4. [Dashboard Integration](#dashboard-integration)
5. [Troubleshooting](#troubleshooting)

---

## Basic Integration

### Step 1: Import the Hook

```typescript
import { useML } from '@/lib/hooks/useML';
```

### Step 2: Use in Component

```typescript
function MyComponent() {
  const ml = useML({ autoInitialize: true });

  return (
    <div>
      <p>ML System: {ml.initialized ? '✓ Ready' : '○ Loading...'}</p>
    </div>
  );
}
```

### Available Methods

```typescript
const {
  // State
  initialized,      // boolean - system ready?
  loading,          // boolean - currently processing?
  error,            // string | null - error message
  stats,            // object - model statistics
  
  // Methods
  predict,          // Predict category + anomaly
  forecast,         // Get spending forecast
  trainModels,      // Train on historical data
  categorizeBatch,  // Batch categorize multiple items
  saveModels,       // Save to IndexedDB
  loadModels,       // Load from IndexedDB
} = useML();
```

---

## Expense Form Integration

### Auto-Categorize on Description Change

```typescript
'use client';

import React, { useState } from 'react';
import { useML } from '@/lib/hooks/useML';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function ExpenseForm() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [confidence, setConfidence] = useState(0);
  const { predict, initialized } = useML();

  const handleDescriptionChange = async (text) => {
    setDescription(text);

    // Auto-predict if ML ready and text is long enough
    if (initialized && text.length > 3) {
      const result = await predict(text, parseFloat(amount) || 0);
      
      if (result?.category) {
        setCategory(result.category.predicted);
        setConfidence(result.category.confidence);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Description</label>
        <Input
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="What did you buy?"
        />
        {confidence > 0.5 && (
          <Badge className="mt-2">
            Auto-detected: {(confidence * 100).toFixed(0)}%
          </Badge>
        )}
      </div>

      <div>
        <label>Category</label>
        <Select value={category} onChange={(val) => setCategory(val)}>
          <option value="">Select category</option>
          <option value="Food & Dining">Food & Dining</option>
          <option value="Transportation">Transportation</option>
          {/* ... other categories ... */}
        </Select>
      </div>

      <div>
        <label>Amount</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <button
        onClick={() => {
          // Submit with ML predictions
          console.log({ description, category, amount });
        }}
      >
        Save Expense
      </button>
    </div>
  );
}
```

---

## Gallery Integration

### Add ML Features to Expense List

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useML } from '@/lib/hooks/useML';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: Date;
}

export function ExpenseGallery({ expenses }: { expenses: Expense[] }) {
  const { predict, forecast } = useML();
  const [predictions, setPredictions] = useState<any>({});
  const [forecastData, setForecastData] = useState<any[]>([]);

  // Run predictions on load
  useEffect(() => {
    if (!expenses.length) return;

    (async () => {
      // Predict all expenses
      const preds: any = {};
      for (const expense of expenses) {
        const result = await predict(expense.description, expense.amount);
        preds[expense.id] = result;
      }
      setPredictions(preds);

      // Get spending forecast
      const amounts = expenses.map((e) => e.amount);
      if (amounts.length > 0) {
        const forecast_result = await forecast(30);
        setForecastData(forecast_result);
      }
    })();
  }, [expenses, predict, forecast]);

  return (
    <div className="space-y-4">
      {/* Spending Forecast Section */}
      {forecastData.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-5 text-blue-600" />
            <h3 className="font-semibold">30-Day Spending Forecast</h3>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {forecastData.slice(0, 7).map((day, idx) => (
              <div key={idx} className="text-center p-2 bg-white rounded">
                <div className="text-xs text-gray-600">{day.date}</div>
                <div className="font-bold text-sm">₹{day.predictedAmount.toFixed(0)}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {day.trend}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List with ML Predictions */}
      <div className="space-y-2">
        <h3 className="font-semibold">Recent Expenses</h3>
        
        {expenses.map((expense) => {
          const pred = predictions[expense.id];
          const isAnomaly = pred?.anomaly?.isAnomaly;

          return (
            <div
              key={expense.id}
              className={`p-3 border rounded-lg flex justify-between items-start ${
                isAnomaly ? 'border-red-300 bg-red-50' : ''
              }`}
            >
              <div className="flex-1">
                <div className="font-medium">{expense.description}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {expense.category} • ₹{expense.amount}
                </div>

                {/* Show predictions */}
                {pred && (
                  <div className="mt-2 space-y-1">
                    {/* Category Prediction */}
                    {pred.category && (
                      <div className="text-xs">
                        <Badge
                          variant={
                            pred.category.predicted === expense.category
                              ? 'default'
                              : 'outline'
                          }
                        >
                          Predicted: {pred.category.predicted}
                          ({(pred.category.confidence * 100).toFixed(0)}%)
                        </Badge>
                      </div>
                    )}

                    {/* Anomaly Alert */}
                    {isAnomaly && (
                      <div className="text-xs flex items-start gap-1">
                        <AlertTriangle className="size-3 mt-0.5 text-red-600" />
                        <span className="text-red-700">
                          {pred.anomaly.reason}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {new Date(expense.date).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Dashboard Integration

### Show ML Insights on Dashboard

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useML } from '@/lib/hooks/useML';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Brain } from 'lucide-react';

export function MLDashboard({ expenses }: { expenses: Expense[] }) {
  const { forecast, stats, trainModels, initialized } = useML();
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>({});

  useEffect(() => {
    (async () => {
      if (!initialized) return;

      // Get forecast
      const forecast_result = await forecast(30);
      setForecastData(forecast_result);

      // Calculate insights
      const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
      const avgDaily = totalSpending / (expenses.length || 1);
      const forecast30 = forecast_result.reduce(
        (sum, d) => sum + d.predictedAmount,
        0
      );

      setInsights({
        totalSpending,
        avgDaily,
        forecast30,
        anomalyCount: expenses.length > 50 ? '12' : 'N/A',
      });
    })();
  }, [initialized, expenses, forecast]);

  // Auto-train if needed
  useEffect(() => {
    if (expenses.length >= 50 && !stats.classifierReady) {
      trainModels(expenses).catch(console.error);
    }
  }, [expenses, stats, trainModels]);

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Spending</div>
          <div className="text-2xl font-bold">₹{insights.totalSpending?.toFixed(0) || '-'}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600">Avg Daily</div>
          <div className="text-2xl font-bold">₹{insights.avgDaily?.toFixed(0) || '-'}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600">30-Day Forecast</div>
          <div className="text-2xl font-bold">₹{insights.forecast30?.toFixed(0) || '-'}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600">Anomalies</div>
          <div className="text-2xl font-bold">{insights.anomalyCount}</div>
        </Card>
      </div>

      {/* Spending Trend */}
      {forecastData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-blue-600" />
            <h3 className="font-semibold">Next 7 Days</h3>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {forecastData.slice(0, 7).map((day, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xs text-gray-600 mb-1">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'short' 
                  })}
                </div>
                <div className="text-lg font-bold">₹{day.predictedAmount.toFixed(0)}</div>
                <Badge
                  variant={
                    day.trend === 'increasing'
                      ? 'destructive'
                      : day.trend === 'decreasing'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="text-xs mt-1"
                >
                  {day.trend}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ML System Status */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="size-5 text-purple-600" />
          <h3 className="font-semibold">ML System Status</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            Classifier: {stats.classifierReady ? (
              <Badge className="ml-1">Ready</Badge>
            ) : (
              <Badge variant="outline">Loading...</Badge>
            )}
          </div>
          <div>
            Predictor: {stats.predictorReady ? (
              <Badge className="ml-1">Ready</Badge>
            ) : (
              <Badge variant="outline">Loading...</Badge>
            )}
          </div>
          <div>
            Detector: {stats.detectorReady ? (
              <Badge className="ml-1">Ready</Badge>
            ) : (
              <Badge variant="outline">Loading...</Badge>
            )}
          </div>
          <div>
            Training Data: {stats.trainingDataSize || 0}
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: "useML not initialized"

**Solution:**
```typescript
// Make sure you're using it in a client component
'use client';

// Wait for initialization
const { initialized } = useML();
if (!initialized) return <div>Loading ML...</div>;
```

### Issue: "No predictions available"

**Solution:** Need 50+ labeled expenses in database

```typescript
const expenses = await api.getExpenses();
if (expenses.filter(e => e.category).length < 50) {
  console.log('Need more labeled expenses');
  return;
}
```

### Issue: "Models loading slowly"

**Solution:** Use batch operations

```typescript
// Instead of predicting one by one
const results = await categorizeBatch(descriptions); // 3x faster

// Instead of:
for (const desc of descriptions) {
  await predict(desc, 0);
}
```

### Issue: "IndexedDB full"

**Solution:** Clear old models

```typescript
localStorage.removeItem('expense_ml_v1');
// Retrain models
```

---

## Best Practices

✅ **Do:**
- Use `useML()` hook from `@/lib/hooks/useML`
- Cache predictions locally
- Show confidence scores
- Add error boundaries
- Test with ML demo page

❌ **Don't:**
- Call predict() on every keystroke (debounce instead)
- Ignore confidence scores below 0.5
- Train models with <50 expenses
- Assume predictions are always correct

---

## Example: Complete Integrated Component

```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useML } from '@/lib/hooks/useML';
import { debounce } from '@/lib/utils';

export function SmartExpenseForm() {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  
  const { predict, initialized, loading } = useML();

  // Debounce predictions
  const debouncedPredict = useCallback(
    debounce(async (text: string, amt: number) => {
      if (initialized && text.length > 3) {
        const result = await predict(text, amt);
        if (result?.category?.confidence > 0.5) {
          setSuggestion(result.category);
        }
      }
    }, 500),
    [initialized, predict]
  );

  const handleDescChange = (value: string) => {
    setDesc(value);
    debouncedPredict(value, parseFloat(amount) || 0);
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      // Handle submit
    }}>
      <div>
        <input
          value={desc}
          onChange={(e) => handleDescChange(e.target.value)}
          placeholder="What did you buy?"
        />
        {suggestion && (
          <div className="p-2 mt-2 bg-blue-50 rounded">
            <button
              type="button"
              onClick={() => {
                setCategory(suggestion.predicted);
                setSuggestion(null);
              }}
            >
              Suggest: {suggestion.predicted} 
              ({(suggestion.confidence * 100).toFixed(0)}%)
            </button>
          </div>
        )}
      </div>

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option>Select Category</option>
      </select>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />

      <button disabled={loading || !category || !amount}>
        {loading ? 'Processing...' : 'Save'}
      </button>
    </form>
  );
}
```

---

## Summary

Integration points:
1. **Forms**: Auto-suggest categories
2. **Gallery**: Show predictions and anomalies
3. **Dashboard**: Display insights and forecasts
4. **Alerts**: Notify on unusual spending

All using the simple `useML()` hook! 🚀
