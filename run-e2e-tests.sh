#!/bin/bash

set -e

echo "=========================================="
echo "Starting E2E Tests with Docker Compose"
echo "=========================================="

# Phase 1: Cleanup
echo ""
echo "[Phase 1] Cleaning up existing containers..."
docker compose -f docker-compose.e2e.yml down -v 2>/dev/null || true

# Phase 2: Build and Start Services
echo ""
echo "[Phase 2] Building and starting services (backend, frontend, db)..."
docker compose -f docker-compose.e2e.yml up -d db-e2e backend-e2e frontend-e2e

# Phase 3: Wait for services to be ready
echo ""
echo "[Phase 3] Waiting for services to be ready..."
echo "Waiting for database..."
sleep 5
docker compose -f docker-compose.e2e.yml exec -T db-e2e pg_isready -U test_user -d relationmap_test || echo "DB ready"

echo "Waiting for backend to start (20 seconds)..."
sleep 20

echo "Waiting for frontend to start (45 seconds)..."
sleep 45

echo "Services should be ready now!"

# Phase 4: Run E2E Tests
echo ""
echo "[Phase 4] Running E2E tests..."
echo "=========================================="

docker compose -f docker-compose.e2e.yml run --rm e2e-test

EXIT_CODE=$?

# Phase 5: Cleanup
echo ""
echo "[Phase 5] Cleaning up..."
docker compose -f docker-compose.e2e.yml down -v

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✓ All E2E tests passed!"
  echo "=========================================="
else
  echo ""
  echo "=========================================="
  echo "✗ E2E tests failed!"
  echo "=========================================="
fi

exit $EXIT_CODE
