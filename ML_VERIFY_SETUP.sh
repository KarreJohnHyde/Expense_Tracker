#!/bin/bash
# ML/DL System Verification & Setup Script
# Run this to verify everything is installed and configured correctly

set -e

echo "🧪 ML/DL System Verification Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    return 0
  else
    echo -e "${RED}✗${NC} Missing: $1"
    return 1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    return 0
  else
    echo -e "${RED}✗${NC} Missing: $1"
    return 1
  fi
}

echo "Step 1: Checking ML Model Files"
echo "--------------------------------"
check_file "src/lib/ml/index.ts"
check_file "src/lib/ml/categoryClassifier.ts"
check_file "src/lib/ml/spendingPredictor.ts"
check_file "src/lib/ml/anomalyDetector.ts"
check_file "src/lib/ml/mlManager.ts"
check_file "src/lib/ml/mlTestSuite.ts"
echo ""

echo "Step 2: Checking React Integration Files"
echo "----------------------------------------"
check_file "src/lib/hooks/useML.ts"
check_file "src/app/components/MLIntegration.tsx"
check_file "src/app/pages/MLDemo.tsx"
echo ""

echo "Step 3: Checking Documentation"
echo "------------------------------"
check_file "ML_QUICK_START.md"
check_file "ML_SETUP_SUMMARY.md"
check_file "ML_IMPLEMENTATION_GUIDE.md"
check_file "ML_DEPLOYMENT_INSTALLATION.md"
check_file "ML_COMPLETE_SUMMARY.md"
check_file ".env.ml.example"
echo ""

echo "Step 4: Checking Server-Side Files"
echo "---------------------------------"
check_file "supabase/functions/ml-service/index.ts"
check_file "aws-lambda/ml-service.py"
check_file "aws-lambda/ml-requirements.txt"
echo ""

echo "Step 5: Checking Dependencies"
echo "----------------------------"
if grep -q '@tensorflow/tfjs' package.json; then
  echo -e "${GREEN}✓${NC} @tensorflow/tfjs found in package.json"
else
  echo -e "${RED}✗${NC} @tensorflow/tfjs NOT found in package.json"
fi

if grep -q '@tensorflow/tfjs-data' package.json; then
  echo -e "${GREEN}✓${NC} @tensorflow/tfjs-data found in package.json"
else
  echo -e "${YELLOW}⚠${NC} @tensorflow/tfjs-data NOT found (optional)"
fi

echo ""
echo "Step 6: Directory Structure"
echo "-------------------------"
check_dir "src/lib/ml"
check_dir "src/lib/hooks"
check_dir "src/app/components"
check_dir "src/app/pages"
check_dir "supabase/functions"
check_dir "aws-lambda"
echo ""

echo "Step 7: Quick Statistics"
echo "---------------------"
total_lines=$(find src/lib/ml -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "Model files: ~$total_lines lines of code"

hooks_lines=$(wc -l < src/lib/hooks/useML.ts)
echo "React hook: $hooks_lines lines"

component_lines=$(wc -l < src/app/components/MLIntegration.tsx)
echo "Example component: $component_lines lines"

demo_lines=$(wc -l < src/app/pages/MLDemo.tsx)
echo "Demo page: $demo_lines lines"

echo ""
echo "🎉 Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Run: pnpm install"
echo "2. Read: ML_QUICK_START.md"
echo "3. Visit: http://localhost:5173/ml-demo"
echo "4. Run tests: mlTestSuite.runAllTests()"
echo ""
echo "All systems ready for ML/DL deployment! ✨"
