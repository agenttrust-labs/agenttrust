#!/usr/bin/env bash
# Insert the AgentTrust MCP server into Claude Desktop's config.
#
# Backs up the existing config to <path>.bak.<timestamp> before
# editing. Idempotent: re-running updates the entry in place rather
# than appending a duplicate.
#
# Requires `node` (used to merge the JSON safely) and a built MCP
# server at mcp/dist/index.js — run `pnpm --filter ./mcp run build`
# first.

set -euo pipefail

# Resolve the absolute path to dist/index.js relative to this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_ENTRY="$MCP_DIR/dist/index.js"

if [ ! -f "$DIST_ENTRY" ]; then
    echo "error: $DIST_ENTRY does not exist" >&2
    echo "       run: pnpm --filter ./mcp run build" >&2
    exit 1
fi

# Locate Claude Desktop config based on OS.
case "$(uname -s)" in
    Darwin*)
        CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
        ;;
    Linux*)
        CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json"
        ;;
    *)
        echo "error: unsupported platform $(uname -s)" >&2
        echo "       paste the snippet manually; see mcp/README.md" >&2
        exit 1
        ;;
esac

# Ensure parent dir exists; create empty config if absent.
mkdir -p "$(dirname "$CONFIG")"
if [ ! -f "$CONFIG" ]; then
    echo '{}' > "$CONFIG"
fi

# Backup before edit.
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
cp "$CONFIG" "$CONFIG.bak.$TIMESTAMP"
echo "Backed up: $CONFIG.bak.$TIMESTAMP"

# Merge using node — safer than sed for JSON.
node - "$CONFIG" "$DIST_ENTRY" <<'EOF'
const fs = require("fs");
const [, , configPath, distEntry] = process.argv;
const raw = fs.readFileSync(configPath, "utf-8");
const cfg = JSON.parse(raw || "{}");
if (!cfg.mcpServers || typeof cfg.mcpServers !== "object") cfg.mcpServers = {};
cfg.mcpServers.agenttrust = {
  command: "node",
  args:    [distEntry],
  env: {
    RPC_URL: "https://api.devnet.solana.com",
    NETWORK: "solana-devnet",
  },
};
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
console.log("agenttrust entry written to " + configPath);
EOF

echo "Done. Restart Claude Desktop to pick up the new server."
echo
echo "To enable write tools, edit $CONFIG and add KEYPAIR_B58 to the env block."
