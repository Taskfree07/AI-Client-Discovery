# 🐳 Docker Quick Start - 5 Minutes

## Step 1: Install Docker (2 min)

**Windows/Mac:**
Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Verify:**
```bash
docker --version
docker-compose --version
```

---

## Step 2: Configure Environment (1 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file and set:
# - SECRET_KEY (generate: python -c "import secrets; print(secrets.token_hex(32))")
# - APOLLO_API_KEY=your-apollo-api-key-here
# - GEMINI_API_KEY=your-gemini-api-key-here
# - GEMINI_API_KEY_FALLBACK=your-fallback-gemini-key-here
# - GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
# - GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
```

**Quick generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 3: Build & Start (2 min)

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

---

## ✅ Done! Your App is Running

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: PostgreSQL on port 5432

**Test it:**
1. Visit http://localhost:3000
2. Go to Session Manager
3. Click "Lead Engine" - Test Apollo API
4. Create a campaign with dynamic email days
5. Send test email

---

## 📋 Essential Commands

```bash
# View service status
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove everything (including database)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

---

## 🔧 Common Issues

**Port already in use?**
```bash
# Change port in docker-compose.yml:
ports:
  - "3001:3000"  # Frontend on 3001 instead
  - "5001:5000"  # Backend on 5001 instead
```

**Services not healthy?**
```bash
# Check what's wrong
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Restart
docker-compose restart
```

**Need to reset everything?**
```bash
# Nuclear option (deletes database!)
docker-compose down -v
docker-compose up -d --build
```

---

## 🚀 Production Deployment

**With Nginx reverse proxy:**
```bash
docker-compose --profile production up -d
```

**Your app will be accessible at:**
- http://your-server-ip (port 80)
- https://your-server-ip (port 443, with SSL)

---

## 📚 More Info

- **Full Guide:** `DOCKER_DEPLOYMENT.md`
- **Security:** `APOLLO_API_SECURITY.md`
- **Features:** `APP_FEATURES_SUMMARY.md`

---

## ✅ Success Checklist

- [ ] Docker installed
- [ ] .env configured with all API keys
- [ ] `docker-compose up -d` completed successfully
- [ ] All services show "healthy" in `docker-compose ps`
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:5000/api/health
- [ ] Session Manager → Lead Engine works
- [ ] Campaign creation works
- [ ] Test email sends successfully

**All checked? Congratulations! 🎉 You're deployed!**
