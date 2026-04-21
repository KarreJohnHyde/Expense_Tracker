/**
 * ML Integration Example Component
 * Demonstrates how to use ML features in your app
 */

import React, { useEffect, useState } from 'react';
import { useML } from '../../lib/hooks/useML';
import { Button } from './ui/button';
import { Card, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, TrendingUp, Brain, Zap } from 'lucide-react';
import type { Expense } from '../lib/api';

interface MLExampleProps {
  expenses: Expense[];
  onCategoryPredicted?: (expenseId: string, category: string) => void;
  onAnomalyDetected?: (expenseId: string, severity: number) => void;
}

export function MLIntegrationExample({
  expenses,
  onCategoryPredicted,
  onAnomalyDetected,
}: MLExampleProps) {
  const {
    initialized,
    loading,
    error,
    stats,
    trainModels,
    predict,
    forecast,
    categorizeBatch,
    loadModels,
    saveModels,
  } = useML({ autoInitialize: true });

  const [predictions, setPredictions] = useState<Map<string, any>>(
    new Map()
  );
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [isTraining, setIsTraining] = useState(false);

  // Train models when component mounts and expenses are available
  useEffect(() => {
    if (expenses.length > 50 && initialized && !isTraining) {
      handleTrainModels();
    }
  }, [expenses.length, initialized]);

  const handleTrainModels = async () => {
    setIsTraining(true);
    const success = await trainModels(expenses);
    if (success) {
      console.log('✓ Models trained and saved');
      // Get forecast
      const forecast_data = await forecast(30);
      setForecastData(forecast_data);
    }
    setIsTraining(false);
  };

  const handlePredictExpense = async (expense: Expense) => {
    const prediction = await predict(
      expense.description || '',
      expense.amount,
      new Date(expense.date || Date.now())
    );

    if (prediction) {
      setPredictions(new Map(predictions).set(expense.id, prediction));

      // Callback with category prediction
      if (
        prediction.category?.predicted &&
        onCategoryPredicted
      ) {
        onCategoryPredicted(expense.id, prediction.category.predicted);
      }

      // Callback if anomaly detected
      if (
        prediction.anomaly?.isAnomaly &&
        onAnomalyDetected
      ) {
        onAnomalyDetected(expense.id, prediction.anomaly.anomalyScore);
      }
    }
  };

  const handleBatchCategorize = async () => {
    if (!expenses.length) return;
    const results = await categorizeBatch(
      expenses.map(e => ({ description: e.description || '' }))
    );
    // Process results...
    console.log('Batch categorization results:', results);
  };

  return (
    <div className="space-y-6">
      {/* ML Status Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="size-5 text-blue-500" />
              Machine Learning Models
            </h3>
            {initialized && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✓ Ready
              </Badge>
            )}
          </div>

          {error && (
            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Classifier</div>
              <div className="text-lg font-semibold">
                {stats.classifierReady ? '✓' : '○'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Predictor</div>
              <div className="text-lg font-semibold">
                {stats.predictorReady ? '✓' : '○'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Detector</div>
              <div className="text-lg font-semibold">
                {stats.detectorReady ? '✓' : '○'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Training Data</div>
              <div className="text-lg font-semibold">{stats.trainingDataSize}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTrainModels}
              disabled={expenses.length < 50 || isTraining || loading}
              className="flex items-center gap-2"
            >
              <Zap className="size-4" />
              {isTraining ? 'Training...' : 'Train Models'}
            </Button>
            <Button
              onClick={() => saveModels()}
              disabled={!initialized}
              variant="outline"
            >
              Save Models
            </Button>
            <Button
              onClick={() => loadModels()}
              variant="outline"
            >
              Load Models
            </Button>
            <Button
              onClick={handleBatchCategorize}
              disabled={!initialized || expenses.length === 0}
              variant="outline"
            >
              Batch Categorize
            </Button>
          </div>

          {expenses.length < 50 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ℹ️ Need at least 50 historical expenses to train models ({expenses.length} available)
            </div>
          )}
        </div>
      </Card>

      {/* Spending Forecast */}
      {forecastData.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="size-5 text-purple-500" />
              30-Day Spending Forecast
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecastData.slice(0, 3).map((f, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600">{f.date}</div>
                  <div className="text-xl font-bold text-primary mt-1">
                    ₹{f.predictedAmount.toFixed(2)}
                  </div>
                  <div className="text-xs mt-2">
                    <Badge variant={f.trend === 'increasing' ? 'destructive' : 'secondary'}>
                      {f.trend}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Confidence: {(f.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Predictions for Recent Expenses */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Expense Predictions</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expenses.slice(0, 5).map(expense => {
              const pred = predictions.get(expense.id);
              return (
                <div key={expense.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-gray-600">₹{expense.amount.toFixed(2)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePredictExpense(expense)}
                      disabled={loading}
                    >
                      Predict
                    </Button>
                  </div>

                  {pred && (
                    <div className="space-y-2 text-xs">
                      {pred.category && (
                        <div>
                          <span className="text-gray-600">Category: </span>
                          <Badge>{pred.category.predicted}</Badge>
                          <span className="text-gray-600 ml-2">
                            ({(pred.category.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                      )}

                      {pred.anomaly?.isAnomaly && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-red-700">
                          <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium">Anomaly Detected</div>
                            <div>{pred.anomaly.reason}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
