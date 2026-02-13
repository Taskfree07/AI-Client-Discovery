from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class SenderAccount(db.Model):
    """Connected email sender accounts via OAuth"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(200), unique=True, nullable=False)
    label = db.Column(db.String(200), default='')
    provider = db.Column(db.String(50), nullable=False)  # gmail, outlook, smtp
    status = db.Column(db.String(50), default='connected')  # connected, expired
    is_default = db.Column(db.Boolean, default=False)
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    token_expiry = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'label': self.label,
            'provider': self.provider,
            'status': self.status,
            'isDefault': self.is_default,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


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


# Email Sequence Models
class CampaignEmailSequence(db.Model):
    """Multi-step email sequence for a campaign"""
    __tablename__ = 'campaign_email_sequence'
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    sequence_name = db.Column(db.String(200))
    ai_personalization_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    steps = db.relationship('CampaignEmailStep', backref='sequence', cascade='all, delete-orphan', lazy=True, order_by='CampaignEmailStep.step_number')


class CampaignEmailStep(db.Model):
    """Individual step in an email sequence"""
    __tablename__ = 'campaign_email_step'
    id = db.Column(db.Integer, primary_key=True)
    sequence_id = db.Column(db.Integer, db.ForeignKey('campaign_email_sequence.id'), nullable=False)
    step_number = db.Column(db.Integer, nullable=False)
    email_template_id = db.Column(db.Integer, db.ForeignKey('email_template.id'), nullable=False)
    days_after_previous = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    template = db.relationship('EmailTemplate', backref='sequence_steps')
    __table_args__ = (db.UniqueConstraint('sequence_id', 'step_number', name='unique_step_number_per_sequence'),)


class LeadEmailState(db.Model):
    """Track email sending state for each lead in a campaign"""
    __tablename__ = 'lead_email_state'
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    lead_email = db.Column(db.String(200), nullable=False)
    lead_name = db.Column(db.String(200))
    lead_company = db.Column(db.String(200))
    lead_title = db.Column(db.String(200))
    current_step = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='pending')
    stopped_reason = db.Column(db.String(100))
    last_email_sent_at = db.Column(db.DateTime)
    next_email_scheduled_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('campaign_id', 'lead_email', name='unique_campaign_lead_email'),)


class EmailSendLog(db.Model):
    """Log of all emails sent"""
    __tablename__ = 'email_send_log'
    id = db.Column(db.Integer, primary_key=True)
    lead_email_state_id = db.Column(db.Integer, db.ForeignKey('lead_email_state.id'), nullable=False)
    step_number = db.Column(db.Integer, nullable=False)
    email_template_id = db.Column(db.Integer, db.ForeignKey('email_template.id'))
    subject = db.Column(db.Text)
    body = db.Column(db.Text)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='sent')
    opened_at = db.Column(db.DateTime)
    clicked_at = db.Column(db.DateTime)
    replied_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    lead_state = db.relationship('LeadEmailState', backref='email_logs')


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


