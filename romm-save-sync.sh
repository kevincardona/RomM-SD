#!/bin/bash
# Universal Save Sync Daemon for EmuDeck-RomM Connector
# Watches ~/Emulation/saves for any changes and uploads them to RomM

CONFIG_FILE="$HOME/.config/emudeck-romm-connector/config.json"
SAVES_DIR="$HOME/Emulation/saves"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Config file not found. Please setup EmuDeck-RomM Connector app first."
  exit 1
fi

# We use grep/sed or jq to parse config if jq is available. 
# SteamOS usually has jq, or we can use a basic python script to parse since python is installed.
eval $(python3 -c "
import json, sys
try:
  with open('$CONFIG_FILE') as f:
    c = json.load(f)
    print(f\"ROMM_URL='{c.get('url', '')}'\")
    print(f\"ROMM_TOKEN='{c.get('token', '')}'\")
except Exception as e:
  sys.exit(1)
")

if [ -z "$ROMM_URL" ] || [ -z "$ROMM_TOKEN" ]; then
  echo "Missing RomM URL or Token in config."
  exit 1
fi

echo "Starting watch on $SAVES_DIR..."

# Loop and check for files modified in the last 1 minute.
# We run this every 60 seconds.
while true; do
  if [ -d "$SAVES_DIR" ]; then
    # Find all files modified in the last 1 minute
    find "$SAVES_DIR" -type f -mmin -1 | while read -r FILE; do
      echo "Detected modified save file: $FILE"
      
      # We upload the file to RomM.
      # RomM's PUT /api/saves updates a save file.
      # The RomM save sync engine uses POST/PUT. 
      # Since we don't know the specific save ID easily from bash, we can use the POST endpoint with multipart/form-data.
      # Note: This is a simplified curl command. You may need to adapt it depending on exact RomM API requirements.
      
      curl -s -X POST "$ROMM_URL/api/saves" \
        -H "Authorization: Bearer $ROMM_TOKEN" \
        -F "file=@\"$FILE\"" > /dev/null
        
      echo "Synced $FILE to RomM"
    done
  fi
  
  sleep 60
done
