#!/bin/bash

# Test reset → edit → delete scenario
# Simulates: reset DB, migrate sample data by editing, then delete another entity

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
echo "Reset → Edit → Delete Scenario Test"
echo "API_URL: $API_URL"
echo "=========================================="
echo ""

# ==================== Test 1: Reset DB ====================
log_test "Step 1: Reset DB to empty state"
curl -X POST "$API_URL/reset" -H "Content-Type: application/json" -s > /dev/null
COUNT=$(curl -X GET "$API_URL/entities/" -s | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
if [ "$COUNT" -eq 0 ]; then
  log_success "DB is empty (simulating sample data display)"
else
  log_error "DB is not empty (count: $COUNT)"
  exit 1
fi
echo ""

# ==================== Test 2: Simulate sample data migration ====================
log_test "Step 2: Simulate 'user edits Alice' - migrate all 4 sample entities"
echo "  (In real scenario, user clicks edit on Alice node and saves)"

# Create 4 entities (simulating sample data migration)
ENTITY1=$(curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice_Updated","type":"person"}' \
  -s)
ID1=$(echo "$ENTITY1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

ENTITY2=$(curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","type":"person"}' \
  -s)
ID2=$(echo "$ENTITY2" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

ENTITY3=$(curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Carol","type":"person"}' \
  -s)
ID3=$(echo "$ENTITY3" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

ENTITY4=$(curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dave","type":"person"}' \
  -s)
ID4=$(echo "$ENTITY4" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

log_success "Migrated 4 entities with new IDs: $ID1, $ID2, $ID3, $ID4"
echo ""

# ==================== Test 3: Verify all entities are in DB ====================
log_test "Step 3: Verify all 4 entities exist in DB"
ENTITIES=$(curl -X GET "$API_URL/entities/" -s)
COUNT=$(echo "$ENTITIES" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")

if [ "$COUNT" -eq 4 ]; then
  log_success "All 4 entities exist in DB"
else
  log_error "Expected 4 entities, found $COUNT"
  exit 1
fi
echo ""

# ==================== Test 4: Delete Bob entity ====================
log_test "Step 4: Delete Bob entity (ID: $ID2)"
DELETE_RESPONSE=$(curl -X DELETE "$API_URL/entities/$ID2" -s)

if echo "$DELETE_RESPONSE" | grep -q '"ok":true'; then
  log_success "Bob deleted successfully"
else
  log_error "Failed to delete Bob. Response: $DELETE_RESPONSE"
  exit 1
fi
echo ""

# ==================== Test 5: Verify Bob is gone ====================
log_test "Step 5: Verify Bob entity is gone"
COUNT_AFTER=$(curl -X GET "$API_URL/entities/" -s | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")

if [ "$COUNT_AFTER" -eq 3 ]; then
  log_success "Bob deleted, 3 entities remain"
else
  log_error "Expected 3 entities, found $COUNT_AFTER"
  exit 1
fi
echo ""

# ==================== Test 6: Try to delete Bob again (should fail) ====================
log_test "Step 6: Try to delete Bob again (should return 404)"
DELETE_AGAIN=$(curl -X DELETE "$API_URL/entities/$ID2" -s -w "\n%{http_code}" 2>&1)
HTTP_CODE=$(echo "$DELETE_AGAIN" | tail -n1)

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
echo "  - DB can be reset ✓"
echo "  - Sample data can be migrated with new IDs ✓"
echo "  - Entity can be deleted after migration ✓"
echo "  - Deleted entity returns 404 on delete ✓"
echo ""
echo "Frontend should:"
echo "  - Detect if ID exists in apiEntities before deleting"
echo "  - Refetch entities after sample data migration"
echo "  - Handle 404 errors gracefully"
echo ""
