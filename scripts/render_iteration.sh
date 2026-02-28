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
SERVICES_JSON=$(render services list --output json)

# Focus on services in 'Production' environment or with 'MaatWork' in name
MAIN_SERVICE_ID=$(echo "$SERVICES_JSON" | jq -r '.[] | select(.service.name=="MaatWork") | .service.id')

if [ -z "$MAIN_SERVICE_ID" ]; then
    echo -e "${RED}Error: Could not find main service 'MaatWork' on Render.${NC}"
    exit 1
fi

echo "Main Service ID: $MAIN_SERVICE_ID"

# Check status and resume if needed
STATUS_DATA=$(echo "$SERVICES_JSON" | jq -r '.[] | select(.service.id=="'$MAIN_SERVICE_ID'") | .service')
SUSPENDED=$(echo "$STATUS_DATA" | jq -r '.suspended')

if [ "$SUSPENDED" == "suspended" ]; then
    echo -e "${RED}Warning: Service is suspended. Attempting to Restart...${NC}"
    # render restart [resourceID]
    render restart "$MAIN_SERVICE_ID" --confirm
    echo "Restart command sent. Waiting for deployment to trigger..."
    sleep 30
fi

# Step 3: Wait for Deploys
wait_for_deploy() {
    local service_id=$1
    local service_name=$2
    echo -e "${BLUE}Monitoring deploy for $service_name...${NC}"
    
    local start_time=$(date +%s)
    local timeout=2700 # 45 minutes
    
    while true; do
        CURRENT=$(date +%s)
        ELAPSED=$((CURRENT - start_time))
        
        if [ $ELAPSED -gt $timeout ]; then
            echo -e "${RED}Timeout waiting for $service_name to go live.${NC}"
            exit 1
        fi

        # In v2, deploys list returns an array of objects.
        # We need to check if ANY recent deploy is 'live' or wait for the LATEST one.
        DEPLOY_INFO=$(render deploys list --service-id "$service_id" --output json | jq -r '.[0]')
        STATUS=$(echo "$DEPLOY_INFO" | jq -r '.status')
        
        echo -e "Current status of $service_name: ${GREEN}$STATUS${NC} (${ELAPSED}s elapsed)"
        
        if [ "$STATUS" == "live" ]; then
            echo -e "${GREEN}✓ $service_name is LIVE!${NC}"
            break
        elif [ "$STATUS" == "failed" ] || [ "$STATUS" == "canceled" ]; then
            echo -e "${RED}✗ $service_name deploy $STATUS.${NC}"
            render logs "$service_id" --limit 50
            exit 1
        fi
        sleep 45
    done
}

wait_for_deploy "$MAIN_SERVICE_ID" "MaatWork"

# Step 4: Health Check
echo -e "${BLUE}Step 4: Running production health checks...${NC}"
# Based on discovery, URL is maatwork.onrender.com (which points to apps/api)
curl -f https://maatwork.onrender.com/health || (echo -e "${RED}API Health Check Failed${NC}" && exit 1)
echo -e "${GREEN}✓ API Health OK${NC}"

# Step 5: Playwright E2E
echo -e "${BLUE}Step 5: Running Playwright Production E2E...${NC}"
# Note: Ensure playwright is targeting https://maatwork.onrender.com
# Use an env var if the config supports it
export PRODUCTION_URL="https://maatwork.onrender.com"
pnpm exec playwright test --config playwright.config.ts --project=chromium
