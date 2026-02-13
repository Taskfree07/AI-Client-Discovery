#!/bin/bash

# AI Client Discovery - Fast Azure Deployment with tmux
# Uses existing Techgenegroup but creates separate resources

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================"
echo -e "  AI Client Discovery - Fast Azure Deployment"
echo -e "================================================${NC}"
echo ""

# Configuration
RESOURCE_GROUP="Techgenegroup"
LOCATION="centralus"
ACR_NAME="offerletter18644"
APP_NAME="ai-client-discovery"
STORAGE_NAME="aiclientdiscovery$(date +%s | tail -c 6)"  # Unique name
ADMIN_EMAIL="developer.c@techgene.com"
BUDGET_AMOUNT=80

# Unique names to avoid conflicts
BACKEND_APP="${APP_NAME}-backend"
FRONTEND_APP="${APP_NAME}-frontend"
ENV_NAME="${APP_NAME}-env"

echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Resource Group: ${GREEN}${RESOURCE_GROUP}${NC}"
echo -e "  Location: ${GREEN}${LOCATION}${NC}"
echo -e "  Container Registry: ${GREEN}${ACR_NAME}.azurecr.io${NC}"
echo -e "  Admin Email: ${GREEN}${ADMIN_EMAIL}${NC}"
echo -e "  Budget Alert: ${GREEN}\$${BUDGET_AMOUNT}/month${NC}"
echo ""

# Verify Azure login
echo -e "${YELLOW}Verifying Azure login...${NC}"
az account show &> /dev/null || {
    echo -e "${RED}Not logged in to Azure!${NC}"
    echo "Run: az login"
    exit 1
}
echo -e "${GREEN}✓ Logged in as $(az account show --query user.name -o tsv)${NC}"
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}tmux not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y tmux
fi

# Create tmux session
echo -e "${YELLOW}Creating tmux session 'deploy'...${NC}"
tmux kill-session -t deploy 2>/dev/null || true
tmux new-session -d -s deploy -n "Deployment"

# Split into 4 panes
tmux split-window -h -t deploy
tmux split-window -v -t deploy:0.0
tmux split-window -v -t deploy:0.2

# Set pane titles
tmux select-pane -t deploy:0.0 -T "Build & Deploy"
tmux select-pane -t deploy:0.1 -T "Backend Logs"
tmux select-pane -t deploy:0.2 -T "Frontend Logs"
tmux select-pane -t deploy:0.3 -T "Status Monitor"

echo -e "${GREEN}✓ tmux session created with 4 panes${NC}"
echo ""

# ====================
# PHASE 1: Setup Storage
# ====================
echo -e "${BLUE}[PHASE 1/6] Creating Storage Account...${NC}"

tmux send-keys -t deploy:0.0 "echo 'Creating storage account...'" C-m

# Check if storage account already exists with similar name
EXISTING_STORAGE=$(az storage account list -g ${RESOURCE_GROUP} --query "[?starts_with(name,'aiclientdiscovery')].name" -o tsv | head -1)

if [ -n "$EXISTING_STORAGE" ]; then
    echo -e "${YELLOW}Using existing storage: ${EXISTING_STORAGE}${NC}"
    STORAGE_NAME=$EXISTING_STORAGE
else
    az storage account create \
        --name ${STORAGE_NAME} \
        --resource-group ${RESOURCE_GROUP} \
        --location ${LOCATION} \
        --sku Standard_LRS \
        --kind StorageV2 \
        --tags app=ai-client-discovery purpose=testing \
        > /dev/null 2>&1

    echo -e "${GREEN}✓ Storage account created: ${STORAGE_NAME}${NC}"
fi

# Create containers
az storage container create --name logs --account-name ${STORAGE_NAME} > /dev/null 2>&1 || true
az storage container create --name backups --account-name ${STORAGE_NAME} > /dev/null 2>&1 || true
az storage share create --name database --account-name ${STORAGE_NAME} --quota 5 > /dev/null 2>&1 || true

echo -e "${GREEN}✓ Storage containers created${NC}"
echo ""

# ====================
# PHASE 2: Create Container Apps Environment
# ====================
echo -e "${BLUE}[PHASE 2/6] Setting up Container Apps Environment...${NC}"

# Check if environment exists
ENV_EXISTS=$(az containerapp env list -g ${RESOURCE_GROUP} --query "[?name=='${ENV_NAME}'].name" -o tsv)

if [ -n "$ENV_EXISTS" ]; then
    echo -e "${YELLOW}Using existing environment: ${ENV_NAME}${NC}"
else
    echo -e "${YELLOW}Creating new environment: ${ENV_NAME}${NC}"
    az containerapp env create \
        --name ${ENV_NAME} \
        --resource-group ${RESOURCE_GROUP} \
        --location ${LOCATION} \
        --tags app=ai-client-discovery purpose=testing \
        > /dev/null 2>&1

    echo -e "${GREEN}✓ Container Apps environment created${NC}"
fi
echo ""

# ====================
# PHASE 3: Build & Push Docker Images
# ====================
echo -e "${BLUE}[PHASE 3/6] Building Docker Images...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes...${NC}"

tmux send-keys -t deploy:0.0 "echo 'Building backend image...'" C-m

# Login to ACR
az acr login --name ${ACR_NAME} > /dev/null 2>&1
echo -e "${GREEN}✓ Logged in to Container Registry${NC}"

# Build backend
echo -e "${YELLOW}Building backend image...${NC}"
BACKEND_IMAGE="${ACR_NAME}.azurecr.io/${BACKEND_APP}:latest"

docker build -t ${BACKEND_IMAGE} . || {
    echo -e "${RED}Backend build failed!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend image built${NC}"

# Push backend
echo -e "${YELLOW}Pushing backend image...${NC}"
docker push ${BACKEND_IMAGE} || {
    echo -e "${RED}Backend push failed!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend image pushed${NC}"

tmux send-keys -t deploy:0.0 "echo 'Backend image pushed successfully'" C-m

# Build frontend
echo -e "${YELLOW}Building frontend image...${NC}"
FRONTEND_IMAGE="${ACR_NAME}.azurecr.io/${FRONTEND_APP}:latest"

cd frontend
docker build -t ${FRONTEND_IMAGE} \
    --build-arg NEXT_PUBLIC_API_URL=https://${BACKEND_APP}.centralus.azurecontainerapps.io \
    . || {
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
}
cd ..
echo -e "${GREEN}✓ Frontend image built${NC}"

# Push frontend
echo -e "${YELLOW}Pushing frontend image...${NC}"
docker push ${FRONTEND_IMAGE} || {
    echo -e "${RED}Frontend push failed!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend image pushed${NC}"

tmux send-keys -t deploy:0.0 "echo 'All images pushed successfully'" C-m
echo ""

# ====================
# PHASE 4: Deploy Backend Container
# ====================
echo -e "${BLUE}[PHASE 4/6] Deploying Backend Container...${NC}"

tmux send-keys -t deploy:0.0 "echo 'Deploying backend container...'" C-m

# Generate secret key
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)

# Get storage connection string
STORAGE_KEY=$(az storage account keys list -g ${RESOURCE_GROUP} -n ${STORAGE_NAME} --query "[0].value" -o tsv)
STORAGE_CONNECTION="DefaultEndpointsProtocol=https;AccountName=${STORAGE_NAME};AccountKey=${STORAGE_KEY};EndpointSuffix=core.windows.net"

# Deploy backend
az containerapp create \
    --name ${BACKEND_APP} \
    --resource-group ${RESOURCE_GROUP} \
    --environment ${ENV_NAME} \
    --image ${BACKEND_IMAGE} \
    --registry-server ${ACR_NAME}.azurecr.io \
    --cpu 1.0 \
    --memory 2.0Gi \
    --min-replicas 1 \
    --max-replicas 2 \
    --ingress external \
    --target-port 5000 \
    --env-vars \
        "SECRET_KEY=${SECRET_KEY}" \
        "FLASK_ENV=production" \
        "APOLLO_API_KEY=your-apollo-api-key-here" \
        "GEMINI_API_KEY=your-gemini-api-key-here" \
        "GEMINI_API_KEY_FALLBACK=your-fallback-gemini-key-here" \
        "GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com" \
        "GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret" \
        "DATABASE_URL=sqlite:///instance/campaigns.db" \
        "STORAGE_CONNECTION_STRING=${STORAGE_CONNECTION}" \
    --tags app=ai-client-discovery purpose=testing \
    > /dev/null 2>&1

# Get backend URL
BACKEND_URL=$(az containerapp show -n ${BACKEND_APP} -g ${RESOURCE_GROUP} --query properties.configuration.ingress.fqdn -o tsv)
BACKEND_URL="https://${BACKEND_URL}"

echo -e "${GREEN}✓ Backend deployed${NC}"
echo -e "  URL: ${BLUE}${BACKEND_URL}${NC}"

tmux send-keys -t deploy:0.0 "echo 'Backend URL: ${BACKEND_URL}'" C-m
echo ""

# Start streaming backend logs in pane 2
tmux send-keys -t deploy:0.1 "az containerapp logs tail -n ${BACKEND_APP} -g ${RESOURCE_GROUP} --follow" C-m

# ====================
# PHASE 5: Deploy Frontend Container
# ====================
echo -e "${BLUE}[PHASE 5/6] Deploying Frontend Container...${NC}"

tmux send-keys -t deploy:0.0 "echo 'Deploying frontend container...'" C-m

# Update backend URL for frontend
az containerapp create \
    --name ${FRONTEND_APP} \
    --resource-group ${RESOURCE_GROUP} \
    --environment ${ENV_NAME} \
    --image ${FRONTEND_IMAGE} \
    --registry-server ${ACR_NAME}.azurecr.io \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 2 \
    --ingress external \
    --target-port 3000 \
    --env-vars \
        "NEXT_PUBLIC_API_URL=${BACKEND_URL}" \
    --tags app=ai-client-discovery purpose=testing \
    > /dev/null 2>&1

# Get frontend URL
FRONTEND_URL=$(az containerapp show -n ${FRONTEND_APP} -g ${RESOURCE_GROUP} --query properties.configuration.ingress.fqdn -o tsv)
FRONTEND_URL="https://${FRONTEND_URL}"

echo -e "${GREEN}✓ Frontend deployed${NC}"
echo -e "  URL: ${BLUE}${FRONTEND_URL}${NC}"

tmux send-keys -t deploy:0.0 "echo 'Frontend URL: ${FRONTEND_URL}'" C-m
echo ""

# Start streaming frontend logs in pane 3
tmux send-keys -t deploy:0.2 "az containerapp logs tail -n ${FRONTEND_APP} -g ${RESOURCE_GROUP} --follow" C-m

# ====================
# PHASE 6: Setup Budget Alert
# ====================
echo -e "${BLUE}[PHASE 6/6] Setting up Budget Alert (\$${BUDGET_AMOUNT}/month)...${NC}"

tmux send-keys -t deploy:0.0 "echo 'Setting up budget alert...'" C-m

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create budget (this might fail if one exists, that's okay)
az consumption budget create \
    --budget-name "${APP_NAME}-budget" \
    --amount ${BUDGET_AMOUNT} \
    --time-grain Monthly \
    --start-date $(date +%Y-%m-01) \
    --end-date $(date -d "+1 year" +%Y-%m-01) \
    --resource-group ${RESOURCE_GROUP} \
    --notifications \
        "actual-80={\"enabled\":true,\"operator\":\"GreaterThan\",\"threshold\":80,\"contactEmails\":[\"${ADMIN_EMAIL}\"],\"contactRoles\":[]}" \
        "actual-100={\"enabled\":true,\"operator\":\"GreaterThan\",\"threshold\":100,\"contactEmails\":[\"${ADMIN_EMAIL}\"],\"contactRoles\":[]}" \
    2>/dev/null || {
    echo -e "${YELLOW}Budget might already exist, skipping...${NC}"
}

echo -e "${GREEN}✓ Budget alert configured${NC}"
echo -e "  Email: ${BLUE}${ADMIN_EMAIL}${NC}"
echo -e "  Alert at: ${BLUE}\$64/month (80% of \$${BUDGET_AMOUNT})${NC}"
echo ""

# ====================
# Setup monitoring in pane 4
# ====================
tmux send-keys -t deploy:0.3 "clear" C-m
tmux send-keys -t deploy:0.3 "echo '=== Deployment Complete ==='" C-m
tmux send-keys -t deploy:0.3 "echo ''" C-m
tmux send-keys -t deploy:0.3 "echo 'Frontend: ${FRONTEND_URL}'" C-m
tmux send-keys -t deploy:0.3 "echo 'Backend:  ${BACKEND_URL}'" C-m
tmux send-keys -t deploy:0.3 "echo ''" C-m
tmux send-keys -t deploy:0.3 "echo 'Monitoring costs...' && watch -n 30 'az consumption usage list --start-date $(date +%Y-%m-01) --end-date $(date +%Y-%m-%d) --query \"[?resourceGroup==\\\"${RESOURCE_GROUP}\\\"].{Resource:instanceName,Cost:pretaxCost}\" -o table 2>/dev/null || echo Fetching cost data...'" C-m

# ====================
# Save deployment info
# ====================
cat > deployment-info.txt << EOF
===========================================
AI Client Discovery - Deployment Info
===========================================

Deployed: $(date)
Resource Group: ${RESOURCE_GROUP}
Location: ${LOCATION}

URLs:
  Frontend: ${FRONTEND_URL}
  Backend:  ${BACKEND_URL}

Resources:
  Backend Container: ${BACKEND_APP}
  Frontend Container: ${FRONTEND_APP}
  Storage Account: ${STORAGE_NAME}
  Container Registry: ${ACR_NAME}.azurecr.io
  Environment: ${ENV_NAME}

Budget Alert:
  Amount: \$${BUDGET_AMOUNT}/month
  Email: ${ADMIN_EMAIL}
  Alert at 80%: \$$(echo "${BUDGET_AMOUNT} * 0.8" | bc)

Next Steps:
1. Visit frontend URL above
2. Update Google OAuth Console with backend URL:
   ${BACKEND_URL}/api/auth/gmail/callback
3. Test all features
4. Monitor costs in Azure Portal

Commands:
  View logs: az containerapp logs tail -n ${BACKEND_APP} -g ${RESOURCE_GROUP} --follow
  View costs: az consumption usage list --resource-group ${RESOURCE_GROUP}
  Stop apps: az containerapp stop -n ${BACKEND_APP} -g ${RESOURCE_GROUP}
  Delete all: az group delete -n ${RESOURCE_GROUP} --yes

tmux:
  Attach: tmux attach -t deploy
  Detach: Ctrl+b, then d
  Switch panes: Ctrl+b, arrow keys
===========================================
EOF

echo -e "${GREEN}✓ Deployment info saved to deployment-info.txt${NC}"
echo ""

# ====================
# Summary
# ====================
echo -e "${GREEN}================================================"
echo -e "       🎉 DEPLOYMENT COMPLETE! 🎉"
echo -e "================================================${NC}"
echo ""
echo -e "${YELLOW}Your app is live:${NC}"
echo -e "  Frontend: ${BLUE}${FRONTEND_URL}${NC}"
echo -e "  Backend:  ${BLUE}${BACKEND_URL}${NC}"
echo ""
echo -e "${YELLOW}Budget Alert:${NC}"
echo -e "  ✓ Email alert set to: ${GREEN}${ADMIN_EMAIL}${NC}"
echo -e "  ✓ Alert triggers at: ${GREEN}\$64/month (80% of \$${BUDGET_AMOUNT})${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Visit: ${BLUE}${FRONTEND_URL}${NC}"
echo -e "  2. Update Google OAuth Console:"
echo -e "     ${BLUE}${BACKEND_URL}/api/auth/gmail/callback${NC}"
echo -e "  3. Test all features"
echo ""
echo -e "${YELLOW}tmux session:${NC}"
echo -e "  Attach: ${GREEN}tmux attach -t deploy${NC}"
echo -e "  Panes:"
echo -e "    Top-left: Deployment commands"
echo -e "    Top-right: Backend logs"
echo -e "    Bottom-left: Frontend logs"
echo -e "    Bottom-right: Cost monitoring"
echo ""
echo -e "${YELLOW}View all info:${NC} ${GREEN}cat deployment-info.txt${NC}"
echo ""
echo -e "${BLUE}Attaching to tmux in 5 seconds...${NC}"
sleep 5

# Attach to tmux session
tmux attach -t deploy
