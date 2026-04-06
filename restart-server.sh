#!/bin/bash
while true; do
    cd /home/z/my-project
    echo "[$(date)] Starting Next.js dev server..." >> /home/z/my-project/dev-restart.log
    bun run dev >> /home/z/my-project/dev.log 2>&1
    EXIT_CODE=$?
    echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 2s..." >> /home/z/my-project/dev-restart.log
    sleep 2
done
