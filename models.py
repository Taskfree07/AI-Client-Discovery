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
