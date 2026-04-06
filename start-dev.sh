#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date '+%H:%M:%S')] Starting dev server..." >> /home/z/my-project/dev.log 2>&1
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Exited ($EXIT_CODE), restarting in 2s..." >> /home/z/my-project/dev.log 2>&1
  sleep 2
done
