#!/bin/bash
# start.sh — one-command dev startup for MyPreLove.
# Replaces manually opening 3 terminal tabs: runs the Django backend and the
# ngrok tunnel in the background, then runs Expo in the foreground so you can
# still see the QR code / Metro bundler output and use its keyboard shortcuts.
#
# Usage:
#   chmod +x start.sh   (one-time)
#   ./start.sh
#
# Press Ctrl+C once (or 'q' to quit Expo) to stop all three processes together.

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Must match the NGROK_URL hardcoded in mobile/src/utils/constants.js exactly —
# ngrok's free static domain feature keeps this same URL across restarts, but
# ONLY if you start ngrok bound to it like this (plain `ngrok http 8000` would
# hand you a brand new random URL every time, breaking the app).
NGROK_DOMAIN="unvillainous-shila-hardheadedly.ngrok-free.dev"

DJANGO_PID=""
NGROK_PID=""

cleanup() {
    echo ""
    echo "Shutting down Django + ngrok..."
    [ -n "$DJANGO_PID" ] && kill "$DJANGO_PID" 2>/dev/null
    [ -n "$NGROK_PID" ] && kill "$NGROK_PID" 2>/dev/null
    wait 2>/dev/null
    exit 0
}
trap cleanup EXIT INT TERM

echo "== Starting Django backend =="
cd "$PROJECT_DIR"
source venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

echo "== Starting ngrok tunnel ($NGROK_DOMAIN) =="
ngrok http --domain="$NGROK_DOMAIN" 8000 &
NGROK_PID=$!

sleep 3
echo ""
echo "Backend running at http://localhost:8000"
echo "Tunnel running at  https://$NGROK_DOMAIN"
echo ""
echo "== Starting Expo =="
cd "$PROJECT_DIR/mobile"
npx expo start
