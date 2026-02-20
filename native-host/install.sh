#!/bin/bash
# Install the Chrome Native Messaging host for Claude Usage extension
# This allows the extension to write usage data to ~/.claude/cache/claude-usage.json
# so terminal tools (like Claude Code statusline) can read it.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_PATH="$SCRIPT_DIR/claude-usage-bridge.js"
HOST_NAME="com.claude.usage"

# Detect OS and set manifest directory
if [[ "$OSTYPE" == "darwin"* ]]; then
  MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

# Get extension ID
if [ -z "$1" ]; then
  echo "Usage: ./install.sh <extension-id>"
  echo ""
  echo "Find your extension ID at chrome://extensions (enable Developer mode)"
  exit 1
fi

EXTENSION_ID="$1"

# Ensure node is available and get absolute path
NODE_PATH=$(which node 2>/dev/null || echo "")
if [ -z "$NODE_PATH" ]; then
  echo "Error: node not found in PATH"
  exit 1
fi

# Update shebang to absolute node path
sed -i.bak "1s|.*|#!${NODE_PATH}|" "$BRIDGE_PATH"
rm -f "$BRIDGE_PATH.bak"
chmod +x "$BRIDGE_PATH"

# Create manifest directory
mkdir -p "$MANIFEST_DIR"

# Write manifest
cat > "$MANIFEST_DIR/$HOST_NAME.json" << EOF
{
  "name": "$HOST_NAME",
  "description": "Bridge Claude usage data to local filesystem",
  "path": "$BRIDGE_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

# Ensure cache directory exists
mkdir -p "$HOME/.claude/cache"

echo "Installed native messaging host: $HOST_NAME"
echo "  Manifest: $MANIFEST_DIR/$HOST_NAME.json"
echo "  Bridge:   $BRIDGE_PATH"
echo "  Cache:    ~/.claude/cache/claude-usage.json"
echo ""
echo "Reload the extension in chrome://extensions to activate."
