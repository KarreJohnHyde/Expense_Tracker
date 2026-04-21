/**
 * ML Demo Page - Showcase all machine learning features
 * Route: /ml-demo
 */

import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Loader,
} from 'lucide-react';
import { useML } from '../../lib/hooks/useML';
import { mlTestSuite } from '../../lib/ml/mlTestSuite';
import type { TestResult } from '../../lib/ml/mlTestSuite';

export default function MLDemoPage() {
  const ml = useML({ autoInitialize: true });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [testText, setTestText] = useState('Swiggy food delivery');
  const [testAmount, setTestAmount] = useState('450');
  const [predictResult, setPredictResult] = useState<any>(null);
  const [forecastResult, setForecastResult] = useState<any[]>([]);

  // Run tests on mount
  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setTestRunning(true);
    const results = await mlTestSuite.runAllTests();
    setTestResults(results);
    setTestRunning(false);
  };

  const runPrediction = async () => {
    setPredictResult(null);
    const result = await ml.predict(testText, parseFloat(testAmount) || 0);
    setPredictResult(result);
  };

  const runForecast = async () => {
    setForecastResult([]);
    const forecast = await ml.forecast(7);
    setForecastResult(forecast);
  };

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const skipCount = testResults.filter(r => r.status === 'skip').length;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
          <Brain className="size-10 text-blue-600" />
          ML/DL Features Demo
        </h1>
        <p className="text-gray-600">
          Test and explore all machine learning capabilities of your expense tracker
        </p>
      </div>

      {/* System Status */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="size-5 text-yellow-500" />
            System Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600">ML Manager</div>
              <div className="text-2xl font-bold mt-2">
                {ml.initialized ? '✓' : '○'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600">Classifier</div>
              <div className="text-2xl font-bold mt-2">
                {ml.stats.classifierReady ? '✓' : '○'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600">Predictor</div>
              <div className="text-2xl font-bold mt-2">
                {ml.stats.predictorReady ? '✓' : '○'}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600">Detector</div>
              <div className="text-2xl font-bold mt-2">
                {ml.stats.detectorReady ? '✓' : '○'}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Training Data Available: <span className="font-bold">{ml.stats.trainingDataSize}</span>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Need at least 50 expenses to train models
            </p>
          </div>
        </div>
      </Card>

      {/* Test Suite */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              ML Test Suite
            </h2>
            <Button
              onClick={runTests}
              disabled={testRunning}
              className="flex items-center gap-2"
            >
              {testRunning ? (
                <>
                  <Loader className="size-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Run Tests
                </>
              )}
            </Button>
          </div>

          {testResults.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{passCount}</div>
                  <div className="text-sm text-green-600">Passed</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{failCount}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-700">{skipCount}</div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {result.status === 'pass' && (
                          <CheckCircle className="size-4 text-green-600" />
                        )}
                        {result.status === 'fail' && (
                          <XCircle className="size-4 text-red-600" />
                        )}
                        {result.status === 'skip' && (
                          <AlertTriangle className="size-4 text-gray-500" />
                        )}
                        {result.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {result.message}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {result.duration.toFixed(0)}ms
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Category Prediction Demo */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="size-5 text-purple-500" />
            Expense Category Prediction
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={testText}
                onChange={e => setTestText(e.target.value)}
                placeholder="Enter expense description..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                value={testAmount}
                onChange={e => setTestAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <Button onClick={runPrediction} disabled={!ml.initialized || ml.loading}>
              Predict Category
            </Button>

            {predictResult && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Predicted Category</div>
                  <Badge className="mt-1" variant="default">
                    {predictResult.category?.predicted || 'N/A'}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Confidence</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">
                    {((predictResult.category?.confidence || 0) * 100).toFixed(1)}%
                  </div>
                </div>

                {predictResult.anomaly && (
                  <div>
                    <div className="text-sm text-gray-600">Anomaly Status</div>
                    {predictResult.anomaly.isAnomaly ? (
                      <div className="mt-1 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm flex items-start gap-2">
                        <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
                        <div>{predictResult.anomaly.reason}</div>
                      </div>
                    ) : (
                      <div className="mt-1 p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
                        Normal spending pattern
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Spending Forecast Demo */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-green-500" />
            7-Day Spending Forecast
          </h2>

          <Button onClick={runForecast} disabled={!ml.initialized || ml.loading} className="mb-4">
            Generate Forecast
          </Button>

          {forecastResult.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {forecastResult.map((day, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="text-xs text-gray-600">{day.date}</div>
                  <div className="text-lg font-bold text-primary mt-1">
                    ₹{day.predictedAmount.toFixed(0)}
                  </div>
                  <div className="text-xs mt-2">
                    <Badge
                      variant={
                        day.trend === 'increasing'
                          ? 'destructive'
                          : day.trend === 'decreasing'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {day.trend}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Conf: {(day.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {forecastResult.length === 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-center">
              Click "Generate Forecast" to see 7-day spending predictions
            </div>
          )}
        </div>
      </Card>

      {/* Quick Links */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-blue-600">1.</div>
              <div>
                <div className="font-medium">Read the Documentation</div>
                <div className="text-sm text-gray-600">
                  Start with <code className="bg-gray-100 px-2 py-1 rounded">ML_QUICK_START.md</code>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-blue-600">2.</div>
              <div>
                <div className="font-medium">Collect Training Data</div>
                <div className="text-sm text-gray-600">
                  Add 50+ labeled expenses to your database
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-blue-600">3.</div>
              <div>
                <div className="font-medium">Train Models</div>
                <div className="text-sm text-gray-600">
                  Use the ML Integration component to train
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-blue-600">4.</div>
              <div>
                <div className="font-medium">Integrate into Components</div>
                <div className="text-sm text-gray-600">
                  Use the <code className="bg-gray-100 px-2 py-1 rounded">useML</code> hook
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
