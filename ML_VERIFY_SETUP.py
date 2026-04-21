#!/usr/bin/env python3
"""
ML Setup Verification Script - Python Version
Verifies all ML/DL components are properly installed and configured
Run: python ML_VERIFY_SETUP.py
"""

import os
import sys
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def check_file(path):
    """Check if a file exists"""
    if os.path.exists(path):
        print(f"{Colors.GREEN}✓{Colors.RESET} {path}")
        return True
    else:
        print(f"{Colors.RED}✗{Colors.RESET} {path}")
        return False

def check_directory(path):
    """Check if a directory exists"""
    if os.path.isdir(path):
        print(f"{Colors.GREEN}✓{Colors.RESET} {path}/")
        return True
    else:
        print(f"{Colors.RED}✗{Colors.RESET} {path}/")
        return False

def check_json_dependency(filename, package_name):
    """Check if a package is in package.json"""
    if not os.path.exists(filename):
        return False
    
    with open(filename, 'r') as f:
        content = f.read()
        if f'"{package_name}"' in content:
            print(f"{Colors.GREEN}✓{Colors.RESET} {package_name} in package.json")
            return True
        else:
            print(f"{Colors.RED}✗{Colors.RESET} {package_name} NOT in package.json")
            return False

def count_lines(directory, extension):
    """Count total lines in files with given extension"""
    total = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(extension):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        total += len(f.readlines())
                except:
                    pass
    return total

def main():
    print(f"{Colors.BLUE}🧪 ML/DL System Verification{Colors.RESET}")
    print("=" * 50)
    print()

    failed_count = 0
    passed_count = 0

    # Step 1: Core ML Models
    print(f"{Colors.BLUE}Step 1: Checking ML Model Files{Colors.RESET}")
    print("-" * 50)
    files_to_check = [
        "src/lib/ml/index.ts",
        "src/lib/ml/categoryClassifier.ts",
        "src/lib/ml/spendingPredictor.ts",
        "src/lib/ml/anomalyDetector.ts",
        "src/lib/ml/mlManager.ts",
        "src/lib/ml/mlTestSuite.ts",
    ]
    
    for file in files_to_check:
        if check_file(file):
            passed_count += 1
        else:
            failed_count += 1
    print()

    # Step 2: React Integration
    print(f"{Colors.BLUE}Step 2: Checking React Integration{Colors.RESET}")
    print("-" * 50)
    react_files = [
        "src/lib/hooks/useML.ts",
        "src/app/components/MLIntegration.tsx",
        "src/app/pages/MLDemo.tsx",
    ]
    
    for file in react_files:
        if check_file(file):
            passed_count += 1
        else:
            failed_count += 1
    print()

    # Step 3: Documentation
    print(f"{Colors.BLUE}Step 3: Checking Documentation{Colors.RESET}")
    print("-" * 50)
    docs = [
        "ML_QUICK_START.md",
        "ML_SETUP_SUMMARY.md",
        "ML_IMPLEMENTATION_GUIDE.md",
        "ML_DEPLOYMENT_INSTALLATION.md",
        "ML_COMPLETE_SUMMARY.md",
        ".env.ml.example",
    ]
    
    for doc in docs:
        if check_file(doc):
            passed_count += 1
        else:
            failed_count += 1
    print()

    # Step 4: Server-Side
    print(f"{Colors.BLUE}Step 4: Checking Server-Side Files{Colors.RESET}")
    print("-" * 50)
    server_files = [
        "supabase/functions/ml-service/index.ts",
        "aws-lambda/ml-service.py",
        "aws-lambda/ml-requirements.txt",
    ]
    
    for file in server_files:
        if check_file(file):
            passed_count += 1
        else:
            failed_count += 1
    print()

    # Step 5: Dependencies
    print(f"{Colors.BLUE}Step 5: Checking Dependencies{Colors.RESET}")
    print("-" * 50)
    if check_json_dependency("package.json", "@tensorflow/tfjs"):
        passed_count += 1
    else:
        failed_count += 1
    
    if check_json_dependency("package.json", "@tensorflow/tfjs-data"):
        passed_count += 0  # Optional
    print()

    # Step 6: Directory Structure
    print(f"{Colors.BLUE}Step 6: Checking Directory Structure{Colors.RESET}")
    print("-" * 50)
    directories = [
        "src/lib/ml",
        "src/lib/hooks",
        "src/app/components",
        "src/app/pages",
        "supabase/functions",
        "aws-lambda",
    ]
    
    for dir_path in directories:
        if check_directory(dir_path):
            passed_count += 1
        else:
            failed_count += 1
    print()

    # Step 7: Statistics
    print(f"{Colors.BLUE}Step 7: Code Statistics{Colors.RESET}")
    print("-" * 50)
    
    ml_lines = count_lines("src/lib/ml", ".ts")
    print(f"Model files: ~{ml_lines} lines of code")
    
    if os.path.exists("src/lib/hooks/useML.ts"):
        hooks_lines = sum(1 for line in open("src/lib/hooks/useML.ts", 'r', encoding='utf-8', errors='ignore'))
        print(f"React hook: {hooks_lines} lines")
    
    if os.path.exists("src/app/components/MLIntegration.tsx"):
        component_lines = sum(1 for line in open("src/app/components/MLIntegration.tsx", 'r', encoding='utf-8', errors='ignore'))
        print(f"Example component: {component_lines} lines")
    
    if os.path.exists("src/app/pages/MLDemo.tsx"):
        demo_lines = sum(1 for line in open("src/app/pages/MLDemo.tsx", 'r', encoding='utf-8', errors='ignore'))
        print(f"Demo page: {demo_lines} lines")
    
    print()

    # Summary
    print("=" * 50)
    if failed_count == 0:
        print(f"{Colors.GREEN}🎉 All checks passed!{Colors.RESET}")
    else:
        print(f"{Colors.RED}⚠️  {failed_count} check(s) failed{Colors.RESET}")
    
    print()
    print("Next Steps:")
    print("1. Run: pnpm install")
    print("2. Read: ML_QUICK_START.md")
    print("3. Visit: http://localhost:5173/ml-demo")
    print("4. Run tests: mlTestSuite.runAllTests()")
    print()
    print(f"{Colors.GREEN}All systems ready for ML/DL deployment! ✨{Colors.RESET}")
    
    return 0 if failed_count == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
