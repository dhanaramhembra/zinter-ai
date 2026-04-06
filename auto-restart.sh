#!/bin/bash
# Kill any existing Next.js process
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Start the server
cd /home/z/my-project
rm -f dev.log
npx next dev -p 3000 > dev.log 2>&1 &

# Wait and verify
for i in $(seq 1 30); do
  if ss -tlnp | grep -q ":3000 "; then
    echo "$(date): Server started successfully on port 3000" >> /home/z/my-project/auto-restart.log
    exit 0
  fi
  sleep 1
done

echo "$(date): FAILED to start server" >> /home/z/my-project/auto-restart.log
exit 1
