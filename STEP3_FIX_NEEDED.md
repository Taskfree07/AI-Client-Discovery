# Step 3 Fix - Replace with AI Sequence Builder

## Current Status

✅ **Completed:**
- Sidebar navigation updated
- Gmail OAuth working
- Sender Identity (Step 2) working
- AI generation backend ready
- Database models created

❌ **Problem:**
- Step 3 shows old simple template selector
- Need to replace with our AI sequence builder

---

## Quick Fix Instructions

### Option 1: Apply Stashed Changes (Recommended)

Run these commands:

```bash
cd "E:\Techgene\AI Client Discovery"

# Apply our AI improvements
git stash pop stash@{1}

# There will be conflicts in 2 files
# Resolve conflicts by:
# 1. For page.tsx: Keep EVERYTHING from stashed changes (our AI builder)
# 2. For globals.css: Keep EVERYTHING from stashed changes (our styles)

# After resolving:
git add frontend/src/app/campaign-manager/new/page.tsx
git add frontend/src/app/globals.css
git stash drop

# Rebuild
cd frontend
npm run build
npm run dev
```

### Option 2: Manual File Replacement

I can create a complete working `page.tsx` file with:
- All 5 steps
- Sender Identity at Step 2
- AI Sequence Builder at Step 3
- All helper functions

Would you like me to create the complete file?

---

## What Step 3 Should Have

### Features:
1. **Left Panel:**
   - "Generate 10+ Email Options with AI" button
   - AI-generated emails grouped by day (Day 1, 3, 7, 11)
   - Collapsible day groups
   - "Import from Email Template" button

2. **Right Panel:**
   - 4-step email sequence builder
   - Drag & drop email cards
   - Day timing configuration
   - Preview button for each step

3. **Functions Needed:**
   - `handleGenerateSequenceWithAI()` - Calls `/api/campaigns/generate-sequence`
   - `toggleDayExpansion()` - Collapse/expand day groups
   - `handlePreviewTemplate()` - Show email preview
   - `handleDragStart()`, `handleDragOver()`, `handleDropTemplate()` - Drag & drop
   - `calculateSequenceDuration()`, `calculateDayNumber()` - Helper functions

---

## Next Steps

Please let me know which option you prefer:

**A)** I'll guide you through applying the stash (5 minutes)
**B)** I'll create a complete working `page.tsx` file for you (10 minutes)
**C)** Something else?

The backend is 100% ready - we just need to connect the frontend Step 3!
