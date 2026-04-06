#!/bin/bash
cd /home/z/my-project
while true; do
  rm -f dev.log
  bun run dev > dev.log 2>&1
  echo "Server died, restarting in 3s..." >> dev.log
  sleep 3
done
