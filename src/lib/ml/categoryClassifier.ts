/**
 * Neural Network-based Expense Category Classifier
 * Uses TensorFlow.js for client-side inference
 */

import * as tf from '@tensorflow/tfjs';
// @ts-ignore
import '@tensorflow/tfjs-data';

// Category mapping
const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Investments & Savings',
  'Travel & Holidays',
  'Personal Care',
  'Other'
];

const CATEGORY_TO_IDX = CATEGORIES.reduce((acc, cat, idx) => {
  acc[cat] = idx;
  return acc;
}, {} as Record<string, number>);

// Text tokenizer for embedding layer
const VOCAB_SIZE = 5000;
const MAX_TOKENS = 100;

class TextTokenizer {
  private vocab: Map<string, number> = new Map();
  private vocabReverse: Map<number, string> = new Map();
  private counter: number = 1; // 0 is reserved for padding

  addWord(word: string): number {
    const normalized = word.toLowerCase().trim();
    if (!this.vocab.has(normalized)) {
      if (this.counter >= VOCAB_SIZE) return VOCAB_SIZE - 1; // Out of vocab token
      this.vocab.set(normalized, this.counter);
      this.vocabReverse.set(this.counter, normalized);
      this.counter++;
    }
    return this.vocab.get(normalized)!;
  }

  tokenize(text: string): number[] {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const tokens = words.map(word => this.addWord(word)).slice(0, MAX_TOKENS);
    
    // Pad to MAX_TOKENS
    while (tokens.length < MAX_TOKENS) {
      tokens.push(0);
    }
    
    return tokens;
  }

  fromJSON(json: { vocab: [string, number][]; counter: number }) {
    this.vocab = new Map(json.vocab);
    this.counter = json.counter;
    this.vocab.forEach((idx, word) => {
      this.vocabReverse.set(idx, word);
    });
  }

  toJSON() {
    return {
      vocab: Array.from(this.vocab.entries()),
      counter: this.counter,
    };
  }
}

export class ExpenseCategoryClassifier {
  private model: tf.LayersModel | null = null;
  private tokenizer: TextTokenizer = new TextTokenizer();
  private modelLoaded: boolean = false;

  /**
   * Build neural network model for classification
   */
  private buildModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Embedding layer: convert token indices to dense vectors
        tf.layers.embedding({
          inputDim: VOCAB_SIZE,
          outputDim: 64,
          inputLength: MAX_TOKENS,
          name: 'embedding',
        }),

        // Spatial dropout
        tf.layers.spatialDropout1d({
          rate: 0.2,
          name: 'spatial_dropout',
        }),

        // Conv1D for feature extraction
        tf.layers.conv1d({
          filters: 128,
          kernelSize: 3,
          padding: 'same',
          activation: 'relu',
          name: 'conv1d_1',
        }),

        // Global average pooling
        tf.layers.globalAveragePooling1d({
          name: 'global_pool',
        }),

        // Dense layers
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'dense_1',
        }),

        tf.layers.dropout({
          rate: 0.3,
          name: 'dropout_1',
        }),

        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'dense_2',
        }),

        tf.layers.dropout({
          rate: 0.2,
          name: 'dropout_2',
        }),

        // Output layer
        tf.layers.dense({
          units: CATEGORIES.length,
          activation: 'softmax',
          name: 'output',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Initialize model (load pretrained or create new)
   */
  async initialize(modelPath?: string): Promise<void> {
    try {
      if (modelPath) {
        // Load pretrained model
        this.model = await tf.loadLayersModel(modelPath);
        console.log('✓ Loaded pretrained category classifier');
      } else {
        // Create new model
        this.model = this.buildModel();
        console.log('✓ Initialized new category classifier');
      }
      this.modelLoaded = true;
    } catch (error) {
      console.error('Failed to initialize classifier:', error);
      throw error;
    }
  }

  /**
   * Train model on labeled expense data
   */
  async train(
    texts: string[],
    labels: string[],
    options?: { epochs?: number; batchSize?: number; validationSplit?: number }
  ): Promise<tf.History> {
    if (!this.model) await this.initialize();

    const opts = {
      epochs: options?.epochs || 20,
      batchSize: options?.batchSize || 32,
      validationSplit: options?.validationSplit || 0.2,
    };

    // Tokenize texts
    const tokenized = texts.map(t => this.tokenizer.tokenize(t));
    const xs = tf.tensor2d(tokenized);

    // One-hot encode labels
    const labelIndices = labels.map(l => CATEGORY_TO_IDX[l] || CATEGORY_TO_IDX['Other']);
    const ys = tf.oneHot(tf.tensor1d(labelIndices, 'int32'), CATEGORIES.length);

    const history = await this.model!.fit(xs, ys, {
      epochs: opts.epochs,
      batchSize: opts.batchSize,
      validationSplit: opts.validationSplit,
      verbose: 1,
    });

    xs.dispose();
    ys.dispose();

    return history;
  }

  /**
   * Predict expense category with confidence
   */
  async predict(text: string): Promise<{ category: string; confidence: number; scores: Record<string, number> }> {
    if (!this.model) await this.initialize();

    return tf.tidy(() => {
      const tokens = this.tokenizer.tokenize(text);
      const input = tf.tensor2d([tokens]);
      
      const predictions = this.model!.predict(input) as tf.Tensor;
      const probs = predictions.dataSync();
      
      // Find best prediction
      let maxProb = 0;
      let bestIdx = 0;
      const scores: Record<string, number> = {};

      for (let i = 0; i < CATEGORIES.length; i++) {
        const prob = probs[i];
        scores[CATEGORIES[i]] = Math.round(prob * 1000) / 1000;
        if (prob > maxProb) {
          maxProb = prob;
          bestIdx = i;
        }
      }

      return {
        category: CATEGORIES[bestIdx],
        confidence: Math.round(maxProb * 1000) / 1000,
        scores,
      };
    });
  }

  /**
   * Batch predict multiple expenses
   */
  async predictBatch(texts: string[]): Promise<Array<{ category: string; confidence: number }>> {
    if (!this.model) await this.initialize();

    return tf.tidy(() => {
      const tokenized = texts.map(t => this.tokenizer.tokenize(t));
      const input = tf.tensor2d(tokenized);
      
      const predictions = this.model!.predict(input) as tf.Tensor;
      const probs = predictions.arraySync() as number[][];
      
      return probs.map(prob => {
        let maxProb = 0;
        let bestIdx = 0;
        
        for (let i = 0; i < CATEGORIES.length; i++) {
          if (prob[i] > maxProb) {
            maxProb = prob[i];
            bestIdx = i;
          }
        }
        
        return {
          category: CATEGORIES[bestIdx],
          confidence: Math.round(maxProb * 1000) / 1000,
        };
      });
    });
  }

  /**
   * Save model and tokenizer to storage
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) throw new Error('Model not initialized');
    
    await this.model.save(`indexeddb://${path}`);
    
    // Save tokenizer separately
    const tokenData = this.tokenizer.toJSON();
    localStorage.setItem(`${path}_tokenizer`, JSON.stringify(tokenData));
    
    console.log(`✓ Model saved to ${path}`);
  }

  /**
   * Load model from storage
   */
  async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`indexeddb://${path}`);
      
      const tokenData = JSON.parse(localStorage.getItem(`${path}_tokenizer`) || '{}');
      this.tokenizer.fromJSON(tokenData);
      
      this.modelLoaded = true;
      console.log(`✓ Model loaded from ${path}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      await this.initialize(); // Fallback to new model
    }
  }

  /**
   * Cleanup
   */
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

// Singleton instance
export const classifier = new ExpenseCategoryClassifier();
