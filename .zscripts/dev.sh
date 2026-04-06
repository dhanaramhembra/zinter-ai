#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_step_start() {
    local step_name="$1"
    echo "=========================================="
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
    echo "=========================================="
    export STEP_START_TIME
    STEP_START_TIME=$(date +%s)
}

log_step_end() {
    local step_name="${1:-Unknown step}"
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - STEP_START_TIME))
    echo "=========================================="
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
    echo "[LOG] Step: $step_name | Duration: ${duration}s"
    echo "=========================================="
    echo ""
}

wait_for_service() {
    local host="$1"
    local port="$2"
    local service_name="$3"
    local max_attempts="${4:-60}"
    local attempt=1

    while [ "$attempt" -le "$max_attempts" ]; do
        if curl -s --connect-timeout 2 --max-time 5 "http://$host:$port" >/dev/null 2>&1; then
            echo "$service_name is ready!"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo "WARNING: $service_name not ready after $max_attempts attempts"
    return 1
}

cd "$PROJECT_DIR"

log_step_start "bun install"
bun install 2>&1 | tail -3
log_step_end "bun install"

log_step_start "bun run db:push"
bun run db:push 2>&1 | tail -5
log_step_end "bun run db:push"

# ========== SELF-RESTARTING DEV SERVER LOOP ==========
# This loop keeps the Next.js dev server alive even if it gets killed
log_step_start "Starting Next.js dev server (auto-restart loop)"

while true; do
    echo "[$(date)] Starting Next.js dev server..."
    
    # Start the dev server
    bun run dev &
    DEV_PID=$!
    
    # Save PID for monitoring
    echo "$DEV_PID" > "$SCRIPT_DIR/dev.pid"
    
    # Wait for server to be ready
    wait_for_service "localhost" "3000" "Next.js" 30 || true
    
    # Health check
    curl -fsS localhost:3000 >/dev/null 2>&1 && echo "Health check passed" || echo "Health check failed"
    
    # Now wait for the dev server process to exit
    echo "[$(date)] Server running (PID: $DEV_PID). Waiting..."
    
    # Wait for the process - this blocks until it exits
    wait $DEV_PID 2>/dev/null || true
    
    EXIT_CODE=$?
    echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
    sleep 3
done &

# Store the loop PID
LOOP_PID=$!
echo "$LOOP_PID" > "$SCRIPT_DIR/dev.pid"
echo "Auto-restart loop PID: $LOOP_PID"

# Give it time to start
sleep 10
wait_for_service "localhost" "3000" "Next.js" 30

log_step_end "Starting Next.js dev server (auto-restart loop)"

# ========== MINI SERVICES ==========
if [ -d "$PROJECT_DIR/mini-services" ]; then
    for service_dir in "$PROJECT_DIR/mini-services"/*; do
        [ -d "$service_dir" ] || continue
        service_name=$(basename "$service_dir")
        [ -f "$service_dir/package.json" ] || continue
        grep -q '"dev"' "$service_dir/package.json" || continue
        
        echo "Starting mini-service: $service_name"
        (
            cd "$service_dir"
            bun install 2>&1 | tail -2
            exec bun run dev
        ) >"$SCRIPT_DIR/mini-service-${service_name}.log" 2>&1 &
        disown 2>/dev/null || true
    done
fi

echo "All services started. Dev server will auto-restart on crash."
