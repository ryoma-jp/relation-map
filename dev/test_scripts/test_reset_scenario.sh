#!/bin/bash

# Test reset and delete scenario
# Verifies that sample data operations work correctly after reset

set -e

API_URL="${API_URL:-http://localhost:8000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
}

function log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

function log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

echo "=========================================="
echo "Reset & Delete Scenario Test"
echo "API_URL: $API_URL"
echo "=========================================="
echo ""

# ==================== Test 1: Add data to DB ====================
log_test "Step 1: Add some entities to DB"
curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser1","type":"person","description":"Test"}' \
  -s > /dev/null
curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser2","type":"person","description":"Test"}' \
  -s > /dev/null
log_success "Added 2 entities to DB"
echo ""

# ==================== Test 2: Verify entities exist ====================
log_test "Step 2: Verify entities exist in DB"
COUNT=$(curl -X GET "$API_URL/entities/" -s | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
log_success "DB contains $COUNT entities"
echo ""

# ==================== Test 3: Reset DB ====================
log_test "Step 3: Reset all data"
RESET_RESPONSE=$(curl -X POST "$API_URL/reset" -H "Content-Type: application/json" -s)
if echo "$RESET_RESPONSE" | grep -q '"ok":true'; then
  log_success "Reset successful"
else
  log_error "Reset failed"
  exit 1
fi
echo ""

# ==================== Test 4: Verify DB is empty ====================
log_test "Step 4: Verify DB is now empty"
COUNT_AFTER=$(curl -X GET "$API_URL/entities/" -s | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
if [ "$COUNT_AFTER" -eq 0 ]; then
  log_success "DB is empty (count: $COUNT_AFTER)"
else
  log_error "DB is not empty (count: $COUNT_AFTER)"
  exit 1
fi
echo ""

# ==================== Test 5: Try to delete non-existent entity ====================
log_test "Step 5: Attempt to delete non-existent entity (ID: 1)"
DELETE_RESPONSE=$(curl -X DELETE "$API_URL/entities/1" -s -w "\n%{http_code}" 2>&1)
HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 404 ]; then
  log_success "Correctly returned 404 Not Found"
else
  log_error "Expected 404, got $HTTP_CODE"
  exit 1
fi
echo ""

# ==================== Summary ====================
echo "=========================================="
echo -e "${GREEN}Scenario test passed!${NC}"
echo "=========================================="
echo ""
echo "Verified behavior:"
echo "  - Data can be reset ✓"
echo "  - DB becomes empty after reset ✓"
echo "  - Deleting non-existent entity returns 404 ✓"
echo ""
echo "Frontend should handle this gracefully by:"
echo "  - Detecting sample data mode (apiEntities.length === 0)"
echo "  - Deleting sample data locally without API call"
echo ""
