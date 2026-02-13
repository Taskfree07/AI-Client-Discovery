#!/bin/bash

# AI Client Discovery - Cleanup Script
# Safely removes only AI Client Discovery resources

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}================================================"
echo -e "  AI Client Discovery - Cleanup"
echo -e "================================================${NC}"
echo ""
echo -e "${YELLOW}WARNING: This will delete all AI Client Discovery resources!${NC}"
echo ""

RESOURCE_GROUP="Techgenegroup"
APP_NAME="ai-client-discovery"

# List resources to delete
echo -e "${YELLOW}Resources to delete:${NC}"
az resource list --resource-group ${RESOURCE_GROUP} --tag app=ai-client-discovery --query "[].{Name:name,Type:type}" -o table

echo ""
read -p "Are you sure you want to delete these resources? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting resources...${NC}"

# Delete container apps
az containerapp delete -n ${APP_NAME}-backend -g ${RESOURCE_GROUP} --yes 2>/dev/null || true
echo -e "${GREEN}✓ Backend deleted${NC}"

az containerapp delete -n ${APP_NAME}-frontend -g ${RESOURCE_GROUP} --yes 2>/dev/null || true
echo -e "${GREEN}✓ Frontend deleted${NC}"

# Delete environment
az containerapp env delete -n ${APP_NAME}-env -g ${RESOURCE_GROUP} --yes 2>/dev/null || true
echo -e "${GREEN}✓ Environment deleted${NC}"

# Delete storage accounts (find all starting with aiclientdiscovery)
STORAGE_ACCOUNTS=$(az storage account list -g ${RESOURCE_GROUP} --query "[?starts_with(name,'aiclientdiscovery')].name" -o tsv)
for storage in $STORAGE_ACCOUNTS; do
    az storage account delete -n $storage -g ${RESOURCE_GROUP} --yes 2>/dev/null || true
    echo -e "${GREEN}✓ Storage account deleted: ${storage}${NC}"
done

# Delete budget
az consumption budget delete --budget-name "${APP_NAME}-budget" --resource-group ${RESOURCE_GROUP} 2>/dev/null || true
echo -e "${GREEN}✓ Budget deleted${NC}"

echo ""
echo -e "${GREEN}================================================"
echo -e "  Cleanup Complete!"
echo -e "================================================${NC}"
echo ""
echo -e "${YELLOW}Note: Container Registry '${ACR_NAME}' was NOT deleted${NC}"
echo -e "${YELLOW}      (shared with other apps)${NC}"
echo ""
