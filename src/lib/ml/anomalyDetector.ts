/**
 * Anomaly Detection Model - Autoencoder for fraud/unusual spending detection
 * Identifies spending patterns that deviate from normal behavior
 */

import * as tf from '@tensorflow/tfjs';

export interface AnomalyScore {
  expenseId: string;
  amount: number;
  category: string;
  anomalyScore: number; // 0-1, higher = more anomalous
  isAnomaly: boolean;
  reason: string;
}

export class AnomalyDetector {
  private autoencoder: tf.LayersModel | null = null;
  private encoder: tf.LayersModel | null = null;
  private reconstructionThreshold: number = 0.15; // Reconstruction error threshold
  private modelLoaded: boolean = false;

  // Feature normalization parameters
  private featureStats: Map<string, { mean: number; std: number }> = new Map();

  /**
   * Build autoencoder model for anomaly detection
   */
  private buildAutoencoder(inputDim: number): tf.LayersModel {
    const input = tf.input({ shape: [inputDim] });

    // Encoder
    let encoded = tf.layers.dense({
      units: Math.round(inputDim * 0.75),
      activation: 'relu',
    }).apply(input) as tf.SymbolicTensor;

    encoded = tf.layers.dense({
      units: Math.round(inputDim * 0.5),
      activation: 'relu',
    }).apply(encoded) as tf.SymbolicTensor;

    encoded = tf.layers.dense({
      units: Math.round(inputDim * 0.25),
      activation: 'relu',
    }).apply(encoded) as tf.SymbolicTensor;

    // Decoder (symmetric)
    let decoded = tf.layers.dense({
      units: Math.round(inputDim * 0.5),
      activation: 'relu',
    }).apply(encoded) as tf.SymbolicTensor;

    decoded = tf.layers.dense({
      units: Math.round(inputDim * 0.75),
      activation: 'relu',
    }).apply(decoded) as tf.SymbolicTensor;

    decoded = tf.layers.dense({
      units: inputDim,
      activation: 'sigmoid',
    }).apply(decoded) as tf.SymbolicTensor;

    const autoencoder = tf.model({ inputs: input, outputs: decoded });

    autoencoder.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    return autoencoder;
  }

  /**
   * Create encoder model (outputs bottleneck representation)
   */
  private createEncoder(autoencoder: tf.LayersModel, encoderLayerIndex: number): tf.LayersModel {
    const encoder = tf.model({
      inputs: autoencoder.inputs,
      outputs: autoencoder.layers[encoderLayerIndex].output,
    });
    return encoder;
  }

  /**
   * Extract features from expense
   */
  private extractFeatures(
    amount: number,
    category: string,
    hour: number,
    dayOfWeek: number,
    categoryFrequency: number,
    amountRatio: number // Amount relative to average
  ): number[] {
    return [amount, hour, dayOfWeek, categoryFrequency, amountRatio];
  }

  /**
   * Normalize features
   */
  private normalizeFeatures(features: number[], featureNames: string[]): number[] {
    return features.map((val, idx) => {
      const name = featureNames[idx];
      const stats = this.featureStats.get(name) || { mean: 0, std: 1 };
      return (val - stats.mean) / (stats.std || 1);
    });
  }

  /**
   * Initialize model
   */
  async initialize(): Promise<void> {
    const featureNames = ['amount', 'hour', 'dayOfWeek', 'categoryFreq', 'amountRatio'];
    this.autoencoder = this.buildAutoencoder(featureNames.length);

    // Initialize feature stats
    featureNames.forEach(name => {
      this.featureStats.set(name, { mean: 0, std: 1 });
    });

    this.modelLoaded = true;
    console.log('✓ Initialized anomaly detector');
  }

  /**
   * Train on normal spending patterns
   */
  async trainOnNormal(
    expenses: Array<{
      amount: number;
      category: string;
      date: Date;
    }>,
    options?: { epochs?: number; batchSize?: number }
  ): Promise<tf.History> {
    if (!this.autoencoder) await this.initialize();

    const opts = {
      epochs: options?.epochs || 30,
      batchSize: options?.batchSize || 16,
    };

    const featureNames = ['amount', 'hour', 'dayOfWeek', 'categoryFreq', 'amountRatio'];

    // Extract features
    const avgAmount = expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length;
    const categoryCount = new Map<string, number>();

    expenses.forEach(e => {
      categoryCount.set(e.category, (categoryCount.get(e.category) || 0) + 1);
    });

    const featureSets: number[][] = [];

    expenses.forEach(expense => {
      const hour = expense.date.getHours();
      const dayOfWeek = expense.date.getDay();
      const categoryFreq = categoryCount.get(expense.category) || 1;
      const amountRatio = expense.amount / avgAmount;

      const features = this.extractFeatures(
        expense.amount,
        expense.category,
        hour,
        dayOfWeek,
        categoryFreq,
        amountRatio
      );

      featureSets.push(features);
    });

    // Calculate normalization parameters
    const featureCount = featureSets[0].length;
    for (let i = 0; i < featureCount; i++) {
      const values = featureSets.map(f => f[i]);
      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      this.featureStats.set(featureNames[i], { mean, std });
    }

    // Normalize features
    const normalizedFeatures = featureSets.map(f =>
      f.map((val, idx) => {
        const stats = this.featureStats.get(featureNames[idx])!;
        return (val - stats.mean) / (stats.std || 1);
      })
    );

    const xs = tf.tensor2d(normalizedFeatures);
    const ys = xs; // Autoencoder reconstructs the input

    const history = await this.autoencoder!.fit(xs, ys, {
      epochs: opts.epochs,
      batchSize: opts.batchSize,
      verbose: 0,
    });

    xs.dispose();
    ys.dispose();

    return history;
  }

  /**
   * Detect anomalies in new expenses
   */
  async detectAnomalies(
    expenses: Array<{
      id: string;
      amount: number;
      category: string;
      date: Date;
    }>,
    averageAmount?: number,
    categoryFrequency?: Map<string, number>
  ): Promise<AnomalyScore[]> {
    if (!this.autoencoder) await this.initialize();

    const featureNames = ['amount', 'hour', 'dayOfWeek', 'categoryFreq', 'amountRatio'];
    const avgAmount = averageAmount || 500; // Default
    const catFreq = categoryFrequency || new Map();

    const scores: AnomalyScore[] = [];

    for (const expense of expenses) {
      tf.tidy(() => {
        const hour = expense.date.getHours();
        const dayOfWeek = expense.date.getDay();
        const frequency = catFreq.get(expense.category) || 1;
        const amountRatio = expense.amount / avgAmount;

        const features = this.extractFeatures(
          expense.amount,
          expense.category,
          hour,
          dayOfWeek,
          frequency,
          amountRatio
        );

        // Normalize
        const normalized = features.map((val, idx) => {
          const stats = this.featureStats.get(featureNames[idx])!;
          return (val - stats.mean) / (stats.std || 1);
        });

        // Get reconstruction
        const input = tf.tensor2d([normalized]);
        const reconstructed = this.autoencoder!.predict(input) as tf.Tensor;
        const reconstructedData = reconstructed.dataSync();

        // Calculate reconstruction error (MSE)
        let error = 0;
        for (let i = 0; i < normalized.length; i++) {
          error += Math.pow(normalized[i] - reconstructedData[i], 2);
        }
        error = Math.sqrt(error / normalized.length);

        // Determine if anomaly
        const isAnomaly = error > this.reconstructionThreshold;
        const anomalyScore = Math.min(error, 1); // Clamp to [0, 1]

        // Generate reason
        let reason = 'Normal spending pattern';
        if (error > this.reconstructionThreshold) {
          if (expense.amount > avgAmount * 3) {
            reason = 'Unusually high amount for this category';
          } else if (hour >= 2 && hour <= 5) {
            reason = 'Purchase at unusual time (late night)';
          } else if (dayOfWeek === 0 || dayOfWeek === 6) {
            reason = 'Weekend spending unusual for this category';
          } else {
            reason = 'Atypical spending pattern detected';
          }
        }

        scores.push({
          expenseId: expense.id,
          amount: expense.amount,
          category: expense.category,
          anomalyScore: Math.round(anomalyScore * 1000) / 1000,
          isAnomaly,
          reason,
        });

        input.dispose();
        reconstructed.dispose();
      });
    }

    return scores;
  }

  /**
   * Get reconstruction error for a single expense
   */
  private async getReconstructionError(features: number[]): Promise<number> {
    return tf.tidy(() => {
      const input = tf.tensor2d([features]);
      const reconstructed = this.autoencoder!.predict(input) as tf.Tensor;
      const reconstructedData = reconstructed.dataSync();

      let error = 0;
      for (let i = 0; i < features.length; i++) {
        error += Math.pow(features[i] - reconstructedData[i], 2);
      }

      input.dispose();
      reconstructed.dispose();

      return Math.sqrt(error / features.length);
    });
  }

  /**
   * Set anomaly threshold
   */
  setThreshold(threshold: number): void {
    this.reconstructionThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Save model
   */
  async saveModel(path: string): Promise<void> {
    if (!this.autoencoder) throw new Error('Model not initialized');

    await this.autoencoder.save(`indexeddb://${path}`);

    // Save feature stats
    const statsObj: Record<string, { mean: number; std: number }> = {};
    this.featureStats.forEach((stats, key) => {
      statsObj[key] = stats;
    });

    localStorage.setItem(`${path}_stats`, JSON.stringify(statsObj));
    console.log(`✓ Anomaly detector saved to ${path}`);
  }

  /**
   * Load model
   */
  async loadModel(path: string): Promise<void> {
    try {
      this.autoencoder = await tf.loadLayersModel(`indexeddb://${path}`);

      const statsObj = JSON.parse(localStorage.getItem(`${path}_stats`) || '{}');
      Object.entries(statsObj).forEach(([key, stats]) => {
        this.featureStats.set(key, stats as { mean: number; std: number });
      });

      this.modelLoaded = true;
      console.log(`✓ Anomaly detector loaded from ${path}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      await this.initialize();
    }
  }

  dispose(): void {
    if (this.autoencoder) {
      this.autoencoder.dispose();
      this.autoencoder = null;
    }
    if (this.encoder) {
      this.encoder.dispose();
      this.encoder = null;
    }
  }

  get isReady(): boolean {
    return this.modelLoaded && this.autoencoder !== null;
  }
}

export const anomalyDetector = new AnomalyDetector();
