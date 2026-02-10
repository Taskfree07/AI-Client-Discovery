from flask import Flask, request, jsonify, session, Response, stream_with_context, redirect
from flask_cors import CORS
from config import Config
from models import db, Settings, Campaign, EmailTemplate, JobLead, ActivityLog, LeadSession, SessionLead, SenderAccount
from services.google_search import GoogleSearchService
from services.apollo_api import ApolloAPIService
from services.email_generator import EmailGenerator
from services.email_sender import EmailSender
from services.sheets_logger import SheetsLogger
from services.scheduler import CampaignScheduler
from services.job_parser import JobParserService
from services.ai_lead_scorer import AILeadScorer
from datetime import datetime
from urllib.parse import urlparse
import os
import json

# Allow OAuth over HTTP for local development
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = app.config.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, supports_credentials=True)

# Initialize database
db.init_app(app)

# Initialize services (will be configured from settings)
email_generator = EmailGenerator()
campaign_scheduler = CampaignScheduler()
ai_lead_scorer = AILeadScorer()

def get_setting(key, default=None):
    """Get a setting from database or return default"""
    setting = Settings.query.filter_by(key=key).first()
    return setting.value if setting else default

def save_setting(key, value):
    """Save a setting to database"""
    setting = Settings.query.filter_by(key=key).first()
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value)
        db.session.add(setting)
    db.session.commit()

def log_activity(campaign_id, action, details, status='success'):
    """Log an activity"""
    log = ActivityLog(
        campaign_id=campaign_id,
        action=action,
        details=details,
        status=status
    )
    db.session.add(log)
    db.session.commit()

# ==================== FRONTEND ROUTES REMOVED ====================
# All frontend routes removed - Next.js handles UI routing
# Flask serves only as API backend

# ==================== API ROUTES ====================

# Settings API
@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get all settings"""
    settings_dict = {}
    settings = Settings.query.all()
    for setting in settings:
        # Don't expose sensitive keys in full
        if 'key' in setting.key.lower() or 'secret' in setting.key.lower():
            settings_dict[setting.key] = '***' if setting.value else ''
        else:
            settings_dict[setting.key] = setting.value

    return jsonify(settings_dict)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update settings"""
    try:
        data = request.json
        for key, value in data.items():
            # Handle different value types
            if value is None:
                continue

            # For strings, skip masked values
            if isinstance(value, str):
                if value == '***' or not value.strip():
                    continue

            # Save the setting
            save_setting(key, str(value))

        log_activity(None, 'settings_updated', 'Settings were updated', 'success')
        return jsonify({'success': True, 'message': 'Settings updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/settings/test-email', methods=['POST'])
def test_email_config():
    """Test email configuration"""
    try:
        client_id = get_setting('azure_client_id')
        client_secret = get_setting('azure_client_secret')
        tenant_id = get_setting('azure_tenant_id')

        sender = EmailSender(client_id, client_secret, tenant_id)
        result = sender.validate_config()

        return jsonify(result)
    except Exception as e:
        return jsonify({'valid': False, 'message': str(e)})

@app.route('/api/settings/test-google', methods=['POST'])
def test_google_config():
    """Test Google Custom Search API configuration"""
    import requests
    try:
        api_key = get_setting('google_api_key')
        cx_code = get_setting('google_cx_code')

        if not api_key or not cx_code:
            return jsonify({'valid': False, 'message': 'Google API Key and CX Code are required'})

        # Test with a simple search
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': api_key,
            'cx': cx_code,
            'q': 'test',
            'num': 1
        }

        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            return jsonify({'valid': True, 'message': 'Google API is working correctly!'})
        elif response.status_code == 429:
            return jsonify({'valid': False, 'message': 'API quota exceeded. Please use a different API key.'})
        elif response.status_code == 403:
            error_data = response.json()
            error_msg = error_data.get('error', {}).get('message', 'Access denied')
            if 'quotaExceeded' in error_msg or 'rateLimitExceeded' in error_msg or 'dailyLimitExceeded' in error_msg:
                return jsonify({'valid': False, 'message': 'API quota exceeded. Please use a different API key.'})
            return jsonify({'valid': False, 'message': f'API Error: {error_msg}'})
        else:
            error_data = response.json() if response.text else {}
            error_msg = error_data.get('error', {}).get('message', f'HTTP {response.status_code}')
            return jsonify({'valid': False, 'message': f'API Error: {error_msg}'})

    except requests.exceptions.Timeout:
        return jsonify({'valid': False, 'message': 'Request timed out. Check your internet connection.'})
    except Exception as e:
        return jsonify({'valid': False, 'message': str(e)})

# Session Manager API
@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get all sessions"""
    from models import LeadSession
    sessions = LeadSession.query.filter(LeadSession.status != 'archived').order_by(LeadSession.created_at.desc()).all()
    return jsonify({
        'success': True,
        'sessions': [s.to_dict() for s in sessions]
    })

@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new session"""
    from models import LeadSession
    import json

    try:
        data = request.json
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'success': False, 'error': 'Session name is required'}), 400

        session = LeadSession(
            name=name,
            job_titles=json.dumps(data.get('job_titles', [])),
            locations=json.dumps(data.get('locations', [])),
            industries=json.dumps(data.get('industries', [])),
            keywords=json.dumps(data.get('keywords', [])),
            company_sizes=json.dumps(data.get('company_sizes', [])),
            status='draft'
        )

        db.session.add(session)
        db.session.commit()

        return jsonify({
            'success': True,
            'session': session.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions/<int:session_id>', methods=['GET'])
def get_session(session_id):
    """Get a specific session with its leads"""
    from models import LeadSession, SessionLead

    session = LeadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'error': 'Session not found'}), 404

    leads = SessionLead.query.filter_by(session_id=session_id).all()

    return jsonify({
        'success': True,
        'session': session.to_dict(),
        'leads': [l.to_dict() for l in leads]
    })

@app.route('/api/sessions/<int:session_id>', methods=['PUT'])
def update_session(session_id):
    """Update a session"""
    from models import LeadSession
    import json

    session = LeadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'error': 'Session not found'}), 404

    try:
        data = request.json

        if 'name' in data:
            session.name = data['name']
        if 'status' in data:
            session.status = data['status']
        if 'job_titles' in data:
            session.job_titles = json.dumps(data['job_titles'])
        if 'locations' in data:
            session.locations = json.dumps(data['locations'])

        db.session.commit()

        return jsonify({
            'success': True,
            'session': session.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session"""
    from models import LeadSession

    session = LeadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'error': 'Session not found'}), 404

    try:
        db.session.delete(session)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions/<int:session_id>/leads', methods=['POST'])
def add_lead_to_session(session_id):
    """Add a lead to a session"""
    from models import LeadSession, SessionLead
    import json

    session = LeadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'error': 'Session not found'}), 404

    try:
        data = request.json
        company = data.get('company', {})
        pocs = data.get('pocs', [])

        lead = SessionLead(
            session_id=session_id,
            company_name=company.get('name', ''),
            company_domain=company.get('domain', ''),
            company_industry=company.get('industry', ''),
            company_size=company.get('size', 0),
            company_location=company.get('location', ''),
            company_linkedin=company.get('linkedin_url', ''),
            company_website=company.get('website', ''),
            job_title=data.get('job_opening', ''),
            job_source=data.get('source', ''),
            job_url=data.get('source_url', ''),
            pocs=json.dumps(pocs)
        )

        db.session.add(lead)

        # Update session stats
        session.total_leads += 1
        session.total_pocs += len(pocs)
        session.total_emails += sum(1 for p in pocs if p.get('email') and 'email_not_unlocked' not in p.get('email', ''))

        db.session.commit()

        return jsonify({
            'success': True,
            'lead': lead.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Campaign API
@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    """Get all campaigns"""
    campaigns = Campaign.query.all()
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'search_keywords': c.search_keywords,
        'company_size_min': c.company_size_min,
        'company_size_max': c.company_size_max,
        'jobs_per_run': c.jobs_per_run,
        'status': c.status,
        'schedule_enabled': c.schedule_enabled,
        'schedule_frequency': c.schedule_frequency,
        'created_at': c.created_at.isoformat(),
        'leads': JobLead.query.filter_by(campaign_id=c.id).count()
    } for c in campaigns])

@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    """Create a new campaign"""
    try:
        data = request.json
        campaign = Campaign(
            name=data['name'],
            search_keywords=data['search_keywords'],
            company_size_min=data.get('company_size_min', 50),
            company_size_max=data.get('company_size_max', 200),
            jobs_per_run=data.get('jobs_per_run', 10),
            email_template_id=data.get('email_template_id'),
            status='draft'
        )

        db.session.add(campaign)
        db.session.commit()

        log_activity(campaign.id, 'campaign_created', f'Campaign "{campaign.name}" created', 'success')

        return jsonify({'success': True, 'campaign_id': campaign.id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/campaigns/<int:campaign_id>', methods=['PUT'])
def update_campaign(campaign_id):
    """Update a campaign"""
    try:
        campaign = Campaign.query.get_or_404(campaign_id)
        data = request.json

        campaign.name = data.get('name', campaign.name)
        campaign.search_keywords = data.get('search_keywords', campaign.search_keywords)
        campaign.company_size_min = data.get('company_size_min', campaign.company_size_min)
        campaign.company_size_max = data.get('company_size_max', campaign.company_size_max)
        campaign.jobs_per_run = data.get('jobs_per_run', campaign.jobs_per_run)
        campaign.status = data.get('status', campaign.status)
        campaign.schedule_enabled = data.get('schedule_enabled', campaign.schedule_enabled)
        campaign.schedule_frequency = data.get('schedule_frequency', campaign.schedule_frequency)

        db.session.commit()

        # Update scheduler if needed
        if campaign.schedule_enabled:
            campaign_scheduler.schedule_campaign(
                campaign.id,
                campaign.schedule_frequency,
                run_campaign_job
            )
        else:
            campaign_scheduler.remove_campaign(campaign.id)

        log_activity(campaign.id, 'campaign_updated', f'Campaign "{campaign.name}" updated', 'success')

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/campaigns/<int:campaign_id>/run', methods=['POST'])
def run_campaign(campaign_id):
    """Run a campaign"""
    try:
        campaign = Campaign.query.get_or_404(campaign_id)

        # Run campaign in background or synchronously
        result = execute_campaign(campaign)

        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def execute_campaign(campaign):
    """Execute a campaign - search jobs, find contacts, send emails"""
    try:
        log_activity(campaign.id, 'campaign_started', f'Campaign "{campaign.name}" started', 'success')

        # Get API keys from settings
        google_api_key = get_setting('google_api_key')
        google_cx = get_setting('google_cx_code')
        apollo_api_key = get_setting('apollo_api_key')

        if not all([google_api_key, google_cx, apollo_api_key]):
            return {'success': False, 'message': 'API keys not configured. Please check settings.'}

        # Initialize services
        google_search = GoogleSearchService(google_api_key, google_cx)
        apollo_api = ApolloAPIService(apollo_api_key)

        # Search for jobs
        jobs = google_search.search_jobs(campaign.search_keywords, campaign.jobs_per_run)

        if not jobs:
            log_activity(campaign.id, 'no_jobs_found', 'No jobs found for search criteria', 'warning')
            return {'success': False, 'message': 'No jobs found'}

        processed = 0
        emails_sent = 0

        for job in jobs:
            try:
                # Extract company domain
                domain = google_search.extract_company_from_url(job['link'])
                if not domain:
                    continue

                # Get company info from Apollo
                org_data = apollo_api.search_organization(domain)
                if not org_data:
                    continue

                # Check company size
                if not apollo_api.check_company_size(
                    org_data['estimated_num_employees'],
                    campaign.company_size_min,
                    campaign.company_size_max
                ):
                    continue

                # Find CEO/Owner contacts
                contacts = apollo_api.find_contacts(domain)
                if not contacts:
                    continue

                # Use first contact (highest ranking)
                contact = contacts[0]

                # Generate email
                email_data = email_generator.generate_email(
                    job_data={
                        'job_title': job['title'],
                        'company_name': org_data['name'],
                        'job_url': job['link']
                    },
                    contact_data=contact
                )

                # Save to database
                lead = JobLead(
                    campaign_id=campaign.id,
                    job_title=job['title'],
                    company_name=org_data['name'],
                    company_size=str(org_data['estimated_num_employees']),
                    job_url=job['link'],
                    contact_name=contact['name'],
                    contact_title=contact['title'],
                    contact_email=contact['email'],
                    email_subject=email_data['subject'],
                    email_body=email_data['body'],
                    status='ready'
                )

                db.session.add(lead)
                db.session.commit()

                # Send email if contact email exists
                if contact['email']:
                    sender_email = get_setting('sender_email')
                    if sender_email:
                        sender = EmailSender(
                            get_setting('azure_client_id'),
                            get_setting('azure_client_secret'),
                            get_setting('azure_tenant_id')
                        )

                        send_result = sender.send_email(
                            contact['email'],
                            email_data['subject'],
                            email_data['body'],
                            sender_email
                        )

                        if send_result['success']:
                            lead.email_sent = True
                            lead.email_sent_at = datetime.utcnow()
                            lead.status = 'contacted'
                            db.session.commit()
                            emails_sent += 1

                            # Log to Google Sheets
                            spreadsheet_id = get_setting('google_spreadsheet_id')
                            if spreadsheet_id:
                                sheets_logger = SheetsLogger()
                                sheets_logger.log_job_lead(spreadsheet_id, {
                                    'campaign_name': campaign.name,
                                    'job_title': lead.job_title,
                                    'company_name': lead.company_name,
                                    'company_size': lead.company_size,
                                    'job_url': lead.job_url,
                                    'contact_name': lead.contact_name,
                                    'contact_title': lead.contact_title,
                                    'contact_email': lead.contact_email,
                                    'email_sent': lead.email_sent,
                                    'email_subject': lead.email_subject,
                                    'status': lead.status,
                                    'notes': ''
                                })

                processed += 1

            except Exception as e:
                print(f"Error processing job: {str(e)}")
                continue

        log_activity(
            campaign.id,
            'campaign_completed',
            f'Processed {processed} jobs, sent {emails_sent} emails',
            'success'
        )

        return {
            'success': True,
            'processed': processed,
            'emails_sent': emails_sent,
            'message': f'Campaign completed. Processed {processed} leads, sent {emails_sent} emails.'
        }

    except Exception as e:
        log_activity(campaign.id, 'campaign_failed', str(e), 'error')
        return {'success': False, 'message': str(e)}

def run_campaign_job(campaign_id):
    """Background job to run campaign (called by scheduler)"""
    with app.app_context():
        campaign = Campaign.query.get(campaign_id)
        if campaign:
            execute_campaign(campaign)

# Email Templates API
@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get all email templates"""
    templates = EmailTemplate.query.all()
    return jsonify([{
        'id': t.id,
        'name': t.name,
        'subject_template': t.subject_template,
        'body_template': t.body_template,
        'is_default': t.is_default
    } for t in templates])

@app.route('/api/templates', methods=['POST'])
def create_template():
    """Create email template"""
    try:
        data = request.json
        template = EmailTemplate(
            name=data['name'],
            subject_template=data['subject_template'],
            body_template=data['body_template'],
            is_default=data.get('is_default', False)
        )

        db.session.add(template)
        db.session.commit()

        return jsonify({'success': True, 'template_id': template.id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

# Job Leads API
@app.route('/api/leads', methods=['GET'])
def get_leads():
    """Get all job leads with optional filters"""
    campaign_id = request.args.get('campaign_id')
    status = request.args.get('status')
    sent = request.args.get('sent')
    limit = request.args.get('limit', type=int)

    query = JobLead.query

    if campaign_id:
        query = query.filter_by(campaign_id=campaign_id)
    
    if status:
        query = query.filter_by(status=status)
    
    if sent == 'true':
        query = query.filter_by(email_sent=True)
    elif sent == 'false':
        query = query.filter_by(email_sent=False)
    
    query = query.order_by(JobLead.created_at.desc())
    
    if limit:
        query = query.limit(limit)
    
    leads = query.all()

    return jsonify([{
        'id': l.id,
        'campaign_id': l.campaign_id,
        'job_title': l.job_title,
        'company_name': l.company_name,
        'company_size': l.company_size,
        'job_url': l.job_url,
        'contact_name': l.contact_name,
        'contact_title': l.contact_title,
        'contact_email': l.contact_email,
        'email_subject': l.email_subject,
        'email_body': l.email_body,
        'email_sent': l.email_sent,
        'email_sent_at': l.email_sent_at.isoformat() if l.email_sent_at else None,
        'status': l.status,
        'created_at': l.created_at.isoformat()
    } for l in leads])

# Activity Logs API
@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get activity logs"""
    limit = request.args.get('limit', 50, type=int)
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()

    return jsonify([{
        'id': l.id,
        'campaign_id': l.campaign_id,
        'action': l.action,
        'details': l.details,
        'status': l.status,
        'created_at': l.created_at.isoformat()
    } for l in logs])

# ==================== PIPELINE API ====================

def extract_domain(url):
    """Extract domain from URL"""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        # Handle cases like jobs.company.com
        parts = domain.split('.')
        if len(parts) > 2:
            # Return last two parts (company.com)
            return '.'.join(parts[-2:])
        return domain
    except:
        return None

@app.route('/api/pipeline/search', methods=['POST'])
def pipeline_search():
    """Step 1: Search for individual LinkedIn job postings and extract company information"""
    try:
        data = request.json
        keywords = data.get('keywords', '')
        num_results = int(data.get('num_results', 10))

        google_api_key = get_setting('google_api_key')
        google_cx = get_setting('google_cx_code')

        if not google_api_key or not google_cx:
            return jsonify({
                'success': False,
                'message': 'Google API not configured. Go to Settings to add your API keys.'
            })

        google_search = GoogleSearchService(google_api_key, google_cx, use_vector_search=True)
        job_parser = JobParserService(google_api_key, google_cx)

        print(f"\n[SEARCH] Starting LinkedIn job search for: '{keywords}'")
        print(f"[STATS] Requesting {num_results} individual job postings\n")

        # Search for individual LinkedIn job postings only (with vector search enabled)
        search_results = google_search.search_linkedin_jobs(keywords, num_results, use_enhanced_search=True)

        if not search_results:
            return jsonify({
                'success': False,
                'message': 'No LinkedIn jobs found. Try different keywords or check your Google API quota.'
            })

        print(f"\n[OK] Found {len(search_results)} LinkedIn job postings")
        print("="*60)

        # Parse each search result to extract job and company information
        formatted_jobs = []
        seen_companies = set()

        # Import vector search for validation
        from services.vector_search import VectorSearchService
        validator = VectorSearchService() if google_search.use_vector_search else None

        for idx, result in enumerate(search_results, 1):
            print(f"\n[{idx}/{len(search_results)}] Processing: {result.get('title', '')[:60]}...")

            # Parse job data to extract company name and job title
            parsed_job = job_parser.parse_job_data(result)

            company_name = parsed_job['company_name']
            job_title = parsed_job['job_title']

            # Skip if we couldn't extract company name
            if company_name == "Unknown Company":
                print(f"   [WARN] Skipping - could not extract company name")
                continue

            # Validate parsed job title if vector search is enabled
            if validator:
                # Create a validation result with the parsed job title
                validation_result = {
                    'title': job_title,
                    'snippet': parsed_job['job_snippet'],
                    'link': parsed_job['job_link']
                }
                is_valid, quality_score, reason = validator.validate_job_result(validation_result)

                if not is_valid or quality_score < 0.4:
                    print(f"   [ERROR] Invalid job (score: {quality_score:.2f}): {reason}")
                    print(f"      Job title: {job_title[:60]}")
                    continue
                else:
                    print(f"   [OK] Valid job (quality: {quality_score:.2f})")

            # Skip duplicate companies (same company, different job)
            if company_name.lower() in seen_companies:
                print(f"   [WARN] Skipping duplicate company: {company_name}")
                continue

            # Find company domain
            print(f"   [SEARCH] Finding domain for: {company_name}")
            domain = job_parser.find_company_domain(company_name)

            if not domain:
                print(f"   [WARN] Could not find domain for company: {company_name}")
                continue

            seen_companies.add(company_name.lower())

            formatted_jobs.append({
                'title': parsed_job['job_title'],
                'link': result.get('link', ''),
                'snippet': parsed_job['job_snippet'],
                'domain': domain,
                'platform': 'LinkedIn',
                'company_name': company_name
            })

            print(f"   [OK] Added: {parsed_job['job_title']} at {company_name}")
            print(f"   [WEB] Domain: {domain}")

        print("\n" + "="*60)
        print(f"[RESULT] Final Results: {len(formatted_jobs)} unique companies with job openings\n")

        log_activity(None, 'pipeline_search', f'Found {len(formatted_jobs)} LinkedIn jobs for "{keywords}"', 'success')

        return jsonify({
            'success': True,
            'jobs': formatted_jobs,
            'count': len(formatted_jobs)
        })

    except Exception as e:
        print(f"\n[ERROR] Pipeline search error: {str(e)}")
        import traceback
        traceback.print_exc()
        log_activity(None, 'pipeline_search', str(e), 'error')
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/pipeline/company', methods=['POST'])
def pipeline_company():
    """Step 2: Get and enrich company details from Apollo"""
    try:
        data = request.json
        domain = data.get('domain')
        min_employees = int(data.get('min_employees', 50))
        max_employees = int(data.get('max_employees', 500))

        apollo_api_key = get_setting('apollo_api_key')

        if not apollo_api_key:
            return jsonify({
                'success': False,
                'message': 'Apollo API not configured. Go to Settings.'
            })

        print(f"\n[COMPANY] Enriching company: {domain}")

        apollo = ApolloAPIService(apollo_api_key)

        # Use enrich_organization to get full company details
        org_data = apollo.enrich_organization(domain)

        if not org_data:
            # Fallback to search if enrich doesn't work
            org_data = apollo.search_organization(domain)

        if not org_data:
            return jsonify({
                'success': False,
                'message': f'Company not found for domain: {domain}'
            })

        # Check company size
        employees = org_data.get('estimated_num_employees', 0)
        if employees < min_employees or employees > max_employees:
            return jsonify({
                'success': False,
                'message': f'Company size ({employees} employees) outside range ({min_employees}-{max_employees})'
            })

        print(f"[OK] Company enriched: {org_data.get('name')} ({employees} employees)")

        return jsonify({
            'success': True,
            'company': {
                # Basic Info
                'id': org_data.get('id', ''),
                'name': org_data.get('name', 'Unknown'),
                'domain': domain,
                'website_url': org_data.get('website_url', f'https://{domain}'),
                'logo_url': org_data.get('logo_url', ''),
                'description': org_data.get('short_description', ''),
                'seo_description': org_data.get('seo_description', ''),
                
                # Size & Industry
                'employees': employees,
                'industry': org_data.get('industry', ''),
                'subindustry': org_data.get('subindustry', ''),
                'founded_year': org_data.get('founded_year', ''),
                'keywords': org_data.get('keywords', []),
                
                # Financial
                'annual_revenue': org_data.get('annual_revenue_printed', ''),
                'total_funding': org_data.get('total_funding_printed', ''),
                'latest_funding_round': org_data.get('latest_funding_round_type', ''),
                'latest_funding_amount': org_data.get('latest_funding_amount', ''),
                'latest_funding_date': org_data.get('latest_funding_date', ''),
                'publicly_traded': org_data.get('publicly_traded_symbol', ''),
                
                # Location
                'city': org_data.get('city', ''),
                'state': org_data.get('state', ''),
                'country': org_data.get('country', ''),
                'address': org_data.get('raw_address', ''),
                'phone': org_data.get('phone', ''),
                
                # Social & Links
                'linkedin': org_data.get('linkedin_url', ''),
                'twitter': org_data.get('twitter_url', ''),
                'facebook': org_data.get('facebook_url', ''),
                'crunchbase': org_data.get('crunchbase_url', ''),
                
                # Tech Stack
                'technologies': org_data.get('technology_names', []),
                
                # Department headcounts
                'department_headcount': org_data.get('departmental_head_count', {})
            }
        })

    except Exception as e:
        print(f"[ERROR] Error enriching company: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/pipeline/contact', methods=['POST'])
def pipeline_contact():
    """Step 3: Find and enrich decision maker contacts with email reveal"""
    try:
        data = request.json
        domain = data.get('domain')
        role_type = data.get('role_type', 'executive')  # executive, tech, hr, sales, marketing, finance, all
        per_page = int(data.get('per_page', 10))
        reveal_all = data.get('reveal_all', False)  # Whether to reveal emails for all contacts

        apollo_api_key = get_setting('apollo_api_key')

        if not apollo_api_key:
            return jsonify({'success': False, 'message': 'Apollo API not configured'})

        print(f"\n[CONTACT] Finding {role_type} decision makers for: {domain}")

        apollo = ApolloAPIService(apollo_api_key)

        # Find contacts using role-based search (without email reveal first to save credits)
        contacts = apollo.find_contacts_by_role(
            domain=domain, 
            role_type=role_type, 
            per_page=per_page,
            reveal_emails=False
        )

        if not contacts:
            return jsonify({
                'success': False,
                'message': f'No {role_type} contacts found'
            })

        # Format all contacts for response
        formatted_contacts = []
        for contact in contacts:
            formatted_contacts.append({
                'id': contact.get('id', ''),
                'name': contact.get('name', 'Unknown'),
                'first_name': contact.get('first_name', ''),
                'last_name': contact.get('last_name', ''),
                'title': contact.get('title', ''),
                'role_category': contact.get('role_category', 'Other'),
                'email': contact.get('email', ''),
                'email_status': contact.get('email_status', ''),
                'phone_numbers': contact.get('phone_numbers', []),
                'linkedin': contact.get('linkedin_url', ''),
                'twitter': contact.get('twitter_url', ''),
                'company': contact.get('organization_name', ''),
                'city': contact.get('city', ''),
                'state': contact.get('state', ''),
                'country': contact.get('country', ''),
                'seniority': contact.get('seniority', ''),
                'departments': contact.get('departments', []),
                'photo_url': contact.get('photo_url', ''),
                'email_revealed': False
            })

        # Get the primary contact (first one, usually highest ranking)
        primary_contact = formatted_contacts[0]

        print(f"[OK] Found {len(formatted_contacts)} contacts, primary: {primary_contact.get('name')} - {primary_contact.get('title')}")
        print(f"[LOCK] Unlocking email for primary contact...")

        # Reveal email for primary contact
        enriched_contact = apollo.enrich_person(
            person_id=primary_contact.get('id'),
            domain=domain,  # Pass domain for guessed emails
            reveal_emails=True
        )

        if enriched_contact:
            if enriched_contact.get('email'):
                primary_contact['email'] = enriched_contact.get('email')
                primary_contact['email_status'] = enriched_contact.get('email_status', 'verified')
                primary_contact['email_revealed'] = True
                print(f"[OK] Email unlocked: {primary_contact['email']}")
            else:
                # No email from Apollo - include status and guessed emails
                primary_contact['email_status'] = enriched_contact.get('email_status', 'unavailable')
                primary_contact['email_status_explanation'] = enriched_contact.get('email_status_explanation', '')
                primary_contact['guessed_emails'] = enriched_contact.get('guessed_emails', [])
                print(f"[WARN] No email from Apollo - status: {primary_contact['email_status']}")
                if primary_contact.get('guessed_emails'):
                    print(f"[TIP] Suggested emails: {', '.join(primary_contact['guessed_emails'][:3])}")
            
            formatted_contacts[0] = primary_contact
        
        # If reveal_all is True, reveal emails for all contacts
        if reveal_all and len(formatted_contacts) > 1:
            print(f"\n[LOCK] Revealing emails for remaining {len(formatted_contacts) - 1} contacts...")
            for i, contact in enumerate(formatted_contacts[1:], 1):
                enriched = apollo.enrich_person(
                    person_id=contact.get('id'),
                    domain=domain,
                    reveal_emails=True
                )
                if enriched:
                    if enriched.get('email'):
                        formatted_contacts[i]['email'] = enriched.get('email')
                        formatted_contacts[i]['email_status'] = enriched.get('email_status', 'verified')
                        formatted_contacts[i]['email_revealed'] = True
                    else:
                        formatted_contacts[i]['email_status'] = enriched.get('email_status', 'unavailable')
                        formatted_contacts[i]['guessed_emails'] = enriched.get('guessed_emails', [])

        return jsonify({
            'success': True,
            'contact': primary_contact,
            'all_contacts': formatted_contacts,
            'total_found': len(formatted_contacts),
            'role_type': role_type
        })

    except Exception as e:
        print(f"[ERROR] Error finding contact: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/pipeline/reveal-email', methods=['POST'])
def pipeline_reveal_email():
    """Step 3.5: Reveal contact email using Apollo /v1/people/match (uses credits)"""
    try:
        data = request.json
        person_id = data.get('person_id')

        apollo_api_key = get_setting('apollo_api_key')

        if not apollo_api_key:
            return jsonify({'success': False, 'message': 'Apollo API not configured'})

        if not person_id:
            return jsonify({'success': False, 'message': 'Person ID required'})

        print(f"\n[LOCK] Manual email reveal requested for person ID: {person_id}")

        apollo = ApolloAPIService(apollo_api_key)

        # Use enrich_person which calls /v1/people/match
        enriched = apollo.enrich_person(person_id=person_id, reveal_emails=True)

        if enriched and enriched.get('email'):
            email = enriched['email']
            log_activity(None, 'email_revealed', f'Email revealed via Apollo: {email}', 'success')

            return jsonify({
                'success': True,
                'email': email,
                'email_status': enriched.get('email_status', 'unknown'),
                'full_contact': enriched
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Apollo did not return an email. Check console logs for details.'
            })

    except Exception as e:
        print(f"[ERROR] Error in reveal-email endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/pipeline/company-name-search', methods=['POST'])
def pipeline_company_name_search():
    """Search for companies by name and location"""
    try:
        data = request.json
        company_name = data.get('company_name', '')
        location = data.get('location', '')
        min_employees = data.get('min_employees')
        max_employees = data.get('max_employees')

        if not company_name:
            return jsonify({
                'success': False,
                'message': 'Company name is required'
            })

        apollo_api_key = get_setting('apollo_api_key')

        if not apollo_api_key:
            return jsonify({
                'success': False,
                'message': 'Apollo API not configured. Go to Settings.'
            })

        print(f"\n[COMPANY SEARCH] Searching for: {company_name}")
        if location:
            print(f"   Location filter: {location}")

        apollo = ApolloAPIService(apollo_api_key)

        # Search for companies by name and location
        companies = apollo.search_companies_by_name(
            company_name=company_name,
            location=location if location else None,
            min_employees=int(min_employees) if min_employees else None,
            max_employees=int(max_employees) if max_employees else None,
            per_page=10
        )

        if not companies:
            return jsonify({
                'success': False,
                'message': f'No companies found matching "{company_name}"' + (f' in {location}' if location else '')
            })

        print(f"[OK] Found {len(companies)} companies")

        log_activity(None, 'company_search', f'Searched for company: {company_name}', 'success')

        return jsonify({
            'success': True,
            'companies': companies,
            'count': len(companies)
        })

    except Exception as e:
        print(f"[ERROR] Company search error: {str(e)}")
        import traceback
        traceback.print_exc()
        log_activity(None, 'company_search_error', str(e), 'error')
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/pipeline/company-employees', methods=['POST'])
def pipeline_company_employees():
    """Find employees at a specific company and reveal their emails"""
    try:
        data = request.json
        domain = data.get('domain')
        company_name = data.get('company_name')
        role_type = data.get('role_type', 'all')  # all, executive, tech, hr, sales, etc.
        per_page = int(data.get('per_page', 25))
        reveal_emails = data.get('reveal_emails', True)

        if not domain:
            return jsonify({
                'success': False,
                'message': 'Company domain is required'
            })

        apollo_api_key = get_setting('apollo_api_key')

        if not apollo_api_key:
            return jsonify({
                'success': False,
                'message': 'Apollo API not configured. Go to Settings.'
            })

        print(f"\n[EMPLOYEE SEARCH] Finding employees at: {company_name or domain}")
        print(f"   Role type: {role_type}")
        print(f"   Results limit: {per_page}")
        print(f"   Reveal emails: {reveal_emails}")

        apollo = ApolloAPIService(apollo_api_key)

        # Find employees by role type
        employees = apollo.find_contacts_by_role(
            domain=domain,
            role_type=role_type,
            per_page=per_page,
            reveal_emails=reveal_emails
        )

        if not employees:
            return jsonify({
                'success': False,
                'message': f'No employees found at {company_name or domain}'
            })

        # Format employee data
        formatted_employees = []
        for emp in employees:
            formatted_employees.append({
                'id': emp.get('id', ''),
                'name': emp.get('name', ''),
                'first_name': emp.get('first_name', ''),
                'last_name': emp.get('last_name', ''),
                'title': emp.get('title', ''),
                'role_category': emp.get('role_category', 'Other'),
                'email': emp.get('email', ''),
                'email_status': emp.get('email_status', ''),
                'phone_numbers': emp.get('phone_numbers', []),
                'linkedin': emp.get('linkedin_url', ''),
                'city': emp.get('city', ''),
                'state': emp.get('state', ''),
                'country': emp.get('country', ''),
                'seniority': emp.get('seniority', ''),
                'departments': emp.get('departments', []),
                'photo_url': emp.get('photo_url', '')
            })

        print(f"[OK] Found {len(formatted_employees)} employees")

        log_activity(None, 'employee_search',
                    f'Found {len(formatted_employees)} employees at {company_name or domain}',
                    'success')

        return jsonify({
            'success': True,
            'employees': formatted_employees,
            'count': len(formatted_employees),
            'company_name': company_name,
            'domain': domain
        })

    except Exception as e:
        print(f"[ERROR] Employee search error: {str(e)}")
        import traceback
        traceback.print_exc()
        log_activity(None, 'employee_search_error', str(e), 'error')
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/pipeline/generate-email', methods=['POST'])
def pipeline_generate_email():
    """Step 4: Generate personalized email"""
    try:
        data = request.json
        job = data.get('job', {})
        company = data.get('company', {})
        contact = data.get('contact', {})
        
        # Generate email using AI
        email_data = email_generator.generate_email(
            job_data={
                'job_title': job.get('title', 'position'),
                'company_name': company.get('name', 'your company'),
                'job_url': job.get('link', '')
            },
            contact_data=contact
        )
        
        # Save as a new lead
        lead = JobLead(
            job_title=job.get('title'),
            company_name=company.get('name'),
            company_size=str(company.get('employees', '')),
            job_url=job.get('link'),
            contact_name=contact.get('name'),
            contact_title=contact.get('title'),
            contact_email=contact.get('email'),
            email_subject=email_data['subject'],
            email_body=email_data['body'],
            status='ready'
        )
        
        db.session.add(lead)
        db.session.commit()
        
        log_activity(None, 'lead_created', f'Lead created for {company.get("name")}', 'success')
        
        return jsonify({
            'success': True,
            'lead_id': lead.id,
            'email': email_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== ENHANCED LEADS API ====================

@app.route('/api/leads/<int:lead_id>', methods=['GET'])
def get_lead_detail(lead_id):
    """Get single lead details"""
    lead = JobLead.query.get_or_404(lead_id)
    return jsonify({
        'id': lead.id,
        'campaign_id': lead.campaign_id,
        'job_title': lead.job_title,
        'company_name': lead.company_name,
        'company_size': lead.company_size,
        'job_url': lead.job_url,
        'contact_name': lead.contact_name,
        'contact_title': lead.contact_title,
        'contact_email': lead.contact_email,
        'email_subject': lead.email_subject,
        'email_body': lead.email_body,
        'email_sent': lead.email_sent,
        'email_sent_at': lead.email_sent_at.isoformat() if lead.email_sent_at else None,
        'status': lead.status,
        'notes': lead.notes,
        'created_at': lead.created_at.isoformat(),
        'updated_at': lead.updated_at.isoformat() if lead.updated_at else None
    })

@app.route('/api/leads/<int:lead_id>', methods=['PUT'])
def update_lead(lead_id):
    """Update lead details"""
    try:
        lead = JobLead.query.get_or_404(lead_id)
        data = request.json
        
        if 'email_subject' in data:
            lead.email_subject = data['email_subject']
        if 'email_body' in data:
            lead.email_body = data['email_body']
        if 'status' in data:
            lead.status = data['status']
        if 'notes' in data:
            lead.notes = data['notes']
        
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/leads/<int:lead_id>/send', methods=['POST'])
def send_lead_email(lead_id):
    """Send email for a specific lead"""
    try:
        lead = JobLead.query.get_or_404(lead_id)
        data = request.json or {}
        
        # Allow overriding subject/body
        subject = data.get('subject', lead.email_subject)
        body = data.get('body', lead.email_body)
        
        if not lead.contact_email:
            return jsonify({'success': False, 'message': 'No email address for this contact'})
        
        # Get email sender settings
        client_id = get_setting('azure_client_id')
        client_secret = get_setting('azure_client_secret')
        tenant_id = get_setting('azure_tenant_id')
        sender_email = get_setting('sender_email')
        
        if not all([client_id, client_secret, tenant_id, sender_email]):
            return jsonify({'success': False, 'message': 'Email settings not configured. Go to Settings.'})
        
        sender = EmailSender(client_id, client_secret, tenant_id)
        result = sender.send_email(
            lead.contact_email,
            subject,
            body,
            sender_email
        )
        
        if result.get('success'):
            lead.email_sent = True
            lead.email_sent_at = datetime.utcnow()
            lead.email_subject = subject
            lead.email_body = body
            lead.status = 'contacted'
            db.session.commit()
            
            log_activity(None, 'email_sent', f'Email sent to {lead.contact_name} at {lead.company_name}', 'success')
            
            return jsonify({'success': True, 'message': 'Email sent successfully'})
        else:
            return jsonify({'success': False, 'message': result.get('message', 'Failed to send email')})
        
    except Exception as e:
        log_activity(None, 'email_failed', str(e), 'error')
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/leads/<int:lead_id>/skip', methods=['POST'])
def skip_lead(lead_id):
    """Skip a lead"""
    try:
        lead = JobLead.query.get_or_404(lead_id)
        lead.status = 'skipped'
        db.session.commit()

        log_activity(None, 'lead_skipped', f'Skipped lead: {lead.company_name}', 'info')

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== AI FEATURES API ====================

@app.route('/api/ai/score-lead', methods=['POST'])
def ai_score_lead():
    """Score a single lead using AI"""
    try:
        data = request.json
        lead_data = data.get('lead', {})
        query = data.get('query', '')

        scoring = ai_lead_scorer.score_lead(lead_data, query)

        return jsonify({
            'success': True,
            'scoring': scoring
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai/score-leads-batch', methods=['POST'])
def ai_score_leads_batch():
    """Score multiple leads at once"""
    try:
        data = request.json
        leads = data.get('leads', [])
        query = data.get('query', '')

        scored_leads = ai_lead_scorer.batch_score_leads(leads, query)

        return jsonify({
            'success': True,
            'leads': scored_leads,
            'distribution': ai_lead_scorer.get_lead_priority_distribution(scored_leads)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai/research-company', methods=['POST'])
def ai_research_company():
    """AI-powered company research"""
    try:
        from services.ai_research_agent import AIResearchAgent

        data = request.json
        company_name = data.get('company_name', '')
        company_domain = data.get('company_domain', '')
        company_data = data.get('company_data', {})
        mode = data.get('mode', 'quick')  # 'quick' or 'full'

        google_api_key = get_setting('google_api_key')
        google_cx = get_setting('google_cx_code')

        researcher = AIResearchAgent(google_api_key, google_cx)

        if mode == 'quick':
            research = researcher.quick_research(company_name, company_data)
        else:
            research = researcher.research_company(company_name, company_domain, company_data)

        return jsonify({
            'success': True,
            'research': research
        })
    except Exception as e:
        print(f"Research error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_analytics():
    """Get enhanced analytics for dashboard"""
    try:
        # Get all leads
        all_leads = JobLead.query.all()
        campaigns = Campaign.query.all()

        # Basic stats
        total_leads = len(all_leads)
        emails_sent = sum(1 for l in all_leads if l.email_sent)

        # Response rate (mock for now - would need reply tracking)
        response_rate = 0.15  # 15% placeholder

        # Leads by status
        status_distribution = {}
        for lead in all_leads:
            status = lead.status or 'unknown'
            status_distribution[status] = status_distribution.get(status, 0) + 1

        # Recent activity trend (last 7 days)
        from datetime import timedelta
        today = datetime.utcnow()
        week_ago = today - timedelta(days=7)

        recent_leads = [l for l in all_leads if l.created_at >= week_ago]

        # Group by date
        daily_stats = {}
        for i in range(7):
            date = (today - timedelta(days=i)).date()
            daily_stats[date.isoformat()] = {
                'leads': 0,
                'emails': 0
            }

        for lead in recent_leads:
            date_key = lead.created_at.date().isoformat()
            if date_key in daily_stats:
                daily_stats[date_key]['leads'] += 1
                if lead.email_sent:
                    daily_stats[date_key]['emails'] += 1

        analytics = {
            'overview': {
                'total_campaigns': len(campaigns),
                'active_campaigns': sum(1 for c in campaigns if c.status == 'active'),
                'total_leads': total_leads,
                'emails_sent': emails_sent,
                'response_rate': response_rate,
                'conversion_rate': (response_rate * 0.3)  # Mock 30% of responses convert
            },
            'status_distribution': status_distribution,
            'daily_trend': daily_stats,
            'top_performers': {
                'best_campaign': campaigns[0].name if campaigns else 'None',
                'most_responsive_industry': 'Technology'  # Mock
            }
        }

        return jsonify({
            'success': True,
            'analytics': analytics
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== AI AGENT CONFIGURATION API ====================

@app.route('/api/ai-agents/config', methods=['GET'])
def get_ai_agent_config():
    """Get current AI agent configuration"""
    try:
        from services.ai_agent_config import get_config
        config = get_config()
        return jsonify({
            'success': True,
            'config': config.export_config(),
            'summary': config.get_config_summary()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai-agents/config', methods=['POST'])
def update_ai_agent_config():
    """Update AI agent configuration"""
    try:
        from services.ai_agent_config import get_config
        config = get_config()

        data = request.json

        # Update individual settings
        if 'enabled' in data:
            config.set_enabled(data['enabled'])

        if 'model' in data:
            config.set_model(data['model'])

        if 'temperature' in data:
            config.set_temperature(data['temperature'])

        if 'contact_filter_min_confidence' in data:
            config.set_contact_filter_min_confidence(data['contact_filter_min_confidence'])

        if 'min_quality_score' in data:
            config.set_min_quality_score(data['min_quality_score'])

        if 'aggressive_mode' in data:
            config.set_aggressive_mode(data['aggressive_mode'])

        # Save configuration
        config.save_config()

        log_activity(None, 'ai_agent_config_updated', 'AI agent configuration updated', 'success')

        return jsonify({
            'success': True,
            'message': 'Configuration updated successfully',
            'summary': config.get_config_summary()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai-agents/config/preset/<preset_name>', methods=['POST'])
def apply_ai_agent_preset(preset_name):
    """Apply a configuration preset"""
    try:
        from services.ai_agent_config import get_config
        config = get_config()

        success = config.apply_preset(preset_name)

        if success:
            config.save_config()
            log_activity(None, 'ai_agent_preset_applied', f'Applied preset: {preset_name}', 'success')
            return jsonify({
                'success': True,
                'message': f'Preset "{preset_name}" applied successfully',
                'summary': config.get_config_summary()
            })
        else:
            return jsonify({
                'success': False,
                'message': f'Preset "{preset_name}" not found'
            })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai-agents/config/presets', methods=['GET'])
def get_ai_agent_presets():
    """Get available configuration presets"""
    try:
        from services.ai_agent_config import get_config
        config = get_config()
        presets = config.get_available_presets()

        return jsonify({
            'success': True,
            'presets': presets
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai-agents/config/reset', methods=['POST'])
def reset_ai_agent_config():
    """Reset configuration to defaults"""
    try:
        from services.ai_agent_config import reload_config
        config = reload_config()
        config.reset_to_defaults()
        config.save_config()

        log_activity(None, 'ai_agent_config_reset', 'AI agent configuration reset to defaults', 'success')

        return jsonify({
            'success': True,
            'message': 'Configuration reset to defaults',
            'summary': config.get_config_summary()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/ai-agents/stats', methods=['GET'])
def get_ai_agent_stats():
    """Get AI agent statistics and status"""
    try:
        from services.ai_agent_config import get_config
        config = get_config()

        # Try to check Ollama status
        import requests as req
        ollama_status = 'unknown'
        available_models = []

        try:
            response = req.get('http://localhost:11434/api/tags', timeout=2)
            if response.status_code == 200:
                ollama_status = 'running'
                models_data = response.json()
                available_models = [m['name'] for m in models_data.get('models', [])]
        except:
            ollama_status = 'not running'

        return jsonify({
            'success': True,
            'stats': {
                'config_summary': config.get_config_summary(),
                'ollama_status': ollama_status,
                'available_models': available_models,
                'current_model': config.get_model()
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ==================== LEAD ENGINE API ====================

@app.route('/api/lead-engine/generate', methods=['POST'])
def lead_engine_generate():
    """
    Lead Engine - Generate leads from job openings using Google Custom Search + Apollo
    Returns streaming JSON for real-time progress updates
    Integrates with Session Manager to save leads to sessions
    """
    from models import LeadSession, SessionLead
    request_data = request.json

    def generate():
        try:
            data = request_data

            # Extract parameters
            job_titles = data.get('job_titles', [])
            num_jobs = data.get('num_jobs', 100)
            locations = data.get('locations')
            industries = data.get('industries')
            keywords = data.get('keywords')
            company_sizes = data.get('company_sizes')
            poc_roles = data.get('poc_roles')
            session_id = data.get('session_id')  # Existing session ID
            session_title = data.get('session_title', 'Lead Search')

            if not job_titles:
                yield json.dumps({'type': 'error', 'message': 'Please enter at least one job title'}) + '\n'
                return

            print(f"\n[LEAD ENGINE API] Starting generation...")
            print(f"    Job Titles: {job_titles}")
            print(f"    Num Jobs: {num_jobs}")
            print(f"    Session ID: {session_id}")
            print(f"    Session Title: {session_title}")

            # Create or get session
            lead_session = None
            if session_id:
                lead_session = LeadSession.query.get(session_id)

            if not lead_session:
                # Create new session
                session_name = session_title if session_title else f"{', '.join(job_titles[:2])} - {datetime.now().strftime('%b %d, %Y %I:%M %p')}"
                lead_session = LeadSession(
                    name=session_name,
                    job_titles=json.dumps(job_titles),
                    locations=json.dumps(locations) if locations else '[]',
                    industries=json.dumps(industries) if industries else '[]',
                    keywords=json.dumps(keywords) if keywords else '[]',
                    company_sizes=json.dumps(company_sizes) if company_sizes else '[]',
                    status='processing'
                )
                db.session.add(lead_session)
                db.session.commit()
                print(f"    [SESSION] Created new session: {lead_session.id} - {lead_session.name}")
            else:
                lead_session.status = 'processing'
                db.session.commit()
                print(f"    [SESSION] Using existing session: {lead_session.id} - {lead_session.name}")

            # Send session info to client
            yield json.dumps({
                'type': 'session',
                'session_id': lead_session.id,
                'session_name': lead_session.name
            }) + '\n'

            # Initialize Lead Engine
            from services.lead_engine import get_lead_engine
            engine = get_lead_engine()

            # Track stats
            total_leads = 0
            total_pocs = 0
            total_emails = 0

            # Generate leads with streaming progress
            for update in engine.generate_leads(
                job_titles=job_titles,
                num_jobs=num_jobs,
                locations=locations,
                industries=industries,
                keywords=keywords,
                company_sizes=company_sizes,
                poc_roles=poc_roles,
                session_title=session_title
            ):
                # Save lead to session when we get a new lead
                if update.get('type') == 'lead':
                    lead_data = update.get('data', {})
                    company = lead_data.get('company', {})
                    pocs = lead_data.get('pocs', [])

                    try:
                        # Save lead to SessionLead
                        session_lead = SessionLead(
                            session_id=lead_session.id,
                            company_name=company.get('name', ''),
                            company_domain=company.get('domain', ''),
                            company_industry=company.get('industry', ''),
                            company_size=company.get('size', 0),
                            company_location=company.get('location', ''),
                            company_linkedin=company.get('linkedin_url', ''),
                            company_website=company.get('website', ''),
                            job_title=lead_data.get('job_opening', ''),
                            job_source=lead_data.get('source', ''),
                            job_url=lead_data.get('source_url', ''),
                            pocs=json.dumps(pocs)
                        )
                        db.session.add(session_lead)

                        # Update session stats
                        total_leads += 1
                        total_pocs += len(pocs)
                        total_emails += sum(1 for p in pocs if p.get('email') and 'email_not_unlocked' not in p.get('email', ''))

                        lead_session.total_leads = total_leads
                        lead_session.total_pocs = total_pocs
                        lead_session.total_emails = total_emails

                        db.session.commit()
                        print(f"    [SESSION] Saved lead: {company.get('name')} ({len(pocs)} POCs)")

                        # Also save to JobLead for backward compatibility
                        for poc in pocs:
                            try:
                                job_lead = JobLead(
                                    job_title=lead_data.get('job_opening', ''),
                                    company_name=company.get('name', ''),
                                    company_size=str(company.get('size', '')),
                                    job_url=lead_data.get('source_url', ''),
                                    contact_name=poc.get('name', ''),
                                    contact_title=poc.get('title', ''),
                                    contact_email=poc.get('email', ''),
                                    status='ready'
                                )
                                db.session.add(job_lead)
                            except Exception as db_err:
                                print(f"    [DB Error] JobLead: {db_err}")

                        db.session.commit()

                    except Exception as db_err:
                        print(f"    [DB Error] SessionLead: {db_err}")
                        db.session.rollback()

                yield json.dumps(update) + '\n'

            # Mark session as ready when complete
            lead_session.status = 'ready'
            db.session.commit()
            print(f"    [SESSION] Complete - {total_leads} leads, {total_pocs} POCs, {total_emails} emails")

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield json.dumps({'type': 'error', 'message': str(e)}) + '\n'

    return Response(stream_with_context(generate()), mimetype='application/x-ndjson')


# ==================== SENDER ACCOUNT ROUTES ====================

@app.route('/api/senders', methods=['GET'])
def get_senders():
    """Get all sender accounts"""
    senders = SenderAccount.query.order_by(SenderAccount.created_at.desc()).all()
    return jsonify([s.to_dict() for s in senders])


@app.route('/api/senders/<int:sender_id>', methods=['DELETE'])
def delete_sender(sender_id):
    """Delete a sender account"""
    sender = SenderAccount.query.get(sender_id)
    if not sender:
        return jsonify({'error': 'Sender not found'}), 404
    db.session.delete(sender)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/senders/<int:sender_id>/default', methods=['PUT'])
def set_default_sender(sender_id):
    """Set a sender as default"""
    SenderAccount.query.update({SenderAccount.is_default: False})
    sender = SenderAccount.query.get(sender_id)
    if not sender:
        return jsonify({'error': 'Sender not found'}), 404
    sender.is_default = True
    db.session.commit()
    return jsonify({'success': True, 'sender': sender.to_dict()})


@app.route('/api/senders/<int:sender_id>', methods=['PUT'])
def update_sender(sender_id):
    """Update sender label"""
    sender = SenderAccount.query.get(sender_id)
    if not sender:
        return jsonify({'error': 'Sender not found'}), 404
    data = request.json
    if 'label' in data:
        sender.label = data['label']
    db.session.commit()
    return jsonify({'success': True, 'sender': sender.to_dict()})


# ==================== GMAIL OAUTH ROUTES ====================

@app.route('/api/auth/gmail/start')
def gmail_oauth_start():
    """Start Gmail OAuth flow"""
    from google_auth_oauthlib.flow import Flow

    client_id = os.getenv('GOOGLE_OAUTH_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET')

    if not client_id or not client_secret:
        return jsonify({'error': 'Gmail OAuth not configured'}), 500

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost:5000/api/auth/gmail/callback"]
            }
        },
        scopes=[
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid'
        ]
    )
    flow.redirect_uri = 'http://localhost:5000/api/auth/gmail/callback'

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )

    session['oauth_state'] = state
    return jsonify({'auth_url': authorization_url})


@app.route('/api/auth/gmail/callback')
def gmail_oauth_callback():
    """Handle Gmail OAuth callback"""
    from google_auth_oauthlib.flow import Flow
    import google.auth.transport.requests
    from google.oauth2.credentials import Credentials

    client_id = os.getenv('GOOGLE_OAUTH_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET')

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost:5000/api/auth/gmail/callback"]
            }
        },
        scopes=[
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid'
        ]
    )
    flow.redirect_uri = 'http://localhost:5000/api/auth/gmail/callback'

    try:
        os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
        flow.fetch_token(authorization_response=request.url)
    except Exception as e:
        return redirect('http://localhost:3000/campaign-manager/sender-profile?error=' + str(e))

    credentials = flow.credentials

    # Get user email from Google
    import requests as req
    userinfo_response = req.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {credentials.token}'}
    )
    user_info = userinfo_response.json()
    user_email = user_info.get('email', '')

    if not user_email:
        return redirect('http://localhost:3000/campaign-manager/sender-profile?error=Could+not+get+email')

    # Save or update sender account
    sender = SenderAccount.query.filter_by(email=user_email).first()
    if sender:
        sender.access_token = credentials.token
        sender.refresh_token = credentials.refresh_token or sender.refresh_token
        sender.token_expiry = credentials.expiry
        sender.status = 'connected'
    else:
        sender = SenderAccount(
            email=user_email,
            label=user_email.split('@')[0].title(),
            provider='gmail',
            status='connected',
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_expiry=credentials.expiry
        )
        db.session.add(sender)

    db.session.commit()

    return redirect('http://localhost:3000/campaign-manager/sender-profile?success=true&email=' + user_email)


# Initialize database and create default data
def init_db():
    """Initialize database with default data"""
    with app.app_context():
        db.create_all()

        # Create default email template if none exists
        if EmailTemplate.query.count() == 0:
            default_template = EmailTemplate(
                name='Default Professional Template',
                subject_template='Top Talent Available for {job_title} at {company_name}',
                body_template='''Dear {contact_name},

I hope this email finds you well. I noticed that {company_name} is currently hiring for a {job_title} position, and I wanted to reach out.

We are a specialized recruitment agency with a pool of pre-vetted, highly qualified candidates who are actively seeking opportunities in this field. Our candidates have been thoroughly screened and are ready for immediate placement.

I'd love to discuss how we can support your hiring needs and potentially save you time in finding the right talent for this role.

Would you be open to a brief conversation this week?

Best regards,
Recruitment Team''',
                is_default=True
            )
            db.session.add(default_template)
            db.session.commit()

        print("Database initialized successfully!")

if __name__ == '__main__':
    init_db()

    # Load AI model in background
    print("Loading AI model...")
    email_generator.load_model()

    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
