# AI Recruiter - Automated Recruitment Platform

A professional, automated recruitment platform that finds job openings, identifies decision-makers, and sends personalized outreach emails using AI.

## ✨ Features

- 🔍 **Automated Job Search** - Uses Google Custom Search API to find relevant job openings
- 🏢 **Company Intelligence** - Apollo API integration for company data and contact discovery
- 👔 **Decision Maker Targeting** - Automatically finds CEOs and owners of target companies
- 🤖 **AI-Powered Email Generation** - Local LLM generates professional, personalized emails
- ✉️ **Microsoft Email Integration** - Send emails via Microsoft Graph API (Entra ID)
- 📊 **Google Sheets Logging** - Automatically logs all leads and campaigns
- ⏰ **Campaign Scheduling** - Schedule campaigns to run daily, weekly, or monthly
- 📈 **Real-time Dashboard** - Monitor campaigns, leads, and email statistics
- 🎨 **Modern UI** - Industry-standard, professional interface

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Google Custom Search API key and CX code
- Apollo API key
- Microsoft Entra ID (Azure AD) application credentials
- Google Cloud credentials for Sheets API

### Installation & Setup

Follow these steps to run the application from scratch:

#### Step 1: Navigate to Project Directory
```bash
cd "E:\Techgene\AI Client Discovery"
```

#### Step 2: Create Virtual Environment
```bash
python -m venv venv
```

#### Step 3: Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

#### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

This will install all required packages including:
- Flask and web framework dependencies
- SQLAlchemy for database management
- AI/ML libraries (sentence-transformers, faiss, torch, scikit-learn)
- Google APIs, Apollo API, and Microsoft Graph API clients
- And more...

Installation may take several minutes as it downloads large ML models.

#### Step 5: Configure Environment (Optional)
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit the `.env` file with your API credentials, or configure them later in the Settings page.

#### Step 6: Run the Application

**Standard Run:**
```bash
python app.py
```

**With Realtime Logs (Recommended for debugging):**

Windows (Command Prompt):
```bash
python -u app.py
```

Windows (PowerShell - save logs to file):
```powershell
python app.py | Tee-Object -FilePath logs/app.log
```

Linux/Mac (save logs to file):
```bash
python -u app.py 2>&1 | tee logs/app.log
```

The `-u` flag enables unbuffered output for immediate log display.

#### Step 7: Access the Application

Once the server starts, you'll see:
```
* Running on http://127.0.0.1:5000
```

Open your browser and navigate to:
```
http://localhost:5000
```

Configure your API keys in the Settings page to start using the platform.

---

### Quick Start (Automated - Windows Only)

If `run.bat` exists, simply double-click it or run:
```bash
run.bat
```

This will automatically create the virtual environment, install dependencies, and start the server.

## ⚙️ Configuration

### 1. Google Custom Search API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Custom Search API**
4. Create credentials (API Key)
5. Go to [Google Custom Search Engine](https://cse.google.com)
6. Create a new search engine
7. Copy the **Search Engine ID (CX)**

### 2. Apollo API

1. Sign up at [Apollo.io](https://apollo.io)
2. Go to Settings → API
3. Generate an API key
4. Copy the API key

### 3. Microsoft Entra ID (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Entra ID** (Azure Active Directory)
3. Go to **App registrations** → **New registration**
4. Register your application
5. Note the **Application (client) ID** and **Directory (tenant) ID**
6. Go to **Certificates & secrets** → **New client secret**
7. Copy the **Client Secret Value**
8. Go to **API permissions** → **Add permission**
9. Add **Microsoft Graph** → **Application permissions**:
   - `Mail.Send`
   - `User.Read.All`
10. Grant admin consent

**Important:** Make sure the sender email you configure has a mailbox in your Microsoft 365 tenant.

### 4. Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Sheets API**
3. Create OAuth 2.0 credentials:
   - Application type: **Desktop app**
   - Download the JSON file
   - Save it as `credentials.json` in the project root
4. Create a Google Sheet and copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

## 📖 How to Use

### Creating a Campaign

1. Click **"+ New Campaign"** on the dashboard
2. Fill in the campaign details:
   - **Campaign Name**: A descriptive name
   - **Search Keywords**: Keywords to search for jobs (e.g., "software developer jobs hiring")
   - **Jobs Per Run**: Number of jobs to process (1-50)
   - **Company Size Range**: Min and max employee count filter
3. Click **"Create Campaign"**

### Running a Campaign

1. Find your campaign in the campaigns table
2. Click the **"▶ Run"** button
3. The system will:
   - Search for job openings using your keywords
   - Extract company information
   - Find CEO/Owner contacts via Apollo
   - Generate personalized emails using AI
   - Send emails via Microsoft Graph API
   - Log everything to Google Sheets

### Scheduling Campaigns

1. Edit a campaign
2. Enable **"Schedule Automation"**
3. Select frequency:
   - **Daily**: Runs every day at 9 AM
   - **Weekly**: Runs every Monday at 9 AM
   - **Monthly**: Runs on the 1st of each month at 9 AM

## 🎨 UI Overview

### Dashboard
- View campaign statistics
- Monitor active campaigns
- Track emails sent
- View recent activity logs

### Settings
- Configure all API keys
- Set default campaign parameters
- Test email configuration
- Manage Google Sheets integration

## 📊 Data Flow

```
Google Search → Find Jobs
     ↓
Apollo API → Company Data + CEO Contacts
     ↓
AI Model → Generate Personalized Email
     ↓
Microsoft Graph → Send Email
     ↓
Google Sheets → Log Results
```

## 🔒 Security Notes

- Never commit your `.env` file or API keys to version control
- Keep your `credentials.json` and `token.pickle` files secure
- Use environment variables for production deployments
- Regularly rotate your API keys and secrets

## 🐛 Troubleshooting

### Email Authentication Fails
- Verify your Azure AD credentials are correct
- Ensure the app has proper API permissions granted
- Check that the sender email has a valid mailbox

### Google Sheets Authentication
- Delete `token.pickle` and re-authenticate
- Ensure the Sheets API is enabled in Google Cloud
- Check that `credentials.json` is in the project root

### Apollo API Errors
- Check your API key is valid
- Verify you haven't exceeded rate limits
- Ensure you have credits available for email reveals

## 📝 Notes

- The AI model (FLAN-T5) will download automatically on first run (~900MB)
- Apollo API has rate limits - check your plan details
- Google Custom Search has a quota (100 searches/day on free tier)
- Microsoft Graph API requires proper permissions and consent

## 🚀 Production Deployment

For production deployment:

1. Set `FLASK_ENV=production` in `.env`
2. Use a production WSGI server (e.g., Gunicorn):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```
3. Use a reverse proxy (nginx/Apache)
4. Set up SSL certificates
5. Use a production database (PostgreSQL)
6. Configure proper logging and monitoring

## 📄 License

This project is for internal use. All rights reserved.

## 🤝 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ using Flask, Transformers, and Modern Web Technologies**
