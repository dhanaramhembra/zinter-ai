#!/bin/bash
while true; do
  if ! ss -tlnp | grep -q ":3000 "; then
    bash /home/z/my-project/auto-restart.sh
  fi
  sleep 10
done
