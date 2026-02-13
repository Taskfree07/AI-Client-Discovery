# 🔒 SSL/HTTPS Setup - Your Action Plan

## 📋 What You Need to Do (Step-by-Step)

**Time Required:** 30-45 minutes
**Cost:** Free (using Let's Encrypt or Cloudflare)

---

## Option 1: Let's Encrypt (Recommended for Self-Hosted)

### ✅ Step 1: Get a Domain (If you don't have one)

**Buy a domain from:**
- Namecheap: ~$10/year
- Google Domains: ~$12/year
- Cloudflare: ~$9/year

**Or use a subdomain you already own:**
- `app.yourcompany.com`
- `clientdiscovery.yourcompany.com`

⏱️ **Time:** 10 minutes + cost

---

### ✅ Step 2: Point Domain to Your Server

**In your domain registrar's DNS settings:**

1. Add **A Record:**
   - Name: `@` (or subdomain like `app`)
   - Type: `A`
   - Value: Your server's IP address
   - TTL: 300 (or Auto)

2. Wait for DNS propagation (5-60 minutes)

3. **Test:**
   ```bash
   ping yourapp.com
   # Should return your server IP
   ```

⏱️ **Time:** 5 minutes + 5-60 min wait

---

### ✅ Step 3: Run Automated SSL Setup

**On your server:**

```bash
# Navigate to project
cd /path/to/ai-client-discovery

# Run SSL setup script
sudo bash setup-ssl.sh
```

**The script will:**
- ✅ Check if certbot is installed (installs if needed)
- ✅ Ask for your domain name
- ✅ Ask for your email address
- ✅ Request SSL certificate from Let's Encrypt
- ✅ Update nginx-ssl.conf with your domain
- ✅ Set up auto-renewal (every 90 days)
- ✅ Show you next steps

**Example:**
```
Enter your domain name: app.mycompany.com
Enter your email: admin@mycompany.com

[Installing certbot...]
[Requesting certificate...]
✓ Certificate obtained successfully!
```

⏱️ **Time:** 5-10 minutes

---

### ✅ Step 4: Update Google OAuth Console

**Go to:** https://console.cloud.google.com/apis/credentials

1. **Click your OAuth 2.0 Client ID**

2. **Add Authorized JavaScript origins:**
   ```
   https://yourapp.com
   ```

3. **Add Authorized redirect URIs:**
   ```
   https://yourapp.com/api/auth/gmail/callback
   https://yourapp.com/auth/callback
   ```

4. **Keep localhost for development:**
   ```
   http://localhost:5000/api/auth/gmail/callback
   http://localhost:3000/auth/callback
   ```

5. **Click Save**

6. **Wait 5 minutes** for Google to update

⏱️ **Time:** 5 minutes

---

### ✅ Step 5: Update Your .env File

**Edit `.env`:**

```bash
# Old
REDIRECT_URI=http://localhost:5000/auth/callback
NEXT_PUBLIC_API_URL=http://localhost:5000

# New (replace with your domain)
REDIRECT_URI=https://yourapp.com/api/auth/gmail/callback
NEXT_PUBLIC_API_URL=https://yourapp.com
```

**Keep all other values the same!**

⏱️ **Time:** 2 minutes

---

### ✅ Step 6: Start Docker with SSL

```bash
# Stop existing services
docker-compose down

# Start with production profile (includes Nginx with SSL)
docker-compose --profile production up -d --build

# Check logs
docker-compose logs -f
```

**Look for:**
```
backend    | ✓ Database initialized successfully!
nginx      | nginx: configuration file /etc/nginx/nginx.conf test is successful
frontend   | ▲ Ready on http://localhost:3000
```

⏱️ **Time:** 5 minutes

---

### ✅ Step 7: Test Everything

**1. Test HTTPS:**
```
https://yourapp.com
```

**Should show:**
- ✅ Green padlock icon
- ✅ "Connection is secure"
- ✅ Your app loads

**2. Test Google OAuth:**
1. Go to Campaign Manager → Sender Identity
2. Click "Connect Gmail Account"
3. Should redirect to Google login (HTTPS)
4. Login with your Gmail
5. Should redirect back and show "Connected"

**3. Test Email:**
1. Create a test campaign
2. Send test email
3. Should receive email successfully

⏱️ **Time:** 5-10 minutes

---

## ✅ Option 2: Cloudflare (Easiest!)

**Perfect if you want:**
- ✅ Instant SSL (no certificate management)
- ✅ Free CDN
- ✅ DDoS protection
- ✅ DNS management
- ✅ Auto-renewal (never expires)

### Step 1: Sign Up for Cloudflare

1. Go to https://cloudflare.com
2. Sign up (free account)
3. Click "Add a Site"
4. Enter your domain name
5. Choose Free plan

⏱️ **Time:** 3 minutes

---

### Step 2: Update Nameservers

**Cloudflare will show you 2 nameservers:**
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**At your domain registrar:**
1. Go to DNS/Nameserver settings
2. Replace existing nameservers with Cloudflare's
3. Save

**Wait 5-60 minutes for nameserver update**

⏱️ **Time:** 5 minutes + wait

---

### Step 3: Configure Cloudflare DNS

**In Cloudflare dashboard → DNS:**

**Add A Record:**
- Type: `A`
- Name: `@` (or `app` for subdomain)
- Content: Your server IP
- Proxy status: ✅ **Proxied** (orange cloud)
- TTL: Auto

**IMPORTANT: Make sure it's Proxied (orange cloud)!**

⏱️ **Time:** 2 minutes

---

### Step 4: Configure SSL/TLS

**In Cloudflare dashboard → SSL/TLS:**

**Overview:**
- Encryption mode: **Full**

**Edge Certificates:**
- ✅ Always Use HTTPS: **ON**
- ✅ Automatic HTTPS Rewrites: **ON**

⏱️ **Time:** 2 minutes

---

### Step 5: Update Google OAuth Console

Same as Let's Encrypt option (Step 4 above)

⏱️ **Time:** 5 minutes

---

### Step 6: Update .env and Restart

Same as Let's Encrypt option (Steps 5-7 above)

⏱️ **Time:** 10 minutes

---

## 📊 Comparison

| Feature | Let's Encrypt | Cloudflare |
|---------|---------------|------------|
| **Cost** | Free | Free |
| **Setup Time** | 30-45 min | 20-30 min |
| **Certificate Management** | Manual (auto-renew) | Automatic |
| **CDN** | No | Yes |
| **DDoS Protection** | No | Yes |
| **Analytics** | No | Yes |
| **Best For** | Self-hosted control | Easy setup + extras |

**My Recommendation:** **Cloudflare** (easier, more features, faster)

---

## 🎯 Success Checklist

**After setup, you should have:**

- [ ] Domain pointing to your server
- [ ] SSL certificate active (Let's Encrypt or Cloudflare)
- [ ] https://yourapp.com loads with green padlock
- [ ] No SSL warnings or errors
- [ ] .env updated with HTTPS URLs
- [ ] Google OAuth Console updated with HTTPS redirect URIs
- [ ] Docker services restarted
- [ ] Can navigate to Sender Identity page
- [ ] "Connect Gmail Account" button works
- [ ] Google login redirects correctly (HTTPS)
- [ ] Can complete OAuth flow
- [ ] Gmail account shows as "Connected"
- [ ] Can send test emails successfully
- [ ] No errors in logs

**All checked?** 🎉 **You're done!**

---

## 🐛 Common Issues

### "redirect_uri_mismatch" Error

**Fix:**
1. Copy EXACT URL from error message
2. Add to Google Console Authorized redirect URIs
3. Make sure no trailing slash
4. Wait 5 minutes
5. Clear browser cache
6. Try again

### SSL Certificate Error in Browser

**Fix:**
```bash
# Renew certificate
sudo certbot renew
docker-compose restart nginx
```

### Can't Connect to Server

**Fix:**
1. Check DNS: `ping yourapp.com`
2. Check firewall: Allow ports 80, 443
3. Check Docker: `docker-compose ps`

---

## 📞 Get Help

**If stuck:**

1. **Check logs:**
   ```bash
   docker-compose logs backend | grep oauth
   docker-compose logs nginx
   ```

2. **Test SSL:**
   ```bash
   curl -I https://yourapp.com
   openssl s_client -connect yourapp.com:443
   ```

3. **Read detailed guides:**
   - `SSL_SETUP_GUIDE.md` - Complete SSL guide
   - `GOOGLE_OAUTH_HTTPS_SETUP.md` - OAuth troubleshooting

---

## 📁 Files Created for You

**SSL Configuration Files:**
- ✅ `nginx-ssl.conf` - Nginx with HTTPS enabled
- ✅ `setup-ssl.sh` - Automated SSL setup script
- ✅ `SSL_SETUP_GUIDE.md` - Complete SSL documentation
- ✅ `GOOGLE_OAUTH_HTTPS_SETUP.md` - OAuth HTTPS guide
- ✅ `SSL_ACTION_PLAN.md` - This file

**All files are ready to use!**

---

## 🚀 Quick Start Commands

**Let's Encrypt:**
```bash
sudo bash setup-ssl.sh
# Follow prompts, then:
nano .env  # Update URLs
docker-compose --profile production up -d --build
```

**Test:**
```bash
# Should show green padlock
xdg-open https://yourapp.com  # Linux
open https://yourapp.com      # Mac
start https://yourapp.com     # Windows
```

---

## ⏱️ Total Time Estimate

**Let's Encrypt:** 30-45 minutes
- Domain setup: 10-15 min
- DNS propagation: 5-60 min
- SSL setup: 5-10 min
- Google OAuth update: 5 min
- Docker restart: 5 min
- Testing: 5-10 min

**Cloudflare:** 20-30 minutes
- Cloudflare signup: 5 min
- Nameserver update: 5-60 min
- Cloudflare config: 5 min
- Google OAuth update: 5 min
- Docker restart: 5 min
- Testing: 5-10 min

**Most time is waiting for DNS propagation (5-60 min)**

---

## 🎉 You're Ready!

**Everything you need is prepared:**

✅ SSL setup script created
✅ Nginx SSL configuration ready
✅ Complete documentation written
✅ Step-by-step guides provided
✅ Troubleshooting guides included

**Your next action:**

1. **Choose:** Let's Encrypt or Cloudflare
2. **Follow:** Steps above
3. **Test:** Google OAuth with HTTPS
4. **Done:** ✅ Production ready!

**Good luck! 🚀**
