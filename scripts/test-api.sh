#!/usr/bin/env bash
set -euo pipefail
BASE=http://localhost:5000

echo "GET /api/health"
curl -sS -f "$BASE/api/health" | jq || true

echo "\nGET /api/stores"
curl -sS -f "$BASE/api/stores" | jq || true

echo "\nGET /api/stores/choppies/products"
curl -sS -f "$BASE/api/stores/choppies/products" | jq || true

echo "\nGET /api/stores/choppies/products/p1"
curl -sS -f "$BASE/api/stores/choppies/products/p1" | jq || true

echo "\nGET /api/stores/choppies/cart"
curl -sS -f "$BASE/api/stores/choppies/cart" | jq || true

echo "\nPOST /api/stores/choppies/cart"
curl -sS -f -X POST -H "Content-Type: application/json" -d '{"items":[{"id":"p1","qty":2}]}' "$BASE/api/stores/choppies/cart" | jq || true

echo "\nGET cart after post"
curl -sS -f "$BASE/api/stores/choppies/cart" | jq || true

echo "\nPOST /api/stores/choppies/orders"
curl -sS -f -X POST -H "Content-Type: application/json" -d '{"items":[{"id":"p1","qty":2}],"total":4.0}' "$BASE/api/stores/choppies/orders" | jq || true

echo "\nGET /api/stores/choppies/orders"
curl -sS -f "$BASE/api/stores/choppies/orders" | jq || true
