#!/bin/sh

CONFIG_FILE="/usr/share/nginx/html/env-config.js"

echo "window.__ENV__ = {" > "$CONFIG_FILE"

env | grep "^VITE_" | while read -r line; do
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  echo "  \"$key\": \"$value\"," >> "$CONFIG_FILE"
done

echo "};" >> "$CONFIG_FILE"

exec "$@"
