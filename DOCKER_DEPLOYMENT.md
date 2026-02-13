# 🐳 Docker Deployment Guide - AI Client Discovery

## Why Docker?

**Benefits:**
- ✅ **Consistency** - Same environment everywhere (dev, staging, prod)
- ✅ **Portability** - Deploy anywhere Docker runs
- ✅ **Isolation** - No dependency conflicts
- ✅ **Scalability** - Easy to scale services independently
- ✅ **Easy Rollback** - Version control your infrastructure
- ✅ **Production-Ready** - Nginx, PostgreSQL, health checks included

---

## 📋 What Gets Deployed

**4 Services:**
1. **PostgreSQL Database** - Production-grade database
2. **Backend (Flask API)** - Python backend with Gunicorn
3. **Frontend (Next.js)** - Optimized React app
4. **Nginx** - Reverse proxy (optional, for production)

**Architecture:**
```
Internet
   ↓
Nginx (Port 80/443)
   ↓
├─→ Frontend (Port 3000) - Next.js
└─→ Backend (Port 5000) - Flask API
       ↓
    PostgreSQL (Port 5432) - Database
```

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

**Install Docker:**
- **Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Mac**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: `curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh`

**Verify Installation:**
```bash
docker --version
docker-compose --version
```

### Step 1: Configure Environment

```bash
# Navigate to project
cd "E:\Techgene\AI Client Discovery"

# Copy .env.example to .env
cp .env.example .env

# Edit .env with your actual values
# Required fields:
# - SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_hex(32))")
# - APOLLO_API_KEY
# - GEMINI_API_KEY
# - GOOGLE_OAUTH_CLIENT_ID
# - GOOGLE_OAUTH_CLIENT_SECRET
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 2: Build and Start

```bash
# Build all images (takes 5-10 minutes first time)
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**That's it! App is running at:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: PostgreSQL on port 5432

### Step 3: Initialize Database

Database is automatically initialized on first run. Verify:

```bash
# Check backend logs for initialization
docker-compose logs backend | grep "Database initialized"

# Should see:
# ✓ Database initialized successfully!
# ✓ SECURITY: Apollo API key initialized from environment
```

### Step 4: Verify Deployment

**Quick Health Check:**
```bash
# Backend health
curl http://localhost:5000/api/health

# Frontend health
curl http://localhost:3000/

# Database connection
docker-compose exec db psql -U aiuser -d campaigns -c "SELECT 1;"
```

**Full Feature Test:**
1. Visit http://localhost:3000
2. Navigate to Session Manager
3. Click "Lead Engine" - Test Apollo API
4. Create a new campaign
5. Send test email

---

## 📦 Docker Commands Cheat Sheet

### Basic Operations

```bash
# Start all services (in background)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: Deletes database!)
docker-compose down -v

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Restart a service
docker-compose restart backend

# Rebuild a service
docker-compose up -d --build backend
```

### Service Management

```bash
# Check service status
docker-compose ps

# Access backend shell
docker-compose exec backend bash

# Access frontend shell
docker-compose exec frontend sh

# Access database
docker-compose exec db psql -U aiuser -d campaigns

# View backend Python console
docker-compose exec backend python
```

### Monitoring

```bash
# Resource usage
docker stats

# Container details
docker-compose ps -a

# Network inspection
docker network ls
docker network inspect ai-client-discovery_app-network

# Volume inspection
docker volume ls
docker volume inspect ai-client-discovery_postgres_data
```

---

## 🔧 Production Deployment

### Option 1: Docker Compose (Single Server)

**Best for:** Small to medium deployments, single server

```bash
# Clone repository on server
git clone https://github.com/your-repo/ai-client-discovery.git
cd ai-client-discovery

# Create production .env
nano .env
# Fill in all values

# Generate strong secret
python -c "import secrets; print(secrets.token_hex(32))"

# Start with Nginx (production profile)
docker-compose --profile production up -d

# View logs
docker-compose logs -f
```

**With Nginx, your app is accessible at:**
- http://your-server-ip (port 80)
- https://your-server-ip (port 443, if SSL configured)

### Option 2: Cloud Platforms

#### A. AWS (ECS/Fargate)

```bash
# Install AWS CLI and ECS CLI
pip install awscli
ecs-cli --version

# Configure
aws configure
ecs-cli configure --cluster ai-client-discovery --region us-east-1

# Create cluster
ecs-cli up --cluster ai-client-discovery --capability-iam --size 2

# Deploy
ecs-cli compose up --cluster ai-client-discovery

# Get service URL
aws ecs describe-services --cluster ai-client-discovery
```

#### B. Google Cloud (Cloud Run)

```bash
# Install gcloud CLI
gcloud version

# Build and push images
gcloud builds submit --tag gcr.io/PROJECT_ID/backend
gcloud builds submit --tag gcr.io/PROJECT_ID/frontend

# Deploy backend
gcloud run deploy backend \
  --image gcr.io/PROJECT_ID/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "SECRET_KEY=$SECRET_KEY,APOLLO_API_KEY=$APOLLO_API_KEY"

# Deploy frontend
gcloud run deploy frontend \
  --image gcr.io/PROJECT_ID/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://backend-url"
```

#### C. DigitalOcean (App Platform)

```bash
# Use DigitalOcean App Platform UI
# 1. Connect GitHub repository
# 2. Configure services (backend, frontend, database)
# 3. Set environment variables
# 4. Deploy
```

#### D. Heroku (Container Registry)

```bash
# Login to Heroku Container Registry
heroku container:login

# Create app
heroku create ai-client-discovery-backend
heroku create ai-client-discovery-frontend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev -a ai-client-discovery-backend

# Push and release backend
heroku container:push web -a ai-client-discovery-backend
heroku container:release web -a ai-client-discovery-backend

# Set environment variables
heroku config:set SECRET_KEY="xxx" -a ai-client-discovery-backend
heroku config:set APOLLO_API_KEY="xxx" -a ai-client-discovery-backend

# Push and release frontend
heroku container:push web -a ai-client-discovery-frontend
heroku container:release web -a ai-client-discovery-frontend
```

---

## 🔒 Security Configuration

### 1. SSL/HTTPS Setup

**Using Let's Encrypt (Certbot):**

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Update docker-compose.yml to mount certificates:
volumes:
  - /etc/letsencrypt/live/yourdomain.com:/etc/nginx/ssl:ro

# Uncomment HTTPS server block in nginx.conf

# Restart Nginx
docker-compose restart nginx
```

### 2. Environment Security

**Production .env checklist:**

```bash
# Generate strong SECRET_KEY (32+ bytes)
SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

# Strong PostgreSQL password (16+ chars)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# Set FLASK_ENV to production
FLASK_ENV=production

# Use HTTPS for OAuth redirects
REDIRECT_URI=https://yourdomain.com/auth/callback
```

### 3. OAuth Configuration

**Update OAuth redirect URIs:**

**Google OAuth Console:**
- Authorized JavaScript origins: `https://yourdomain.com`
- Authorized redirect URIs:
  - `https://yourdomain.com/api/auth/gmail/callback`
  - `https://yourdomain.com/auth/callback`

**Microsoft Azure:**
- Redirect URIs: `https://yourdomain.com/api/auth/outlook/callback`

### 4. Firewall Rules

```bash
# Allow only necessary ports
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 22/tcp    # SSH
ufw enable

# Block direct access to services (optional)
# Only allow through Nginx
ufw deny 3000/tcp   # Frontend
ufw deny 5000/tcp   # Backend
ufw deny 5432/tcp   # PostgreSQL
```

---

## 📊 Monitoring & Maintenance

### Health Checks

**Built-in health checks:**
- Backend: http://localhost:5000/api/health
- Frontend: http://localhost:3000/
- Database: Auto-checked by Docker

**Check health status:**
```bash
docker-compose ps
# Look for "healthy" in STATUS column
```

### Logs

**View logs:**
```bash
# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Since 1 hour ago
docker-compose logs --since 1h

# Specific service
docker-compose logs -f backend

# Apollo API calls (backend container)
docker-compose exec backend cat logs/apollo_api_calls.log

# Security violations
docker-compose exec backend grep "SECURITY VIOLATION" logs/apollo_api_calls.log
```

### Database Backup

**Automated backup script:**

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/campaigns_$TIMESTAMP.sql"

# Create backup
docker-compose exec -T db pg_dump -U aiuser campaigns > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Schedule with cron:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-db.sh
```

**Restore from backup:**
```bash
# Restore from backup
gunzip < campaigns_20240215_020000.sql.gz | \
  docker-compose exec -T db psql -U aiuser -d campaigns
```

### Updates

**Update application:**
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
```

**Update dependencies:**
```bash
# Update backend dependencies
# Edit requirements.txt
docker-compose build backend
docker-compose up -d backend

# Update frontend dependencies
# Edit frontend/package.json
docker-compose build frontend
docker-compose up -d frontend
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:5000 failed: port is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process or change port in docker-compose.yml
ports:
  - "5001:5000"  # Use port 5001 instead
```

#### 2. Database Connection Failed

**Error:** `could not connect to server`

**Solution:**
```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db

# Wait for database to be ready
docker-compose up -d db
sleep 10
docker-compose up -d backend
```

#### 3. Frontend Can't Reach Backend

**Error:** `Failed to fetch` or `Network error`

**Solution:**
```bash
# Check NEXT_PUBLIC_API_URL in .env
# Should be: http://localhost:5000 (development)
# Or: https://yourdomain.com (production with Nginx)

# Rebuild frontend with correct env
docker-compose up -d --build frontend

# Check Nginx logs if using production profile
docker-compose logs nginx
```

#### 4. Apollo API Not Working

**Error:** `Apollo API disabled for pipeline`

**This is expected!** Apollo API only works in Session Manager.

**Verify security:**
```bash
# Check backend logs
docker-compose logs backend | grep "SECURITY"

# Should see:
# ✓ SECURITY: Apollo API key initialized from environment
# ❌ SECURITY VIOLATION: Unauthorized Apollo API access attempt from: /api/pipeline/xyz
```

#### 5. OAuth Not Working

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Check OAuth credentials in `.env`
2. Update redirect URIs in Google/Microsoft console
3. Ensure using HTTPS in production
4. Restart backend: `docker-compose restart backend`

#### 6. Out of Memory

**Error:** Container killed by OOM

**Solution:**
```bash
# Check resource usage
docker stats

# Increase memory limit in docker-compose.yml
services:
  backend:
    mem_limit: 1g

  frontend:
    mem_limit: 512m
```

### Debug Mode

**Enable debug logging:**

```bash
# Edit docker-compose.yml
environment:
  FLASK_ENV: development  # Enable Flask debug mode
  FLASK_DEBUG: 1

# Restart
docker-compose up -d backend

# View verbose logs
docker-compose logs -f backend
```

---

## 🎯 Performance Optimization

### 1. Build Cache

**Speed up rebuilds:**
```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose build

# Build with cache from registry
docker-compose build --pull
```

### 2. Multi-Stage Builds

Already implemented in Dockerfiles for:
- ✅ Smaller image sizes
- ✅ Faster builds
- ✅ Better security (only runtime dependencies)

### 3. Resource Limits

**Set in docker-compose.yml:**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 4. Database Optimization

**PostgreSQL tuning:**
```bash
# Add to docker-compose.yml under db service
command:
  - "postgres"
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
```

---

## 📈 Scaling

### Horizontal Scaling

**Scale specific services:**
```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Scale frontend to 2 instances
docker-compose up -d --scale frontend=2

# Nginx will load balance automatically
```

### Kubernetes (Advanced)

**Convert to Kubernetes:**
```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.28.0/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv kompose /usr/local/bin/

# Convert docker-compose.yml to Kubernetes manifests
kompose convert

# Deploy to Kubernetes
kubectl apply -f .
```

---

## ✅ Production Checklist

Before going live:

**Infrastructure:**
- [ ] Docker and docker-compose installed
- [ ] SSL certificates configured
- [ ] Firewall rules configured
- [ ] Backup system set up
- [ ] Monitoring in place

**Configuration:**
- [ ] All .env variables set
- [ ] Strong SECRET_KEY generated
- [ ] Strong PostgreSQL password set
- [ ] FLASK_ENV set to production
- [ ] OAuth redirect URIs updated
- [ ] Domain/DNS configured

**Security:**
- [ ] Apollo API key secure
- [ ] No sensitive data in logs
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting active

**Testing:**
- [ ] All services healthy
- [ ] Database connection works
- [ ] Session Manager works
- [ ] Campaign creation works
- [ ] Email sending works
- [ ] OAuth login works

**Monitoring:**
- [ ] Health checks passing
- [ ] Logs accessible
- [ ] Backup tested
- [ ] Resource usage monitored

---

## 📞 Support

**View comprehensive logs:**
```bash
# All logs since start
docker-compose logs

# Live logs
docker-compose logs -f

# Save logs to file
docker-compose logs > docker-logs.txt
```

**Get container details:**
```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Network info
docker network inspect ai-client-discovery_app-network
```

**Clean slate (CAUTION: Deletes everything):**
```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

---

## 🎉 Success!

**Your Docker deployment is complete when:**

✅ All services show "healthy" in `docker-compose ps`
✅ Frontend accessible at http://localhost:3000
✅ Backend API accessible at http://localhost:5000
✅ Apollo API works in Session Manager (and blocked elsewhere)
✅ Email sending works with OAuth
✅ Database persists between restarts
✅ Logs show no errors

**Your app is now production-ready!** 🚀

---

## 📚 Additional Resources

- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **PostgreSQL Docker:** https://hub.docker.com/_/postgres
- **Next.js Docker:** https://nextjs.org/docs/deployment#docker-image
- **Flask Docker:** https://flask.palletsprojects.com/en/2.3.x/deploying/

**Project Documentation:**
- `DEPLOYMENT_SECURITY_CHECKLIST.md` - Security verification
- `APOLLO_API_SECURITY.md` - API security details
- `APP_FEATURES_SUMMARY.md` - Complete feature list
