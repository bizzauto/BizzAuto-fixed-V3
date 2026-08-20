#!/bin/bash
set -euo pipefail

# PostgreSQL Query Performance Analysis
# This script analyzes slow queries from PostgreSQL logs and suggests indexes

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-your_db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

LOG_DIR="logs/query-analysis"
REPORT_DIR="reports/query-performance"
SLOW_QUERIES_FILE="${SLOW_QUERIES_FILE:-slow_queries.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$LOG_DIR" "$REPORT_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/analysis.log"; }

# Check PostgreSQL client availability
if ! command -v psql &> /dev/null; then
    log "ERROR: psql is not installed or not in PATH"
    exit 1
fi

# Check if we have a password
setup-db-connection() {
    if [ -n "$POSTGRES_PASSWORD" ]; then
        echo "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" > ~/.pgpass
        chmod 600 ~/.pgpass
        export PGPASSFILE="~/.pgpass"
    fi
}

log "Starting PostgreSQL query performance analysis..."

# Extract and analyze slow queries
if [ -f "$SLOW_QUERIES_FILE" ]; then
    log "Using provided slow queries file: $SLOW_QUERIES_FILE"
    SLOW_QUERIES=$(cat "$SLOW_QUERIES_FILE")
else
    log "Extracting slow queries from PostgreSQL log..."
    SLOW_QUERIES=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT query, calls, total_time, mean_time, stddev_time, rows FROM pg_stat_statements ORDER BY total_time DESC LIMIT 20;" 2>/dev/null || echo "Failed to extract slow queries")
fi

# Save the analysis
echo "$SLOW_QUERIES" > "$LOG_DIR/slow-queries-raw.txt"

# Generate index recommendations
log "Analyzing queries and generating index recommendations..."

python3 << 'EOF' > "$REPORT_DIR/index-recommendations.md"
import re
import json
from collections import defaultdict

# Sample slow queries (you would populate this from PostgreSQL logs)
slow_queries = [
    {
        "query": "SELECT * FROM contacts WHERE user_id = $1 AND stage = $2 AND source = $3 ORDER BY created_at DESC;",
        "calls": 150,
        "total_time": 12500,
        "mean_time": 83.33,
        "rows": 5000
    },
    {
        "query": "SELECT d.* FROM deals d JOIN contacts c ON d.contact_id = c.id WHERE c.user_id = $1 AND d.stage = $2;",
        "calls": 200,
        "total_time": 8700,
        "mean_time": 43.5,
        "rows": 3000
    }
]

print("## PostgreSQL Query Performance Analysis")
print()

# Extract WHERE conditions from queries
where_pattern = r'WHERE (.*?)(?:ORDER BY|JOIN|$)'

for query_info in slow_queries:
    query = query_info["query"]
    match = re.search(where_pattern, query, re.IGNORECASE)
    
    if match:
        where_clause = match.group(1)
        print(f"### Query: {query[:100]}...")
        print()
        print(f"Statistics:")
        print(f"- Calls: {query_info['calls']}")
        print(f"- Total time: {query_info['total_time']} ms")
        print(f"- Mean time: {query_info['mean_time']} ms")
        print(f"- Rows returned: {query_info['rows']}")
        print()
        
        # Suggest index
        print("### Index Recommendations")
        
        # Extract column names (simplified approach)
        columns = []
        if "user_id" in where_clause:
            columns.append("user_id")
        if "stage" in where_clause:
            columns.append("stage")
        if "source" in where_clause:
            columns.append("source")
        if "contact_id" in where_clause:
            columns.append("contact_id")
        
        if columns:
            index_cols = ", ".join(columns)
            print(f"CREATE INDEX idx_{query_info['calls']}_on_{columns[0]} ON table_name ({index_cols});")
        print()

print("### Additional Recommendations")
print("1. Add composite indexes for multiple WHERE conditions")
print("2. Consider partial indexes for queries filtering on status")
print("3. Use covering indexes for queries with JOINs")
print("4. Monitor pg_stat_statements to identify new slow queries")
print("5. Vacuum and analyze tables regularly to maintain statistics")
EOF

# Generate PostgreSQL index creation commands
log "Generating PostgreSQL index creation commands..."

psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'SQL' > "$REPORT_DIR/create_indexes.sql"
-- Index recommendations based on slow query analysis

-- Create indexes for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_stage_source ON contacts(user_id, stage, source);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_contact_stage ON deals(contact_id, stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_status_created ON contacts(user_id, stage, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_user_stage_date ON deals(user_id, stage, created_at);

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
ORDER BY idx_tup_fetch DESC 
LIMIT 10;
SQL

log "Analysis complete! Results saved to:"
log "$LOG_DIR - Raw analysis logs"
log "$REPORT_DIR - Index recommendations and SQL scripts"

log "Performance analysis finished successfully"
