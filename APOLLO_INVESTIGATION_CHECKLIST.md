# Apollo API Usage Investigation Checklist
**Date:** February 11, 2026
**Issue:** 7,500 Apollo API calls detected but no local database activity

## 🔍 Investigation Steps

### 1. Check Teammates ✓ HIGH PRIORITY
- [ ] Ask teammates if they ran lead generation today
- [ ] Check if anyone has the API key in their local `.env` file
- [ ] Review recent git commits from teammates (especially from today)
- [ ] Check team communication (Slack/Teams) for mentions of lead generation

**Recent Commits:**
```
f454bb3 - Update campaign builder: rename Sender Profile to Sender Identity
4d39584 - Add POC role filter and ranking logic for lead generation
808acbb - Redesign UI across Session Manager, Campaign Manager, and Sidebar
```

### 2. Check Deployed Environments ✓ HIGH PRIORITY
- [ ] **Azure App Service** - Check if the app is deployed to Azure
  - Login to portal.azure.com
  - Look for App Services or Web Apps
  - Check deployment logs and activity

- [ ] **AWS/Other Cloud** - Check for EC2, Lambda, or container deployments
  - Check AWS Console
  - Look for running instances
  - Check CloudWatch logs

- [ ] **Docker Containers** - Check if there are containers running
  - Run: `docker ps`
  - Look for running instances of this application

### 3. Check for Background Processes ✓ MEDIUM PRIORITY
- [ ] Check Windows Task Scheduler for automated tasks
  - Open: Task Scheduler (`taskschd.msc`)
  - Look for Python/lead generation tasks

- [ ] Check for PM2 or other process managers
  - Run: `pm2 list` (if PM2 is installed)

- [ ] Check for running Python processes
  - Currently running: PID 37248 (localhost:5000)
  - Kill it: `taskkill /PID 37248 /F`
  - Check if API calls stop

### 4. Monitor API Usage in Real-Time
- [ ] Run the monitoring script:
  ```bash
  python check_apollo_usage.py
  ```

- [ ] Compare usage now vs. in 1 hour
  - Current: 7,500 calls today
  - Check again at: [TIME] ___________
  - New total: ___________

- [ ] If calls are increasing:
  - Something is actively using the API key RIGHT NOW
  - Kill all Python processes and monitor again

### 5. Check Apollo Dashboard Directly
- [ ] Login to Apollo.io web dashboard
  - URL: https://app.apollo.io
  - Check "API Usage" or "Settings → API"
  - Look for recent activity logs
  - Check if anyone else has access to this account

### 6. API Key Security
- [ ] Review who has access to the API key
  - Check `.env` file permissions
  - Check if key is in version control (NEVER commit API keys!)
  - Check team documentation/wikis where key might be stored

- [ ] Consider rotating the API key if source unknown
  - Generate new key in Apollo dashboard
  - Update `.env` file
  - Update deployed environments

### 7. Check Application Logs
- [ ] Check Flask application logs
  - Location: `logs/` directory (if exists)
  - Look for today's timestamp
  - Search for "apollo", "lead", "search"

- [ ] Check Windows Event Viewer
  - Look for Python application events
  - Check around the time calls were made (today)

## 📋 Findings

### When Were The Calls Made?
Apollo usage endpoint shows:
- **Hour usage:** All at 0/6000 consumed (resets hourly)
- **Day usage:** 7,500/50,000 consumed

**This means:** The calls were NOT in the last hour, they happened earlier today.

### Call Pattern Analysis
```
06:41 AM - 6,641 calls (Mixed People Search)
[Unknown times for other 847 calls]
```

**Likely Timeline:**
- Bulk of calls (6,641) happened in a short burst
- Suggests automated/batch processing
- Not manual clicking (too many calls too fast)

## ✅ Next Steps Based on Findings

### If Teammate Used It:
- [x] Document the activity
- [x] Set up usage notifications for future
- [x] Consider setting up separate API keys per environment

### If Deployed Version Found:
- [x] Document the deployment
- [x] Set up proper monitoring
- [x] Use environment-specific API keys (dev vs. prod)

### If Source Unknown:
- [x] ROTATE API KEY immediately (security risk)
- [x] Check access logs
- [x] Review who has access to codebase/credentials
- [x] Set up IP restrictions if possible

## 🛡️ Prevention Measures

### Monitoring
- [ ] Set up daily usage report (automated email)
- [ ] Alert when usage exceeds 25% of daily limit
- [ ] Log all Apollo API calls in application

### Security
- [x] Never commit API keys to git
- [x] Use separate keys for dev/staging/production
- [x] Rotate keys quarterly
- [x] Document who has access

### Documentation
- [x] Document all deployments
- [x] Keep inventory of where API keys are used
- [x] Set up team communication about API usage

---

**Investigation Started:** [DATE/TIME]
**Investigation Completed:** [DATE/TIME]
**Root Cause Found:** [YES/NO]
**Root Cause:** ___________________________
**Action Taken:** ___________________________
