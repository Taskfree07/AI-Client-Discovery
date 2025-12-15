# AI Client Discovery Platform - User Guide

## Quick Overview

This platform automatically finds potential clients (leads) by searching for job postings, identifying companies, finding decision-makers, and generating personalized outreach emails.

---

## How It Works (Simple 4-Step Process)

```
1. SEARCH → 2. ENRICH → 3. CONTACT → 4. EMAIL
```

### Step 1: Search for Job Postings
- System searches LinkedIn for jobs matching your keywords
- Example: "Software Engineer" finds companies hiring engineers

### Step 2: Get Company Details
- Pulls company info from Apollo API (size, industry, revenue, etc.)
- Filters companies by your criteria (200-10,000 employees)

### Step 3: Find Decision Makers
- Identifies C-level executives (CEO, VP, HR Head, etc.)
- Reveals their email addresses using Apollo

### Step 4: Generate & Send Email
- AI writes personalized cold emails
- Sends via Microsoft Outlook integration
- Logs everything to Google Sheets

---

## Using the Platform

### Dashboard
**What you see:**
- Total campaigns running
- Number of leads found
- Emails sent
- Recent activity

### Pipeline (Main Workflow)

#### **Search Tab**
```
1. Enter keywords: "Manufacturing Manager" or "Production Engineer"
2. Set number of results: 10-50 leads
3. Click "Search Jobs"
```

**What happens:**
- Finds LinkedIn job postings
- Extracts company names and domains
- Shows list of companies with job openings

#### **Company Tab**
```
1. Click on a company from search results
2. System pulls detailed info:
   - Employee count
   - Revenue & funding
   - Tech stack
   - Location & industry
```

**Filters:**
- Minimum employees: 200
- Maximum employees: 10,000
- Geography: USA, India (configurable)

#### **Contact Tab**
```
1. Select role type:
   - Executive (CEO, COO, VP)
   - HR/Talent (HR Head, TA Manager)
   - Tech (CTO, Engineering Director)
   - Sales/Marketing
2. Click "Find Contacts"
```

**What you get:**
- List of decision-makers with:
  - Name & job title
  - Email address (verified)
  - LinkedIn profile
  - Phone numbers

#### **Email Tab**
```
1. Review auto-generated email
2. Edit if needed
3. Click "Send Email"
```

**Result:**
- Email sent via your Outlook account
- Lead marked as "Contacted"
- Logged to Google Sheets for tracking

---

## Settings Configuration

### Required API Keys

| Service | Purpose | Where to Get |
|---------|---------|--------------|
| **Google Custom Search** | Find job postings | [Google Cloud Console](https://console.cloud.google.com) |
| **Apollo.io API** | Company data & contact emails | [Apollo.io Settings](https://app.apollo.io/settings/integrations) |
| **Azure AD (Microsoft)** | Send emails via Outlook | [Azure Portal](https://portal.azure.com) |
| **Google Sheets** (optional) | Log leads | [Google Cloud Console](https://console.cloud.google.com) |

### How to Configure

1. Go to **Settings** page
2. Fill in API credentials:
   - Google API Key
   - Google CX Code
   - Apollo API Key
   - Azure Client ID, Secret, Tenant ID
3. Click **Save Settings**
4. Click **Test Email** to verify Outlook connection

---

## Current Limitations

### What the App Does Well
- ✅ Finds companies hiring in specific roles
- ✅ Gets detailed company information
- ✅ Finds decision-maker contacts with emails
- ✅ Generates personalized cold emails
- ✅ Sends emails automatically

### What the App Currently Doesn't Do
- ❌ **Manufacturing-specific filtering** (only searches job postings)
- ❌ **Bulk generation** (processes one lead at a time)
- ❌ **Tier-based targeting** (T1/T2/T3 personas)
- ❌ **Excel export** (stores in database only)
- ❌ **Advanced validation** (basic quality checks only)
- ❌ **Industry filtering** (beyond job-based search)

---

## Typical Use Case (Current App)

**Scenario:** You're a staffing agency looking for companies hiring Software Engineers

### Workflow:
1. **Go to Pipeline** → Search Tab
2. **Enter:** "Software Engineer remote"
3. **Click Search** → Get 20 companies with open positions
4. **Click on Company** → See details (size, revenue, location)
5. **Find Contact** → Get HR Head or VP Engineering email
6. **Generate Email** → AI writes personalized pitch
7. **Send Email** → Delivered via your Outlook
8. **Lead Saved** → Stored in database & Google Sheets

**Time:** ~5 minutes for 10 leads

---

## What You Can Do Today

### Quick Campaign Setup
1. Create a campaign with keywords
2. Set company size filters (50-500 employees)
3. Choose contact role (Executive, HR, Tech)
4. Run campaign → Get 10-50 leads
5. Review and send emails manually or auto-send

### Data You Get Per Lead
- Company name & website
- Company size, industry, revenue
- Job posting URL
- Contact name, title, email
- Generated email subject & body
- Email sent status & timestamp

---

## API Credit Usage

### Per Lead Cost (Apollo):
- Search company: **1 credit**
- Enrich company data: **1 credit**
- Find contacts: **1 credit per search**
- Reveal email: **1 credit per contact**

**Total: ~3-4 credits per lead**

**For 500 leads = ~2,000 Apollo credits needed**

---

## Next Steps for Manufacturing ICP Requirements

To meet the new requirements (500 Manufacturing leads with T1/T2/T3 tiers), we need to build:

1. **Manufacturing industry filters**
2. **Tier-based persona targeting (T1: COO, T2: HR, T3: Recruiter)**
3. **Bulk lead generation (500 at once)**
4. **6-point validation checklist**
5. **Excel export functionality**
6. **Tier distribution (40% T1, 40% T2, 20% T3)**

**Estimated Development Time:** 1-2 weeks

---

## Support & Troubleshooting

### Common Issues

**Problem:** "No jobs found"
- **Solution:** Check Google API quota, try different keywords

**Problem:** "Company not found in Apollo"
- **Solution:** Domain may be incorrect or company too small

**Problem:** "No email revealed"
- **Solution:** Apollo may not have email, try other contacts

**Problem:** "Email send failed"
- **Solution:** Check Azure AD credentials, verify Outlook permissions

### Need Help?
- Check Settings page for API configuration
- Review Activity Logs for error messages
- Verify API credits in Apollo dashboard

---

## Summary

### What This App Does
**Automates lead generation** by finding companies with job openings, enriching company data, finding decision-makers, and generating personalized outreach emails.

### Best For
- Staffing agencies
- Recruitment firms
- B2B sales teams
- Lead generation specialists

### Current Capacity
- **10-50 leads per search** (manual process)
- **Job posting-based** targeting
- **Basic filtering** by company size

### To Scale to 500 Leads
Need to add: Industry filtering, tier-based personas, bulk processing, validation engine, and Excel export.

---

*Last Updated: December 2025*
