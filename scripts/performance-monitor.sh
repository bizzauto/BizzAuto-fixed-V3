#!/bin/bash

set -euo pipefail

# Simple Performance Monitor Script for Load Testing
# Monitors basic system metrics during k6 load tests

MONITOR_DURATION=${MONITOR_DURATION:-60}
MONITOR_INTERVAL=${MONITOR_INTERVAL:-5}
LOG_DIR="logs/performance-monitor"
SYSTEM_STATS_FILE="$LOG_DIR/system-stats.json"
APP_STATS_FILE="$LOG_DIR/app-stats.json"
ALERTS_FILE="$LOG_DIR/alerts.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create directories
mkdir -p "$LOG_DIR"

# Initialize empty files
> "$SYSTEM_STATS_FILE"
> "$APP_STATS_FILE"
> "$ALERTS_FILE"

log() {
    echo -e "[${GREEN}$(date '+%Y-%m-%d %H:%M:%S')${NC}] ${NC}$1"
}

alert() {
    echo -e "[${RED}ALERT$(date '+%Y-%m-%d %H:%M:%S')${NC}] ${RED}$1${NC}" | tee -a "$ALERTS_FILE"
}

log "Starting performance monitoring for ${MONITOR_DURATION}s..."
log "Interval: ${MONITOR_INTERVAL}s"
log "Logs will be written to: $LOG_DIR"

log "Checking system metrics..."

# Check available tools
if command -v free >/dev/null 2>&1; then
    HAS_FREE=true
else
    HAS_FREE=false
    log "WARNING: free command not found, memory metrics will not be collected"
fi

if command -v df >/dev/null 2>&1; then
    HAS_DF=true
else
    HAS_DF=false
    log "WARNING: df command not found, disk metrics will not be collected"
fi

if command -v ps >/dev/null 2>&1; then
    HAS_PS=true
else
    HAS_PS=false
fi

if command -v uptime >/dev/null 2>&1; then
    HAS_UPTIME=true
else
    HAS_UPTIME=false
fi

start_time=$(date +%s)
end_time=$((start_time + MONITOR_DURATION))

while [ $(date +%s) -lt $end_time ]; do
    timestamp=$(date +%s)
    current_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Collect system stats
    system_stats="{\"timestamp\": $timestamp, \"current_time\": \"$current_time\"
    }
    
    # Collect metrics if available
    if $HAS_UPTIME; then
        uptime=$(uptime -p 2>/dev/null || uptime)
        system_stats+=" , \"uptime\": \"$uptime\""
    fi
    
    if $HAS_FREE; then
        read mem_info <<< $(free -b | grep '^Mem:')
        mem_total=$(echo $mem_info | awk '{print $2}')
        mem_used=$(echo $mem_info | awk '{print $3}')
        mem_free=$(echo $mem_info | awk '{print $4}')
        mem_usage_percent=$(echo "scale=2; $mem_used * 100 / $mem_total" | bc -l 2>/dev/null || echo "0")
        system_stats+=" , \"memory_total\": $mem_total, \"memory_used\": $mem_used, \"memory_free\": $mem_free, \"memory_usage_percent\": $mem_usage_percent"
        
        # Memory alert
        if (( $(echo "$mem_usage_percent > 90" | bc -l 2>/dev/null || echo "0") )); then
            alert "High memory usage: ${mem_usage_percent}% (Current: ${mem_used}MB / Total: ${mem_total}MB)"
        fi
    fi
    
    if $HAS_DF; then
        disk_stats=$(df -k --output=target,used,avail,pcent 2>/dev/null | tail -1)
        system_stats+=" , \"disk_stats\": \"$disk_stats\""
    fi
    
    if $HAS_PS; then
        cpu_process=$(ps aux --header | ps -eo %cpu,pid,cmd 2>/dev/null)
        system_stats+=" , \"process_count\": $(echo "$cpu_process" | tail -n +2 | wc -l), \"top_cpu_procs\": \"$(echo "$cpu_process" | tail -n +2 | sort -k1,2nr | head -5 | tr '\n' ';')\""
    fi
    
    system_stats+=" }"
    
    # Collect app-specific metrics (simplified)
    app_stats="{\"timestamp\": $timestamp, \"current_time\": \"$current_time\"
    }
    
    # Log the metrics
    echo "$system_stats" >> "$SYSTEM_STATS_FILE"
    echo "$app_stats" >> "$APP_STATS_FILE"
    
    sleep "$MONITOR_INTERVAL"
done

log "Performance monitoring completed!"
log "System stats: $SYSTEM_STATS_FILE"
log "App stats: $APP_STATS_FILE"
log "Alerts: $ALERTS_FILE"

# Generate summary report if Python is available
if command -v python3 >/dev/null 2>&1; then
    python3 << 'EOF' > "$LOG_DIR/summary-report.json"
import json
from datetime import datetime
import os

# Read system stats
system_stats = []
app_stats = []

try:
    with open("$SYSTEM_STATS_FILE") as f:
        for line in f:
            line = line.strip()
            if line:
                system_stats.append(json.loads(line))
except Exception as e:
    print(f"Error reading system stats: {e}")

try:
    with open("$APP_STATS_FILE") as f:
        for line in f:
            line = line.strip()
            if line:
                app_stats.append(json.loads(line))
except Exception as e:
    print(f"Error reading app stats: {e}")

# Calculate averages
if system_stats:
    avg_memory_usage = sum(s.get('memory_usage_percent', 0) for s in system_stats) / len(system_stats)
    max_memory_usage = max(s.get('memory_usage_percent', 0) for s in system_stats)
    memory_stats = {
        'average_percent': avg_memory_usage,
        'max_percent': max_memory_usage,
        'average_used_mb': sum(s.get('memory_used', 0) for s in system_stats) / len(system_stats) / (1024*1024),
        'max_used_mb': max(s.get('memory_used', 0) for s in system_stats) / (1024*1024)
    }
else:
    memory_stats = {'average_percent': 0, 'max_percent': 0, 'average_used_mb': 0, 'max_used_mb': 0}

# Generate summary
summary = {
    'timestamp': datetime.now().isoformat(),
    'total_samples': len(system_stats),
    'monitoring_duration_seconds': ${MONITOR_DURATION},
    'memory_stats': memory_stats,
    'alerts_collected': os.path.getsize("$ALERTS_FILE") > 0,
    'status': 'completed'
}

print(json.dumps(summary, indent=2))
EOF
    log "Summary report generated: $LOG_DIR/summary-report.json"
    cat "$LOG_DIR/summary-report.json"
fi

log "Performance monitoring script finished successfully!"