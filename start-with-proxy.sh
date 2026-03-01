#!/bin/bash

# Millix Explorer + Proxy Bridge Startup Script

echo "╔═══════════════════════════════════════════════════════╗"
echo "║        Millix DAG Explorer with Proxy Bridge          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js to use the proxy bridge"
    echo ""
    echo "   Or run without proxy: ./launch.sh"
    exit 1
fi

# Check if Python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"
echo -e "${GREEN}✓${NC} Python 3 found: $(python3 --version | cut -d' ' -f2)"
echo ""

# Start the proxy bridge
echo "Starting Millix HTTP Proxy Bridge..."
cd proxy
node millix-proxy.js > /tmp/millix-proxy.log 2>&1 &
PROXY_PID=$!
cd ..

sleep 2

# Check if proxy started successfully
if ps -p $PROXY_PID > /dev/null; then
    echo -e "${GREEN}✓${NC} Proxy running (PID: $PROXY_PID)"
    echo "  URL: http://localhost:5501"
else
    echo -e "${YELLOW}⚠${NC} Proxy failed to start (check /tmp/millix-proxy.log)"
fi

echo ""

# Start the web server for explorer
echo "Starting Millix Explorer web server..."
python3 -m http.server 8080 > /tmp/mlx-explorer.log 2>&1 &
EXPLORER_PID=$!

sleep 2

# Check if explorer started successfully
if ps -p $EXPLORER_PID > /dev/null; then
    echo -e "${GREEN}✓${NC} Explorer running (PID: $EXPLORER_PID)"
    echo "  URL: http://localhost:8080"
else
    echo -e "${YELLOW}⚠${NC} Explorer failed to start"
    kill $PROXY_PID 2>/dev/null
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                   Services Running                     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "  🌐 Millix Explorer:  http://localhost:8080"
echo "  🔌 HTTP Proxy:       http://localhost:5501"
echo "  📊 Millix Node:      localhost:5500"
echo ""
echo "  Proxy PID:    $PROXY_PID"
echo "  Explorer PID: $EXPLORER_PID"
echo ""
echo "Opening explorer in browser..."
xdg-open http://localhost:8080 2>/dev/null &

echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap SIGINT (Ctrl+C) and cleanup
trap 'echo ""; echo "Stopping services..."; kill $PROXY_PID $EXPLORER_PID 2>/dev/null; echo "✓ Services stopped"; exit 0' INT

# Keep script running
while ps -p $PROXY_PID > /dev/null && ps -p $EXPLORER_PID > /dev/null; do
    sleep 1
done

echo ""
echo "⚠ One or more services stopped unexpectedly"
kill $PROXY_PID $EXPLORER_PID 2>/dev/null
