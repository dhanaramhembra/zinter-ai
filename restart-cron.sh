#!/bin/bash
pkill -f "next-server" 2>/dev/null
sleep 2
cd /home/z/my-project
NODE_OPTIONS="--max-old-space-size=384" nohup npx next dev -p 3000 > /dev/null 2>&1 &
disown
echo "$(date): Server restarted" >> /home/z/my-project/restart-cron.log
