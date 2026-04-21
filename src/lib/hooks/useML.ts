/**
 * React Hook - useML
 * Integrates machine learning into React components
 * Usage: const { predict, forecast, detectAnomalies } = useML();
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { mlManager, type MLPrediction } from '../ml/mlManager';
import type { Expense } from '../../app/lib/api';

export interface UseMLOptions {
  autoInitialize?: boolean;
  modelPath?: string;
}

export interface UseMLState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  stats: any;
}

export function useML(options: UseMLOptions = {}) {
  const { autoInitialize = true, modelPath } = options;
  const [state, setState] = useState<UseMLState>({
    initialized: false,
    loading: false,
    error: null,
    stats: {},
  });

  const mlRef = useRef(mlManager);

  // Initialize models on mount
  useEffect(() => {
    if (!autoInitialize) return;

    const init = async () => {
      try {
        setState(prev => ({ ...prev, loading: true }));
        await mlRef.current.initialize(
          modelPath
            ? {
                classifier: `${modelPath}_classifier`,
                predictor: `${modelPath}_predictor`,
                detector: `${modelPath}_detector`,
              }
            : undefined
        );
        setState(prev => ({ ...prev, initialized: true, loading: false }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to initialize ML';
        setState(prev => ({ ...prev, error: msg, loading: false }));
      }
    };

    init();

    return () => {
      mlRef.current.dispose();
    };
  }, [autoInitialize, modelPath]);

  /**
   * Train models on historical data
   */
  const trainModels = useCallback(
    async (expenses: Expense[]) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        await mlRef.current.trainOnHistoricalData(expenses);
        await mlRef.current.saveAllModels();
        setState(prev => ({
          ...prev,
          loading: false,
          stats: mlRef.current.getStats(),
        }));
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Training failed';
        setState(prev => ({ ...prev, error: msg, loading: false }));
        return false;
      }
    },
    []
  );

  /**
   * Predict category, anomalies, and get insights for an expense
   */
  const predict = useCallback(
    async (
      description: string,
      amount: number,
      date?: Date
    ): Promise<MLPrediction | null> => {
      try {
        if (!state.initialized) {
          await mlRef.current.initialize();
        }
        return await mlRef.current.predict(description, amount, date);
      } catch (error) {
        console.error('Prediction error:', error);
        return null;
      }
    },
    [state.initialized]
  );

  /**
   * Get spending forecast
   */
  const forecast = useCallback(async (daysAhead: number = 30) => {
    try {
      if (!state.initialized) {
        await mlRef.current.initialize();
      }
      return await mlRef.current.forecast(daysAhead);
    } catch (error) {
      console.error('Forecast error:', error);
      return [];
    }
  }, [state.initialized]);

  /**
   * Categorize multiple expenses at once
   */
  const categorizeBatch = useCallback(
    async (expenses: Array<{ description: string }>) => {
      try {
        if (!state.initialized) {
          await mlRef.current.initialize();
        }
        return await mlRef.current.categorizeBatch(expenses);
      } catch (error) {
        console.error('Batch categorization error:', error);
        return [];
      }
    },
    [state.initialized]
  );

  /**
   * Save models to browser storage
   */
  const saveModels = useCallback(async (basePath: string = 'expense_ml') => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await mlRef.current.saveAllModels(basePath);
      setState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Save failed';
      setState(prev => ({ ...prev, error: msg, loading: false }));
      return false;
    }
  }, []);

  /**
   * Load models from browser storage
   */
  const loadModels = useCallback(async (basePath: string = 'expense_ml') => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await mlRef.current.loadAllModels(basePath);
      setState(prev => ({
        ...prev,
        initialized: true,
        loading: false,
        stats: mlRef.current.getStats(),
      }));
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Load failed';
      setState(prev => ({ ...prev, error: msg, loading: false }));
      return false;
    }
  }, []);

  return {
    // State
    initialized: state.initialized,
    loading: state.loading,
    error: state.error,
    stats: state.stats,

    // Methods
    trainModels,
    predict,
    forecast,
    categorizeBatch,
    saveModels,
    loadModels,
  };
}
