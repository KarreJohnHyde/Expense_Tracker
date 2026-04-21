/**
 * ML Module Exports
 * Central entry point for all machine learning features
 */

// Core ML Models
export { 
  ExpenseCategoryClassifier, 
  classifier 
} from './categoryClassifier';

export type { } from './categoryClassifier';

export {
  SpendingPredictor,
  spendingPredictor,
  type SpendingData,
  type SpendingForecast,
} from './spendingPredictor';

export {
  AnomalyDetector,
  anomalyDetector,
  type AnomalyScore,
} from './anomalyDetector';

// Manager
import { mlManager } from './mlManager';
export { 
  MLManager, 
  mlManager,
  type MLPrediction,
} from './mlManager';

// Re-export commonly used functions
export const initializeML = async (paths?: {
  classifier?: string;
  predictor?: string;
  detector?: string;
}) => {
  return mlManager.initialize(paths);
};

export const trainML = async (expenses: any[]) => {
  return mlManager.trainOnHistoricalData(expenses);
};

export const predictExpense = async (
  description: string,
  amount: number,
  date?: Date
) => {
  return mlManager.predict(description, amount, date);
};

export const forecastSpending = async (daysAhead: number = 30) => {
  return mlManager.forecast(daysAhead);
};

export const getMLStats = () => {
  return mlManager.getStats();
};

export const saveML = async (path: string = 'expense_ml') => {
  return mlManager.saveAllModels(path);
};

export const loadML = async (path: string = 'expense_ml') => {
  return mlManager.loadAllModels(path);
};
