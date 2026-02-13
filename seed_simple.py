"""Simple seed script that doesn't import app.py"""
import os
import sys

# Set up the database path
os.environ['DATABASE_URL'] = 'sqlite:///instance/database.db'

# Import Flask and SQLAlchemy
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Create a minimal app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///instance/database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define EmailTemplate model
class EmailTemplate(db.Model):
    __tablename__ = 'email_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    subject_template = db.Column(db.Text, nullable=False)
    body_template = db.Column(db.Text, nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

print("Seeding email templates...")

with app.app_context():
    # Check count
    count = EmailTemplate.query.count()
    print(f"Current templates: {count}")

    if count > 1:
        print("Templates already exist!")
        sys.exit(0)

    templates = [
        # Manufacturing A
        {'name': 'Manufacturing A - Day 1 (Opener)', 'subject_template': 'Quick question about {{CompanyName}}\'s hiring', 'body_template': '''Hi {{FirstName}},

I noticed {{CompanyName}} and wanted to reach out quickly.

We specialize in placing {{JobTitle}} candidates in manufacturing. Most of our placements happen within 2 weeks because we pre-screen for technical fit and culture.

Would it make sense to connect for 10 minutes this week?

Best,
{{SenderName}}''', 'is_default': False},
        {'name': 'Manufacturing A - Day 3 (Follow-up)', 'subject_template': 'Re: {{CompanyName}} hiring', 'body_template': '''Hi {{FirstName}},

Following up from Monday. I know hiring {{JobTitle}} roles in manufacturing can be time-consuming.

We currently have 3 candidates who match your industry - all with 5+ years experience in similar environments.

Would Thursday or Friday work for a brief call?

{{SenderName}}''', 'is_default': False},
        {'name': 'Manufacturing A - Day 7 (Value)', 'subject_template': 'Top {{JobTitle}} candidates available', 'body_template': '''{{FirstName}},

Quick update: We just placed two {{JobTitle}} professionals at companies similar to {{CompanyName}}.

Both placements were filled within 14 days because we focus on pre-qualified candidates who are actively looking.

If you're hiring or planning to soon, let's connect. I can share profiles that might fit.

Thanks,
{{SenderName}}''', 'is_default': False},
        {'name': 'Manufacturing A - Day 11 (Breakup)', 'subject_template': 'Should I close your file?', 'body_template': '''Hi {{FirstName}},

Haven't heard back, so I'll assume the timing isn't right.

If things change and you need {{JobTitle}} candidates down the road, feel free to reach out.

Best of luck with your hiring!

{{SenderName}}''', 'is_default': False},

        # Manufacturing B
        {'name': 'Manufacturing B - Day 1 (Opener)', 'subject_template': '{{CompanyName}} - Manufacturing talent', 'body_template': '''Hi {{FirstName}},

I work with manufacturing companies on {{JobTitle}} placements.

We have candidates with experience in {{CompanyName}}'s industry who are looking for new opportunities.

Would you be open to a quick intro call this week?

{{SenderName}}''', 'is_default': False},
        {'name': 'Manufacturing B - Day 3 (Follow-up)', 'subject_template': 'Re: Manufacturing talent', 'body_template': '''{{FirstName}},

Wanted to follow up on my note from Monday.

We specialize in manufacturing roles and have a few {{JobTitle}} candidates available now. All have been pre-screened and are ready to interview.

Any interest in connecting?

{{SenderName}}''', 'is_default': False},
        {'name': 'Manufacturing B - Day 7 (Value)', 'subject_template': 'Manufacturing hiring taking too long?', 'body_template': '''Hi {{FirstName}},

Finding quality {{JobTitle}} candidates in manufacturing shouldn't take months.

Our average placement happens in under 3 weeks because we focus on active candidates who are ready to move.

Let me know if you'd like to see some profiles.

{{SenderName}}''', 'is_default': False},
        {'name': 'Manufacturing B - Day 11 (Breakup)', 'subject_template': 'Moving on', 'body_template': '''{{FirstName}},

I'll take your silence as a "not now" and close your file.

If you ever need {{JobTitle}} candidates, you know where to find me.

Good luck!

{{SenderName}}''', 'is_default': False},

        # SaaS/Product
        {'name': 'SaaS/Product - Day 1 (Opener A)', 'subject_template': '{{CompanyName}} hiring for {{JobTitle}}?', 'body_template': '''Hi {{FirstName}},

Saw {{CompanyName}} is growing and thought I'd reach out.

We place {{JobTitle}} professionals in tech and SaaS companies. Our candidates are actively interviewing and available within 2-4 weeks.

Open to a quick call this week?

{{SenderName}}''', 'is_default': False},
        {'name': 'SaaS/Product - Day 1 (Opener B)', 'subject_template': 'Quick question, {{FirstName}}', 'body_template': '''Hi {{FirstName}},

I specialize in {{JobTitle}} placements for SaaS companies like {{CompanyName}}.

We have candidates with experience at similar-stage companies who are looking for their next opportunity.

Would it make sense to connect?

{{SenderName}}''', 'is_default': True},
        {'name': 'SaaS/Product - Day 3 (Follow-up)', 'subject_template': 'Re: {{JobTitle}} candidates', 'body_template': '''{{FirstName}},

Following up on my note about {{JobTitle}} candidates.

We've successfully placed professionals at companies in your space. Most of our candidates come from referrals and are passively exploring.

Any interest in seeing a few profiles?

{{SenderName}}''', 'is_default': False},
        {'name': 'SaaS/Product - Day 7 (Value)', 'subject_template': 'Tech hiring moving slow?', 'body_template': '''Hi {{FirstName}},

Finding good {{JobTitle}} talent in tech can be a grind.

We focus on pre-vetted candidates who are already interviewing. Our average time-to-hire is 18 days.

If you're hiring now or soon, let's connect. I can share relevant profiles.

{{SenderName}}''', 'is_default': False},
        {'name': 'SaaS/Product - Day 11 (Breakup)', 'subject_template': 'Last note', 'body_template': '''{{FirstName}},

I'll assume the timing isn't right and close your file.

If you need {{JobTitle}} candidates in the future, feel free to reach out.

Best,
{{SenderName}}''', 'is_default': False}
    ]

    for tmpl_data in templates:
        template = EmailTemplate(**tmpl_data)
        db.session.add(template)

    db.session.commit()
    print(f"✓ Seeded {len(templates)} templates!")
    print(f"Total in DB: {EmailTemplate.query.count()}")
