# Apollo API Usage Report - February 11, 2026

**Report Generated:** February 11, 2026
**API Key:** PJsnRknvyw8xFCkmOuwgjQ (Master Key)
**Account Email:** info@vensiti.com

---

## Executive Summary

**Total API Calls Today: 7,500**

The majority of API calls today were made to the **mixed_people search endpoints**, which are used for lead generation and enrichment. No credit-consuming enrichment calls (like email reveal) were made.

---

## Detailed Usage by Endpoint

### 1. Mixed People Search (Bulk Lead Discovery)
- **`/api/v1/mixed_people/search`**
  - **Calls Today:** 6,641
  - **Daily Limit:** 50,000
  - **Remaining:** 43,359 (87% available)
  - **Purpose:** Primary lead search and discovery across companies

- **`/api/v1/mixed_people/api_search`**
  - **Calls Today:** 847
  - **Daily Limit:** 50,000
  - **Remaining:** 49,153 (98% available)
  - **Purpose:** Advanced API-based people search

**Subtotal: 7,488 calls (99.8% of today's usage)**

### 2. Organization/Company Search
- **`/api/v1/organizations/search`**
  - **Calls Today:** 4
  - **Daily Limit:** 50,000
  - **Remaining:** 49,996
  - **Purpose:** Company information and enrichment

### 3. Contacts Search
- **`/api/v1/contacts/search`**
  - **Calls Today:** 4
  - **Daily Limit:** 2,000
  - **Remaining:** 1,996
  - **Purpose:** Contact management and search

### 4. People Search
- **`/api/v1/people/search`**
  - **Calls Today:** 1
  - **Daily Limit:** 50,000
  - **Remaining:** 49,999
  - **Purpose:** Individual person lookups

### 5. Other Endpoints
- **`/api/v1/users/search`**: 1 call
- **`/api/v1/email_accounts/index`**: 2 calls

---

## Credit-Consuming Enrichment Calls

**Email Reveal (People Match):** 0 calls
**Bulk Email Reveal (Bulk Match):** 0 calls
**Contact Match:** 0 calls
**Organization Enrich:** 0 calls

✅ **No Apollo credits were consumed today.**

The API calls made were for searching and discovery only, which do not consume credits. Email reveals and enrichment operations (which cost credits) were not used.

---

## Rate Limits & Account Capacity

### Current Rate Limits (Based on Your Plan)

| Endpoint | Per Minute | Per Hour | Per Day |
|----------|------------|----------|---------|
| People Search | 200 | 6,000 | 50,000 |
| Organizations Search | 200 | 6,000 | 50,000 |
| Mixed People Search | 200 | 6,000 | 50,000 |
| Contacts Search | 200 | 400 | 2,000 |
| People Match (Enrichment) | 1,000 | N/A | N/A |
| Bulk Match (Enrichment) | 1,000 | N/A | N/A |

### Usage vs. Capacity

- **People Search:** 1 / 50,000 (0.002% used)
- **Organization Search:** 4 / 50,000 (0.008% used)
- **Mixed People Search:** 7,488 / 50,000 (15% used) ⚠️
- **Contacts Search:** 4 / 2,000 (0.2% used)

**Status:** Well within limits. The 7,488 mixed_people search calls represent only 15% of your daily quota.

---

## Source Analysis

### Where Did These 7,500 Calls Come From?

Based on the local database check:

**Local Database Activity (Today):**
- ✅ **0 sessions created today**
- ✅ **0 leads generated today**
- ✅ **0 activity log entries today**

**Recent Activity (Last 7 Days):**
- February 6, 2026: 10 leads created
- February 5, 2026: 95 leads created

### ⚠️ Important Finding

**The 7,500 API calls did NOT come from your local development environment.**

Possible sources:
1. **Deployed Application** - If you have a live/production deployment (Azure, AWS, etc.)
2. **Team Members** - Other developers using the same API key
3. **Scheduled Jobs/Cron Tasks** - Background workers running on a server
4. **CI/CD Pipeline** - Automated testing or deployment processes
5. **Direct API Usage** - Scripts or integrations using the API key directly

### Recommended Actions

1. **Check Deployed Environments:**
   - Azure App Service logs
   - Any cloud deployments using this API key
   - Check `logs/` directories for deployment logs

2. **Review API Key Usage:**
   - This is a **Master API Key** with full access
   - Consider using non-master keys for specific services
   - Rotate keys if unauthorized access is suspected

3. **Check Teammate Activity:**
   - Confirm if any team members ran lead generation today
   - Review shared development/staging environments

---

## Apollo Account Information

**Email Account Synced:** info@vensiti.com
**Account Type:** Microsoft Exchange
**Last Synced:** February 10, 2026 at 11:38 AM
**Status:** Account revoked (requires re-authentication)

⚠️ **Note:** The connected email account shows as revoked. You may need to re-authenticate the Microsoft Exchange connection.

---

## API Keys in Use

### Key 1: PJsnRknvyw8xFCkmOuwgjQ
- **Type:** Master Key ✅
- **Status:** Active
- **Permissions:** Full access (can view usage stats)
- **Location:** `.env` file (APOLLO_API_KEY)

### Key 2: tY-idLVz3uh3XxYm5eir5w
- **Type:** Standard Key
- **Status:** Active
- **Permissions:** Limited (cannot view usage stats)
- **Location:** `services/api_keys.py` (APOLLO_KEYS list)

---

## Recommendations

### Immediate Actions

1. **Identify the Source:**
   - Check all deployed environments for running applications
   - Review server logs to identify what triggered 7,500 API calls
   - Confirm if this was expected batch processing

2. **Monitor Usage:**
   - The current 15% usage is sustainable
   - However, if this pattern continues daily, you'll hit limits
   - 7,500 calls/day × 30 days = 225,000 calls/month (exceeds your 50k daily limit if sustained)

3. **Optimize if Needed:**
   - Consider caching results to reduce API calls
   - Implement request batching where possible
   - Add rate limiting to your application

### Long-Term Actions

1. **Set Up Monitoring:**
   - Create a daily usage check script
   - Alert when usage exceeds thresholds (e.g., 50% of daily limit)

2. **Credit Management:**
   - No credits were used today ✅
   - Email reveals cost credits - use sparingly
   - Consider using bulk_match for better credit efficiency

3. **Security:**
   - Rotate the master API key if source is unknown
   - Use environment-specific keys (dev vs. prod)
   - Never commit API keys to version control

---

## Technical Details

**API Endpoint for Usage Stats:**
`POST https://api.apollo.io/api/v1/usage_stats/api_usage_stats`

**Authentication Required:** Master API Key only
**Response Format:** JSON with per-endpoint breakdown (minute/hour/day limits)

**Documentation:**
- [Apollo API Usage Stats](https://docs.apollo.io/reference/view-api-usage-stats)
- [Apollo Rate Limits](https://docs.apollo.io/reference/rate-limits)
- [Apollo API Pricing](https://docs.apollo.io/docs/api-pricing)

---

## Questions to Investigate

1. **Where is the deployed version of this application?**
   - Check Azure Portal, AWS Console, or other cloud platforms
   - Look for App Services, EC2 instances, or container deployments

2. **Are there any scheduled tasks running?**
   - Cron jobs on servers
   - Azure Functions/AWS Lambda scheduled triggers
   - Background workers (Celery, etc.)

3. **Who else has access to this API key?**
   - Team members
   - CI/CD pipelines
   - Third-party integrations

---

**Report End**
