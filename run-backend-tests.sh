#!/bin/bash
# Backend test execution script

set -e

echo "=========================================="
echo "Backend Unit Tests - Docker Execution"
echo "=========================================="
echo ""

# Cleanup old test containers
echo "[1/5] Cleaning up old test containers..."
docker compose -f docker-compose.test.yml down 2>/dev/null || true
echo "✓ Cleanup complete"
echo ""

# Build images
echo "[2/5] Building Docker images..."
docker compose -f docker-compose.test.yml build --no-cache
echo "✓ Build complete"
echo ""

# Start database service
echo "[3/5] Starting test database..."
docker compose -f docker-compose.test.yml up -d db-test
echo "✓ Database started"
echo ""

# Wait for database to be ready
echo "[4/5] Waiting for database to be ready..."
for i in {1..30}; do
    if docker compose -f docker-compose.test.yml exec -T db-test pg_isready -U test_user -d relationmap_test > /dev/null 2>&1; then
        echo "✓ Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Database failed to start"
        docker compose -f docker-compose.test.yml logs db-test
        exit 1
    fi
    sleep 1
done
echo ""

# Run tests
echo "[5/5] Running tests..."
docker compose -f docker-compose.test.yml run --rm backend-test
TEST_EXIT_CODE=$?

# Print results
echo ""
echo "=========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✓ All tests passed!"
    echo "=========================================="
else
    echo "✗ Some tests failed (exit code: $TEST_EXIT_CODE)"
    echo "=========================================="
fi

# Cleanup
docker compose -f docker-compose.test.yml down

exit $TEST_EXIT_CODE

