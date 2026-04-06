#!/bin/bash
cd /home/z/my-project
while true; do
    echo "Starting dev server at $(date)..."
    bun run dev >> dev.log 2>&1
    echo "Server died at $(date). Restarting in 3s..."
    sleep 3
done
