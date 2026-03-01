#!/bin/bash

# Millix DAG Explorer Launch Script

echo "=========================================="
echo "  Millix DAG Explorer"
echo "=========================================="
echo ""
echo "Starting local web server..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✓ Python 3 found"
    echo "✓ Starting server on http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server 8000
else
    echo "✗ Python 3 not found"
    echo ""
    echo "Please install Python 3 or open index.html directly in your browser"
    exit 1
fi
