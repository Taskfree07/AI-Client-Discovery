#!/bin/bash

# AI Client Discovery - Docker Setup Script
# Automates the initial Docker deployment setup

set -e  # Exit on error

echo "=================================="
echo "AI Client Discovery - Docker Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo -e "${YELLOW}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed!${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}[ERROR] docker-compose is not installed!${NC}"
    echo "Please install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}[OK] Docker is installed${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"

    if [ ! -f .env.example ]; then
        echo -e "${RED}[ERROR] .env.example not found!${NC}"
        exit 1
    fi

    cp .env.example .env
    echo -e "${GREEN}[OK] .env file created${NC}"
    echo ""

    # Generate SECRET_KEY
    echo -e "${YELLOW}Generating SECRET_KEY...${NC}"
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || python -c "import secrets; print(secrets.token_hex(32))")

    # Update .env with generated SECRET_KEY (cross-platform sed)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    else
        # Linux and others
        sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    fi

    echo -e "${GREEN}[OK] SECRET_KEY generated${NC}"
    echo ""

    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}IMPORTANT: Edit .env file with your API keys:${NC}"
    echo -e "  - APOLLO_API_KEY"
    echo -e "  - GEMINI_API_KEY"
    echo -e "  - GOOGLE_OAUTH_CLIENT_ID"
    echo -e "  - GOOGLE_OAUTH_CLIENT_SECRET"
    echo -e "${YELLOW}========================================${NC}"
    echo ""

    read -p "Press Enter after editing .env file to continue..."
else
    echo -e "${GREEN}[OK] .env file exists${NC}"
    echo ""
fi

# Validate required env vars
echo -e "${YELLOW}Validating environment variables...${NC}"
source .env

MISSING_VARS=()
[ -z "$SECRET_KEY" ] && MISSING_VARS+=("SECRET_KEY")
[ -z "$APOLLO_API_KEY" ] && MISSING_VARS+=("APOLLO_API_KEY")
[ -z "$GEMINI_API_KEY" ] && MISSING_VARS+=("GEMINI_API_KEY")
[ -z "$GOOGLE_OAUTH_CLIENT_ID" ] && MISSING_VARS+=("GOOGLE_OAUTH_CLIENT_ID")
[ -z "$GOOGLE_OAUTH_CLIENT_SECRET" ] && MISSING_VARS+=("GOOGLE_OAUTH_CLIENT_SECRET")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}[ERROR] Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "  - $var"
    done
    echo ""
    echo "Please edit .env and set these variables."
    exit 1
fi

echo -e "${GREEN}[OK] All required environment variables are set${NC}"
echo ""

# Build Docker images
echo -e "${YELLOW}Building Docker images (this may take 5-10 minutes)...${NC}"
docker-compose build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Docker images built successfully${NC}"
else
    echo -e "${RED}[ERROR] Failed to build Docker images${NC}"
    exit 1
fi
echo ""

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Services started successfully${NC}"
else
    echo -e "${RED}[ERROR] Failed to start services${NC}"
    exit 1
fi
echo ""

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
echo "This may take 30-60 seconds..."
sleep 10

# Check service health
MAX_RETRIES=12
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    BACKEND_HEALTH=$(docker-compose ps backend | grep "healthy" || echo "")
    FRONTEND_HEALTH=$(docker-compose ps frontend | grep "healthy" || echo "")
    DB_HEALTH=$(docker-compose ps db | grep "healthy" || echo "")

    if [ -n "$BACKEND_HEALTH" ] && [ -n "$FRONTEND_HEALTH" ] && [ -n "$DB_HEALTH" ]; then
        echo -e "${GREEN}[OK] All services are healthy!${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${YELLOW}[WARNING] Services may still be starting. Check logs with: docker-compose logs -f${NC}"
fi

echo ""

# Display service status
echo -e "${YELLOW}Service Status:${NC}"
docker-compose ps
echo ""

# Test endpoints
echo -e "${YELLOW}Testing endpoints...${NC}"

# Test backend
if curl -f http://localhost:5000/api/health &> /dev/null; then
    echo -e "${GREEN}[OK] Backend is responding${NC}"
else
    echo -e "${YELLOW}[WARNING] Backend not responding yet (may still be starting)${NC}"
fi

# Test frontend
if curl -f http://localhost:3000/ &> /dev/null; then
    echo -e "${GREEN}[OK] Frontend is responding${NC}"
else
    echo -e "${YELLOW}[WARNING] Frontend not responding yet (may still be starting)${NC}"
fi

echo ""

# Success message
echo -e "${GREEN}=================================="
echo -e "   SETUP COMPLETE!"
echo -e "==================================${NC}"
echo ""
echo -e "Your app is now running:"
echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:5000${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:           ${YELLOW}docker-compose logs -f${NC}"
echo -e "  Stop services:       ${YELLOW}docker-compose down${NC}"
echo -e "  Restart services:    ${YELLOW}docker-compose restart${NC}"
echo -e "  Check status:        ${YELLOW}docker-compose ps${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Visit http://localhost:3000"
echo -e "  2. Navigate to Session Manager"
echo -e "  3. Test Lead Engine (Apollo API)"
echo -e "  4. Create a campaign"
echo -e "  5. Send test email"
echo ""
echo -e "For production deployment with Nginx:"
echo -e "  ${YELLOW}docker-compose --profile production up -d${NC}"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
echo ""
