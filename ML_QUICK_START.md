# ML Quick Start Guide

Get machine learning running in 5 minutes!

## 1. Installation

```bash
# Install TensorFlow.js
pnpm add @tensorflow/tfjs @tensorflow/tfjs-data
```

## 2. Basic Usage

### Option A: Use the Hook (Recommended for React Components)

```typescript
import { useML } from '@/lib/hooks/useML';

function MyExpenseComponent() {
  const { 
    predict, 
    forecast, 
    initialized, 
    trainModels 
  } = useML({ autoInitialize: true });

  // Predict category and anomalies
  const handlePredictExpense = async () => {
    const result = await predict(
      'Swiggy food order',
      450,
      new Date()
    );
    
    console.log('Category:', result?.category?.predicted);
    console.log('Confidence:', result?.category?.confidence);
    console.log('Anomaly?', result?.anomaly?.isAnomaly);
  };

  // Get spending forecast
  const handleGetForecast = async () => {
    const forecast_data = await forecast(30);
    console.log('Next 30 days:', forecast_data);
  };

  // Train on your data
  const handleTrain = async () => {
    const success = await trainModels(yourExpensesArray);
    if (success) {
      console.log('Models trained!');
    }
  };

  return (
    <div>
      <button onClick={handlePredictExpense}>Predict</button>
      <button onClick={handleGetForecast}>Forecast</button>
      <button onClick={handleTrain}>Train</button>
    </div>
  );
}
```

### Option B: Direct API Usage

```typescript
import { 
  mlManager, 
  classifier, 
  spendingPredictor,
  anomalyDetector 
} from '@/lib/ml';

// Initialize
await mlManager.initialize();

// Train on expenses
await mlManager.trainOnHistoricalData(expenses);

// Make predictions
const prediction = await mlManager.predict(
  'Amazon purchase',
  2500
);
console.log(prediction);
// {
//   category: { predicted: 'Shopping', confidence: 0.92, ... },
//   anomaly: { isAnomaly: false, ... },
//   spending: [...]
// }
```

## 3. Training Your Models

```typescript
// Requires: 50+ expenses
const expenses = await api.getExpenses();

if (expenses.length >= 50) {
  await mlManager.trainOnHistoricalData(expenses);
  
  // Save models locally
  await mlManager.saveAllModels('expense_ml_v1');
  
  console.log('✓ Models trained and saved!');
}
```

## 4. Using Predictions in Your App

```typescript
// Auto-categorize new expenses
const handleNewExpense = async (expense) => {
  const prediction = await predict(
    expense.description,
    expense.amount
  );

  // Use predicted category
  expense.category = prediction.category?.predicted;
  
  // Check for anomalies
  if (prediction.anomaly?.isAnomaly) {
    showWarning(`Unusual spending: ${prediction.anomaly.reason}`);
  }

  return expense;
};
```

## 5. Example Component Integration

```typescript
import { MLIntegrationExample } from '@/app/components/MLIntegration';

function Dashboard() {
  const [expenses, setExpenses] = useState([]);

  return (
    <>
      <ExpenseList expenses={expenses} />
      
      {/* Add ML integration */}
      <MLIntegrationExample 
        expenses={expenses}
        onCategoryPredicted={(id, category) => {
          console.log(`Predicted ${id}: ${category}`);
        }}
        onAnomalyDetected={(id, score) => {
          console.log(`Anomaly detected on ${id}: ${score}`);
        }}
      />
    </>
  );
}
```

## 6. Common Tasks

### Get Category Suggestions
```typescript
const result = await classifier.predict('Starbucks coffee');
console.log(result.category); // 'Food & Dining'
console.log(result.confidence); // 0.94
console.log(result.scores); // { 'Food & Dining': 0.94, ... }
```

### Detect Unusual Spending
```typescript
const anomalies = await anomalyDetector.detectAnomalies([
  { id: '1', amount: 50000, category: 'Shopping', date: new Date() }
]);

if (anomalies[0].isAnomaly) {
  console.log('Alert:', anomalies[0].reason);
}
```

### Forecast Next Week
```typescript
const recentAmounts = expenses
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 30)
  .map(e => e.amount);

const forecast = await spendingPredictor.predictNext(recentAmounts, 7);

forecast.forEach(day => {
  console.log(`${day.date}: ₹${day.predictedAmount} (${day.trend})`);
});
```

### Batch Categorize Multiple
```typescript
const texts = expenses.map(e => e.description);
const predictions = await classifier.predictBatch(texts);

predictions.forEach((pred, idx) => {
  expenses[idx].category = pred.category;
  expenses[idx].categoryConfidence = pred.confidence;
});
```

## 7. Performance Tips

### Lazy Load Models
```typescript
// Load models only when needed
const { initialized } = useML({ autoInitialize: false });

const handleFirstPrediction = async () => {
  if (!initialized) {
    await initializeML();
  }
  // Now predict
};
```

### Batch Operations
```typescript
// Fast - processes 100 expenses in ~500ms
const results = await classifier.predictBatch(texts);

// Slow - processes 100 expenses in ~5s
for (const text of texts) {
  await classifier.predict(text);
}
```

### Clear Memory
```typescript
// On component unmount
useEffect(() => {
  return () => {
    mlManager.dispose();
  };
}, []);
```

## 8. Troubleshooting

### Models not initializing?
```typescript
// Force reinitialize
localStorage.removeItem('expense_ml_classifier_tokenizer');
await mlManager.initialize();
```

### Training too slow?
```typescript
// Reduce epochs
await mlManager.trainOnHistoricalData(expenses, {
  epochs: 10, // instead of 30
  batchSize: 64
});
```

### Out of memory?
```typescript
// Reduce batch size during training
const history = await classifier.train(texts, labels, {
  epochs: 20,
  batchSize: 8 // smaller batches
});
```

## 9. Server-Side Usage (Advanced)

### Call Advanced Models on Lambda

```typescript
// For more complex NLP tasks
const response = await fetch('/functions/v1/ml-service', {
  method: 'POST',
  body: JSON.stringify({
    action: 'categorize',
    data: {
      text: 'Complex receipt text',
      categories: ['Food', 'Transport', 'Shopping'],
      useLambda: true // Use server-side transformer
    }
  })
});

const result = await response.json();
console.log(result.data);
```

## 10. Next Steps

✅ Complete these in order:

1. **[x] Install TensorFlow.js** 
2. **[x] Add 50+ labeled expenses** - Open ML_IMPLEMENTATION_GUIDE.md
3. **[ ] Train models** - Run `mlManager.trainOnHistoricalData(expenses)`
4. **[ ] Integrate into components** - Use `useML` hook
5. **[ ] Monitor predictions** - Check accuracy in production
6. **[ ] Deploy Lambda** - For advanced NLP (optional)
7. **[ ] Fine-tune models** - Retrain monthly

---

## Resources

- 📖 **Full Guide**: [ML_IMPLEMENTATION_GUIDE.md](./ML_IMPLEMENTATION_GUIDE.md)
- 🧠 **Component**: [MLIntegration.tsx](./src/app/components/MLIntegration.tsx)
- 🔗 **Hook**: [useML.ts](./src/lib/hooks/useML.ts)
- 📁 **Source Code**: [src/lib/ml/](./src/lib/ml/)

## Example: Complete Feature

```typescript
// 1. Your component
import { useML } from '@/lib/hooks/useML';

export function SmartExpenseForm() {
  const { predict, trainModels } = useML();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Auto-predict category as user types
  useEffect(() => {
    if (description.length > 5) {
      predict(description, parseFloat(amount) || 0).then(result => {
        if (result?.category) {
          setCategory(result.category.predicted);
        }
      });
    }
  }, [description]);

  return (
    <form>
      <input 
        value={description} 
        onChange={e => setDescription(e.target.value)}
        placeholder="What did you buy?"
      />
      
      <select value={category} onChange={e => setCategory(e.target.value)}>
        <option value="">
          {category || 'Select category...'}
        </option>
      </select>

      <input 
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Amount"
      />

      <button type="submit">Add Expense</button>
    </form>
  );
}
```

Ready? Start with the hook! 🚀
