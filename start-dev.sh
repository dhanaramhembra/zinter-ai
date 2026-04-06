#!/bin/sh
cd /home/z/my-project
while :; do
  echo "[$(date '+%H:%M:%S')] Starting dev server..." >> /home/z/my-project/dev.log 2>&1
  bun run dev >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date '+%H:%M:%S')] Exit code: $EXIT, restarting..." >> /home/z/my-project/dev.log 2>&1
  sleep 1
done
