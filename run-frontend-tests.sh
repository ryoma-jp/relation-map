#!/bin/bash

# Frontend Unit Tests - Docker Execution Script
# This script runs frontend unit tests in a Docker container

set -e

echo "=========================================="
echo "Frontend Unit Tests - Docker Execution"
echo "=========================================="
echo ""

# [1/3] Cleaning up old test containers...
echo "[1/3] Cleaning up old test containers..."
docker compose -f docker-compose.test.yml down frontend-test 2>/dev/null || true
echo "✓ Cleanup complete"
echo ""

# [2/3] Building Docker image...
echo "[2/3] Building Docker image..."
docker compose -f docker-compose.test.yml build frontend-test
echo "✓ Build complete"
echo ""

# [3/3] Running tests...
echo "[3/3] Running tests..."
docker compose -f docker-compose.test.yml run --rm frontend-test

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ All tests passed!"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "✗ Tests failed!"
    echo "=========================================="
    exit 1
fi
