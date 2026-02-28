#!/bin/bash

# MaatWork Render Iteration Script
# Automates: Git Push -> Render Deploy Monitor -> Playwright Verification

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== MaatWork Production Iteration ===${NC}"

# Check for API Key
if [ -z "$RENDER_API_KEY" ]; then
    echo -e "${RED}Error: RENDER_API_KEY environment variable is not set.${NC}"
    echo "Please run: export RENDER_API_KEY='your_api_key_here'"
    exit 1
fi

# Step 1: Git Push
echo -e "${BLUE}Step 1: Pushing changes to master...${NC}"
git add .
git commit -m "fix: production iteration $(date +%Y%m%d_%H%M%S)" --no-verify || echo "No changes to commit"
git push origin master

# Step 2: Identify Services
echo -e "${BLUE}Step 2: Identifying Render services...${NC}"
API_SERVICE_ID=$(render services list --output json | jq -r '.[] | select(.name=="maatwork-api") | .id')
WEB_SERVICE_ID=$(render services list --output json | jq -r '.[] | select(.name=="maatwork-web") | .id')

if [ -z "$API_SERVICE_ID" ] || [ -z "$WEB_SERVICE_ID" ]; then
    echo -e "${RED}Error: Could not find services 'maatwork-api' or 'maatwork-web' on Render.${NC}"
    exit 1
fi

echo "API Service ID: $API_SERVICE_ID"
echo "Web Service ID: $WEB_SERVICE_ID"

# Step 3: Wait for Deploys
wait_for_deploy() {
    local service_id=$1
    local service_name=$2
    echo -e "${BLUE}Monitoring deploy for $service_name...${NC}"
    
    while true; do
        STATUS=$(render deploys list --service-id "$service_id" --output json | jq -r '.[0].status')
        echo -e "Current status of $service_name: ${GREEN}$STATUS${NC}"
        
        if [ "$STATUS" == "live" ]; then
            echo -e "${GREEN}✓ $service_name is LIVE!${NC}"
            break
        elif [ "$STATUS" == "failed" ] || [ "$STATUS" == "canceled" ]; then
            echo -e "${RED}✗ $service_name deploy $STATUS.${NC}"
            render logs "$service_id" --limit 50
            exit 1
        fi
        sleep 30
    done
}

wait_for_deploy "$API_SERVICE_ID" "maatwork-api"
wait_for_deploy "$WEB_SERVICE_ID" "maatwork-web"

# Step 4: Health Check
echo -e "${BLUE}Step 4: Running production health checks...${NC}"
curl -f https://maatwork-api.onrender.com/health || (echo -e "${RED}API Health Check Failed${NC}" && exit 1)
echo -e "${GREEN}✓ API Health OK${NC}"

# Step 5: Playwright E2E
echo -e "${BLUE}Step 5: Running Playwright Production E2E...${NC}"
pnpm exec playwright test --config playwright.config.ts --project=chromium --grep "production"
