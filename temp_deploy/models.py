from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    search_keywords = db.Column(db.Text, nullable=False)
    company_size_min = db.Column(db.Integer, default=50)
    company_size_max = db.Column(db.Integer, default=200)
    jobs_per_run = db.Column(db.Integer, default=10)
    email_template_id = db.Column(db.Integer, db.ForeignKey('email_template.id'))
    status = db.Column(db.String(50), default='draft')  # draft, active, paused, completed
    schedule_enabled = db.Column(db.Boolean, default=False)
    schedule_frequency = db.Column(db.String(50))  # daily, weekly, monthly
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmailTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    subject_template = db.Column(db.Text, nullable=False)
    body_template = db.Column(db.Text, nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class JobLead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'))
    job_title = db.Column(db.String(300))
    company_name = db.Column(db.String(200))
    company_size = db.Column(db.String(100))
    job_url = db.Column(db.Text)
    contact_name = db.Column(db.String(200))
    contact_title = db.Column(db.String(200))
    contact_email = db.Column(db.String(200))
    email_sent = db.Column(db.Boolean, default=False)
    email_sent_at = db.Column(db.DateTime)
    email_subject = db.Column(db.Text)
    email_body = db.Column(db.Text)
    status = db.Column(db.String(50), default='new')  # new, contacted, replied, skipped, failed
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text)
    status = db.Column(db.String(50))  # success, error, warning
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LeadSession(db.Model):
    """Session for Lead Engine - tracks each search session"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)

    # Search parameters (stored as JSON)
    job_titles = db.Column(db.Text)  # JSON array
    locations = db.Column(db.Text)  # JSON array
    industries = db.Column(db.Text)  # JSON array
    keywords = db.Column(db.Text)  # JSON array
    company_sizes = db.Column(db.Text)  # JSON array

    # Session stats
    total_leads = db.Column(db.Integer, default=0)
    total_pocs = db.Column(db.Integer, default=0)
    total_emails = db.Column(db.Integer, default=0)

    # Status: draft, processing, ready, sent, archived
    status = db.Column(db.String(50), default='draft')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to leads
    leads = db.relationship('SessionLead', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'job_titles': json.loads(self.job_titles) if self.job_titles else [],
            'locations': json.loads(self.locations) if self.locations else [],
            'industries': json.loads(self.industries) if self.industries else [],
            'keywords': json.loads(self.keywords) if self.keywords else [],
            'company_sizes': json.loads(self.company_sizes) if self.company_sizes else [],
            'total_leads': self.total_leads,
            'total_pocs': self.total_pocs,
            'total_emails': self.total_emails,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class SessionLead(db.Model):
    """Individual lead within a session"""
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('lead_session.id'), nullable=False)

    # Company information
    company_name = db.Column(db.String(200), nullable=False)
    company_domain = db.Column(db.String(200))
    company_industry = db.Column(db.String(200))
    company_size = db.Column(db.Integer)
    company_location = db.Column(db.String(300))
    company_linkedin = db.Column(db.Text)
    company_website = db.Column(db.Text)

    # Job source
    job_title = db.Column(db.String(300))
    job_source = db.Column(db.String(100))  # LinkedIn, Indeed, etc.
    job_url = db.Column(db.Text)

    # POCs stored as JSON array
    pocs = db.Column(db.Text)  # JSON array of POC objects

    # Lead status
    status = db.Column(db.String(50), default='new')  # new, contacted, replied, skipped
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'session_id': self.session_id,
            'company': {
                'name': self.company_name,
                'domain': self.company_domain,
                'industry': self.company_industry,
                'size': self.company_size,
                'location': self.company_location,
                'linkedin_url': self.company_linkedin,
                'website': self.company_website
            },
            'job_opening': self.job_title,
            'source': self.job_source,
            'source_url': self.job_url,
            'pocs': json.loads(self.pocs) if self.pocs else [],
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ManufacturingICPCampaign(db.Model):
    """Campaign for Manufacturing ICP lead generation"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)

    # Target counts for each tier
    t1_target = db.Column(db.Integer, default=20)
    t2_target = db.Column(db.Integer, default=20)
    t3_target = db.Column(db.Integer, default=10)

    # Filters configuration (stored as JSON)
    industries = db.Column(db.Text)  # JSON array of selected industries
    t1_titles = db.Column(db.Text)  # JSON array of T1 titles
    t2_titles = db.Column(db.Text)  # JSON array of T2 titles
    t3_titles = db.Column(db.Text)  # JSON array of T3 titles
    locations = db.Column(db.Text)  # JSON object with USA/India specifics
    size_min = db.Column(db.Integer, default=200)
    size_max = db.Column(db.Integer, default=10000)
    min_validation_score = db.Column(db.Integer, default=4)

    # Campaign status
    status = db.Column(db.String(50), default='draft')  # draft, in_progress, completed, failed

    # Results summary
    total_leads = db.Column(db.Integer, default=0)
    t1_generated = db.Column(db.Integer, default=0)
    t2_generated = db.Column(db.Integer, default=0)
    t3_generated = db.Column(db.Integer, default=0)
    avg_validation_score = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            't1_target': self.t1_target,
            't2_target': self.t2_target,
            't3_target': self.t3_target,
            'status': self.status,
            'total_leads': self.total_leads,
            't1_generated': self.t1_generated,
            't2_generated': self.t2_generated,
            't3_generated': self.t3_generated,
            'avg_validation_score': self.avg_validation_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class ManufacturingLead(db.Model):
    """Individual lead from Manufacturing ICP campaign"""
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('manufacturing_icp_campaign.id'), nullable=False)

    # Tier classification
    tier = db.Column(db.String(10), nullable=False)  # T1, T2, T3

    # Company information
    company_name = db.Column(db.String(200), nullable=False)
    company_domain = db.Column(db.String(200))
    company_size = db.Column(db.Integer)
    company_industry = db.Column(db.String(200))
    company_location = db.Column(db.String(200))
    company_revenue = db.Column(db.String(100))
    company_linkedin = db.Column(db.Text)
    company_website = db.Column(db.Text)

    # Contact information
    contact_name = db.Column(db.String(200), nullable=False)
    contact_title = db.Column(db.String(200), nullable=False)
    contact_email = db.Column(db.String(200))
    contact_phone = db.Column(db.String(100))
    contact_linkedin = db.Column(db.Text)
    email_status = db.Column(db.String(50))  # verified, guessed, unavailable

    # Validation checklist (stored as JSON)
    validation_score = db.Column(db.Integer)  # 0-6
    validation_details = db.Column(db.Text)  # JSON with checklist results

    # Lead status
    status = db.Column(db.String(50), default='new')  # new, contacted, replied, skipped
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        validation = json.loads(self.validation_details) if self.validation_details else {}

        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'tier': self.tier,
            'company': {
                'name': self.company_name,
                'domain': self.company_domain,
                'size': self.company_size,
                'industry': self.company_industry,
                'location': self.company_location,
                'revenue': self.company_revenue,
                'linkedin': self.company_linkedin,
                'website': self.company_website
            },
            'contact': {
                'name': self.contact_name,
                'title': self.contact_title,
                'email': self.contact_email,
                'phone': self.contact_phone,
                'linkedin': self.contact_linkedin,
                'email_status': self.email_status
            },
            'validation': {
                'score': self.validation_score,
                'max_score': 6,
                'percentage': round((self.validation_score / 6) * 100) if self.validation_score else 0,
                'checklist': validation.get('checklist', {}),
                'is_valid': self.validation_score >= 4
            },
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
