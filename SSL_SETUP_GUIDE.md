# 🔒 SSL/HTTPS Setup Guide - AI Client Discovery

## Why HTTPS is Required

**Critical for OAuth:**
- ✅ Google OAuth **requires** HTTPS for production
- ✅ Microsoft OAuth **requires** HTTPS for production
- ✅ Browsers block OAuth on HTTP (insecure content policy)
- ✅ Protects user credentials and tokens
- ✅ Required for production deployment

**Without HTTPS:**
- ❌ Google login will fail with `redirect_uri_mismatch` error
- ❌ Outlook login will fail
- ❌ Browsers show "Not Secure" warning
- ❌ Cannot use production OAuth credentials

---

## 📋 Prerequisites

**You need:**
1. ✅ A domain name (e.g., `myapp.com` or `app.mycompany.com`)
2. ✅ Domain DNS pointing to your server IP
3. ✅ Server with open ports 80 and 443
4. ✅ Docker deployment running

**Recommended Domain Registrars:**
- Namecheap (cheap domains)
- Google Domains
- GoDaddy
- Cloudflare (includes free SSL proxy)

---

## 🚀 Option 1: Let's Encrypt (Free SSL) - RECOMMENDED

**Best for:** Production deployments, real domains

### Step 1: Install Certbot

**On your server (Ubuntu/Debian):**
```bash
# Update packages
sudo apt-get update

# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Verify installation
certbot --version
```

**For other OS:**
- CentOS/RHEL: `sudo yum install certbot python3-certbot-nginx`
- Mac: `brew install certbot`

### Step 2: Verify DNS Setup

**Before requesting certificate, verify:**
```bash
# Check if domain points to your server
nslookup yourdomain.com

# Should return your server's IP address
ping yourdomain.com

# Test if server is reachable
curl http://yourdomain.com
```

**If not working:**
- Update DNS A record to point to server IP
- Wait 5-60 minutes for DNS propagation

### Step 3: Stop Nginx (Temporary)

```bash
# Stop Nginx to free port 80
docker-compose stop nginx

# Or if not using Docker Nginx yet:
docker-compose down
```

### Step 4: Get SSL Certificate

**Standalone mode (easiest):**
```bash
# Get certificate for your domain
sudo certbot certonly --standalone -d yourdomain.com

# For multiple domains/subdomains:
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address (for renewal notifications)
# - Agree to Terms of Service
# - Share email with EFF (optional)
```

**Success output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/yourdomain.com/privkey.pem
This certificate expires on 2024-05-15.
```

**Certificate locations:**
- Certificate: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/yourdomain.com/privkey.pem`
- Chain: `/etc/letsencrypt/live/yourdomain.com/chain.pem`

### Step 5: Update docker-compose.yml

**Add SSL volume mount:**
```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: ai-client-discovery-nginx
    restart: unless-stopped
    depends_on:
      - frontend
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro  # ← Add this line
    networks:
      - app-network
    profiles:
      - production
```

### Step 6: Create SSL-Enabled Nginx Config

I'll create this file for you in the next step.

### Step 7: Update Google OAuth Console

**Go to:** https://console.cloud.google.com/apis/credentials

**Find your OAuth 2.0 Client ID and update:**

**Authorized JavaScript origins:**
```
https://yourdomain.com
```

**Authorized redirect URIs:**
```
https://yourdomain.com/api/auth/gmail/callback
https://yourdomain.com/auth/callback
```

**Remove old HTTP URIs:**
- ❌ http://localhost:5000/api/auth/gmail/callback
- ❌ http://localhost:3000/auth/callback

**Keep for development:**
- ✅ http://localhost:5000/api/auth/gmail/callback (for local testing)
- ✅ http://localhost:3000/auth/callback (for local testing)

### Step 8: Update .env File

```bash
# Update backend .env
REDIRECT_URI=https://yourdomain.com/api/auth/gmail/callback

# Update frontend .env or docker-compose.yml
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### Step 9: Restart Services

```bash
# Rebuild with new configuration
docker-compose --profile production up -d --build

# Check logs
docker-compose logs -f nginx

# Should see: "nginx: configuration file /etc/nginx/nginx.conf test is successful"
```

### Step 10: Test HTTPS

**In browser:**
```
https://yourdomain.com
```

**Should see:**
- ✅ Green padlock icon
- ✅ "Connection is secure"
- ✅ Frontend loads properly

**Test API:**
```bash
curl -I https://yourdomain.com/api/health
# Should return: HTTP/2 200
```

**Test Google OAuth:**
1. Go to Sender Profile
2. Click "Connect Gmail Account"
3. Should redirect to Google login
4. After login, should redirect back successfully

### Step 11: Set Up Auto-Renewal

**Certbot auto-renewal (runs automatically):**
```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer (systemd)
sudo systemctl status certbot.timer

# Manual renewal (if needed)
sudo certbot renew

# After renewal, reload Nginx
docker-compose restart nginx
```

**Add cron job (backup method):**
```bash
# Edit crontab
sudo crontab -e

# Add this line (checks daily at 2:30 AM)
30 2 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/docker-compose.yml restart nginx"
```

---

## 🚀 Option 2: Cloudflare SSL (Free & Easy)

**Best for:** Quick setup, free SSL proxy, DDoS protection

### Step 1: Sign Up for Cloudflare

1. Go to https://cloudflare.com
2. Sign up for free account
3. Add your domain

### Step 2: Update Nameservers

**Cloudflare will provide 2 nameservers:**
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**Update at your domain registrar:**
- Go to your domain registrar (Namecheap, GoDaddy, etc.)
- Find DNS/Nameserver settings
- Replace existing nameservers with Cloudflare's
- Wait 5-60 minutes for propagation

### Step 3: Configure Cloudflare DNS

**In Cloudflare DNS settings:**

**Add A record:**
- Type: `A`
- Name: `@` (or subdomain like `app`)
- Content: Your server IP address
- Proxy status: ✅ Proxied (orange cloud)
- TTL: Auto

**Add CNAME for www (optional):**
- Type: `CNAME`
- Name: `www`
- Content: `yourdomain.com`
- Proxy status: ✅ Proxied
- TTL: Auto

### Step 4: Configure SSL/TLS

**In Cloudflare SSL/TLS settings:**

**Overview:**
- Encryption mode: **Full** (not "Full (strict)" for self-signed certs)
- Or: **Full (strict)** if you have Let's Encrypt on server

**Edge Certificates:**
- ✅ Always Use HTTPS: ON
- ✅ Automatic HTTPS Rewrites: ON
- ✅ Minimum TLS Version: TLS 1.2

### Step 5: Update docker-compose.yml

**You don't need Nginx with Cloudflare!**

```yaml
services:
  backend:
    ports:
      - "80:5000"  # Expose backend on port 80

  frontend:
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://yourdomain.com
```

**Or keep Nginx but use HTTP internally:**
- Cloudflare handles HTTPS (edge)
- Your server uses HTTP (origin)
- Cloudflare's "Full" mode encrypts between them

### Step 6: Update OAuth Redirects

Same as Option 1 - update to `https://yourdomain.com`

### Step 7: Test

```
https://yourdomain.com
```

**Should work immediately!**
- ✅ Cloudflare provides SSL automatically
- ✅ Certificate managed by Cloudflare
- ✅ Auto-renewal handled
- ✅ Free forever

---

## 🚀 Option 3: Self-Signed Certificate (Development Only)

**Best for:** Local testing, development

**⚠️ WARNING:**
- ❌ **NOT for production**
- ❌ Google OAuth will reject self-signed certs
- ❌ Browsers show security warnings
- ✅ Only for testing HTTPS locally

### Step 1: Generate Self-Signed Certificate

```bash
# Create SSL directory
mkdir -p ssl

# Generate certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Step 2: Update docker-compose.yml

```yaml
services:
  nginx:
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro  # Use local ssl/ directory
```

### Step 3: Access with HTTPS

```
https://localhost
```

**Browser will warn:** "Your connection is not private"
- Click "Advanced"
- Click "Proceed to localhost (unsafe)"

**Only for development testing!**

---

## 📝 Updated Nginx Configuration (SSL)

I'll create `nginx-ssl.conf` with HTTPS configuration in the next step.

---

## 🧪 Testing Checklist

### Test HTTP → HTTPS Redirect

```bash
curl -I http://yourdomain.com
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/
```

### Test HTTPS Response

```bash
curl -I https://yourdomain.com
# Should return: HTTP/2 200
```

### Test SSL Certificate

```bash
# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Look for:
# - Verify return code: 0 (ok)
# - Certificate chain
# - Expiry date
```

**Online tools:**
- https://www.ssllabs.com/ssltest/ (Grade A/A+ is good)
- https://www.whynopadlock.com/

### Test Google OAuth

1. ✅ Go to: https://yourdomain.com/campaign-manager/sender-profile
2. ✅ Click "Connect Gmail Account"
3. ✅ Should redirect to Google login (HTTPS URL)
4. ✅ After login, should redirect back successfully
5. ✅ Account should be connected and show in list

**If it fails:**
- Check redirect URI exactly matches in Google Console
- Check HTTPS (not HTTP) in all URLs
- Check certificate is valid (not expired, not self-signed)
- Check logs: `docker-compose logs backend | grep oauth`

---

## 🔧 Troubleshooting

### Certificate Not Found

**Error:** `nginx: [emerg] cannot load certificate`

**Fix:**
```bash
# Check certificate exists
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# Check permissions
sudo chmod -R 755 /etc/letsencrypt/live/
sudo chmod -R 755 /etc/letsencrypt/archive/

# Restart Nginx
docker-compose restart nginx
```

### Port 443 Already in Use

**Error:** `bind() to 0.0.0.0:443 failed: Address already in use`

**Fix:**
```bash
# Find what's using port 443
sudo lsof -i :443
sudo netstat -tulpn | grep :443

# Stop the service (e.g., Apache)
sudo systemctl stop apache2

# Or change Docker port
ports:
  - "8443:443"  # Use port 8443 externally
```

### Mixed Content Errors

**Error:** Browser console shows "Mixed Content" warnings

**Fix:**
```bash
# Ensure NEXT_PUBLIC_API_URL uses HTTPS
NEXT_PUBLIC_API_URL=https://yourdomain.com

# Rebuild frontend
docker-compose up -d --build frontend
```

### OAuth Redirect URI Mismatch

**Error:** `redirect_uri_mismatch` from Google

**Fix:**
1. Check exact URL in error message
2. Copy exact URL to Google Console Authorized redirect URIs
3. Ensure no trailing slashes (unless URL has one)
4. Wait 5 minutes for Google to update
5. Try again

**Common mistakes:**
- ❌ `https://yourdomain.com/api/auth/gmail/callback/` (extra slash)
- ❌ `http://yourdomain.com/api/auth/gmail/callback` (HTTP not HTTPS)
- ❌ `https://www.yourdomain.com/api/auth/gmail/callback` (wrong subdomain)
- ✅ `https://yourdomain.com/api/auth/gmail/callback` (correct)

### Certificate Expired

**Error:** `SSL certificate problem: certificate has expired`

**Fix:**
```bash
# Renew certificate
sudo certbot renew

# Force renewal even if not expired
sudo certbot renew --force-renewal

# Restart Nginx
docker-compose restart nginx
```

---

## 📊 Comparison: Let's Encrypt vs Cloudflare

| Feature | Let's Encrypt | Cloudflare |
|---------|--------------|------------|
| **Cost** | Free | Free |
| **Setup Time** | 15 minutes | 5 minutes |
| **Auto-Renewal** | Yes (90 days) | Yes (automatic) |
| **Certificate Type** | Domain Validation (DV) | Universal SSL |
| **DDoS Protection** | No | Yes |
| **CDN** | No | Yes (free) |
| **Analytics** | No | Yes |
| **Caching** | No | Yes |
| **DNS Management** | No | Yes |
| **Best For** | Self-hosted | Quick setup, extra features |

**Recommendation:**
- **Production:** Cloudflare (easier, more features)
- **Self-hosted:** Let's Encrypt (full control)
- **Development:** Self-signed (local testing only)

---

## ✅ Final Checklist

**Before going live:**

- [ ] Domain registered and DNS configured
- [ ] SSL certificate obtained (Let's Encrypt or Cloudflare)
- [ ] Nginx configured for HTTPS
- [ ] HTTP → HTTPS redirect working
- [ ] Certificate auto-renewal set up
- [ ] .env updated with HTTPS URLs
- [ ] Google OAuth redirect URIs updated to HTTPS
- [ ] Microsoft OAuth redirect URIs updated to HTTPS (if using)
- [ ] Docker services restarted with new config
- [ ] HTTPS working in browser (green padlock)
- [ ] Google OAuth login tested and working
- [ ] No mixed content warnings
- [ ] SSL Labs test shows A/A+ grade

**Test OAuth flow:**

1. [ ] Visit https://yourdomain.com
2. [ ] Go to Campaign Manager → Sender Identity
3. [ ] Click "Connect Gmail Account"
4. [ ] Google login page opens (check URL is HTTPS)
5. [ ] Login with Google account
6. [ ] Redirects back to your app
7. [ ] Account appears in sender list
8. [ ] Can send test email successfully

**If all checked:** 🎉 **You're ready for production!**

---

## 📞 Need Help?

**Common commands:**
```bash
# Check certificate expiry
sudo certbot certificates

# Test certificate renewal
sudo certbot renew --dry-run

# View Nginx logs
docker-compose logs nginx

# Test HTTPS
curl -I https://yourdomain.com

# Check SSL configuration
openssl s_client -connect yourdomain.com:443
```

**Resources:**
- Let's Encrypt Docs: https://letsencrypt.org/docs/
- Certbot Docs: https://certbot.eff.org/docs/
- Cloudflare Docs: https://developers.cloudflare.com/
- SSL Labs Test: https://www.ssllabs.com/ssltest/

---

## 🎯 Next Steps

1. **Choose your SSL option** (Let's Encrypt or Cloudflare recommended)
2. **Follow the step-by-step guide** above
3. **Create nginx-ssl.conf** (I'll create this next)
4. **Update Google OAuth Console** with HTTPS URLs
5. **Test everything** using the checklist
6. **Deploy to production** confidently!

**I'll now create the SSL-enabled Nginx configuration file for you.** ✅
