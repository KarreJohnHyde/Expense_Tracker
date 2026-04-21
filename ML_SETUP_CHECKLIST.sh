#!/usr/bin/env bash

# ML Setup Checklist - Run these steps in order

echo "🤖 Expense Tracker ML Setup Checklist"
echo "===================================="
echo ""

# Check Node/pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi
echo "✅ pnpm found"

# Step 1: Install TensorFlow.js
echo ""
echo "📦 Step 1: Installing TensorFlow.js..."
pnpm add @tensorflow/tfjs @tensorflow/tfjs-data

if [ $? -eq 0 ]; then
    echo "✅ TensorFlow.js installed"
else
    echo "❌ Failed to install TensorFlow.js"
    exit 1
fi

# Step 2: Verify files exist
echo ""
echo "📁 Step 2: Checking ML files..."
files=(
    "src/lib/ml/index.ts"
    "src/lib/ml/categoryClassifier.ts"
    "src/lib/ml/spendingPredictor.ts"
    "src/lib/ml/anomalyDetector.ts"
    "src/lib/ml/mlManager.ts"
    "src/lib/hooks/useML.ts"
    "src/app/components/MLIntegration.tsx"
    "supabase/functions/ml-service/index.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done

# Step 3: Check AWS Lambda files
echo ""
echo "🔧 Step 3: Checking AWS Lambda files..."
lambda_files=(
    "aws-lambda/ml-service.py"
    "aws-lambda/ml-requirements.txt"
)

for file in "${lambda_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (optional, for advanced features)"
    fi
done

# Step 4: Check documentation
echo ""
echo "📚 Step 4: Checking documentation..."
docs=(
    "ML_SETUP_SUMMARY.md"
    "ML_QUICK_START.md"
    "ML_IMPLEMENTATION_GUIDE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✅ $doc"
    else
        echo "  ❌ $doc (missing)"
    fi
done

# Final summary
echo ""
echo "===================================="
echo "✅ ML Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Read ML_QUICK_START.md for quick examples"
echo "2. Collect 50+ labeled expenses"
echo "3. Run: mlManager.trainOnHistoricalData(expenses)"
echo "4. Use useML hook in your components"
echo ""
echo "Start here: ML_QUICK_START.md"
echo "===================================="
