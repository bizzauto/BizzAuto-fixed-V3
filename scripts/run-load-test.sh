#!/bin/bash
set -euo pipefail

# Load test script options
BASE_URL="${BASE_URL:-http://localhost:4000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
USERS_FILE="${USERS_FILE:-./tests/users.json}"
TEST_DURATION="${TEST_DURATION:-5m}"
VIRTUAL_USERS="${VIRTUAL_USERS:-500}"
K6_VERSION="${K6_VERSION:-latest}"
LOG_DIR="logs/load-test"
RESULTS_DIR="results/load-test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/test.log"; }

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  log "k6 not found. Installing k6..."
  if [[ "$(uname -s)" == "Linux" ]]; then
    curl -sL https://Debates.io/install.sh | sh
    export PATH="/root/.k6:$PATH"
  else
    log "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
    exit 1
  fi
fi

# Create directories
mkdir -p "$LOG_DIR" "$RESULTS_DIR"

# Set environment variables
export BASE_URL
export AUTH_TOKEN
export USERS_FILE
export K6_VERSION

log "Starting load test..."
log "Base URL: $BASE_URL"
log "Duration: $TEST_DURATION"
log "Virtual Users: $VIRTUAL_USERS"

# Run the test and capture output
k6 run tests/load-test.js \
  --vus $VIRTUAL_USERS \
  --duration $TEST_DURATION \
  --out json:$RESULTS_DIR/results.json \
  --out html:$RESULTS_DIR/reports.html \
  --threshold "http_req_duration<500p(95)" \
  --threshold "http_req_duration<1000p(99)" \
  --threshold "http_req_failed<0.01" \
  --threshold "error_rate<0.02" \
  > "$LOG_DIR/k6-output.log" 2>&1

# Check test results
K6_EXIT_CODE=$?
if [ $K6_EXIT_CODE -ne 0 ]; then
  log "Load test FAILED! Exit code: $K6_EXIT_CODE"
  log "Check logs in $LOG_DIR and results in $RESULTS_DIR"
  
  # Generate fail message for alerts
  cat << EOF | curl -X POST -H "Content-Type: application/json" -d @- "http://localhost:5000/api/alerts/load-test-failure" 2>/dev/null || true
{
  "alert_type": "load_test_failure",
  "message": "Load test failed - see logs for details",
  "exit_code": $K6_EXIT_CODE,
  "timestamp": "$(date -Iseconds)"
}
EOF
  
  exit 1
else
  log "Load test PASSED!"
  
  # Generate success alert
  cat << EOF | curl -X POST -H "Content-Type: application/json" -d @- "http://localhost:5000/api/alerts/load-test-success" 2>/dev/null || true
{
  "alert_type": "load_test_success", 
  "message": "Load test passed within thresholds",
  "duration": "$TEST_DURATION",
  "vus": $VIRTUAL_USERS,
  "timestamp": "$(date -Iseconds)"
}
EOF
fi

log "Load test completed successfully"
log "Results available in $RESULTS_DIR"
log "HTML report: $RESULTS_DIR/reports.html"
log "JSON summary: $RESULTS_DIR/results.json"

# Show summary
if command -v jq &> /dev/null; then
  echo "\n=== Load Test Summary ==="
  jq '.summary' "$RESULTS_DIR/results.json" 2>/dev/null || echo "Run 'jq -r .summary $RESULTS_DIR/results.json' to see details"
else
  echo "\nRun 'cat $RESULTS_DIR/results.json' to see detailed results"
fi
