#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting dev server..."
  npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "Server crashed, restarting in 2s..."
  sleep 2
done
