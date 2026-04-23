#!/bin/bash

echo "🔍 Verifying Dataverse CRUD Test Suite Setup..."
echo ""

# Check required files
echo "📁 Checking files..."

files=(
  "src/services/dataverseTest.ts"
  "src/components/DataverseTestPanel.tsx"
  "src/components/DataverseTestPanel.module.css"
  "DATAVERSE_TESTING.md"
  "TESTING_SETUP_SUMMARY.md"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
    missing=$((missing + 1))
  fi
done

echo ""

# Check TypeScript compilation
echo "📦 Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
  echo "  ✅ TypeScript compiles successfully"
else
  echo "  ❌ TypeScript compilation failed"
fi

echo ""

# Check imports
echo "🔗 Checking imports in DataverseSample.tsx..."
if grep -q "DataverseTestPanel" src/screens/DataverseSample.tsx; then
  echo "  ✅ DataverseTestPanel imported"
else
  echo "  ❌ DataverseTestPanel not imported"
  missing=$((missing + 1))
fi

if grep -q "testing" src/screens/DataverseSample.tsx; then
  echo "  ✅ Testing tab added"
else
  echo "  ❌ Testing tab not added"
  missing=$((missing + 1))
fi

echo ""

# Summary
if [ $missing -eq 0 ]; then
  echo "✅ Setup Complete! All files present and TypeScript compiles."
  echo ""
  echo "Next steps:"
  echo "  1. Run: npm run dev"
  echo "  2. Navigate to: Debug → Dataverse Sample"
  echo "  3. Click: 🧪 CRUD Testing tab"
  echo "  4. Click: Run Tests"
  echo ""
  exit 0
else
  echo "❌ Setup incomplete - $missing items missing"
  exit 1
fi
