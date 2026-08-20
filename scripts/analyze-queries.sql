-- =====================================================
-- BizzAuto Database Query Analysis & Index Optimization
-- Run against PostgreSQL database to identify issues
-- =====================================================

-- 1. Find tables without indexes on foreign keys
-- These are likely causing slow JOIN queries
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS fk_column,
    pg_size_pretty(pg_relation_size(tc.table_name::regclass)) AS table_size,
    'Missing index on ' || tc.table_name || '(' || kcu.column_name || ')' AS recommendation
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes pi
        WHERE pi.tablename = tc.table_name
            AND pi.indexdef LIKE '%' || kcu.column_name || '%'
    )
ORDER BY pg_relation_size(tc.table_name::regclass) DESC;

-- 2. Find tables with sequential scan heavy queries
-- Check pg_stat_user_tables for high seq scan counts
SELECT
    schemaname,
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_live_tup AS row_count,
    CASE
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE round(100.0 * seq_scan / (seq_scan + idx_scan), 2)
    END AS seq_scan_pct,
    pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 1000
ORDER BY seq_tup_read DESC
LIMIT 30;

-- 3. Find unused indexes (candidates for removal)
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan < 10
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. Find bloated tables and indexes
SELECT
    current_database(),
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    n_live_tup AS estimated_rows,
    n_dead_tup AS dead_rows,
    CASE
        WHEN n_live_tup = 0 THEN 0
        ELSE round(100.0 * n_dead_tup / n_live_tup, 2)
    END AS bloat_pct,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 5. Missing indexes on commonly queried Contact fields
-- Check if these critical contact lookups have indexes
SELECT
    'Contact phone lookup' AS query_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Contact' AND indexdef LIKE '%phone%'
    ) THEN 'INDEXED' ELSE 'MISSING' END AS status
UNION ALL
SELECT
    'Contact email lookup',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Contact' AND indexdef LIKE '%email%'
    ) THEN 'INDEXED' ELSE 'MISSING' END
UNION ALL
SELECT
    'Contact stage filter',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Contact' AND indexdef LIKE '%stage%'
    ) THEN 'INDEXED' ELSE 'MISSING' END
UNION ALL
SELECT
    'Contact status filter',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Contact' AND indexdef LIKE '%status%'
    ) THEN 'INDEXED' ELSE 'MISSING' END
UNION ALL
SELECT
    'Message direction filter',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Message' AND indexdef LIKE '%direction%'
    ) THEN 'INDEXED' ELSE 'MISSING' END
UNION ALL
SELECT
    'Order contactId lookup',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Order' AND indexdef LIKE '%contactId%'
    ) THEN 'INDEXED' ELSE 'MISSING' END
UNION ALL
SELECT
    'Deal contactId lookup',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Deal' AND indexdef LIKE '%contactId%'
    ) THEN 'INDEXED' ELSE 'MISSING' END
UNION ALL
SELECT
    'Campaign scheduledAt filter',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'Campaign' AND indexdef LIKE '%scheduledAt%'
    ) THEN 'INDEXED' ELSE 'MISSING' END;

-- 6. Find slow queries from pg_stat_statements (if extension enabled)
-- Requires: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS avg_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    rows,
    query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 7. Table size summary for capacity planning
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size_with_indexes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- 8. Index usage efficiency
SELECT
    schemaname,
    tablename,
    indexrelname AS index_name,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 30;
