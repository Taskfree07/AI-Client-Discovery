# Manufacturing ICP Lead Sourcing - User Guide

## What This Does

Generates **500 validated manufacturing leads** matching specific buyer personas (decision-makers in manufacturing companies) with verified contact information and quality scoring.

---

## Simple 3-Step Process

```
1. CREATE CAMPAIGN → 2. GENERATE LEADS → 3. EXPORT TO EXCEL
```

---

## Step-by-Step Walkthrough

### Step 1: Create Manufacturing ICP Campaign

**Go to: Dashboard → New Campaign → Select "Manufacturing ICP"**

You'll see a pre-configured form:

```
Campaign Setup
├── Campaign Name: [Enter name, e.g., "Dec-25 Manufacturing"]
├── Industry: Manufacturing (pre-selected)
├── Geography: USA, India (pre-selected)
├── Company Size: 200-10,000 employees (pre-set)
├── Total Leads Needed: [Enter 500]
└── Click "Start Campaign"
```

**What happens:**
- System automatically applies Manufacturing-specific filters
- Sets up tier distribution (40% T1, 40% T2, 20% T3)
- Prepares to search for all three persona types

---

### Step 2: Automatic Lead Generation

**System runs automatically in background:**

#### Phase 1: Search for T1 Decision Makers (Target: 200 leads)
```
Searching for:
├── COO, VP Operations, Director Operations
├── Plant Head, Factory Manager, Unit Head
├── General Manager Operations, Regional Managers
└── In: Manufacturing, Industrial, Automotive, Electronics, etc.
```

**Filters Applied:**
- Company Size: 200-10,000 employees
- Location: USA or India
- Seniority: VP, Director, CXO, Head
- Industry: Manufacturing, Industrial, Automotive, Electronics, Chemicals, FMCG, Heavy Engineering, Industrial Machinery, Electrical Equipment, Industrial Automation

#### Phase 2: Search for T2 Talent Leaders (Target: 200 leads)
```
Searching for:
├── HR Head, VP HR, CHRO, Director HR
├── HR Manager, Talent Acquisition Head
└── TA Manager, Senior HRBP
```

#### Phase 3: Search for T3 HR/TA Practitioners (Target: 100 leads)
```
Searching for:
├── Recruiter, TA Specialist
├── HRBP, HR Executive
└── Staffing Coordinator
```

**For Each Lead Found:**
1. Get company details from Apollo
2. Find contact information (name, title, email)
3. Reveal verified email address
4. Run validation checklist (6 criteria)
5. Calculate quality score
6. Assign tier classification

---

### Step 3: Review & Validation

**Go to: Campaign Dashboard → View Leads**

You'll see a table with all leads:

| Company | Contact | Title | Tier | Email | Validation Score | Status |
|---------|---------|-------|------|-------|------------------|--------|
| ABC Manufacturing | John Doe | VP Operations | T1 | john@abc.com | 5/6 (83%) | Valid |
| XYZ Industries | Jane Smith | HR Head | T2 | jane@xyz.com | 6/6 (100%) | Valid |
| DEF Motors | Bob Wilson | TA Specialist | T3 | bob@def.com | 4/6 (67%) | Review |

**Quality Indicators:**

✅ **Green (Valid):** Meets 4+ validation criteria
⚠️ **Yellow (Review):** Meets 3 criteria (borderline)
❌ **Red (Invalid):** Meets <3 criteria (auto-rejected)

**What Each Lead Shows:**
- Company name, size, industry
- Contact name, title, email (verified)
- Tier classification (T1/T2/T3)
- Validation score (out of 6)
- Phone numbers (if available)
- LinkedIn profile link
- Company website

---

### Step 4: Export to Excel

**Click: "Export to Excel"**

**Excel File Structure:**

```
Sheet 1: Summary
├── Campaign Name: Dec-25
├── Total Leads: 500
├── T1 Leads: 200 (40%)
├── T2 Leads: 200 (40%)
├── T3 Leads: 100 (20%)
├── Validation Rate: 92%
└── Date Generated: Dec 10, 2025

Sheet 2: T1 - Decision Makers (200 leads)
├── Columns: Company Name, Contact Name, Title, Email, Phone,
│            Company Size, Industry, Location, LinkedIn,
│            Validation Score, Criteria Met

Sheet 3: T2 - Talent Leaders (200 leads)
├── Same columns as Sheet 2

Sheet 4: T3 - HR/TA Practitioners (100 leads)
├── Same columns as Sheet 2

Sheet 5: Validation Report
├── Quality metrics
├── Criteria breakdown
└── Filters used
```

**File saved as:** `Manufacturing_ICP_Dec25_500leads.xlsx`

---

## 6-Point Validation Checklist

Each lead is automatically validated against these criteria:

| # | Criteria | How It's Checked |
|---|----------|------------------|
| 1️⃣ | **Manufacturing Industry** | Company industry matches: Manufacturing, Industrial, Automotive, Electronics, Chemicals, FMCG, Heavy Engineering, Industrial Machinery, Electrical Equipment, Industrial Automation |
| 2️⃣ | **200-10,000 Employees** | Company headcount from Apollo is within range |
| 3️⃣ | **Multi-location OR Multi-plant** | Company has offices/plants in multiple cities or states |
| 4️⃣ | **Has HR + Operations Leadership** | Found contacts in both HR and Operations departments |
| 5️⃣ | **Monthly/Quarterly Hiring Cycles** | Company posts jobs regularly (checked via LinkedIn activity) |
| 6️⃣ | **Uses Staffing Vendors** | Evidence of working with recruitment agencies (LinkedIn job posts mention "staffing partner" or similar) |

**Quality Threshold:**
- **Valid Lead:** Meets 4+ criteria (90%+ pass this)
- **Borderline:** Meets 3 criteria (requires manual review)
- **Rejected:** Meets <3 criteria (auto-filtered out)

---

## Tier Distribution Breakdown

### T1 - High Priority Buyers (200 leads / 40%)

**Target Personas:**
- COO, VP Operations, Director Operations
- Plant Head, Factory Manager, Unit Head
- General Manager Operations, Regional Managers

**Why These Matter:**
- Direct owners of manufacturing output
- Feel the impact of vacant roles immediately
- Final decision-makers for staffing needs

**Company Criteria:**
- 500-5,000 employees (larger operations)
- Multi-plant facilities
- Multiple hiring cycles per year
- Known to use staffing agencies

---

### T2 - Mid Priority Talent Leaders (200 leads / 40%)

**Target Personas:**
- HR Head, VP HR, CHRO, Director HR
- HR Manager, Talent Acquisition Head
- TA Manager, Senior HRBP

**Why These Matter:**
- Direct hiring authority
- Vendor selection and onboarding
- Control staffing budgets

**Company Criteria:**
- 200-1,000 employees (growing operations)
- Active HR department
- Regular recruitment activity

---

### T3 - Low Priority Practitioners (100 leads / 20%)

**Target Personas:**
- Recruiter, TA Specialist
- HRBP, HR Executive
- Staffing Coordinator

**Why These Matter:**
- Warm pipeline for future engagement
- Involved in day-to-day hiring
- Can influence decision-makers

**Company Criteria:**
- 200+ employees
- Single or multi-location
- Ad-hoc hiring needs

---

## What You See During Processing

### Real-time Progress Dashboard

```
Manufacturing ICP Campaign: Dec-25
Status: In Progress

Progress Overview:
├── T1 Decision Makers:    [████████░░] 160/200 (80%)
├── T2 Talent Leaders:     [██████████] 200/200 (100%)
└── T3 practitioners:      [███████░░░] 70/100 (70%)

Total Progress: 430/500 (86%)

Quality Metrics:
├── Validation Rate: 91%
├── Email Verified: 95%
├── Avg Score: 4.8/6
└── Estimated Time Remaining: 15 minutes

Recent Activity:
├── [OK] Found T1: John Smith (COO) at ABC Manufacturing
├── [OK] Found T2: Sarah Jones (HR Head) at XYZ Industries
├── [SKIP] Rejected: Company size 150 (too small)
├── [SKIP] Rejected: No manufacturing industry match
└── [OK] Found T3: Mike Brown (Recruiter) at DEF Motors
```

---

## Sample Lead Entry

Here's what one complete lead looks like:

```
=== LEAD #1 ===

Tier: T1 - Decision Maker
Validation Score: 5/6 (83%) ✅ VALID

Company Information:
├── Name: Precision Automotive Components Inc.
├── Industry: Automotive Manufacturing
├── Size: 850 employees
├── Revenue: $120M annually
├── Locations: Detroit, MI | Chennai, India (Multi-plant ✓)
├── Website: www.precisionauto.com
└── Founded: 1998

Contact Information:
├── Name: Robert Martinez
├── Title: VP of Operations
├── Email: r.martinez@precisionauto.com (Verified ✓)
├── Phone: +1 (313) 555-0123
├── LinkedIn: linkedin.com/in/robert-martinez-ops
└── Department: Operations

Validation Checklist:
├── ✅ Manufacturing industry (Automotive)
├── ✅ 850 employees (200-10,000 range)
├── ✅ Multi-location (USA + India)
├── ✅ Has HR + Operations leadership
├── ✅ Hiring cycles detected (23 jobs in last 90 days)
└── ❌ Staffing vendor usage (not visible)

Why This Lead Matters:
VP Operations at mid-size automotive manufacturer with multi-plant operations and active hiring. Direct decision-maker for production staffing.

Recommended Action:
High-priority outreach. Mention multi-location support and manufacturing-specific staffing solutions.
```

---

## Timeline Expectations

### For 500 Leads:

| Phase | Time Required | What Happens |
|-------|--------------|--------------|
| **Setup** | 2 minutes | Create campaign, configure settings |
| **T1 Search** | 20-30 min | Find 200 COOs, VPs, Operations leaders |
| **T2 Search** | 15-20 min | Find 200 HR/TA leaders |
| **T3 Search** | 10-15 min | Find 100 HR/TA practitioners |
| **Validation** | 5-10 min | Apply checklist, score quality |
| **Review** | 10 min | Manual spot-check of results |
| **Export** | 1 minute | Generate Excel file |

**Total Time: ~60-90 minutes for 500 validated leads**

---

## Quality Assurance

### Automatic Checks:
- ✅ Email verification (Apollo verified emails only)
- ✅ Title matching (exact match to T1/T2/T3 personas)
- ✅ Company size filtering (200-10,000 employees)
- ✅ Geography filtering (USA, India only)
- ✅ Industry matching (manufacturing categories only)
- ✅ Deduplication (no duplicate companies or contacts)

### Manual Review Points:
- Spot-check 10-20 random leads
- Verify tier classification accuracy
- Confirm validation scores make sense
- Check email formatting

---

## API Usage & Credits

### Per Campaign (500 leads):

| Activity | Credits per Lead | Total for 500 |
|----------|------------------|---------------|
| Company Search | 1 credit | 500 credits |
| Company Enrichment | 1 credit | 500 credits |
| Contact Search | 1 credit | 500 credits |
| Email Reveal | 1 credit | 500 credits |
| **TOTAL** | **4 credits** | **~2,000 credits** |

**Note:** System searches more leads than target to account for rejections. Expect ~2,500-3,000 credits used for quality filtering.

---

## Troubleshooting

### "Not enough T1 leads found"
**Solution:** T1 (COO, VP) roles are limited. System will:
- Search broader titles (e.g., General Manager, Plant Head)
- Expand to adjacent industries
- Notify you if target can't be met

### "Validation rate below 90%"
**Solution:** System automatically:
- Searches additional leads to replace low-quality ones
- Adjusts filters to improve quality
- Provides report on why leads were rejected

### "Excel export missing data"
**Solution:** Check that all leads completed validation. Re-run export after processing completes.

---

## What Makes This Different from Current App

### OLD Way (Current App):
1. Search for job postings manually
2. Process one company at a time
3. No tier classification
4. No bulk validation
5. Export to database only

### NEW Way (Manufacturing ICP):
1. ✅ **Bulk processing:** 500 leads in one campaign
2. ✅ **Smart targeting:** Auto-searches T1/T2/T3 personas
3. ✅ **Quality scoring:** 6-point validation checklist
4. ✅ **Tier distribution:** Automatic 40/40/20 split
5. ✅ **Excel delivery:** Ready-to-use format for marketing team

---

## Summary

### Input Required from You:
1. Campaign name (e.g., "Dec-25")
2. Click "Start Campaign"
3. Wait 60-90 minutes
4. Review results
5. Export to Excel

### Output You Get:
- ✅ 500 validated manufacturing leads
- ✅ 40% T1 (COO, VP Ops) - 200 leads
- ✅ 40% T2 (HR/TA leaders) - 200 leads
- ✅ 20% T3 (HR practitioners) - 100 leads
- ✅ 90%+ validation rate
- ✅ Verified emails for all contacts
- ✅ Structured Excel file ready for upload
- ✅ Quality report with metrics

### Time Saved:
- **Manual sourcing:** 40-60 hours
- **With this system:** 1.5 hours
- **Time saved:** 95%+

---

## Ready to Implement?

Once you approve this workflow, we'll build:

1. **Manufacturing ICP campaign module**
2. **Tier-based search engine (T1/T2/T3)**
3. **6-point validation system**
4. **Bulk processing (500 leads)**
5. **Excel export functionality**
6. **Quality dashboard & reporting**

**Development Time:** 1-2 weeks
**Apollo Credits Needed:** ~3,000 credits per campaign

---

*This user guide describes the PROPOSED system based on marketing team requirements.*
*Current app does not yet have these features - pending your approval to build.*
