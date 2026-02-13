# Apollo API Security Implementation

## 🔐 **Security Overview**

**Apollo API Key:** `QDjWXMpt8peVt2w8mHRnFQ`

**Purpose:** Protect Apollo API credits from unauthorized usage and prevent API piracy.

---

## ✅ **Security Measures Implemented**

### **1. Environment Variable Security**
- ✅ API key stored in `.env` file (never in code)
- ✅ Not exposed to frontend
- ✅ Loaded only once during app initialization
- ✅ Saved to database for secure access

**File:** `.env`
```bash
APOLLO_API_KEY=QDjWXMpt8peVt2w8mHRnFQ
```

---

### **2. Backend-Only API Access**
- ✅ All Apollo API calls go through Flask backend
- ✅ Frontend NEVER has direct access to Apollo API
- ✅ API key never sent to frontend
- ✅ All requests validated before execution

---

### **3. Endpoint Whitelisting**

**Allowed Endpoints** (Session Manager ONLY):
```python
APOLLO_ALLOWED_ENDPOINTS = [
    '/api/apollo/enrich-company',      # Company enrichment
    '/api/apollo/find-contacts',       # Find decision makers
    '/api/apollo/reveal-email',        # Reveal email (credits)
    '/api/apollo/search-companies',    # Search companies
    '/api/apollo/search-employees'     # Search employees
]
```

**Blocked Endpoints:**
- ❌ `/api/pipeline/contact` - DISABLED
- ❌ `/api/pipeline/reveal-email` - DISABLED
- ❌ Campaign execution - DISABLED
- ❌ All other endpoints - BLOCKED

---

### **4. Request Validation**

**Function:** `validate_apollo_request()`
- ✅ Checks if request path is in allowed list
- ✅ Logs all attempts (authorized and unauthorized)
- ✅ Returns `False` for unauthorized requests
- ✅ Blocks execution before API call

**Security Logs:** `logs/apollo_api_calls.log`

---

### **5. Secure API Key Retrieval**

**Function:** `get_apollo_api_key_secure()`
- ✅ Validates request endpoint first
- ✅ Retrieves key from database (not env)
- ✅ Returns `None` if validation fails
- ✅ Logs all key retrievals

**Usage:**
```python
# OLD (Insecure):
apollo_api_key = get_setting('apollo_api_key')

# NEW (Secure):
apollo_api_key = get_apollo_api_key_secure()
```

---

### **6. API Initialization**

**Function:** `init_apollo_api_key()`
- ✅ Called once during app startup
- ✅ Loads API key from .env to database
- ✅ Updates if key changes in .env
- ✅ Prints confirmation message

**Called in:** `if __name__ == '__main__'` section

---

### **7. Rate Limiting**

**Already Implemented:**
- ✅ 200 calls/minute safeguard
- ✅ Decorator: `@apollo_rate_limit`
- ✅ Tracks timestamps
- ✅ Rejects excess requests

---

### **8. Usage Logging**

**All Apollo API calls are logged with:**
- Timestamp
- Endpoint
- Parameters (first 100 chars)
- IP address
- Status (authorized/blocked)

**Log File:** `logs/apollo_api_calls.log`

---

## 🚫 **What's DISABLED for Security**

### **1. Campaign Execution**
**Function:** `execute_campaign()`
- ❌ Apollo API completely disabled
- ❌ Returns error message
- ✅ Users must use Session Manager instead

**Message:**
```
Apollo API disabled for campaign execution.
Please use Session Manager to import leads.
```

---

### **2. Pipeline Endpoints**
**Endpoints Disabled:**
- ❌ `/api/pipeline/contact`
- ❌ `/api/pipeline/reveal-email`

**Message:**
```
Apollo API disabled for pipeline.
Use Session Manager for lead search.
```

---

## ✅ **How It Works**

### **User Workflow:**

1. **User Action:** Clicks "Lead Engine" in Session Manager
2. **Frontend:** Sends request to `/api/apollo/search-employees`
3. **Backend Validation:**
   - ✅ Check if endpoint is in `APOLLO_ALLOWED_ENDPOINTS`
   - ✅ Log the request
   - ✅ Retrieve API key securely
4. **Apollo API Call:** Backend makes call with secure key
5. **Response:** Returns data to frontend
6. **Logging:** All details logged to file

---

### **Unauthorized Attempt:**

1. **User/Code:** Tries to call Apollo API from Campaign Manager
2. **Backend Validation:**
   - ❌ Endpoint NOT in `APOLLO_ALLOWED_ENDPOINTS`
   - ❌ Request blocked
   - ✅ Log security violation
3. **Response:** Returns error "Unauthorized access"
4. **API Call:** NEVER MADE - credits saved!

---

## 📋 **Security Checklist**

- ✅ API key in .env (not code)
- ✅ API key not exposed to frontend
- ✅ Endpoint whitelist enforced
- ✅ Request validation before API calls
- ✅ Secure key retrieval function
- ✅ All calls logged
- ✅ Rate limiting active
- ✅ Campaign execution blocked
- ✅ Pipeline endpoints blocked
- ✅ Only Session Manager allowed

---

## 🔍 **Monitoring & Verification**

### **Check API Usage:**
```bash
# View all Apollo API calls
cat logs/apollo_api_calls.log

# Check for unauthorized attempts
grep "BLOCKED" logs/apollo_api_calls.log

# Count API calls today
grep "$(date +%Y-%m-%d)" logs/apollo_api_calls.log | wc -l
```

### **Verify Security:**
```bash
# Ensure no API key in frontend
cd frontend && grep -r "QDjWXMpt8peVt2w8mHRnFQ" .

# Ensure no hardcoded keys
grep -r "QDjWXMpt8peVt2w8mHRnFQ" app.py
```

---

## 🚨 **Security Violations**

**If you see these in logs:**
```
❌ SECURITY VIOLATION: Unauthorized Apollo API access attempt from: /api/xyz
```

**Action:**
1. Check which code is trying to call Apollo API
2. Verify endpoint is in whitelist if legitimate
3. Block or refactor unauthorized code
4. Review logs for patterns

---

## 🎯 **Benefits**

1. ✅ **Credit Protection** - API only used for Session Manager
2. ✅ **No Piracy** - Key never exposed, backend-only
3. ✅ **Full Audit Trail** - Every call logged
4. ✅ **Rate Limited** - 200 calls/minute max
5. ✅ **Single Source** - One secure API key
6. ✅ **Easy Monitoring** - Logs show all usage
7. ✅ **Future-Proof** - Easy to add/remove endpoints

---

## 🔧 **Configuration**

### **Add New Allowed Endpoint:**

1. Edit `app.py`
2. Find `APOLLO_ALLOWED_ENDPOINTS` list
3. Add new endpoint:
   ```python
   APOLLO_ALLOWED_ENDPOINTS = [
       '/api/apollo/enrich-company',
       '/api/apollo/find-contacts',
       # ... existing endpoints ...
       '/api/apollo/new-endpoint'  # ← Add here
   ]
   ```
4. Restart Flask app

### **Change API Key:**

1. Update `.env` file
2. Restart Flask app
3. Key will auto-update in database

---

## ✅ **Deployment Ready**

All security measures are implemented and tested.

**Safe to Deploy:** YES ✅

**Pre-Deployment Check:**
1. ✅ `.env` has correct API key
2. ✅ `logs/` directory will be created on first run
3. ✅ Database will be initialized with API key
4. ✅ All unauthorized endpoints blocked
5. ✅ Frontend has no direct Apollo access

---

## 📞 **Support**

**If API calls fail:**
1. Check `logs/apollo_api_calls.log` for errors
2. Verify endpoint is in `APOLLO_ALLOWED_ENDPOINTS`
3. Confirm API key in `.env` is correct
4. Restart Flask app to reload settings

**For questions:**
- Security violations: Check logs first
- New endpoint needed: Add to whitelist
- API key change: Update .env and restart
