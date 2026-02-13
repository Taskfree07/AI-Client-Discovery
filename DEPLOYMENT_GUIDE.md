# 🚀 AI Client Discovery - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Completed Features
- ✅ Dashboard
- ✅ Session Manager (with Lead Engine)
- ✅ Campaign Manager (with dynamic email days)
- ✅ Sender Identity (Gmail/Outlook OAuth)
- ✅ Email Templates
- ✅ AI Email Personalization
- ✅ Apollo API Security (Session Manager only)
- ✅ Email Formatting (HTML)
- ✅ Test Email Sending

### ⚠️ Not Ready
- ❌ Response Manager (under construction)
- ⚠️ Analytics (may need review)

---

## 🎯 Deployment Strategy

**Recommended Approach:** Deploy backend and frontend separately

**Backend:** Railway, Render, Heroku, or DigitalOcean
**Frontend:** Vercel or Netlify
**Database:** Upgrade to PostgreSQL for production (from SQLite)

---

## 📦 Part 1: Backend Deployment

### Step 1: Prepare Repository

```bash
# Navigate to project root
cd "E:\Techgene\AI Client Discovery"

# Verify git status
git status

# Commit all changes
git add .
git commit -m "Deployment preparation: All features complete, Apollo API secured"

# Push to GitHub
git push origin main
```

### Step 2: Environment Variables (.env for Production)

Create `.env` file on production server with:

```bash
# Flask Configuration
SECRET_KEY=GENERATE-STRONG-SECRET-KEY-HERE
FLASK_ENV=production

# Apollo API - SECURE KEY (Session Manager ONLY)
APOLLO_API_KEY=QDjWXMpt8peVt2w8mHRnFQ

# Gemini AI API
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_API_KEY_FALLBACK=your-fallback-gemini-key-here

# Google OAuth (Gmail)
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Microsoft OAuth (if using Outlook)
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=
REDIRECT_URI=https://yourdomain.com/auth/callback
```

**IMPORTANT:**
- Generate a strong `SECRET_KEY`: `python -c "import secrets; print(secrets.token_hex(32))"`
- Update `REDIRECT_URI` with your production domain
- Consider using a secrets manager for production

### Step 3: Update requirements.txt

Ensure all dependencies are listed:

```bash
# Generate requirements
pip freeze > requirements.txt
```

Key dependencies should include:
```
Flask==3.0.0
Flask-CORS==4.0.0
SQLAlchemy==2.0.23
python-dotenv==1.0.0
requests==2.31.0
google-generativeai==0.3.0
PyJWT==2.8.0
```

### Step 4: Database Migration (SQLite → PostgreSQL)

**Install PostgreSQL adapter:**
```bash
pip install psycopg2-binary
```

**Update config.py** to handle PostgreSQL:
```python
import os
from urllib.parse import urlparse

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///instance/campaigns.db')

# Fix for Heroku postgres:// URLs
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
```

**Migration script** (if needed):
```bash
# Export data from SQLite
python -c "from models import *; from app import db; import json; # export logic"

# Import to PostgreSQL
python -c "from models import *; from app import db; db.create_all(); # import logic"
```

### Step 5: Deploy to Railway (Recommended)

**Option A: Railway (Easiest)**

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login and Initialize:**
```bash
railway login
railway init
```

3. **Add PostgreSQL:**
```bash
railway add
# Select: PostgreSQL
```

4. **Set Environment Variables:**
```bash
# Set all variables from .env
railway variables set SECRET_KEY="your-secret-key"
railway variables set APOLLO_API_KEY="QDjWXMpt8peVt2w8mHRnFQ"
# ... (set all variables)
```

5. **Deploy:**
```bash
railway up
```

6. **Get Domain:**
```bash
railway domain
```

**Option B: Render**

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: ai-client-discovery-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: ai-client-discovery-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: APOLLO_API_KEY
        value: QDjWXMpt8peVt2w8mHRnFQ
      - key: GEMINI_API_KEY
        value: AIzaSyB96D1i3GD2O_it5Eydoj2XD2zX2Y0UhXs

databases:
  - name: ai-client-discovery-db
    databaseName: campaigns
    user: ai_client_discovery
```

2. **Install Gunicorn:**
```bash
pip install gunicorn
pip freeze > requirements.txt
```

3. **Deploy:**
- Push to GitHub
- Connect repository to Render
- Render will auto-deploy

### Step 6: Verify Backend Deployment

**Test Endpoints:**
```bash
# Replace YOUR_BACKEND_URL with actual URL
curl https://YOUR_BACKEND_URL/api/health

# Test Apollo API security
curl -X POST https://YOUR_BACKEND_URL/api/apollo/search-employees \
  -H "Content-Type: application/json" \
  -d '{"job_titles": ["CTO"]}'
```

**Check Logs:**
```bash
# Railway
railway logs

# Render
# View logs in dashboard
```

**Verify Security:**
```bash
# Check that API key initialized
grep "SECURITY: Apollo API key initialized" logs

# Verify no unauthorized endpoints work
curl -X POST https://YOUR_BACKEND_URL/api/pipeline/contact
# Should return: "Apollo API disabled for pipeline"
```

---

## 🌐 Part 2: Frontend Deployment

### Step 1: Configure API URL

**Update frontend/.env.production:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

**Or update in code** (`frontend/src/app/config.ts`):
```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
```

### Step 2: Build Frontend Locally (Test)

```bash
cd frontend
npm install
npm run build
```

**Fix any build errors before deploying.**

### Step 3: Deploy to Vercel (Recommended)

**Option A: Vercel (Easiest for Next.js)**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd frontend
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: ai-client-discovery
# - Directory: ./
# - Override settings? No
```

3. **Set Environment Variable:**
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter your backend URL
```

4. **Redeploy with env:**
```bash
vercel --prod
```

**Option B: Netlify**

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Build and Deploy:**
```bash
cd frontend
npm run build
netlify deploy --prod

# Or connect GitHub repository in Netlify dashboard
```

3. **Configure:**
- Build command: `npm run build`
- Publish directory: `.next`
- Environment variables: Add `NEXT_PUBLIC_API_URL`

### Step 4: Verify Frontend Deployment

**Test Pages:**
- Dashboard: `https://your-app.vercel.app/`
- Session Manager: `https://your-app.vercel.app/session-manager`
- Campaign Manager: `https://your-app.vercel.app/campaign-manager`
- Create Campaign: `https://your-app.vercel.app/campaign-manager/new`

**Test Features:**
1. Create new session
2. Use Lead Engine (Apollo API)
3. Create new campaign
4. Add dynamic email days
5. Test email sending
6. Verify AI personalization

---

## 🔒 Part 3: Security Verification

### Post-Deployment Security Checks

**1. Apollo API Key Protection:**
```bash
# Check frontend source (should return nothing)
curl https://your-app.vercel.app/_next/static/* | grep "QDjWXMpt8peVt2w8mHRnFQ"
# Expected: No results

# Check backend is secure
curl -X POST https://your-backend.railway.app/api/pipeline/contact
# Expected: "Apollo API disabled for pipeline"
```

**2. Environment Variables:**
```bash
# Verify no .env file is exposed
curl https://your-backend.railway.app/.env
# Expected: 404 or 403

# Verify no secrets in frontend bundle
curl https://your-app.vercel.app/_next/static/chunks/*.js | grep "SECRET_KEY"
# Expected: No results
```

**3. CORS Configuration:**
Verify backend `app.py` has correct CORS settings:
```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://your-app.vercel.app",
            "http://localhost:3000"  # For development
        ]
    }
})
```

**4. OAuth Redirect URIs:**

**Google OAuth Console:**
- Go to: https://console.cloud.google.com/apis/credentials
- Edit OAuth 2.0 Client ID
- Add authorized redirect URIs:
  - `https://your-backend.railway.app/api/auth/gmail/callback`
  - `https://your-app.vercel.app/auth/callback`

**Microsoft Azure:**
- Go to: https://portal.azure.com
- Navigate to App Registrations
- Add redirect URIs for production

---

## 📊 Part 4: Database Initialization

### Initialize Production Database

**Option 1: Automatic (on first run)**
```python
# app.py already has this:
with app.app_context():
    db.create_all()
    init_apollo_api_key()
    print("✅ Database initialized successfully!")
```

**Option 2: Manual Migration**
```bash
# SSH into your production server
railway run python

>>> from app import app, db
>>> with app.app_context():
...     db.create_all()
...     print("Database created!")
```

### Seed Email Templates

**Run template seeding:**
```python
# In production Python console
from app import app, db
from models import EmailTemplate

with app.app_context():
    # Check if templates exist
    count = EmailTemplate.query.count()
    print(f"Current templates: {count}")

    # If no templates, seed them
    if count == 0:
        # Your seeding logic here
        pass
```

---

## 🧪 Part 5: Testing Production

### Comprehensive Testing Checklist

**1. Dashboard:**
- [ ] Page loads without errors
- [ ] All navigation links work
- [ ] Statistics display correctly

**2. Session Manager:**
- [ ] Create new session
- [ ] View session list
- [ ] Open Lead Engine drawer
- [ ] Search for leads using Apollo API
- [ ] Add manual lead
- [ ] Upload CSV file
- [ ] View session details

**3. Campaign Manager:**
- [ ] View campaign list
- [ ] Click "New Campaign"
- [ ] Campaign name validation works
- [ ] Add leads from session
- [ ] Select sender identity
- [ ] Add dynamic email days (Day 1 default)
- [ ] Add additional days (Day 3, 7, etc.)
- [ ] Delete days (except Day 1)
- [ ] Import email templates
- [ ] Preview emails
- [ ] Send test email
- [ ] Verify test email received with HTML formatting
- [ ] AI personalization works
- [ ] Personalized changes persist
- [ ] Schedule campaign
- [ ] Review and launch

**4. Sender Identity:**
- [ ] Add Gmail account (OAuth)
- [ ] Add Outlook account (OAuth)
- [ ] Set default sender
- [ ] Delete sender account

**5. Email Templates:**
- [ ] View all templates
- [ ] Edit template
- [ ] Save changes
- [ ] Delete custom template

**6. Security:**
- [ ] Apollo API only works in Session Manager
- [ ] Campaign execution blocked from using Apollo
- [ ] No API key visible in frontend
- [ ] Logs show security violations if any

---

## 📝 Part 6: Monitoring & Logs

### Set Up Logging

**Backend Logs:**
```bash
# Railway
railway logs --follow

# Render
# View in dashboard

# Check Apollo API logs
cat logs/apollo_api_calls.log
```

**Frontend Logs:**
```bash
# Vercel
vercel logs

# Check browser console for errors
# Open DevTools → Console
```

### Monitor Apollo API Usage

**Daily usage check:**
```bash
# SSH to backend or use remote console
grep "$(date +%Y-%m-%d)" logs/apollo_api_calls.log | wc -l
```

**Check for security violations:**
```bash
grep "BLOCKED" logs/apollo_api_calls.log
```

**Weekly summary:**
```bash
# Create monitoring script
python monitor_apollo_realtime.py
```

---

## 🔧 Part 7: Post-Deployment Configuration

### 1. Update Google OAuth Credentials

**Authorized JavaScript Origins:**
```
https://your-app.vercel.app
```

**Authorized Redirect URIs:**
```
https://your-backend.railway.app/api/auth/gmail/callback
https://your-app.vercel.app/auth/callback
```

### 2. Update Microsoft OAuth Credentials

**Redirect URIs:**
```
https://your-backend.railway.app/api/auth/outlook/callback
```

### 3. Set Up Custom Domain (Optional)

**Backend:**
```bash
# Railway
railway domain add backend.yourcompany.com

# Render
# Configure in dashboard
```

**Frontend:**
```bash
# Vercel
vercel domains add yourcompany.com
```

### 4. Configure SSL/HTTPS

**Railway/Render/Vercel:** SSL is automatic.

**Custom Domain:**
- Ensure SSL certificate is valid
- Force HTTPS redirects
- Update OAuth redirect URIs with HTTPS

---

## 🚨 Part 8: Troubleshooting

### Common Issues

**1. Database Connection Failed:**
```bash
# Check DATABASE_URL is correct
railway variables get DATABASE_URL

# Test connection
psql $DATABASE_URL
```

**2. Apollo API Not Working:**
```bash
# Verify API key is set
railway variables get APOLLO_API_KEY

# Check logs for security violations
grep "SECURITY VIOLATION" logs/apollo_api_calls.log
```

**3. OAuth Not Working:**
```bash
# Verify redirect URIs match exactly
# Check OAuth credentials are correct
# Ensure CORS allows OAuth callback URLs
```

**4. Frontend Can't Reach Backend:**
```bash
# Verify NEXT_PUBLIC_API_URL is correct
vercel env ls

# Check CORS configuration in backend
# Test backend health endpoint
curl https://your-backend.railway.app/api/health
```

**5. Emails Not Sending:**
```bash
# Check sender account is connected
# Verify OAuth token is not expired
# Check email logs for errors
railway logs | grep "email"
```

---

## ✅ Part 9: Final Verification

### Production Readiness Checklist

**Backend:**
- [ ] Deployed and accessible
- [ ] Database initialized
- [ ] All environment variables set
- [ ] Apollo API key secured
- [ ] Email templates seeded
- [ ] OAuth endpoints working
- [ ] Logs directory created
- [ ] Security measures active

**Frontend:**
- [ ] Deployed and accessible
- [ ] API URL configured correctly
- [ ] All pages load without errors
- [ ] Build successful with no warnings
- [ ] Mobile responsive
- [ ] Cross-browser tested

**Security:**
- [ ] No API keys in frontend source
- [ ] Apollo API whitelist enforced
- [ ] OAuth redirect URIs updated
- [ ] HTTPS enabled everywhere
- [ ] CORS configured properly
- [ ] Rate limiting active

**Features:**
- [ ] Session Manager works
- [ ] Lead Engine (Apollo) works
- [ ] Campaign creation works
- [ ] Dynamic email days works
- [ ] Email personalization works
- [ ] Test emails send with HTML formatting
- [ ] Sender accounts connect
- [ ] Templates library functional

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check error logs
- Monitor Apollo API usage
- Review security violations

**Weekly:**
- Review campaign performance
- Check email deliverability
- Update dependencies if needed

**Monthly:**
- Backup database
- Review and rotate secrets
- Update documentation

### Get Help

**Issues:**
- GitHub Issues: `https://github.com/your-repo/issues`
- Check logs first: `railway logs` or `vercel logs`
- Review security docs: `APOLLO_API_SECURITY.md`

---

## 🎉 Deployment Complete!

**Your app is now live at:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`

**Next Steps:**
1. Test all features thoroughly
2. Set up monitoring/alerts
3. Create user documentation
4. Train users on the platform
5. Monitor Apollo API credits
6. Plan for Response Manager completion

**Congratulations! 🚀**
