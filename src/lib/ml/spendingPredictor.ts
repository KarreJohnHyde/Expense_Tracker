/**
 * Spending Prediction Model - LSTM for time series forecasting
 * Predicts future spending patterns based on historical data
 */

import * as tf from '@tensorflow/tfjs';

export interface SpendingData {
  date: string;
  amount: number;
  category: string;
}

export interface SpendingForecast {
  date: string;
  predictedAmount: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class SpendingPredictor {
  private model: tf.LayersModel | null = null;
  private scaleMean: number = 0;
  private scaleStd: number = 1;
  private sequenceLength: number = 30; // 30-day window
  private modelLoaded: boolean = false;

  /**
   * Build LSTM model for spending prediction
   */
  private buildModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // LSTM layer 1
        tf.layers.lstm({
          units: 128,
          returnSequences: true,
          inputShape: [this.sequenceLength, 1],
          activation: 'relu',
          name: 'lstm_1',
        }),

        tf.layers.dropout({
          rate: 0.2,
          name: 'dropout_1',
        }),

        // LSTM layer 2
        tf.layers.lstm({
          units: 64,
          returnSequences: false,
          activation: 'relu',
          name: 'lstm_2',
        }),

        tf.layers.dropout({
          rate: 0.2,
          name: 'dropout_2',
        }),

        // Dense layers
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'dense_1',
        }),

        tf.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'dense_2',
        }),

        // Output layer
        tf.layers.dense({
          units: 1,
          activation: 'linear',
          name: 'output',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    return model;
  }

  /**
   * Normalize spending data
   */
  private normalize(data: number[]): { normalized: number[]; mean: number; std: number } {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);

    const normalized = data.map(x => (x - mean) / (std || 1));

    return { normalized, mean, std };
  }

  /**
   * Create sequences for LSTM training
   */
  private createSequences(data: number[], seqLen: number): { x: number[][]; y: number[] } {
    const x: number[][] = [];
    const y: number[] = [];

    for (let i = 0; i <= data.length - seqLen - 1; i++) {
      x.push(data.slice(i, i + seqLen));
      y.push(data[i + seqLen]);
    }

    return { x, y };
  }

  /**
   * Initialize model
   */
  async initialize(): Promise<void> {
    this.model = this.buildModel();
    this.modelLoaded = true;
    console.log('✓ Initialized spending predictor');
  }

  /**
   * Train model on historical spending data
   */
  async train(
    amounts: number[],
    options?: { epochs?: number; batchSize?: number; validationSplit?: number }
  ): Promise<tf.History> {
    if (!this.model) await this.initialize();

    const opts = {
      epochs: options?.epochs || 50,
      batchSize: options?.batchSize || 16,
      validationSplit: options?.validationSplit || 0.2,
    };

    // Normalize data
    const { normalized, mean, std } = this.normalize(amounts);
    this.scaleMean = mean;
    this.scaleStd = std;

    // Create sequences
    const { x, y } = this.createSequences(normalized, this.sequenceLength);

    if (x.length < 10) {
      throw new Error('Insufficient data for training. Need at least 40 data points.');
    }

    const xs = tf.tensor3d(x.map(seq => seq.map(v => [v])));
    const ys = tf.tensor2d(y.map(v => [v]));

    const history = await this.model!.fit(xs, ys, {
      epochs: opts.epochs,
      batchSize: opts.batchSize,
      validationSplit: opts.validationSplit,
      verbose: 0,
    });

    xs.dispose();
    ys.dispose();

    return history;
  }

  /**
   * Predict spending for next period
   */
  async predictNext(recentAmounts: number[], daysAhead: number = 7): Promise<SpendingForecast[]> {
    if (!this.model) await this.initialize();

    const { normalized } = this.normalize(recentAmounts);
    const forecasts: SpendingForecast[] = [];
    let sequence = [...normalized.slice(-this.sequenceLength)];

    for (let i = 0; i < daysAhead; i++) {
      const prediction = tf.tidy(() => {
        const input = tf.tensor3d([sequence.map(v => [v])]);
        const output = this.model!.predict(input) as tf.Tensor;
        const value = output.dataSync()[0];
        return value;
      });

      // Denormalize
      const denormalized = prediction * (this.scaleStd || 1) + this.scaleMean;

      // Determine trend
      const trend = this.determineTrend(sequence);

      // Create forecast entry
      const date = new Date();
      date.setDate(date.getDate() + i);

      forecasts.push({
        date: date.toISOString().split('T')[0],
        predictedAmount: Math.max(0, Math.round(denormalized * 100) / 100),
        confidence: this.calculateConfidence(sequence),
        trend,
      });

      // Add prediction to sequence for next iteration
      sequence.push(prediction);
      sequence = sequence.slice(-this.sequenceLength);
    }

    return forecasts;
  }

  /**
   * Determine spending trend
   */
  private determineTrend(sequence: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (sequence.length < 2) return 'stable';

    const firstHalf = sequence.slice(0, Math.floor(sequence.length / 2));
    const secondHalf = sequence.slice(Math.floor(sequence.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    const diff = avgSecond - avgFirst;
    const threshold = Math.abs(avgFirst) * 0.1;

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(sequence: number[]): number {
    if (sequence.length < 2) return 0.5;

    // Confidence based on variance - lower variance = higher confidence
    const mean = sequence.reduce((a, b) => a + b) / sequence.length;
    const variance = sequence.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sequence.length;
    const std = Math.sqrt(variance);

    // Score between 0.5 and 0.95 based on stability
    const score = 0.95 - Math.min(std * 0.1, 0.45);
    return Math.round(score * 1000) / 1000;
  }

  /**
   * Save model
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) throw new Error('Model not initialized');

    await this.model.save(`indexeddb://${path}`);

    // Save scale parameters
    localStorage.setItem(`${path}_params`, JSON.stringify({
      scaleMean: this.scaleMean,
      scaleStd: this.scaleStd,
      sequenceLength: this.sequenceLength,
    }));

    console.log(`✓ Spending predictor saved to ${path}`);
  }

  /**
   * Load model
   */
  async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`indexeddb://${path}`);

      const params = JSON.parse(localStorage.getItem(`${path}_params`) || '{}');
      this.scaleMean = params.scaleMean || 0;
      this.scaleStd = params.scaleStd || 1;
      this.sequenceLength = params.sequenceLength || 30;

      this.modelLoaded = true;
      console.log(`✓ Spending predictor loaded from ${path}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      await this.initialize();
    }
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  get isReady(): boolean {
    return this.modelLoaded && this.model !== null;
  }
}

export const spendingPredictor = new SpendingPredictor();
