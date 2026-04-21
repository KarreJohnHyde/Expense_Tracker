/**
 * ML Manager - Unified interface for all machine learning models
 * Coordinates initialization, training, and inference across all models
 */

import * as tf from '@tensorflow/tfjs';
import { classifier, ExpenseCategoryClassifier } from './categoryClassifier';
import { spendingPredictor, SpendingPredictor, SpendingForecast } from './spendingPredictor';
import { anomalyDetector, AnomalyDetector, AnomalyScore } from './anomalyDetector';
import type { Expense } from '../../app/lib/api';

export interface MLPrediction {
  category?: {
    predicted: string;
    confidence: number;
    alternatives: Record<string, number>;
  };
  anomaly?: AnomalyScore;
  spending?: SpendingForecast[];
}

export class MLManager {
  private initialized: boolean = false;
  private trainingData: Expense[] = [];

  /**
   * Initialize all models
   */
  async initialize(modelPaths?: {
    classifier?: string;
    predictor?: string;
    detector?: string;
  }): Promise<void> {
    console.log('🤖 Initializing ML models...');

    try {
      // Initialize classifier
      if (modelPaths?.classifier) {
        await classifier.loadModel(modelPaths.classifier);
      } else {
        await classifier.initialize();
      }

      // Initialize predictor
      if (modelPaths?.predictor) {
        await spendingPredictor.loadModel(modelPaths.predictor);
      } else {
        await spendingPredictor.initialize();
      }

      // Initialize detector
      if (modelPaths?.detector) {
        await anomalyDetector.loadModel(modelPaths.detector);
      } else {
        await anomalyDetector.initialize();
      }

      this.initialized = true;
      console.log('✓ All ML models initialized');
    } catch (error) {
      console.error('Failed to initialize ML models:', error);
      throw error;
    }
  }

  /**
   * Train all models on historical data
   */
  async trainOnHistoricalData(expenses: Expense[]): Promise<{
    classifier?: tf.History;
    predictor?: tf.History;
    detector?: tf.History;
  }> {
    if (expenses.length < 50) {
      throw new Error('Need at least 50 historical expenses to train models');
    }

    console.log(`📚 Training ML models on ${expenses.length} expenses...`);
    this.trainingData = expenses;

    const results: any = {};

    try {
      // Train classifier
      const texts = expenses.map(
        e =>
          `${e.description || ''} ${e.category || ''} ${e.scanData?.rawText || ''}`
      );
      const labels = expenses.map(e => e.category || 'Other');
      results.classifier = await classifier.train(texts, labels, {
        epochs: 30,
        batchSize: 32,
        validationSplit: 0.2,
      });

      // Train predictor
      const amounts = expenses.map(e => e.amount);
      results.predictor = await spendingPredictor.train(amounts, {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
      });

      // Train anomaly detector
      results.detector = await anomalyDetector.trainOnNormal(
        expenses.map(e => ({
          amount: e.amount,
          category: e.category || 'Other',
          date: new Date(e.date || Date.now()),
        })),
        { epochs: 30, batchSize: 16 }
      );

      console.log('✓ All models trained successfully');
      return results;
    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    }
  }

  /**
   * Predict everything for a new expense
   */
  async predict(
    description: string,
    amount: number,
    date?: Date
  ): Promise<MLPrediction> {
    if (!this.initialized) await this.initialize();

    const prediction: MLPrediction = {};

    try {
      // Categorization
      if (classifier.isReady) {
        const catResult = await classifier.predict(description);
        prediction.category = {
          predicted: catResult.category,
          confidence: catResult.confidence,
          alternatives: catResult.scores,
        };
      }

      // Anomaly detection
      if (anomalyDetector.isReady && this.trainingData.length > 0) {
        const avgAmount =
          this.trainingData.reduce((sum, e) => sum + e.amount, 0) /
          this.trainingData.length;
        const categoryFreq = new Map<string, number>();
        this.trainingData.forEach(e => {
          const cat = e.category || 'Other';
          categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + 1);
        });

        const anomalyResults = await anomalyDetector.detectAnomalies(
          [
            {
              id: 'temp',
              amount,
              category: prediction.category?.predicted || 'Other',
              date: date || new Date(),
            },
          ],
          avgAmount,
          categoryFreq
        );

        if (anomalyResults.length > 0) {
          prediction.anomaly = anomalyResults[0];
        }
      }

      return prediction;
    } catch (error) {
      console.error('Prediction failed:', error);
      return prediction;
    }
  }

  /**
   * Get spending forecast
   */
  async forecast(daysAhead: number = 30): Promise<SpendingForecast[]> {
    if (!spendingPredictor.isReady || this.trainingData.length < 30) {
      return [];
    }

    try {
      const amounts = this.trainingData.map(e => e.amount);
      return await spendingPredictor.predictNext(amounts, daysAhead);
    } catch (error) {
      console.error('Forecast failed:', error);
      return [];
    }
  }

  /**
   * Batch categorize expenses
   */
  async categorizeBatch(
    expenses: Array<{ description: string }>
  ): Promise<
    Array<{
      category: string;
      confidence: number;
    }>
  > {
    if (!classifier.isReady) await classifier.initialize();

    const texts = expenses.map(e => e.description);
    return classifier.predictBatch(texts);
  }

  /**
   * Save all models to storage
   */
  async saveAllModels(basePath: string = 'expense_ml'): Promise<void> {
    console.log(`💾 Saving ML models to ${basePath}...`);

    await Promise.all([
      classifier.saveModel(`${basePath}_classifier`),
      spendingPredictor.saveModel(`${basePath}_predictor`),
      anomalyDetector.saveModel(`${basePath}_detector`),
    ]);

    console.log('✓ All models saved');
  }

  /**
   * Load all models from storage
   */
  async loadAllModels(basePath: string = 'expense_ml'): Promise<void> {
    console.log(`📂 Loading ML models from ${basePath}...`);

    await Promise.all([
      classifier.loadModel(`${basePath}_classifier`),
      spendingPredictor.loadModel(`${basePath}_predictor`),
      anomalyDetector.loadModel(`${basePath}_detector`),
    ]);

    this.initialized = true;
    console.log('✓ All models loaded');
  }

  /**
   * Get model statistics
   */
  getStats(): {
    classifierReady: boolean;
    predictorReady: boolean;
    detectorReady: boolean;
    trainingDataSize: number;
  } {
    return {
      classifierReady: classifier.isReady,
      predictorReady: spendingPredictor.isReady,
      detectorReady: anomalyDetector.isReady,
      trainingDataSize: this.trainingData.length,
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    classifier.dispose();
    spendingPredictor.dispose();
    anomalyDetector.dispose();
    this.initialized = false;
  }
}

export const mlManager = new MLManager();
