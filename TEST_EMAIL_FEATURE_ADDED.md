# Test Email Feature Added ✅

## Overview
Added a "Send Test Email" button to Step 3 (Create Campaign Mail) that allows you to send test emails to any recipient address to verify email sending functionality before launching a campaign.

---

## What Was Added

### 1. Frontend Components (`page.tsx`)

#### State Variables (Lines ~149-153)
```typescript
const [showTestEmailModal, setShowTestEmailModal] = useState(false)
const [testEmailAddress, setTestEmailAddress] = useState('')
const [selectedTestTemplate, setSelectedTestTemplate] = useState<Template | null>(null)
const [sendingTestEmail, setSendingTestEmail] = useState(false)
```

#### Handler Functions (Lines ~427-490)
```typescript
const handleOpenTestEmail = (template: Template) => {
  // Opens test email modal with selected template
}

const handleSendTestEmail = async () => {
  // Validates email, calls backend API, sends test email
  // Uses first selected sender from Step 2
  // Replaces variables with test data (Test User, Test Company)
}
```

#### UI Components

**Test Email Buttons** (Added to template cards in Step 3):
- Green paper plane icon next to preview button
- Appears on both AI-generated and imported templates
- Clicking opens the test email modal

**Test Email Modal** (Lines ~2201-2261):
- Shows selected template name and subject
- Input field for recipient email address
- Validation for email format
- Send button with loading state
- Info note about test data usage

### 2. Backend Endpoint (`app.py`)

#### New Route: `/api/campaigns/send-test-email` (Lines ~2068-2174)
```python
@app.route('/api/campaigns/send-test-email', methods=['POST'])
def send_test_email():
    """Send a test email to verify email sending functionality"""
    # Validates recipient email and sender
    # Gets template content (DB or AI-generated)
    # Replaces variables with test data
    # Sends email via Gmail API
    # Returns success/error response
```

**Features:**
- ✅ Supports both database templates and AI-generated templates
- ✅ Uses Gmail OAuth sender accounts
- ✅ Replaces template variables with test data:
  - `{{FirstName}}` → "Test User"
  - `{{CompanyName}}` → "Test Company"
  - `{{SenderName}}` → Sender's name from email
  - `{{Title}}` → "Test Title"
  - `{{Industry}}` → "Technology"
  - `{{Email}}` → Recipient email
- ✅ Adds "[TEST]" prefix to subject line
- ✅ Error handling for sender connection issues
- ✅ Token refresh support

### 3. CSS Styles (`globals.css`)

Added 170+ lines of styles (Lines ~5192-5363):

**Button Styles:**
- `.template-card-actions` - Container for action buttons
- `.btn-icon-test` - Green paper plane button with hover effects

**Modal Styles:**
- `.le-test-email-modal` - Modal container
- `.le-test-email-body` - Modal body layout
- `.test-email-info` - Template info display
- `.test-email-form` - Email input form
- `.test-email-note` - Info note styling
- `.le-modal-btn-primary` - Green send button

---

## How to Use

### Prerequisites
1. ✅ Complete Step 1: Add leads
2. ✅ Complete Step 2: Select a sender account (Gmail OAuth required)
3. ✅ Navigate to Step 3: Create Campaign Mail

### Steps to Send Test Email

1. **Generate or Import Templates**
   - Click "Generate 10+ Email Options with AI" OR
   - Click "Import from Email Template"

2. **Select Template to Test**
   - Find the template you want to test
   - Click the green **paper plane icon** (Send Test Email button)

3. **Enter Recipient Email**
   - Modal opens with template details
   - Enter your email address in the input field
   - Click "Send Test Email"

4. **Check Your Inbox**
   - Email will arrive in a few seconds/minutes
   - Subject will have "[TEST]" prefix
   - Body will have test data (Test User, Test Company)

### Example Test Email

**Subject:** `[TEST] Quick question about hiring tech talent`

**Body:**
```
Hi Test User,

I noticed Test Company is in the Technology industry and thought you might be interested in our recruiting services.

We specialize in placing top tech talent...

Best regards,
[Your Sender Name]
```

---

## Features & Validations

### ✅ Validations
- **Email Format**: Validates email address format before sending
- **Sender Required**: Checks if sender is selected in Step 2
- **Sender Status**: Ensures sender is connected (not expired)
- **Template Required**: Ensures template is selected

### ✅ Error Handling
- **Invalid Email**: Shows alert "Please enter a valid email address"
- **No Sender**: Shows alert "Please select a sender in Step 2 first"
- **Send Failure**: Shows detailed error message from backend
- **Connection Issues**: Shows error if sender account has expired

### ✅ UI Feedback
- **Loading State**: Button shows spinner while sending
- **Success Message**: Alert confirms email sent successfully
- **Error Messages**: Clear error messages with actionable steps

---

## Testing Checklist

### Basic Functionality
- [ ] Test email button appears on AI-generated templates
- [ ] Test email button appears on imported templates
- [ ] Clicking button opens test email modal
- [ ] Modal shows template name and subject
- [ ] Can enter email address in input field
- [ ] Can close modal with X or Cancel button

### Email Sending
- [ ] Send test email with AI-generated template
- [ ] Send test email with database template
- [ ] Verify email arrives in inbox
- [ ] Verify subject has "[TEST]" prefix
- [ ] Verify variables are replaced with test data
- [ ] Verify email is from selected sender

### Error Handling
- [ ] Try sending without entering email (should show alert)
- [ ] Try sending with invalid email format (should show alert)
- [ ] Try sending without selecting sender in Step 2 (should show alert)
- [ ] Try sending with expired sender connection (should show error)

### Edge Cases
- [ ] Send to Gmail address
- [ ] Send to Outlook address
- [ ] Send to custom domain
- [ ] Multiple tests in quick succession
- [ ] Test while other modals are open

---

## API Request Format

**Endpoint:** `POST /api/campaigns/send-test-email`

**Request Body:**
```json
{
  "recipient_email": "test@example.com",
  "template_id": 5,
  "template_data": {
    "subject": "Test Subject",
    "body": "Test Body"
  },
  "sender_id": 1,
  "test_lead_name": "Test User",
  "test_company": "Test Company"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Test email sent successfully to test@example.com",
  "message_id": "18d4a1b2c3d4e5f6"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Sender account is not connected. Please reconnect."
}
```

---

## File Changes Summary

### Modified Files
1. ✅ `frontend/src/app/campaign-manager/new/page.tsx`
   - Added 4 state variables
   - Added 2 handler functions (~65 lines)
   - Added test email buttons to template cards
   - Added test email modal (~60 lines)

2. ✅ `frontend/src/app/globals.css`
   - Added 170+ lines of CSS styles

3. ✅ `app.py`
   - Added `/api/campaigns/send-test-email` endpoint (~105 lines)

### No Changes Required
- ✅ Database models (no new tables needed)
- ✅ Existing API endpoints (no modifications)
- ✅ Authentication (uses existing Gmail OAuth)

---

## Troubleshooting

### Problem: "Please select a sender in Step 2 first"
**Solution:** Go back to Step 2 and select at least one Gmail sender account

### Problem: "Sender account is not connected"
**Solution:** Go to Campaign Manager → Sender Profile and reconnect the Gmail account

### Problem: Test email not arriving
**Possible Causes:**
1. Check spam/junk folder
2. Wait a few minutes (Gmail API can have slight delays)
3. Verify sender's Gmail account has sending permissions
4. Check backend logs for API errors

### Problem: "Failed to send email" error
**Solutions:**
1. Check if sender's OAuth token has expired (reconnect in Sender Profile)
2. Verify Gmail API is enabled in Google Cloud Console
3. Check backend console for detailed error messages
4. Ensure `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` are set in `.env`

---

## Technical Details

### Gmail API Integration
- Uses `google-api-python-client` library
- Sends emails via Gmail API v1
- Uses OAuth 2.0 credentials from sender accounts
- Encodes message in base64 format
- Sends with user's "me" resource

### Variable Replacement
All template variables are replaced with test data:
- `{{FirstName}}` → "Test User"
- `{{CompanyName}}` → "Test Company"
- `{{SenderName}}` → Extracted from sender's email
- `{{Title}}` → "Test Title"
- `{{Industry}}` → "Technology"
- `{{Email}}` → Recipient's email

### Security
- ✅ Email validation before sending
- ✅ Sender authentication required
- ✅ OAuth token validation
- ✅ Subject line prefix to identify test emails
- ✅ No storage of test emails in database

---

## Future Enhancements

Potential improvements:
- [ ] Send test to multiple recipients at once
- [ ] Custom test data (not just "Test User", "Test Company")
- [ ] Preview rendered email before sending
- [ ] Test email history/log
- [ ] Schedule test emails
- [ ] A/B test multiple templates
- [ ] Track test email opens/clicks

---

## Summary

✅ **Feature Complete and Ready to Use!**

You can now:
1. Click the green paper plane icon on any template in Step 3
2. Enter any email address
3. Send a test email instantly
4. Verify your email content and sender configuration
5. Fix any issues before launching the full campaign

**Next Steps:**
- Test the feature with your own email address
- Verify emails arrive correctly
- Check spam folder if needed
- Launch campaigns with confidence! 🚀
