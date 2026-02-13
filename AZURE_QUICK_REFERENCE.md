# 🚀 Azure Deployment - Quick Reference

## ⚡ Fast Deployment (One Command)

```bash
# Make script executable (in WSL)
chmod +x deploy-azure-fast.sh

# Deploy everything with tmux
./deploy-azure-fast.sh
```

**What it does:**
1. ✅ Creates unique resources (no conflicts with existing apps)
2. ✅ Builds Docker images
3. ✅ Pushes to Container Registry
4. ✅ Deploys backend + frontend
5. ✅ Sets up $80/month budget alert to developer.c@techgene.com
6. ✅ Opens tmux with 4-pane monitoring
7. ✅ Takes 10-15 minutes total

---

## 📋 What Gets Created

**Resources (all tagged as "ai-client-discovery"):**
- ✅ Container App: `ai-client-discovery-backend`
- ✅ Container App: `ai-client-discovery-frontend`
- ✅ Container Environment: `ai-client-discovery-env`
- ✅ Storage Account: `aiclientdiscoveryXXXXXX` (unique)
- ✅ Budget Alert: Emails at $64/month (80% of $80)

**Existing resources (REUSED, not created):**
- ✅ Container Registry: `offerletter18644.azurecr.io`
- ✅ Resource Group: `Techgenegroup`
- ✅ Log Analytics: `workspace-echgenegroupLDEi`

**Cost:** ~$80-90/month (with budget alert at $80)

---

## 🎮 tmux Commands

**Attach to session:**
```bash
tmux attach -t deploy
```

**Switch between panes:**
- `Ctrl+b` then `arrow keys`

**Pane layout:**
```
┌──────────────────┬──────────────────┐
│ Deployment       │ Backend Logs     │
│ Commands         │ (streaming)      │
├──────────────────┼──────────────────┤
│ Frontend Logs    │ Cost Monitor     │
│ (streaming)      │ (updates every   │
│                  │  30 seconds)     │
└──────────────────┴──────────────────┘
```

**Detach (keep running):**
- `Ctrl+b` then `d`

**Kill session:**
```bash
tmux kill-session -t deploy
```

---

## 📊 Monitoring Commands

**View backend logs:**
```bash
az containerapp logs tail -n ai-client-discovery-backend -g Techgenegroup --follow
```

**View frontend logs:**
```bash
az containerapp logs tail -n ai-client-discovery-frontend -g Techgenegroup --follow
```

**Check app status:**
```bash
az containerapp show -n ai-client-discovery-backend -g Techgenegroup --query "properties.{Status:runningStatus,URL:configuration.ingress.fqdn}" -o table
```

**View costs (current month):**
```bash
az consumption usage list \
  --start-date $(date +%Y-%m-01) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?resourceGroup=='Techgenegroup' && contains(instanceName, 'ai-client-discovery')].{Resource:instanceName,Cost:pretaxCost}" \
  -o table
```

**Check budget status:**
```bash
az consumption budget show --budget-name ai-client-discovery-budget --resource-group Techgenegroup
```

---

## 🔧 Management Commands

**Get app URLs:**
```bash
# Backend URL
az containerapp show -n ai-client-discovery-backend -g Techgenegroup --query "properties.configuration.ingress.fqdn" -o tsv

# Frontend URL
az containerapp show -n ai-client-discovery-frontend -g Techgenegroup --query "properties.configuration.ingress.fqdn" -o tsv
```

**Restart apps:**
```bash
# Restart backend
az containerapp restart -n ai-client-discovery-backend -g Techgenegroup

# Restart frontend
az containerapp restart -n ai-client-discovery-frontend -g Techgenegroup
```

**Stop apps (to save costs):**
```bash
# Stop backend
az containerapp stop -n ai-client-discovery-backend -g Techgenegroup

# Stop frontend
az containerapp stop -n ai-client-discovery-frontend -g Techgenegroup
```

**Start apps:**
```bash
# Start backend
az containerapp start -n ai-client-discovery-backend -g Techgenegroup

# Start frontend
az containerapp start -n ai-client-discovery-frontend -g Techgenegroup
```

**Update environment variables:**
```bash
# Update backend env var
az containerapp update \
  -n ai-client-discovery-backend \
  -g Techgenegroup \
  --set-env-vars "NEW_VAR=value"
```

**Scale apps:**
```bash
# Scale backend (more replicas = higher cost)
az containerapp update \
  -n ai-client-discovery-backend \
  -g Techgenegroup \
  --min-replicas 0 \
  --max-replicas 1

# Scale to zero saves money but adds cold start delay
```

---

## 🗑️ Cleanup (Remove Everything)

**Delete only AI Client Discovery resources:**
```bash
chmod +x cleanup-azure.sh
./cleanup-azure.sh
```

**What it deletes:**
- ✅ Backend container app
- ✅ Frontend container app
- ✅ Container environment
- ✅ Storage accounts
- ✅ Budget alert

**What it keeps:**
- ✅ Container Registry (shared with other apps)
- ✅ Resource Group
- ✅ Log Analytics

**Manual delete (if needed):**
```bash
# Delete backend
az containerapp delete -n ai-client-discovery-backend -g Techgenegroup --yes

# Delete frontend
az containerapp delete -n ai-client-discovery-frontend -g Techgenegroup --yes

# Delete environment
az containerapp env delete -n ai-client-discovery-env -g Techgenegroup --yes

# Delete storage (replace XXXXXX with actual name)
az storage account delete -n aiclientdiscoveryXXXXXX -g Techgenegroup --yes
```

---

## 🔐 Update Google OAuth

**After deployment, update Google Console:**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs:**
   ```
   https://ai-client-discovery-backend.xxx.centralus.azurecontainerapps.io/api/auth/gmail/callback
   https://ai-client-discovery-backend.xxx.centralus.azurecontainerapps.io/auth/callback
   ```
4. Save and wait 5 minutes
5. Test login in your app

**Get your exact URLs from deployment-info.txt**

---

## 🧪 Testing Checklist

**After deployment:**

- [ ] Visit frontend URL (from deployment-info.txt)
- [ ] Dashboard loads
- [ ] Navigate to Session Manager
- [ ] Click "Lead Engine" (Apollo API test)
- [ ] Search for leads (tests Apollo API)
- [ ] Go to Campaign Manager
- [ ] Create new campaign
- [ ] Add dynamic email days
- [ ] Go to Sender Identity
- [ ] Click "Connect Gmail Account" (tests OAuth)
- [ ] Complete Google login
- [ ] Send test email
- [ ] Check backend logs: `tmux attach -t deploy`

**All working?** ✅ Deployment successful!

---

## 💰 Cost Management

**Daily cost check:**
```bash
# Today's costs
az consumption usage list \
  --start-date $(date +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?resourceGroup=='Techgenegroup'].{Resource:instanceName,Cost:pretaxCost}" \
  -o table
```

**Set lower budget alert:**
```bash
# Change alert to $50/month instead of $80
az consumption budget update \
  --budget-name ai-client-discovery-budget \
  --amount 50 \
  --resource-group Techgenegroup
```

**Stop apps when not testing (saves money):**
```bash
# Stop both apps
az containerapp stop -n ai-client-discovery-backend -g Techgenegroup
az containerapp stop -n ai-client-discovery-frontend -g Techgenegroup

# Start when needed
az containerapp start -n ai-client-discovery-backend -g Techgenegroup
az containerapp start -n ai-client-discovery-frontend -g Techgenegroup
```

---

## 📞 Troubleshooting

**App not accessible:**
```bash
# Check if running
az containerapp show -n ai-client-discovery-backend -g Techgenegroup --query "properties.runningStatus"

# Check logs
az containerapp logs tail -n ai-client-discovery-backend -g Techgenegroup --follow
```

**OAuth not working:**
1. Check redirect URI in Google Console matches exactly
2. Wait 5 minutes after updating Google Console
3. Clear browser cookies
4. Check backend logs for errors

**High costs:**
```bash
# Check what's costing most
az consumption usage list \
  --start-date $(date +%Y-%m-01) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?resourceGroup=='Techgenegroup'].{Resource:instanceName,Cost:pretaxCost}" \
  -o table | sort -k2 -rn

# Scale down or stop apps
```

**Deployment failed:**
```bash
# Check deployment status
az containerapp list -g Techgenegroup --query "[?contains(name,'ai-client-discovery')].{Name:name,Status:properties.provisioningState}" -o table

# View error logs
az monitor activity-log list -g Techgenegroup --offset 1h --query "[?contains(resourceId,'ai-client-discovery')]" -o table
```

---

## 📁 Important Files

**Generated files:**
- `deployment-info.txt` - All URLs and info
- `deploy-azure-fast.sh` - Deployment script
- `cleanup-azure.sh` - Cleanup script
- `AZURE_QUICK_REFERENCE.md` - This file

**View deployment info:**
```bash
cat deployment-info.txt
```

---

## ⚡ Quick Commands Summary

```bash
# Deploy everything
./deploy-azure-fast.sh

# Attach to monitoring
tmux attach -t deploy

# View backend logs
az containerapp logs tail -n ai-client-discovery-backend -g Techgenegroup --follow

# Check costs
az consumption usage list --start-date $(date +%Y-%m-01) --end-date $(date +%Y-%m-%d) --query "[?resourceGroup=='Techgenegroup' && contains(instanceName,'ai-client')]" -o table

# Stop apps (save money)
az containerapp stop -n ai-client-discovery-backend -g Techgenegroup
az containerapp stop -n ai-client-discovery-frontend -g Techgenegroup

# Delete everything
./cleanup-azure.sh
```

---

## 🎉 You're Ready!

**Next step:** Run `./deploy-azure-fast.sh` and wait 10-15 minutes!

**Questions?** Check `deployment-info.txt` or view logs with `tmux attach -t deploy`

**Good luck! 🚀**
