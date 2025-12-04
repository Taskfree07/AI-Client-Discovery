# 🚀 Quick Setup Guide

This guide will help you set up the AI Recruiter application step by step.

## 📋 Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Python 3.8+ installed
- [ ] Google Custom Search API Key
- [ ] Google Custom Search Engine ID (CX)
- [ ] Apollo API Key
- [ ] Microsoft Entra ID App Registration (Client ID, Secret, Tenant ID)
- [ ] Google Cloud credentials for Sheets API

## 🎯 Step-by-Step Setup

### Step 1: Install Python Dependencies

1. Double-click `run.bat` (Windows) or run:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

### Step 2: First Time Setup

1. Run the application:
   ```bash
   python app.py
   ```

2. You should see:
   ```
   Loading AI model...
   Model loaded on cpu
   Database initialized successfully!
   * Running on http://0.0.0.0:5000
   ```

3. Open your browser and go to: `http://localhost:5000`

### Step 3: Configure Settings

1. Click **"Settings"** in the sidebar

2. **Google Custom Search API:**
   - Paste your API Key
   - Paste your CX Code

3. **Apollo API:**
   - Paste your Apollo API Key

4. **Microsoft Email (Entra ID):**
   - Paste your Client ID
   - Paste your Client Secret
   - Paste your Tenant ID
   - Enter your sender email address
   - Click **"Test Email Configuration"** to verify

5. **Google Sheets:**
   - Create a new Google Sheet
   - Copy the Spreadsheet ID from the URL
   - Paste it in the settings

6. Click **"Save Settings"**

### Step 4: Google Sheets Authentication

1. Download OAuth credentials from Google Cloud Console:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Desktop app)
   - Download JSON file
   - Save as `credentials.json` in the project folder

2. On first campaign run, a browser window will open
3. Sign in with your Google account
4. Grant permissions to the app
5. The token will be saved automatically

### Step 5: Create Your First Campaign

1. Go to the Dashboard
2. Click **"+ New Campaign"**
3. Fill in:
   - Campaign Name: "Test Campaign"
   - Search Keywords: "software developer jobs"
   - Jobs Per Run: 5 (start small for testing)
   - Company Size: 50-200
4. Click **"Create Campaign"**

### Step 6: Run Your First Campaign

1. Find your campaign in the table
2. Click **"▶ Run"**
3. Watch the activity log for progress
4. Check your Google Sheet for results

## ⚠️ Common Issues

### Issue: "Module not found" error
**Solution:** Make sure you activated the virtual environment:
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

### Issue: Email sending fails
**Solution:**
- Verify Microsoft Graph API permissions are granted
- Check that sender email exists in your Microsoft 365 tenant
- Ensure admin consent is granted in Azure AD

### Issue: Google Sheets authentication fails
**Solution:**
- Delete `token.pickle` file
- Make sure `credentials.json` is in the project root
- Re-run the campaign to trigger authentication

### Issue: Apollo API returns empty results
**Solution:**
- Check your API key is valid
- Verify you have credits available
- Try with a well-known company domain first

### Issue: AI model loading is slow
**Solution:**
- First time: Model downloads ~900MB (be patient)
- Subsequent runs: Model loads from cache (faster)
- Consider using GPU if available for faster generation

## 🎓 Best Practices

1. **Start Small**: Test with 5-10 jobs per run first
2. **Monitor Logs**: Check activity logs for errors
3. **Rate Limits**: Be aware of API quotas
4. **Email Timing**: Don't send too many emails at once
5. **Personalization**: Review generated emails before large campaigns

## 📊 Understanding the Workflow

```
1. Search Phase
   └─ Google Custom Search finds job postings

2. Enrichment Phase
   ├─ Apollo finds company information
   └─ Apollo finds CEO/Owner contacts

3. Generation Phase
   └─ AI generates personalized email

4. Sending Phase
   ├─ Email sent via Microsoft Graph
   └─ Results logged to Google Sheets

5. Tracking Phase
   └─ Monitor responses (manual for now)
```

## 🔐 Security Reminders

- **Never share** your `.env` file
- **Keep secure**: `credentials.json` and `token.pickle`
- **Rotate regularly**: API keys and secrets
- **Use strong**: Client secrets in Azure AD

## 📞 Need Help?

If you encounter issues:

1. Check the console output for error messages
2. Review the activity logs in the dashboard
3. Verify all API keys are correct in Settings
4. Check the troubleshooting section in README.md

## ✅ Verification Checklist

After setup, verify:

- [ ] Application loads at http://localhost:5000
- [ ] Settings page shows all configured API keys
- [ ] Email configuration test passes
- [ ] Can create a new campaign
- [ ] Campaign runs without errors
- [ ] Results appear in Google Sheets
- [ ] Activity logs show successful operations

---

**Congratulations! Your AI Recruiter is ready to use! 🎉**

For advanced features and production deployment, see `README.md`
