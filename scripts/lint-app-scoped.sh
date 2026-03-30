#!/usr/bin/env bash
# Ensures all entity stores (except AppStore) use withAppScoped()
set -euo pipefail

ERRORS=0
while IFS= read -r file; do
  if ! grep -q 'withAppScoped()' "$file"; then
    echo "ERROR: $file — missing withAppScoped()"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find src/app/entities -name '*.store.ts' ! -path '*/entities/app/*')

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "$ERRORS store(s) missing withAppScoped()."
  echo "All entity stores must include withAppScoped() for automatic reset on app switch."
  exit 1
fi

echo "All entity stores use withAppScoped()"
