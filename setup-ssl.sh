#!/bin/bash

# AI Client Discovery - SSL Setup Script
# Automates Let's Encrypt SSL certificate setup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================="
echo -e "  SSL/HTTPS Setup - Let's Encrypt"
echo -e "==================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot not found. Installing...${NC}"

    # Detect OS
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot
    else
        echo -e "${RED}[ERROR] Unsupported OS. Please install certbot manually.${NC}"
        exit 1
    fi

    echo -e "${GREEN}[OK] Certbot installed${NC}"
fi

# Get domain name
echo -e "${YELLOW}Enter your domain name (e.g., myapp.com):${NC}"
read -p "Domain: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}[ERROR] Domain name is required${NC}"
    exit 1
fi

# Validate domain format
if ! [[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}[ERROR] Invalid domain format${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Domain: ${GREEN}$DOMAIN${NC}"
echo ""

# Check DNS resolution
echo -e "${YELLOW}Checking DNS resolution...${NC}"
if ! host "$DOMAIN" > /dev/null 2>&1; then
    echo -e "${RED}[ERROR] Domain does not resolve. Please configure DNS first.${NC}"
    echo -e "Add an A record pointing to this server's IP address."
    exit 1
fi

DOMAIN_IP=$(host "$DOMAIN" | grep "has address" | awk '{print $4}' | head -n 1)
SERVER_IP=$(curl -s ifconfig.me)

echo -e "Domain resolves to: ${BLUE}$DOMAIN_IP${NC}"
echo -e "Server IP: ${BLUE}$SERVER_IP${NC}"

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}[WARNING] Domain IP does not match server IP${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[OK] DNS configured${NC}"
echo ""

# Get email for Let's Encrypt
echo -e "${YELLOW}Enter your email address (for certificate renewal notifications):${NC}"
read -p "Email: " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}[ERROR] Email is required${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Email: ${GREEN}$EMAIL${NC}"
echo ""

# Stop services on port 80/443
echo -e "${YELLOW}Stopping services on ports 80 and 443...${NC}"

# Stop Docker Nginx if running
if docker ps | grep -q "ai-client-discovery-nginx"; then
    docker stop ai-client-discovery-nginx
    echo -e "${GREEN}[OK] Docker Nginx stopped${NC}"
fi

# Check if any other service is using port 80
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}[WARNING] Port 80 is still in use${NC}"
    lsof -Pi :80 -sTCP:LISTEN
    read -p "Try to continue? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# Request certificate
echo -e "${YELLOW}Requesting SSL certificate from Let's Encrypt...${NC}"
echo -e "This may take a minute..."
echo ""

certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --preferred-challenges http

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}[SUCCESS] SSL certificate obtained!${NC}"
    echo ""
    echo -e "Certificate: ${BLUE}/etc/letsencrypt/live/$DOMAIN/fullchain.pem${NC}"
    echo -e "Private Key: ${BLUE}/etc/letsencrypt/live/$DOMAIN/privkey.pem${NC}"
else
    echo -e "${RED}[ERROR] Failed to obtain certificate${NC}"
    exit 1
fi

echo ""

# Update nginx-ssl.conf with domain
echo -e "${YELLOW}Updating Nginx configuration with your domain...${NC}"

if [ -f "nginx-ssl.conf" ]; then
    # Backup original
    cp nginx-ssl.conf nginx-ssl.conf.bak

    # Replace yourdomain.com with actual domain
    sed -i "s/yourdomain.com/$DOMAIN/g" nginx-ssl.conf
    sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx-ssl.conf

    echo -e "${GREEN}[OK] Nginx configuration updated${NC}"
else
    echo -e "${RED}[ERROR] nginx-ssl.conf not found${NC}"
    exit 1
fi

echo ""

# Update docker-compose.yml
echo -e "${YELLOW}Updating docker-compose.yml...${NC}"

if [ -f "docker-compose.yml" ]; then
    # Check if SSL volume is already mounted
    if ! grep -q "/etc/letsencrypt:/etc/letsencrypt:ro" docker-compose.yml; then
        # Backup original
        cp docker-compose.yml docker-compose.yml.bak

        # Add SSL volume mount to nginx service
        # This is a simple approach - might need manual adjustment
        echo -e "${YELLOW}Please manually add this line to docker-compose.yml under nginx service volumes:${NC}"
        echo -e "${BLUE}      - /etc/letsencrypt:/etc/letsencrypt:ro${NC}"
    else
        echo -e "${GREEN}[OK] SSL volume already configured${NC}"
    fi

    # Update nginx config file reference
    if grep -q "nginx.conf:/etc/nginx/nginx.conf" docker-compose.yml; then
        sed -i "s|nginx.conf:/etc/nginx/nginx.conf|nginx-ssl.conf:/etc/nginx/nginx.conf|g" docker-compose.yml
        echo -e "${GREEN}[OK] Nginx config reference updated to nginx-ssl.conf${NC}"
    fi
else
    echo -e "${RED}[ERROR] docker-compose.yml not found${NC}"
    exit 1
fi

echo ""

# Set up auto-renewal
echo -e "${YELLOW}Setting up automatic certificate renewal...${NC}"

# Test renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Auto-renewal test successful${NC}"
else
    echo -e "${YELLOW}[WARNING] Auto-renewal test failed${NC}"
fi

# Add cron job for renewal
CRON_CMD="30 2 * * * certbot renew --quiet --post-hook \"cd $(pwd) && docker-compose restart nginx\" >> /var/log/letsencrypt-renew.log 2>&1"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo -e "${GREEN}[OK] Auto-renewal cron job added${NC}"
else
    echo -e "${GREEN}[OK] Auto-renewal cron job already exists${NC}"
fi

echo ""

# Display next steps
echo -e "${GREEN}=================================="
echo -e "  SSL Setup Complete!"
echo -e "==================================${NC}"
echo ""
echo -e "Domain: ${BLUE}$DOMAIN${NC}"
echo -e "Certificate: ${BLUE}/etc/letsencrypt/live/$DOMAIN/fullchain.pem${NC}"
echo -e "Expires: ${BLUE}$(date -d "90 days" +%Y-%m-%d)${NC} (auto-renews)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "1. Update Google OAuth Console:"
echo -e "   ${BLUE}https://console.cloud.google.com/apis/credentials${NC}"
echo -e "   "
echo -e "   Add Authorized redirect URI:"
echo -e "   ${GREEN}https://$DOMAIN/api/auth/gmail/callback${NC}"
echo ""
echo -e "2. Update .env file:"
echo -e "   ${BLUE}REDIRECT_URI=https://$DOMAIN/api/auth/gmail/callback${NC}"
echo -e "   ${BLUE}NEXT_PUBLIC_API_URL=https://$DOMAIN${NC}"
echo ""
echo -e "3. Start Docker services:"
echo -e "   ${BLUE}docker-compose --profile production up -d --build${NC}"
echo ""
echo -e "4. Test your site:"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "5. Test SSL certificate:"
echo -e "   ${BLUE}https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN${NC}"
echo ""
echo -e "${GREEN}Certificate will auto-renew every 90 days.${NC}"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo -e "  View logs: ${BLUE}docker-compose logs nginx${NC}"
echo -e "  Test renewal: ${BLUE}sudo certbot renew --dry-run${NC}"
echo -e "  Manual renewal: ${BLUE}sudo certbot renew${NC}"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
echo ""
