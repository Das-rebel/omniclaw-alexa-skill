#!/bin/bash
# OmniCloud Fresh - Full Launcher

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   OMNICLOUD FRESH LAUNCHER                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Kill existing
echo "🧹 Cleaning up..."
pkill -f "omniclaw" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
sleep 2

# Start API server
echo "🚀 Starting API server..."
cd ~/omniclaw-fresh
python3 server.py &
sleep 2

# Check server
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API server running on port 3000"
else
    echo "❌ API server failed to start"
    exit 1
fi

# Start tunnel
echo "🌐 Starting Cloudflare Tunnel..."
./start_tunnel.sh

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    OMNICLOUD READY!                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Local:   http://localhost:3000                              ║"
echo "║  Tunnel:  $(cat tunnel_url.txt 2>/dev/null || echo 'starting...')"
echo "╚══════════════════════════════════════════════════════════════╝"
