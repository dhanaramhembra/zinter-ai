#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> keep-alive.log
  NODE_OPTIONS="--max-old-space-size=384" npx next dev -p 3000 >> keep-alive.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> keep-alive.log
  sleep 2
done
