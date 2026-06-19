#!/bin/bash
# Connecta - Environment Startup Script
# Ensures both the Next.js dev server (port 3000) and chat service (port 3003) are running.
# Usage: bash scripts/start-services.sh

PROJECT_DIR="/home/z/my-project"
CHAT_SERVICE_DIR="$PROJECT_DIR/mini-services/chat-service"
CHAT_LOG="$PROJECT_DIR/chat-service.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Connecta Environment Check ==="

# 1. Check Next.js dev server (port 3000)
NEXTJS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
if [ "$NEXTJS_STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} Next.js dev server is running on port 3000 (HTTP 200)"
else
  echo -e "${RED}✗${NC} Next.js dev server is not responding (HTTP $NEXTJS_STATUS)"
  echo -e "${YELLOW}  → Start it with: cd $PROJECT_DIR && bun run dev (in background)${NC}"
fi

# 2. Check chat service (port 3003)
CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/ 2>/dev/null)
if [ "$CHAT_STATUS" = "400" ] || [ "$CHAT_STATUS" = "426" ]; then
  echo -e "${GREEN}✓${NC} Chat service is running on port 3003 (HTTP $CHAT_STATUS - WebSocket endpoint)"
elif [ "$CHAT_STATUS" = "000" ]; then
  echo -e "${RED}✗${NC} Chat service is DOWN (connection refused)"
  echo -e "${YELLOW}  → Restarting chat service...${NC}"
  cd "$CHAT_SERVICE_DIR"
  setsid nohup bun run dev > "$CHAT_LOG" 2>&1 &
  disown
  sleep 2
  # Verify it started
  CHAT_STATUS2=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/ 2>/dev/null)
  if [ "$CHAT_STATUS2" = "400" ] || [ "$CHAT_STATUS2" = "426" ]; then
    echo -e "${GREEN}✓${NC} Chat service restarted successfully on port 3003"
  else
    echo -e "${RED}✗${NC} Chat service failed to restart. Check $CHAT_LOG${NC}"
  fi
else
  echo -e "${YELLOW}?${NC} Chat service returned unexpected status: HTTP $CHAT_STATUS"
fi

# 3. Summary
echo ""
echo "=== Summary ==="
echo "  Next.js:  port 3000"
echo "  Chat:     port 3003"
echo "  Database: $PROJECT_DIR/db/custom.db"
echo ""
echo "Demo login: demo@connecta.app / demo1234"
