# Machine Learning & Deep Learning Implementation Guide

## Overview

Your expense tracker now includes a comprehensive ML/DL system with:

1. **Neural Network Categorization** - Intelligent expense classification
2. **LSTM Spending Prediction** - Forecast future spending patterns
3. **Autoencoder Anomaly Detection** - Detect fraud and unusual spending
4. **Advanced NLP** - Transformer-based receipt analysis
5. **Hybrid Architecture** - Client-side (TensorFlow.js) + Server-side (AWS Lambda)

## Architecture

```
┌─────────────────────────────────────────────────┐
│             React Frontend                       │
│  ┌─────────────────────────────────────────┐   │
│  │  useML Hook + ML Components             │   │
│  │  • Categorization                       │   │
│  │  • Anomaly Detection                    │   │
│  │  • Spending Forecasts                   │   │
│  └─────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────────────┐   ┌──────────────────────┐
│ TensorFlow.js   │   │ Supabase Edge Fn     │
│ (Client-side)   │   │ (Routing Layer)      │
│                 │   └──────────────┬───────┘
│ • Classifier    │                  │
│ • LSTM          │                  ▼
│ • Autoencoder   │             ┌─────────────────┐
└─────────────────┘             │ AWS Lambda      │
                                │ (Server-side)   │
                                │                 │
                                │ • Transformers  │
                                │ • NER           │
                                │ • Summarization │
                                │ • Isolation F.  │
                                └─────────────────┘
```

## Components

### 1. Category Classifier (`categoryClassifier.ts`)

**Architecture:**
- Embedding Layer (VOCAB_SIZE=5000)
- Conv1D Layer (128 filters)
- Global Average Pooling
- Dense Layers (256 → 128 units)
- Softmax Output (11 categories)

**Usage:**
```typescript
import { classifier } from '@/lib/ml/categoryClassifier';

// Initialize
await classifier.initialize();

// Train on labeled data
const texts = ['Swiggy order', 'Uber ride', 'Amazon purchase'];
const labels = ['Food & Dining', 'Transportation', 'Shopping'];
await classifier.train(texts, labels);

// Predict
const result = await classifier.predict('Zomato lunch order');
// Returns: { category: 'Food & Dining', confidence: 0.94, scores: {...} }
```

**Supported Categories:**
- Food & Dining
- Transportation
- Shopping
- Bills & Utilities
- Entertainment
- Healthcare
- Education
- Investments & Savings
- Travel & Holidays
- Personal Care
- Other

### 2. Spending Predictor (`spendingPredictor.ts`)

**Architecture:**
- LSTM Layer 1 (128 units)
- LSTM Layer 2 (64 units)
- Dense Layers (32 → 16 units)
- Linear Output

**Predicts:**
- Future spending amounts
- Trend (increasing/decreasing/stable)
- Confidence scores

**Usage:**
```typescript
import { spendingPredictor } from '@/lib/ml/spendingPredictor';

// Train on historical amounts
const amounts = [1200, 1500, 1400, 1600, ...]; // 30+ days
await spendingPredictor.train(amounts);

// Get 7-day forecast
const forecast = await spendingPredictor.predictNext(amounts, 7);
// Returns: [
//   { date: '2026-04-24', predictedAmount: 1450.50, confidence: 0.87, trend: 'stable' },
//   ...
// ]
```

### 3. Anomaly Detector (`anomalyDetector.ts`)

**Architecture:**
- Autoencoder with bottleneck (3-layer compression)
- Reconstruction error threshold: 0.15
- Reconstruction MSE as anomaly score

**Features Used:**
- Amount
- Hour of day
- Day of week
- Category frequency
- Amount ratio (relative to average)

**Usage:**
```typescript
import { anomalyDetector } from '@/lib/ml/anomalyDetector';

// Train on normal spending patterns
const normalExpenses = expenses.filter(e => 
  e.date > Date.now() - 90 * 24 * 60 * 60 * 1000
);
await anomalyDetector.trainOnNormal(normalExpenses);

// Detect anomalies
const scores = await anomalyDetector.detectAnomalies(newExpenses);
// Returns: [
//   { 
//     expenseId: '123', 
//     anomalyScore: 0.72, 
//     isAnomaly: true,
//     reason: 'Unusually high amount for this category'
//   }
// ]
```

### 4. ML Manager (`mlManager.ts`)

**Unified Interface:**
```typescript
import { mlManager } from '@/lib/ml/mlManager';

// Initialize all models
await mlManager.initialize();

// Train on historical data
await mlManager.trainOnHistoricalData(allExpenses);

// Get complete prediction
const prediction = await mlManager.predict('Uber ride', 450);
// Returns: {
//   category: { predicted: 'Transportation', confidence: 0.95, ... },
//   anomaly: { expenseId: 'temp', anomalyScore: 0.15, isAnomaly: false, ... },
//   spending: [ /* forecast */ ]
// }

// Get stats
const stats = mlManager.getStats();
```

### 5. React Hook (`useML.ts`)

**Simple Integration:**
```typescript
import { useML } from '@/lib/hooks/useML';

function MyComponent() {
  const {
    initialized,
    loading,
    error,
    stats,
    trainModels,
    predict,
    forecast,
    categorizeBatch,
    saveModels,
    loadModels,
  } = useML({ autoInitialize: true });

  // Use as needed
  const handlePredict = async (expense) => {
    const prediction = await predict(
      expense.description,
      expense.amount,
      new Date(expense.date)
    );
    console.log(prediction);
  };
}
```

## Setup & Training

### 1. Client-Side Models (TensorFlow.js)

**Installation:**
```bash
pnpm add @tensorflow/tfjs @tensorflow/tfjs-data
```

**Initialization:**
```typescript
import { useML } from '@/lib/hooks/useML';

// In your component
const { initialized, trainModels } = useML({ autoInitialize: true });

// Train when you have 50+ expenses
if (expenses.length > 50) {
  await trainModels(expenses);
}
```

**Data Requirements:**
- **Classifier**: 50+ labeled expenses with descriptions and categories
- **Predictor**: 30+ days of spending amounts
- **Detector**: 100+ normal expenses to establish baseline

### 2. Server-Side Models (AWS Lambda)

**Setup Lambda Layer:**

1. Create dependencies package:
```bash
mkdir python
cd python
pip install -r ml-requirements.txt -t .
cd ..
zip -r ml-layer.zip python
```

2. Create Lambda Layer:
```bash
aws lambda publish-layer-version \
  --layer-name expense-ml-layer \
  --zip-file fileb://ml-layer.zip \
  --compatible-runtimes python3.11
```

3. Create Lambda Function from `ml-service.py`

4. Set Environment Variables:
```
AWS_LAMBDA_URL: https://lambda-url.amazonaws.com
AWS_LAMBDA_API_KEY: your-api-key
```

### 3. Deploy Supabase Edge Function

```bash
supabase functions deploy ml-service
```

## API Endpoints

### Client-Side (useML Hook)

- `trainModels(expenses)` - Train all models
- `predict(text, amount, date?)` - Complete prediction
- `forecast(daysAhead)` - Spending forecast
- `categorizeBatch(expenses)` - Batch categorization
- `saveModels(basePath)` - Save to browser
- `loadModels(basePath)` - Load from browser

### Server-Side (Edge Function)

```typescript
// Advanced categorization
POST /ml-service
{
  "action": "categorize",
  "data": {
    "text": "Swiggy order",
    "categories": ["Food & Dining", "Transportation", ...]
  }
}

// Entity extraction
POST /ml-service
{
  "action": "extract_entities",
  "data": { "receipt_text": "..." }
}

// Anomaly detection
POST /ml-service
{
  "action": "detect_anomalies",
  "data": {
    "expenses": [...],
    "contamination": 0.1
  }
}

// Receipt summarization
POST /ml-service
{
  "action": "summarize",
  "data": {
    "receipt_text": "...",
    "max_length": 50
  }
}
```

## Model Persistence

### Browser Storage (IndexedDB)

Models are automatically saved to IndexedDB:
```typescript
// Auto-saved to IndexedDB
await mlManager.saveAllModels('expense_ml_v1');

// Load later
await mlManager.loadAllModels('expense_ml_v1');
```

**Storage Location:**
- TensorFlow.js: `indexeddb://expense_ml_classifier`
- Tokenizer: `localStorage.expense_ml_classifier_tokenizer`

### S3 Storage (Production)

For production deployment:
```typescript
// Save to S3
await saveModelsToS3(mlManager, 'expense-ml-models/v1/');

// Load from S3
await loadModelsFromS3('expense-ml-models/v1/');
```

## Performance Optimization

### Memory Management

Models dispose tensors automatically with `tf.tidy()`:
```typescript
// Automatic cleanup
const result = await classifier.predict(text);
```

### Model Quantization (Reduce size by 75%)

```bash
# Use quantized models
tfjs_model_quantized = true
```

### Batch Processing

For multiple predictions:
```typescript
// Instead of individual predictions
const results = await classifier.predictBatch([
  'Swiggy order',
  'Uber ride',
  'Amazon purchase',
]);
```

## Best Practices

### 1. Data Preparation
- Use at least 50 labeled examples
- Ensure balanced category distribution
- Clean OCR text before training

### 2. Model Validation
- Use 80/20 train/validation split
- Monitor accuracy on validation set
- Check predictions on new data

### 3. Retraining
- Retrain monthly with new data
- Monitor drift in predictions
- Save model versions

### 4. Fallback Handling
```typescript
try {
  const prediction = await predict(description, amount);
} catch (error) {
  // Fallback to keyword-based categorization
  const category = fallbackCategorizer(description);
}
```

## Monitoring & Debugging

### View Model Stats

```typescript
const stats = mlManager.getStats();
console.log(stats);
// {
//   classifierReady: true,
//   predictorReady: true,
//   detectorReady: true,
//   trainingDataSize: 250
// }
```

### Check Training Progress

```typescript
const history = await mlManager.trainModels(expenses);
console.log(history.classifier);
// Shows loss and accuracy per epoch
```

### Performance Metrics

```typescript
// Measure inference time
const start = performance.now();
const prediction = await classifier.predict(text);
const time = performance.now() - start;
console.log(`Prediction took ${time}ms`);
```

## Troubleshooting

### Models Won't Load
```typescript
// Clear storage and reinitialize
localStorage.clear();
indexedDB.deleteDatabase('tensorflow');
await mlManager.initialize();
```

### Out of Memory
```typescript
// Reduce batch size
await mlManager.trainModels(expenses, { batchSize: 8 });

// Dispose unused models
classifier.dispose();
```

### Slow Predictions
```typescript
// Use batch prediction
const results = await classifier.predictBatch(texts);
// 3x faster than individual predictions
```

## Future Enhancements

1. **Transfer Learning** - Use pretrained models
2. **Active Learning** - Smart sampling for labeling
3. **Federated Learning** - Privacy-preserving training
4. **Model Optimization** - TensorFlow Lite for mobile
5. **Ensemble Methods** - Multiple models for robustness

## References

- TensorFlow.js: https://js.tensorflow.org/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- AWS Lambda: https://docs.aws.amazon.com/lambda/
- Transformers: https://huggingface.co/transformers/
