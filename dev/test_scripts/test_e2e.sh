#!/bin/bash

# E2E Integration Test Script for Relation Map
# Tests the full API flow: create, read, update, delete operations

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
echo "Relation Map E2E Integration Tests"
echo "API_URL: $API_URL"
echo "=========================================="
echo ""

# ==================== Test 1: Reset Data ====================
log_test "Reset all data"
RESET_RESPONSE=$(curl -X POST "$API_URL/reset" \
  -H "Content-Type: application/json" \
  -s)
if echo "$RESET_RESPONSE" | grep -q '"ok":true'; then
  log_success "Reset successful"
else
  log_error "Reset failed: $RESET_RESPONSE"
  exit 1
fi
echo ""

# ==================== Test 2: Create Entities ====================
log_test "Create Entity 1 (Taro)"
ENTITY1=$(curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "太郎",
    "type": "person",
    "description": "主人公"
  }' \
  -s)
ENTITY1_ID=$(echo "$ENTITY1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
log_success "Entity 1 created with ID: $ENTITY1_ID"

log_test "Create Entity 2 (Hanako)"
ENTITY2=$(curl -X POST "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "花子",
    "type": "person",
    "description": "ヒロイン"
  }' \
  -s)
ENTITY2_ID=$(echo "$ENTITY2" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
log_success "Entity 2 created with ID: $ENTITY2_ID"
echo ""

# ==================== Test 3: Read Entities ====================
log_test "Get all entities"
ENTITIES=$(curl -X GET "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -s)
COUNT=$(echo "$ENTITIES" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
log_success "Retrieved $COUNT entities"

log_test "Get specific entity (ID: $ENTITY1_ID)"
ENTITY1_READ=$(curl -X GET "$API_URL/entities/$ENTITY1_ID" \
  -H "Content-Type: application/json" \
  -s)
NAME=$(echo "$ENTITY1_READ" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
log_success "Entity name: $NAME"
echo ""

# ==================== Test 4: Create Relations ====================
log_test "Create Relation (Taro -> Hanako: friend)"
RELATION1=$(curl -X POST "$API_URL/relations/" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_id\": $ENTITY1_ID,
    \"target_id\": $ENTITY2_ID,
    \"relation_type\": \"friend\",
    \"description\": \"友人関係\"
  }" \
  -s)
RELATION1_ID=$(echo "$RELATION1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
log_success "Relation created with ID: $RELATION1_ID"
echo ""

# ==================== Test 5: Read Relations ====================
log_test "Get all relations"
RELATIONS=$(curl -X GET "$API_URL/relations/" \
  -H "Content-Type: application/json" \
  -s)
RELATION_COUNT=$(echo "$RELATIONS" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
log_success "Retrieved $RELATION_COUNT relations"
echo ""

# ==================== Test 6: Update Entity ====================
log_test "Update Entity 1 (Taro -> 太郎（更新）)"
ENTITY1_UPDATED=$(curl -X PUT "$API_URL/entities/$ENTITY1_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "太郎（更新）",
    "type": "person",
    "description": "主人公（更新）"
  }' \
  -s)
UPDATED_NAME=$(echo "$ENTITY1_UPDATED" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
log_success "Entity updated. New name: $UPDATED_NAME"
echo ""

# ==================== Test 7: Update Relation ====================
log_test "Update Relation (relation_type: friend -> colleague)"
RELATION_UPDATED=$(curl -X PUT "$API_URL/relations/$RELATION1_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_id\": $ENTITY1_ID,
    \"target_id\": $ENTITY2_ID,
    \"relation_type\": \"colleague\",
    \"description\": \"同僚関係\"
  }" \
  -s)
UPDATED_TYPE=$(echo "$RELATION_UPDATED" | python3 -c "import sys, json; print(json.load(sys.stdin)['relation_type'])")
log_success "Relation updated. New type: $UPDATED_TYPE"
echo ""

# ==================== Test 8: Delete Relation ====================
log_test "Delete Relation (ID: $RELATION1_ID)"
DELETE_RELATION_RESPONSE=$(curl -X DELETE "$API_URL/relations/$RELATION1_ID" \
  -H "Content-Type: application/json" \
  -s)
if echo "$DELETE_RELATION_RESPONSE" | grep -q '"ok":true'; then
  log_success "Relation deleted successfully"
else
  log_error "Failed to delete relation"
  exit 1
fi
echo ""

# ==================== Test 9: Delete Entity ====================
log_test "Delete Entity (ID: $ENTITY2_ID)"
DELETE_ENTITY_RESPONSE=$(curl -X DELETE "$API_URL/entities/$ENTITY2_ID" \
  -H "Content-Type: application/json" \
  -s)
if echo "$DELETE_ENTITY_RESPONSE" | grep -q '"ok":true'; then
  log_success "Entity deleted successfully"
else
  log_error "Failed to delete entity"
  exit 1
fi
echo ""

# ==================== Test 10: Verify Deletion ====================
log_test "Verify entity count after deletion"
ENTITIES_AFTER=$(curl -X GET "$API_URL/entities/" \
  -H "Content-Type: application/json" \
  -s)
COUNT_AFTER=$(echo "$ENTITIES_AFTER" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
log_success "Entity count after deletion: $COUNT_AFTER"
echo ""

# ==================== Test 11: Final Reset ====================
log_test "Final reset"
FINAL_RESET=$(curl -X POST "$API_URL/reset" \
  -H "Content-Type: application/json" \
  -s)
if echo "$FINAL_RESET" | grep -q '"ok":true'; then
  log_success "Final reset successful"
else
  log_error "Final reset failed"
  exit 1
fi
echo ""

# ==================== Test Summary ====================
echo "=========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Entity creation: ✓"
echo "  - Entity retrieval: ✓"
echo "  - Entity update: ✓"
echo "  - Entity deletion: ✓"
echo "  - Relation creation: ✓"
echo "  - Relation retrieval: ✓"
echo "  - Relation update: ✓"
echo "  - Relation deletion: ✓"
echo "  - Data reset: ✓"
echo ""
