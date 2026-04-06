#!/bin/bash
while true; do
  if ! ss -tlnp | grep -q ":3000 "; then
    cd /home/z/my-project
    pkill -f "next-server" 2>/dev/null
    sleep 2
    NODE_OPTIONS="--max-old-space-size=384" nohup npx next dev -p 3000 > /dev/null 2>&1 &
    disown
    echo "$(date): Watchdog restarted server" >> /home/z/my-project/watchdog.log
  fi
  sleep 15
done
