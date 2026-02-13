# 🚀 Azure Deployment Plan - Cost-Effective & Organized

## 📊 Current Azure Setup

**Account:** developer.c@techgene.com
**Subscription:** Microsoft Partner Network
**Resource Group:** Techgenegroup (centralus)

**Existing Infrastructure:**
- ✅ Container Registry: `offerletter18644.azurecr.io`
- ✅ Log Analytics Workspace: `workspace-echgenegroupLDEi`
- ✅ Container Apps Environment: `resume-formatter-env`

---

## 💰 Proposed Architecture (Cost-Optimized)

### Option 1: Azure Container Apps (RECOMMENDED) ✅

**What we'll deploy:**

```
┌─────────────────────────────────────────────────────┐
│           Azure Container Apps Environment           │
│              (resume-formatter-env)                  │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Frontend   │  │  Backend    │  │  Database   │ │
│  │  (Next.js)  │  │  (Flask)    │  │ (Postgres)  │ │
│  │  Port 3000  │  │  Port 5000  │  │  Port 5432  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │  Azure Storage Account │
              │  - Logs (apollo_api)   │
              │  - Database backups    │
              │  - Static files        │
              └────────────────────────┘
```

**Components:**

1. **Frontend Container** (Next.js)
   - Image: `offerletter18644.azurecr.io/ai-client-discovery-frontend:latest`
   - CPU: 0.5 cores
   - Memory: 1 GB
   - Auto-domain: `frontend.xxx.centralus.azurecontainerapps.io`

2. **Backend Container** (Flask)
   - Image: `offerletter18644.azurecr.io/ai-client-discovery-backend:latest`
   - CPU: 1 core
   - Memory: 2 GB
   - Auto-domain: `backend.xxx.centralus.azurecontainerapps.io`

3. **Database Container** (PostgreSQL)
   - Image: `postgres:16-alpine`
   - CPU: 0.5 cores
   - Memory: 1 GB
   - Storage: Azure File Share (persistent)

4. **Storage Account**
   - Logs storage
   - Database backups
   - File uploads (if any)

---

## 💵 Cost Breakdown (Monthly Estimates)

### Azure Container Apps Pricing

**Frontend:**
- 0.5 vCPU × 730 hours = ~$30/month
- 1 GB memory × 730 hours = ~$7/month
- **Subtotal: ~$37/month**

**Backend:**
- 1 vCPU × 730 hours = ~$60/month
- 2 GB memory × 730 hours = ~$14/month
- **Subtotal: ~$74/month**

**Database:**
- 0.5 vCPU × 730 hours = ~$30/month
- 1 GB memory × 730 hours = ~$7/month
- **Subtotal: ~$37/month**

**Storage Account:**
- 10 GB storage = ~$0.20/month
- Transactions (100k/month) = ~$0.10/month
- **Subtotal: ~$0.30/month**

**Container Registry:**
- Already exists (Basic tier = ~$5/month)

**Log Analytics:**
- Already exists (~$2-5/month for < 5GB)

---

### 🎯 Total Monthly Cost: ~$150-160/month

**Free tier options:**
- First 180,000 vCPU-seconds free/month
- First 360,000 GB-seconds free/month
- **Estimated with free tier: ~$120-130/month**

---

## 💡 Cost Optimization Strategies

### 1. Use Existing Resources ✅

**Already have:**
- ✅ Container Registry ($5/month saved)
- ✅ Log Analytics Workspace ($2-5/month saved)
- ✅ Container Apps Environment ($0 - shared)

### 2. Scale-to-Zero (Not Recommended for Production)

**Option:** Configure containers to scale to 0 when idle
- **Saves:** ~50% of costs during off-hours
- **Trade-off:** Cold start delay (2-5 seconds)

**Recommendation:** Keep minimum 1 replica for production

### 3. SQLite Instead of PostgreSQL (Initial Deployment)

**Option:** Use SQLite for initial deployment
- **Saves:** ~$37/month (database container cost)
- **Trade-off:** Less scalable, no concurrent writes
- **Recommendation:** Start with SQLite, migrate to PostgreSQL later

**Revised Total: ~$83-93/month (with SQLite)**

---

## 🏗️ Deployment Architecture

### Network Setup

```
Internet
   ↓
Azure Container Apps (HTTPS auto-enabled)
   ↓
Frontend Container (yourapp.centralus.azurecontainerapps.io)
   ↓
Backend Container (backend.centralus.azurecontainerapps.io)
   ↓
Database Container (internal only)
   ↓
Storage Account (file share mounted)
```

**Benefits:**
- ✅ **Auto HTTPS** - SSL certificates managed by Azure
- ✅ **Custom domains** - Can add your own domain
- ✅ **Auto-scaling** - Scale based on traffic
- ✅ **Health checks** - Auto-restart on failure
- ✅ **Logging** - Integrated with Log Analytics

---

## 📦 Storage Organization

### Storage Account Structure

```
ai-client-discovery-storage (Storage Account)
├── logs/                          # Container for logs
│   └── apollo_api_calls.log       # Apollo API usage logs
├── backups/                       # Container for DB backups
│   └── campaigns_2024-02-12.sql   # Daily backups
├── fileshare/                     # File share for persistent data
│   ├── database/                  # PostgreSQL data
│   └── instance/                  # SQLite database (if using)
└── uploads/                       # Container for user uploads
    └── csv/                       # CSV lead uploads
```

**Access:**
- Backend mounts file share for database persistence
- Logs written to Azure Blob Storage
- Backups stored in separate container (retention policy)

---

## 🔐 Security & Secrets

### Azure Key Vault Integration

**Store secrets in Azure Key Vault:**
- APOLLO_API_KEY
- GEMINI_API_KEY
- GOOGLE_OAUTH_CLIENT_SECRET
- Database credentials

**Reference in Container Apps:**
```yaml
env:
  - name: APOLLO_API_KEY
    secretRef: apollo-api-key
```

**Benefits:**
- ✅ No secrets in code or .env files
- ✅ Automatic rotation support
- ✅ Audit logging
- ✅ Access control

**Cost:** ~$0.03/month (10,000 operations)

---

## 📊 Monitoring & Tracking

### Built-in Monitoring

**Log Analytics Workspace (already exists):**
- Container logs
- Application logs
- Performance metrics
- Error tracking

**Application Insights (optional):**
- Request tracing
- Dependency tracking
- Exception tracking
- Custom metrics

**Cost:** Already included in Log Analytics (~$2-5/month)

### Custom Dashboards

**Create Azure Dashboard for:**
- CPU/Memory usage per container
- Request counts (API calls)
- Error rates
- Apollo API usage (from logs)
- Cost tracking

---

## 🎯 Deployment Steps

### Phase 1: Prepare Images (10 minutes)

```bash
# Login to Azure Container Registry
az acr login --name offerletter18644

# Build and push backend
docker build -t offerletter18644.azurecr.io/ai-client-discovery-backend:latest .
docker push offerletter18644.azurecr.io/ai-client-discovery-backend:latest

# Build and push frontend
cd frontend
docker build -t offerletter18644.azurecr.io/ai-client-discovery-frontend:latest .
docker push offerletter18644.azurecr.io/ai-client-discovery-frontend:latest
```

### Phase 2: Create Storage Account (5 minutes)

```bash
# Create storage account
az storage account create \
  --name aiclientdiscovery \
  --resource-group Techgenegroup \
  --location centralus \
  --sku Standard_LRS \
  --kind StorageV2

# Create containers
az storage container create --name logs --account-name aiclientdiscovery
az storage container create --name backups --account-name aiclientdiscovery
az storage container create --name uploads --account-name aiclientdiscovery

# Create file share for database
az storage share create --name database --account-name aiclientdiscovery --quota 10
```

### Phase 3: Deploy Containers (15 minutes)

**Deploy Backend:**
```bash
az containerapp create \
  --name ai-client-discovery-backend \
  --resource-group Techgenegroup \
  --environment resume-formatter-env \
  --image offerletter18644.azurecr.io/ai-client-discovery-backend:latest \
  --registry-server offerletter18644.azurecr.io \
  --cpu 1.0 \
  --memory 2.0Gi \
  --ingress external \
  --target-port 5000 \
  --env-vars \
    "SECRET_KEY=secretref:secret-key" \
    "APOLLO_API_KEY=secretref:apollo-api-key" \
    "GEMINI_API_KEY=secretref:gemini-api-key" \
    "DATABASE_URL=postgresql://user:pass@localhost:5432/campaigns"
```

**Deploy Frontend:**
```bash
az containerapp create \
  --name ai-client-discovery-frontend \
  --resource-group Techgenegroup \
  --environment resume-formatter-env \
  --image offerletter18644.azurecr.io/ai-client-discovery-frontend:latest \
  --registry-server offerletter18644.azurecr.io \
  --cpu 0.5 \
  --memory 1.0Gi \
  --ingress external \
  --target-port 3000 \
  --env-vars \
    "NEXT_PUBLIC_API_URL=https://ai-client-discovery-backend.xxx.centralus.azurecontainerapps.io"
```

### Phase 4: Configure & Test (10 minutes)

1. Get container URLs
2. Update Google OAuth redirect URIs
3. Test all features
4. Monitor logs

---

## 🔄 CI/CD Pipeline (Optional - Future)

**GitHub Actions workflow:**
```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Login to ACR
        run: az acr login --name offerletter18644
      - name: Build and push
        run: |
          docker build -t offerletter18644.azurecr.io/backend:latest .
          docker push offerletter18644.azurecr.io/backend:latest
      - name: Deploy to Container Apps
        run: az containerapp update --name ai-client-discovery-backend --image offerletter18644.azurecr.io/backend:latest
```

---

## 📈 Scaling Strategy

### Auto-scaling Rules

**Backend:**
- Min replicas: 1
- Max replicas: 5
- Scale trigger: CPU > 70% or HTTP requests > 100/min

**Frontend:**
- Min replicas: 1
- Max replicas: 3
- Scale trigger: CPU > 80%

**Database:**
- Fixed: 1 replica (not scalable horizontally)

### Manual Scaling

```bash
# Scale backend to 2 replicas
az containerapp update \
  --name ai-client-discovery-backend \
  --min-replicas 2 \
  --max-replicas 5
```

---

## 🗑️ Cleanup Commands (When Needed)

```bash
# Delete specific container app
az containerapp delete --name ai-client-discovery-backend --resource-group Techgenegroup

# Delete storage account
az storage account delete --name aiclientdiscovery --resource-group Techgenegroup

# View all resources in group
az resource list --resource-group Techgenegroup --output table
```

---

## ✅ Cost Tracking

### Set Up Budget Alerts

```bash
# Create budget alert (triggers at $150/month)
az consumption budget create \
  --budget-name ai-client-discovery-budget \
  --amount 150 \
  --time-grain Monthly \
  --start-date 2024-02-01 \
  --end-date 2025-02-01 \
  --notifications \
    "actual-80={\"enabled\":true,\"operator\":\"GreaterThan\",\"threshold\":80,\"contactEmails\":[\"developer.c@techgene.com\"]}"
```

### Monitor Costs Daily

**Azure Portal:**
- Cost Management + Billing
- Cost Analysis
- View by resource group: Techgenegroup

**CLI:**
```bash
# Check current month costs
az consumption usage list \
  --start-date 2024-02-01 \
  --end-date 2024-02-29 \
  --query "[?resourceGroup=='Techgenegroup'].{Resource:instanceName, Cost:pretaxCost}" \
  --output table
```

---

## 🎯 Decision: Which Architecture?

### Recommended: Azure Container Apps + SQLite (Initial)

**Why:**
- ✅ **Cost-effective:** ~$83-93/month
- ✅ **Uses existing infrastructure** (Container Registry, Environment)
- ✅ **Auto HTTPS** with Azure domain
- ✅ **Easy to deploy**
- ✅ **Easy to scale later** (move to PostgreSQL when needed)
- ✅ **Built-in monitoring**
- ✅ **Professional setup**

**When to migrate to PostgreSQL:**
- When you have > 100 concurrent users
- When you need better performance
- When SQLite becomes a bottleneck
- Estimated: After 3-6 months of usage

---

## 📞 Next Steps

1. **Review this plan** - Approve architecture and costs
2. **Create deployment script** - Automated setup with tmux
3. **Deploy containers** - Push images and create container apps
4. **Configure secrets** - Set up environment variables
5. **Update OAuth** - Add Azure URLs to Google Console
6. **Test everything** - Verify all features working
7. **Set up monitoring** - Configure alerts and dashboards
8. **Document** - Save all URLs and credentials

---

**Ready to proceed?** Let me know and I'll create the automated deployment scripts! 🚀
