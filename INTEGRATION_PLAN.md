# 🔄 Integration Plan: Sender Identity + AI Sequence Builder

## ✅ What's Been Completed

### **Backend:**
1. ✅ Gmail OAuth endpoints added (`/api/auth/gmail/start`, `/api/auth/gmail/callback`)
2. ✅ Sender Account API (`/api/senders` - CRUD operations)
3. ✅ AI Email Generation endpoint (`/api/campaigns/generate-sequence`)
   - Uses `gemini-2.5-flash` model
   - Generates 11 email options (3+3+3+2)
   - References PDF templates
   - Includes spam-prevention rules
4. ✅ Email Sequence database models created
   - CampaignEmailSequence
   - CampaignEmailStep
   - LeadEmailState
   - EmailSendLog
5. ✅ Environment variables updated with Gmail credentials

### **Database:**
1. ✅ `sender_account` table created
2. ✅ Email sequence tables created

---

## 🎯 Frontend Integration Needed

### **Current Workflow (From GitHub):**
```
Step 1: Add Leads
Step 2: Sender Identity ← GitHub code (dropdown selector)
Step 3: Create Campaign Mail ← Simple template selector
Step 4: Schedule
Step 5: Review and Launch
```

### **Target Workflow (Our Work + GitHub):**
```
Step 1: Add Leads ← Keep as is
Step 2: Sender Identity ← Keep GitHub version (dropdown selector)
Step 3: Create Campaign Mail ← Replace with our AI sequence builder
Step 4: Schedule ← Keep as is
Step 5: Review and Launch ← Keep as is
```

---

## 📝 Step 3 Replacement Details

### **Current (GitHub) - Simple Template Selector:**
- Shows grid of all templates
- Click to select one template
- No AI generation
- No multi-step sequence

### **New (Our Work) - AI Sequence Builder:**
- **Left Panel:**
  - "Generate 10+ Email Options with AI" button
  - AI-generated emails grouped by day (collapsible)
  - "Import from Email Template" button with modal
- **Right Panel:**
  - 4-step sequence builder
  - Drag & drop functionality
  - Day timing configuration
  - Preview functionality

---

## 🚀 Implementation Steps

### **Step 1: Update page.tsx**
- Keep Sender Identity step (Step 2) from GitHub
- Replace Step 3 with our sequence builder
- Add all state management:
  - `aiGeneratedTemplates`
  - `aiEmailsByDay`
  - `expandedDays`
  - `showImportModal`
  - `draggedTemplate`
  - `previewTemplate`

### **Step 2: Add Helper Functions**
- `handleGenerateSequenceWithAI()` - AI generation
- `toggleDayExpansion()` - Collapsible groups
- `handlePreviewTemplate()` - Preview with variable replacement
- `handleDragStart()`, `handleDragOver()`, `handleDropTemplate()` - Drag & drop

### **Step 3: Add CSS Styles**
- Day group styling
- Drag & drop styles
- Import modal styles
- Preview modal styles

---

## 🔧 Technical Details

### **Sender Identity Integration:**
The Sender Identity step (Step 2) will:
- Load senders from `/api/senders`
- Display checkboxes for selection
- Store selected sender IDs in `formData.selected_sender_ids`
- Later used when launching campaign for email sending

### **Sequence Builder Integration:**
The Create Campaign Mail step (Step 3) will:
- Generate emails via `/api/campaigns/generate-sequence`
- Display emails grouped by day
- Allow drag & drop to build sequence
- Store sequence in `formData.email_sequence`

### **Data Flow:**
```
1. User adds leads (Step 1)
2. User selects sender(s) (Step 2) → formData.selected_sender_ids
3. User generates AI emails or imports templates (Step 3)
4. User drags emails to sequence → formData.email_sequence
5. User configures schedule (Step 4)
6. User launches campaign (Step 5)
   → Creates CampaignEmailSequence
   → Creates CampaignEmailSteps
   → Sends emails using selected sender(s)
```

---

## ✅ Status

**Completed:**
- ✅ Backend API (Gmail OAuth + AI Generation)
- ✅ Database models and tables
- ✅ Environment configuration

**Remaining:**
- ⏳ Frontend Step 3 replacement (in progress)
- ⏳ CSS styling (in progress)
- ⏳ Testing complete workflow

---

**Next:** Replace Step 3 in page.tsx with our AI sequence builder
