# 🚀 AI Client Discovery - Deployment Specification

**Document Purpose:** Complete deployment specification for AI Client Discovery application. Use this as reference to deploy to Azure Container Apps.

**Last Updated:** February 12, 2026
**Account:** developer.c@techgene.com
**Subscription:** Microsoft Partner Network (f2ecab04-e566-4faf-9854-f661e981188e)

---

## 📋 Deployment Summary

**What to Deploy:**
- 2 Docker containers (Backend + Frontend)
- 1 Storage Account
- 1 Container Apps Environment (may already exist)
- 1 Budget Alert

**Where to Deploy:**
- **Resource Group:** `Techgenegroup`
- **Location:** `centralus`
- **Container Registry:** `offerletter18644.azurecr.io` (already exists)

**Cost Target:** ~$80-90/month with budget alert at $80

---

## 🏗️ Architecture Overview

```
Internet (HTTPS)
    ↓
Azure Container Apps
    ↓
┌─────────────────────────────────────────┐
│  Frontend Container (Next.js)           │
│  - Port 3000                            │
│  - CPU: 0.5, RAM: 1GB                  │
│  - Min replicas: 1, Max: 2             │
└─────────────────────────────────────────┘
    ↓ (calls)
┌─────────────────────────────────────────┐
│  Backend Container (Flask)              │
│  - Port 5000                            │
│  - CPU: 1.0, RAM: 2GB                  │
│  - Min replicas: 1, Max: 2             │
└─────────────────────────────────────────┘
    ↓ (stores)
┌─────────────────────────────────────────┐
│  SQLite Database (in container)         │
│  - /instance/campaigns.db               │
└─────────────────────────────────────────┘
    ↓ (backed up to)
┌─────────────────────────────────────────┐
│  Azure Storage Account                  │
│  - Logs, Backups                        │
└─────────────────────────────────────────┘
```

---

## 🐳 Container Images

### Backend Image
**Name:** `offerletter18644.azurecr.io/ai-client-discovery-backend:latest`

**Source:** `E:\Techgene\AI Client Discovery\Dockerfile`

**Base Image:** `python:3.11-slim`

**Build Command:**
```bash
docker build -t offerletter18644.azurecr.io/ai-client-discovery-backend:latest .
```

**Status:** ✅ Built and ready to push

**Key Files:**
- `app.py` - Main Flask application
- `models.py` - Database models
- `requirements.txt` - Python dependencies
- `services/` - Apollo API, Email sender, Lead engine
- `utils/` - Email utilities

---

### Frontend Image
**Name:** `offerletter18644.azurecr.io/ai-client-discovery-frontend:latest`

**Source:** `E:\Techgene\AI Client Discovery\frontend\Dockerfile`

**Base Image:** `node:20-alpine`

**Build Command:**
```bash
cd frontend
docker build -t offerletter18644.azurecr.io/ai-client-discovery-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://BACKEND_URL \
  .
```

**Status:** ⏳ Needs to be built

**Key Files:**
- `src/app/` - Next.js application
- `src/components/` - React components
- `next.config.js` - Next.js configuration
- `package.json` - Node dependencies

---

## 📦 Azure Resources to Create

### 1. Storage Account (May Already Exist)

**Name:** `aiclientdiscovery01032` or similar (must be globally unique)

**Settings:**
- **Resource Group:** Techgenegroup
- **Location:** centralus
- **SKU:** Standard_LRS
- **Kind:** StorageV2
- **Tags:** `app=ai-client-discovery, purpose=testing`

**Containers to Create:**
- `logs` - For application logs
- `backups` - For database backups
- `uploads` - For user file uploads

**File Shares:**
- `database` - For persistent database storage (optional, SQLite is in-container)

---

### 2. Container Apps Environment

**Name:** `ai-client-discovery-env`

**Settings:**
- **Resource Group:** Techgenegroup
- **Location:** centralus
- **Tags:** `app=ai-client-discovery, purpose=testing`

**Status:** ✅ Already created

**Note:** If it doesn't exist, create it. Multiple apps can share the same environment.

---

### 3. Backend Container App

**Name:** `ai-client-discovery-backend`

**Container Settings:**
- **Image:** `offerletter18644.azurecr.io/ai-client-discovery-backend:latest`
- **Registry:** `offerletter18644.azurecr.io`
- **CPU:** 1.0 cores
- **Memory:** 2.0 Gi
- **Min Replicas:** 1
- **Max Replicas:** 2
- **Target Port:** 5000
- **Ingress:** External (HTTPS enabled)

**Environment Variables:**
```yaml
SECRET_KEY: "<generate-random-32-byte-hex>"
FLASK_ENV: "production"
APOLLO_API_KEY: "your-apollo-api-key-here"
GEMINI_API_KEY: "your-gemini-api-key-here"
GEMINI_API_KEY_FALLBACK: "your-fallback-gemini-key-here"
GOOGLE_OAUTH_CLIENT_ID: "your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET: "your-google-oauth-client-secret"
DATABASE_URL: "sqlite:///instance/campaigns.db"
```

**Expected URL:** `https://ai-client-discovery-backend.{hash}.centralus.azurecontainerapps.io`

---

### 4. Frontend Container App

**Name:** `ai-client-discovery-frontend`

**Container Settings:**
- **Image:** `offerletter18644.azurecr.io/ai-client-discovery-frontend:latest`
- **Registry:** `offerletter18644.azurecr.io`
- **CPU:** 0.5 cores
- **Memory:** 1.0 Gi
- **Min Replicas:** 1
- **Max Replicas:** 2
- **Target Port:** 3000
- **Ingress:** External (HTTPS enabled)

**Environment Variables:**
```yaml
NEXT_PUBLIC_API_URL: "https://<backend-container-url>"
```

**Note:** Replace `<backend-container-url>` with the actual backend URL after deployment.

**Expected URL:** `https://ai-client-discovery-frontend.{hash}.centralus.azurecontainerapps.io`

---

### 5. Budget Alert

**Name:** `ai-client-discovery-budget`

**Settings:**
- **Resource Group:** Techgenegroup
- **Amount:** $80/month
- **Time Grain:** Monthly
- **Alert Thresholds:**
  - 80% ($64) - Email alert
  - 100% ($80) - Email alert
- **Contact Email:** developer.c@techgene.com

---

## 🔐 Secrets & Configuration

### Generate SECRET_KEY

**Python:**
```python
import secrets
print(secrets.token_hex(32))
```

**Bash:**
```bash
openssl rand -hex 32
```

### API Keys (Already Configured)

**Apollo API:**
- Key: `QDjWXMpt8peVt2w8mHRnFQ`
- Usage: Session Manager lead search ONLY
- Security: Endpoint whitelisting enforced

**Gemini AI:**
- Primary: `your-gemini-api-key-here`
- Fallback: `your-fallback-gemini-key-here`
- Usage: Email personalization

**Google OAuth:**
- Client ID: `your-google-oauth-client-id.apps.googleusercontent.com`
- Client Secret: `your-google-oauth-client-secret`
- Usage: Gmail sender authentication

---

## 🔑 Where to Place New API Keys

### If You Need to Replace/Update API Keys:

**Option 1: Azure Container App Environment Variables (Recommended)**

Update via Azure Portal or CLI:
```bash
az containerapp update \
  --name ai-client-discovery-backend \
  --resource-group Techgenegroup \
  --set-env-vars "NEW_API_KEY=your-new-key"
```

**Option 2: Azure Key Vault (Most Secure)**

1. Create Azure Key Vault in Techgenegroup
2. Store secrets in Key Vault
3. Reference secrets in Container App:
```yaml
secrets:
  - name: apollo-api-key
    keyVaultUrl: https://your-vault.vault.azure.net/secrets/apollo-api-key
```

**Option 3: Update Source .env File (For Rebuilds)**

**File:** `E:\Techgene\AI Client Discovery\.env`

**⚠️ IMPORTANT:** Never commit `.env` to GitHub!

**Template:**
```bash
# Flask Configuration
SECRET_KEY=<generate-new-with: openssl rand -hex 32>
FLASK_ENV=production

# Apollo API - SECURE KEY (Session Manager ONLY)
APOLLO_API_KEY=<your-apollo-key>

# Gemini AI API
GEMINI_API_KEY=<your-gemini-key>
GEMINI_API_KEY_FALLBACK=<your-fallback-gemini-key>

# Google OAuth (Gmail)
GOOGLE_OAUTH_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<your-client-secret>

# Microsoft OAuth (Outlook) - Optional
AZURE_CLIENT_ID=<your-azure-client-id>
AZURE_CLIENT_SECRET=<your-azure-client-secret>
AZURE_TENANT_ID=<your-tenant-id>
REDIRECT_URI=https://your-backend-url/auth/callback

# Database
DATABASE_URL=sqlite:///instance/campaigns.db
```

### API Key Priority (Where the App Looks First):

1. **Container App Environment Variables** (highest priority)
2. **Azure Key Vault** (if configured)
3. **`.env` file** (only during local development/build)

### To Get New API Keys:

**Apollo API:**
- Website: https://apollo.io
- Go to Settings → API
- Generate new API key

**Gemini AI:**
- Website: https://makersuite.google.com/app/apikey
- Create API key
- Get 2 keys for primary + fallback

**Google OAuth:**
- Console: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID
- Type: Web application
- Get Client ID and Client Secret

**Microsoft OAuth (Optional):**
- Portal: https://portal.azure.com
- Azure Active Directory → App registrations
- New registration → Get Client ID, Secret, Tenant ID

---

## 🎯 Application Features (What's Being Deployed)

### Working Features ✅

1. **Dashboard** - Overview of all statistics
2. **Session Manager** - Lead session management
   - Lead Engine (Apollo API integration)
   - Manual lead entry
   - CSV upload
3. **Campaign Manager** - Multi-email campaign creation
   - Dynamic email days (Day 1, 3, 7, 11+)
   - Email template library (13 pre-built)
   - AI personalization (Gemini)
   - Campaign scheduling
4. **Sender Identity** - OAuth sender accounts
   - Gmail integration
   - Outlook integration
5. **Email Templates** - Template management
   - Pre-built templates
   - Custom templates
   - Variable support

### Not Deployed ❌

1. **Response Manager** - Still under development
2. **Analytics** - Basic only, incomplete

---

## 🔒 Security Implementation

### Apollo API Security

**Whitelisted Endpoints Only:**
```
/api/apollo/enrich-company
/api/apollo/find-contacts
/api/apollo/reveal-email
/api/apollo/search-companies
/api/apollo/search-employees
```

**Blocked Endpoints:**
- `/api/pipeline/contact` - Disabled
- `/api/pipeline/reveal-email` - Disabled
- Campaign execution - Apollo API disabled

**Security Functions (in app.py):**
- `init_apollo_api_key()` - Loads key from env to database
- `validate_apollo_request()` - Validates endpoint whitelist
- `get_apollo_api_key_secure()` - Secure key retrieval
- Rate limiting: 200 calls/minute

**Logging:**
- All API calls logged to `logs/apollo_api_calls.log`
- Security violations tracked

---

## 📊 Database Schema

**Database Type:** SQLite (in-container)

**Location:** `/instance/campaigns.db`

**Key Tables:**
1. `Settings` - App configuration
2. `Campaign` - Campaign data
3. `EmailTemplate` - Email templates
4. `JobLead` - Individual leads
5. `LeadSession` - Lead sessions
6. `SessionLead` - Session-lead relationships
7. `SenderAccount` - OAuth sender credentials
8. `CampaignEmailSequence` - Email sequence container
9. `CampaignEmailStep` - Individual email steps
10. `LeadEmailState` - Lead email tracking
11. `EmailSendLog` - Email send history

**Database Initialization:** Automatic on first run

---

## 🌐 DNS & Domains

### Azure Auto-Generated Domains

**Backend:**
- Pattern: `https://ai-client-discovery-backend.{hash}.centralus.azurecontainerapps.io`
- SSL: Automatic (Azure-managed)
- Example: `https://ai-client-discovery-backend.kindbeach-12345678.centralus.azurecontainerapps.io`

**Frontend:**
- Pattern: `https://ai-client-discovery-frontend.{hash}.centralus.azurecontainerapps.io`
- SSL: Automatic (Azure-managed)
- Example: `https://ai-client-discovery-frontend.proudsea-87654321.centralus.azurecontainerapps.io`

### Post-Deployment Configuration

**Update Google OAuth Console:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth 2.0 Client ID: `155506254883-02223k3aa0tok5aujigp9ulob1nbfqgh`
3. Add to **Authorized redirect URIs:**
   ```
   https://ai-client-discovery-backend.{actual-hash}.centralus.azurecontainerapps.io/api/auth/gmail/callback
   https://ai-client-discovery-backend.{actual-hash}.centralus.azurecontainerapps.io/auth/callback
   ```
4. Keep localhost URIs for development:
   ```
   http://localhost:5000/api/auth/gmail/callback
   http://localhost:3000/auth/callback
   ```

---

## 📦 Existing Azure Resources (DO NOT DELETE)

**In Resource Group `Techgenegroup`:**

1. **Container Registry:** `offerletter18644`
   - Used by multiple applications
   - Contains all Docker images
   - DO NOT DELETE

2. **Log Analytics Workspace:** `workspace-echgenegroupLDEi`
   - Shared monitoring workspace
   - DO NOT DELETE

3. **Container Apps Environment:** `resume-formatter-env` (if exists)
   - May be reused or create new one

**Other Resource Groups:** DO NOT MODIFY
- `DefaultResourceGroup-CUS`
- `cloud-shell-storage-centralindia`
- `TECHGENE_group`
- `NetworkWatcherRG`
- `S2SVPN`

---

## 🧪 Testing After Deployment

### Backend Health Check

**URL:** `https://<backend-url>/api/health`

**Expected Response:** HTTP 200 OK

### Frontend Health Check

**URL:** `https://<frontend-url>/`

**Expected:** Dashboard loads

### Feature Testing Checklist

1. ✅ Visit frontend URL
2. ✅ Navigate to Session Manager
3. ✅ Click "Lead Engine" → Search leads (Apollo API test)
4. ✅ Go to Campaign Manager → Create new campaign
5. ✅ Add dynamic email days (Day 1, Day 3, etc.)
6. ✅ Go to Sender Identity → Connect Gmail account
7. ✅ Complete OAuth flow
8. ✅ Send test email
9. ✅ Verify email received with HTML formatting

---

## 💰 Cost Monitoring

### Monthly Cost Estimate

**Backend Container:**
- 1 vCPU × 730 hours = ~$60/month
- 2 GB memory × 730 hours = ~$14/month
- **Subtotal: ~$74/month**

**Frontend Container:**
- 0.5 vCPU × 730 hours = ~$30/month
- 1 GB memory × 730 hours = ~$7/month
- **Subtotal: ~$37/month**

**Storage Account:**
- ~$0.30/month

**Total:** ~$111/month
**With free tier:** ~$80-90/month

### Cost Optimization

**To reduce costs:**
- Scale to zero when idle (adds 2-5s cold start)
- Reduce replica count to 0-1 minimum
- Use smaller CPU/memory sizes
- Stop containers when not testing

---

## 📁 Source Code Structure

**Repository Location:** `E:\Techgene\AI Client Discovery`

**Key Directories:**
```
AI Client Discovery/
├── app.py                      # Main Flask app
├── models.py                   # Database models
├── config.py                   # Configuration
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Backend container
├── .env                        # Environment variables (NOT in git)
├── services/
│   ├── apollo_api.py          # Apollo integration
│   ├── email_sender.py        # Email sending
│   ├── lead_engine.py         # Lead processing
│   └── email_generator.py     # Template processing
├── utils/
│   └── email_utils.py         # Email utilities
├── frontend/
│   ├── Dockerfile             # Frontend container
│   ├── package.json           # Node dependencies
│   ├── next.config.js         # Next.js config
│   └── src/
│       ├── app/               # Next.js pages
│       └── components/        # React components
└── templates/                 # Email template PDFs
```

---

## 🔄 Deployment Sequence

### Phase 1: Pre-Deployment
1. Build backend Docker image
2. Build frontend Docker image
3. Push both images to Container Registry

### Phase 2: Infrastructure
1. Create Storage Account (if not exists)
2. Create Container Apps Environment (if not exists)
3. Set up Budget Alert

### Phase 3: Deploy Containers
1. Deploy Backend Container App
   - Get backend URL
2. Deploy Frontend Container App
   - Use backend URL in env vars
   - Get frontend URL

### Phase 4: Post-Deployment
1. Update Google OAuth redirect URIs
2. Test all features
3. Verify budget alert configured
4. Document URLs

---

## 📞 Important URLs & Credentials

### Azure Portal
- Main: https://portal.azure.com
- Container Apps: https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.App%2FcontainerApps
- Cost Management: https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview

### Google OAuth Console
- Credentials: https://console.cloud.google.com/apis/credentials
- Project: AI Client Discovery (or default)

### Container Registry
- Name: offerletter18644
- Login Server: offerletter18644.azurecr.io
- Location: centralus

---

## ⚠️ Important Notes

1. **DO NOT delete or modify existing resources** in Techgenegroup that are not prefixed with `ai-client-discovery`

2. **Resource naming:** All new resources must include `ai-client-discovery` prefix to avoid conflicts

3. **Tagging:** Tag all resources with:
   - `app=ai-client-discovery`
   - `purpose=testing`

4. **OAuth URLs:** Must be updated after deployment with actual container URLs

5. **Database:** SQLite is in-container, data will be lost on container restart unless using persistent storage

6. **Budget Alert:** Critical - ensures costs don't exceed $80/month

7. **Apollo API:** Only works in Session Manager (security whitelist enforced)

8. **Container Registry:** Shared with other apps, handle with care

---

## 📝 Deployment Checklist

**Before Deployment:**
- [ ] Backend Docker image built
- [ ] Frontend Docker image built
- [ ] Both images pushed to offerletter18644.azurecr.io
- [ ] SECRET_KEY generated
- [ ] All environment variables documented

**During Deployment:**
- [ ] Storage account created
- [ ] Container Apps environment ready
- [ ] Backend container deployed
- [ ] Frontend container deployed
- [ ] Budget alert configured

**After Deployment:**
- [ ] Backend URL obtained
- [ ] Frontend URL obtained
- [ ] Google OAuth URIs updated
- [ ] All features tested
- [ ] Budget alert verified
- [ ] URLs documented

---

## 🎯 Success Criteria

**Deployment is successful when:**
1. ✅ Both containers show "Running" status
2. ✅ Frontend accessible via HTTPS
3. ✅ Backend API responding
4. ✅ Session Manager → Lead Engine works
5. ✅ Campaign Manager works
6. ✅ Google OAuth login works
7. ✅ Test emails send successfully
8. ✅ Budget alert configured and working
9. ✅ No errors in container logs
10. ✅ All 5 core modules functional

---

**Document Version:** 1.0
**Created:** February 12, 2026
**For:** Deployment by teammate using Claude Code agent

**Contact:** developer.c@techgene.com
**Resource Group:** Techgenegroup
**Subscription:** Microsoft Partner Network
