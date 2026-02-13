# 📤 Push to GitHub - Commands

## Quick Push Commands

**Open WSL or Git Bash and run these:**

```bash
# Navigate to project
cd /mnt/e/Techgene/AI\ Client\ Discovery

# Check current status
git status

# Add all new files
git add DEPLOYMENT_SPECIFICATION.md
git add GIT_PUSH_COMMANDS.md
git add deploy-azure-fast.sh
git add cleanup-azure.sh
git add nginx-ssl.conf
git add SSL_SETUP_GUIDE.md
git add GOOGLE_OAUTH_HTTPS_SETUP.md
git add SSL_ACTION_PLAN.md
git add DOCKER_DEPLOYMENT.md
git add DOCKER_QUICK_START.md
git add DOCKER_DEPLOYMENT_SUMMARY.md
git add .env.example
git add AZURE_DEPLOYMENT_PLAN.md
git add AZURE_QUICK_REFERENCE.md
git add deploy_check.py
git add docker-setup.sh
git add setup-ssl.sh

# Or add all changes
git add .

# Commit with message
git commit -m "Add complete deployment documentation and Docker/Azure configs

- Add DEPLOYMENT_SPECIFICATION.md (main deployment guide for teammate)
- Add Docker deployment guides and scripts
- Add Azure Container Apps deployment plans
- Add SSL/HTTPS setup guides
- Add budget tracking and cost monitoring
- Add API key configuration documentation
- All deployment scripts and automation ready
- Security implementation documented (Apollo API whitelist)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

---

## Alternative: All-in-One Command

```bash
cd /mnt/e/Techgene/AI\ Client\ Discovery && \
git add . && \
git commit -m "Add deployment docs and Docker/Azure configs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" && \
git push origin main
```

---

## ⚠️ IMPORTANT: Before Pushing

### Make Sure .env is NOT Committed

**Check .gitignore has:**
```
.env
.env.local
.env.production
*.db
*.sqlite
instance/
logs/
__pycache__/
```

**Verify .env is ignored:**
```bash
git status
# Should NOT show .env in "Changes to be committed"
```

**If .env is showing up:**
```bash
# Remove it from git (keeps file locally)
git rm --cached .env

# Add to .gitignore if not already there
echo ".env" >> .gitignore

# Commit
git add .gitignore
git commit -m "Ensure .env is not tracked"
```

---

## Files Being Pushed

**New Documentation:**
- ✅ `DEPLOYMENT_SPECIFICATION.md` - **Main file for teammate**
- ✅ `DOCKER_DEPLOYMENT.md` - Docker deployment guide
- ✅ `AZURE_DEPLOYMENT_PLAN.md` - Azure cost and architecture
- ✅ `SSL_SETUP_GUIDE.md` - SSL/HTTPS configuration
- ✅ `GOOGLE_OAUTH_HTTPS_SETUP.md` - OAuth setup guide
- ✅ `.env.example` - Environment variable template

**Scripts:**
- ✅ `deploy-azure-fast.sh` - Fast deployment automation
- ✅ `cleanup-azure.sh` - Resource cleanup
- ✅ `deploy_check.py` - Pre-deployment verification
- ✅ `docker-setup.sh` - Docker setup automation
- ✅ `setup-ssl.sh` - SSL certificate automation

**Configs:**
- ✅ `nginx-ssl.conf` - Nginx HTTPS configuration
- ✅ `docker-compose.yml` - Docker Compose orchestration

**NOT Pushed (Excluded):**
- ❌ `.env` - Contains secrets
- ❌ `*.db` - Database files
- ❌ `instance/` - Runtime data
- ❌ `logs/` - Log files
- ❌ `__pycache__/` - Python cache

---

## After Pushing

**Share with Teammate:**
1. GitHub repository URL
2. Main file to read: `DEPLOYMENT_SPECIFICATION.md`
3. They can use their Claude Code agent with this spec

**What Teammate Needs:**
- Access to Azure account: developer.c@techgene.com
- Resource Group: Techgenegroup
- Container Registry: offerletter18644
- Read DEPLOYMENT_SPECIFICATION.md
- Deploy following the spec (their own way)

---

## Quick Check Before Sharing

```bash
# Verify files are pushed
git log --oneline -1
git ls-files | grep DEPLOYMENT_SPECIFICATION.md

# Get repository URL
git remote -v
```

---

**Ready to push!** Run the commands above in WSL or Git Bash! 🚀
