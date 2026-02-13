# 🔐 Google OAuth HTTPS Setup Checklist

## Why This is Critical

**Google OAuth Requirements:**
- ✅ **HTTPS is REQUIRED** for production redirect URIs
- ❌ **HTTP will NOT work** for OAuth in production
- ✅ `localhost` is the only exception (for development)

**Without HTTPS:**
- Google will show: `Error: redirect_uri_mismatch`
- Users cannot connect Gmail accounts
- Sender Profile feature will not work
- Email sending will fail

---

## 📋 Complete Setup Checklist

### Part 1: Get a Domain (If you don't have one)

**Option 1: Buy a domain ($10-15/year)**
- Namecheap: https://www.namecheap.com
- Google Domains: https://domains.google.com
- GoDaddy: https://www.godaddy.com
- Cloudflare: https://www.cloudflare.com/products/registrar/

**Option 2: Use a subdomain (if you have a domain)**
- Example: `app.mycompany.com` or `clientdiscovery.mycompany.com`

**Recommended domain:**
```
app.yourcompany.com
```
or
```
yourcompanyname.com
```

---

### Part 2: SSL Certificate Setup

**Choose ONE option:**

#### ✅ Option A: Let's Encrypt (Recommended)

**Quick setup:**
```bash
# 1. Point your domain DNS to your server IP
#    (Wait 5-60 minutes for propagation)

# 2. Run automated SSL setup script
sudo bash setup-ssl.sh

# Follow prompts:
# - Enter domain: yourapp.com
# - Enter email: your@email.com
# Done!
```

**Manual setup (if script fails):**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot -y

# Stop Nginx temporarily
docker-compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourapp.com

# Start services
docker-compose --profile production up -d
```

#### ✅ Option B: Cloudflare (Easiest)

1. Sign up at https://cloudflare.com (free account)
2. Add your domain
3. Update nameservers at your domain registrar
4. In Cloudflare DNS: Add A record pointing to server IP
5. In Cloudflare SSL/TLS: Set to "Full" mode
6. Wait 5 minutes - **HTTPS works automatically!**

**No server configuration needed with Cloudflare!**

---

### Part 3: Update Google OAuth Console

**🔴 THIS IS CRITICAL - OAuth won't work without this!**

#### Step 1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Select your project (or create one if new)
3. Navigate to: **APIs & Services** → **Credentials**

#### Step 2: Find Your OAuth Client

Look for:
- **OAuth 2.0 Client IDs**
- Find the one you're using (should have the Client ID from your .env)
- Click the pencil icon (Edit) or click the name

#### Step 3: Update Authorized JavaScript Origins

**Add these (keep localhost for development):**

```
https://yourapp.com
http://localhost:3000
```

**Remove any old HTTP production URLs:**
```
❌ http://yourapp.com (remove this)
```

#### Step 4: Update Authorized Redirect URIs

**Add these (keep localhost for development):**

```
https://yourapp.com/api/auth/gmail/callback
https://yourapp.com/auth/callback
http://localhost:5000/api/auth/gmail/callback
http://localhost:3000/auth/callback
```

**Remove any old HTTP production URLs:**
```
❌ http://yourapp.com/api/auth/gmail/callback (remove this)
```

**CRITICAL: Match EXACTLY!**
- ✅ `https://yourapp.com/api/auth/gmail/callback` (correct)
- ❌ `https://yourapp.com/api/auth/gmail/callback/` (wrong - extra slash)
- ❌ `https://www.yourapp.com/api/auth/gmail/callback` (wrong - extra www)
- ❌ `http://yourapp.com/api/auth/gmail/callback` (wrong - not HTTPS)

#### Step 5: Save Changes

1. Click **"Save"** at the bottom
2. Wait **5 minutes** for Google to propagate changes
3. You may need to clear browser cookies/cache

---

### Part 4: Update Your Application

#### Update .env File

**Open `.env` and update these:**

```bash
# Old (development)
REDIRECT_URI=http://localhost:5000/auth/callback
NEXT_PUBLIC_API_URL=http://localhost:5000

# New (production)
REDIRECT_URI=https://yourapp.com/api/auth/gmail/callback
NEXT_PUBLIC_API_URL=https://yourapp.com
```

**Keep your existing values for:**
```bash
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
```

#### Update docker-compose.yml (if needed)

**In the backend service:**
```yaml
environment:
  REDIRECT_URI: https://yourapp.com/api/auth/gmail/callback
```

**In the frontend service:**
```yaml
environment:
  NEXT_PUBLIC_API_URL: https://yourapp.com
```

Or set via .env file (recommended).

---

### Part 5: Restart and Test

#### Restart Services

```bash
# Rebuild with new configuration
docker-compose --profile production down
docker-compose --profile production up -d --build

# View logs
docker-compose logs -f
```

#### Test HTTPS

**1. Test website loads:**
```
https://yourapp.com
```

**Should see:**
- ✅ Green padlock in browser
- ✅ "Connection is secure"
- ✅ Frontend loads

**2. Test API:**
```bash
curl -I https://yourapp.com/api/health
# Should return: HTTP/2 200
```

#### Test Google OAuth

**IMPORTANT: Complete step-by-step test:**

1. **Visit your app:**
   ```
   https://yourapp.com
   ```

2. **Navigate to Sender Profile:**
   - Click "Campaign Manager" in sidebar
   - Click "Sender Identity"
   - You should see the sender profile page

3. **Click "Connect Gmail Account":**
   - Button should be visible at top
   - Click it

4. **Check redirect URL:**
   - You should be redirected to Google login
   - **Check the URL - should be HTTPS!**
   - Example: `https://accounts.google.com/o/oauth2/v2/auth?...`

5. **Login with Google:**
   - Enter your Google email and password
   - Accept permissions (if prompted)

6. **Check callback:**
   - After login, you should be redirected back to your app
   - URL should be: `https://yourapp.com/api/auth/gmail/callback?code=...`
   - Then redirected to: `https://yourapp.com/campaign-manager/sender-profile`

7. **Verify account connected:**
   - You should see your Gmail account in the sender list
   - Shows email address, status "Connected", and provider "Gmail"

8. **Test email sending:**
   - Go to Campaign Manager → Create Campaign
   - Go through steps to create test campaign
   - Send test email
   - Email should send successfully!

---

## 🐛 Troubleshooting

### Error: redirect_uri_mismatch

**Error message:**
```
Error 400: redirect_uri_mismatch

The redirect URI in the request, https://yourapp.com/api/auth/gmail/callback,
does not match the ones authorized for the OAuth client.
```

**Fix:**
1. Copy the EXACT URL from the error message
2. Go to Google Cloud Console → Credentials
3. Add that EXACT URL to Authorized redirect URIs
4. **Make sure there's no trailing slash or extra characters**
5. Save and wait 5 minutes
6. Clear browser cache
7. Try again

### Error: invalid_client

**Error message:**
```
Error 401: invalid_client
```

**Fix:**
1. Check `GOOGLE_OAUTH_CLIENT_ID` in .env matches Google Console
2. Check `GOOGLE_OAUTH_CLIENT_SECRET` in .env matches Google Console
3. Restart backend: `docker-compose restart backend`

### Error: access_denied

**Error message:**
```
Error: access_denied
```

**Fix:**
- This means you clicked "Cancel" on Google login
- Try again and click "Allow"

### Redirect loop

**Keeps redirecting to Google login:**

**Fix:**
1. Clear browser cookies for your domain
2. Check backend logs: `docker-compose logs backend | grep oauth`
3. Verify `REDIRECT_URI` in .env is correct
4. Restart backend: `docker-compose restart backend`

### SSL certificate errors

**Browser shows "Not Secure" or certificate error:**

**Fix:**
1. Check certificate is valid:
   ```bash
   sudo certbot certificates
   ```

2. Renew if expired:
   ```bash
   sudo certbot renew
   docker-compose restart nginx
   ```

3. Check Nginx logs:
   ```bash
   docker-compose logs nginx
   ```

4. Test certificate:
   ```bash
   openssl s_client -connect yourapp.com:443
   ```

---

## ✅ Final Verification Checklist

**Before you consider it "done":**

- [ ] Domain DNS points to your server
- [ ] SSL certificate obtained and valid
- [ ] HTTPS loads in browser (green padlock)
- [ ] No SSL errors or warnings
- [ ] .env updated with HTTPS URLs
- [ ] Google OAuth Console updated with HTTPS redirect URIs
- [ ] docker-compose restarted with new config
- [ ] Can visit https://yourapp.com successfully
- [ ] Can navigate to Sender Identity page
- [ ] "Connect Gmail Account" button visible
- [ ] Clicking button redirects to Google (HTTPS URL)
- [ ] Can login with Google successfully
- [ ] Redirects back to app after login
- [ ] Gmail account appears in sender list with "Connected" status
- [ ] Can send test email successfully
- [ ] No errors in browser console
- [ ] No errors in backend logs

**If ALL checked:** 🎉 **Google OAuth with HTTPS is working!**

---

## 📸 Screenshots of Expected Behavior

### 1. Sender Identity Page
```
Campaign Manager > Sender Identity

+----------------------------------+
|  [+ Connect Gmail Account]       |
|  [ ] Connect Outlook Account     |
+----------------------------------+

Connected Accounts:
+----------------------------------+
| 📧 yourname@gmail.com           |
| Provider: Gmail                  |
| Status: ✓ Connected              |
| [Set as Default] [Disconnect]    |
+----------------------------------+
```

### 2. Google OAuth Consent Screen
```
Google Sign-In

Choose an account to continue to AI Client Discovery

📧 yourname@gmail.com
   yourname@gmail.com

[Use another account]

By continuing, Google will share your name, email address,
and profile picture with AI Client Discovery.

[Cancel]  [Continue]
```

### 3. After Successful Login
```
Sender Identity

✓ Successfully connected Gmail account!

Connected Accounts:
- yourname@gmail.com (Gmail) ✓ Connected
```

---

## 🔗 Important URLs

**Google Cloud Console:**
- Main Console: https://console.cloud.google.com
- Credentials: https://console.cloud.google.com/apis/credentials
- OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent

**SSL Testing:**
- SSL Labs: https://www.ssllabs.com/ssltest/
- Why No Padlock: https://www.whynopadlock.com/

**Documentation:**
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Let's Encrypt: https://letsencrypt.org/docs/
- Certbot: https://certbot.eff.org/

---

## 💡 Quick Reference

**Your settings should look like this:**

**Google Cloud Console:**
```
Authorized JavaScript origins:
  https://yourapp.com
  http://localhost:3000

Authorized redirect URIs:
  https://yourapp.com/api/auth/gmail/callback
  https://yourapp.com/auth/callback
  http://localhost:5000/api/auth/gmail/callback
  http://localhost:3000/auth/callback
```

**.env file:**
```
REDIRECT_URI=https://yourapp.com/api/auth/gmail/callback
NEXT_PUBLIC_API_URL=https://yourapp.com
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
```

**Test URL:**
```
https://yourapp.com/campaign-manager/sender-profile
```

---

## 🎯 Success Criteria

**You know it's working when:**

1. ✅ Browser shows green padlock on https://yourapp.com
2. ✅ No SSL warnings or errors
3. ✅ Can navigate to Sender Identity page
4. ✅ "Connect Gmail Account" button works
5. ✅ Redirects to Google login (HTTPS)
6. ✅ Can complete Google login
7. ✅ Redirects back to your app
8. ✅ Gmail account shows as "Connected"
9. ✅ Can send test emails
10. ✅ No errors in browser console or backend logs

**All 10 criteria met?** 🎉 **You're done!**

---

## 📞 Still Need Help?

**Check these first:**
1. Browser console (F12) for errors
2. Backend logs: `docker-compose logs backend | grep oauth`
3. Nginx logs: `docker-compose logs nginx`
4. Verify redirect URI matches EXACTLY in Google Console

**Common mistakes:**
- ❌ Using HTTP instead of HTTPS
- ❌ Extra trailing slash in redirect URI
- ❌ Wrong subdomain (www vs no-www)
- ❌ Typo in domain name
- ❌ Forgot to wait 5 minutes after changing Google Console
- ❌ Forgot to restart Docker services after changing .env

**Test command:**
```bash
# This should return 200 OK
curl -I https://yourapp.com/api/health
```

---

**Your Google OAuth with HTTPS setup is now complete!** 🚀
