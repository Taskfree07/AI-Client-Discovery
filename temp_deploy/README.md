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

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd "E:\Techgene\AI Client Discovery"
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Create environment file:**
   ```bash
   copy .env.example .env
   ```

6. **Edit `.env` file with your credentials** (or configure later in the Settings page)

### Running the Application

#### Option 1: Quick Start (Windows - Recommended)
Simply double-click or run:
```bash
run.bat
```
This will automatically:
- Create and activate the virtual environment
- Install all dependencies
- Start the Flask server

#### Option 2: Manual Start
1. **Activate the virtual environment:**
   ```bash
   venv\Scripts\activate
   ```

2. **Start the Flask server:**
   ```bash
   python app.py
   ```

#### Access the Application
1. **Open your browser and navigate to:**
   ```
   http://localhost:5000
   ```

2. **Configure your API keys in the Settings page**

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
