"""Direct SQLite seed - bypasses Flask/SQLAlchemy completely"""
import sqlite3
from datetime import datetime

# Connect directly to the database
db_path = r'E:\Techgene\AI Client Discovery\instance\database.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current count
cursor.execute('SELECT COUNT(*) FROM email_template')
count = cursor.fetchone()[0]
print(f"Current templates: {count}")

if count > 1:
    print("✓ Templates already seeded!")
    conn.close()
    exit(0)

templates = [
    # Manufacturing A (4)
    ("Manufacturing A - Day 1 (Opener)", "Quick question about {{CompanyName}}'s hiring", "Hi {{FirstName}},\n\nI noticed {{CompanyName}} and wanted to reach out quickly.\n\nWe specialize in placing {{JobTitle}} candidates in manufacturing. Most of our placements happen within 2 weeks because we pre-screen for technical fit and culture.\n\nWould it make sense to connect for 10 minutes this week?\n\nBest,\n{{SenderName}}", 0),
    ("Manufacturing A - Day 3 (Follow-up)", "Re: {{CompanyName}} hiring", "Hi {{FirstName}},\n\nFollowing up from Monday. I know hiring {{JobTitle}} roles in manufacturing can be time-consuming.\n\nWe currently have 3 candidates who match your industry - all with 5+ years experience in similar environments.\n\nWould Thursday or Friday work for a brief call?\n\n{{SenderName}}", 0),
    ("Manufacturing A - Day 7 (Value)", "Top {{JobTitle}} candidates available", "{{FirstName}},\n\nQuick update: We just placed two {{JobTitle}} professionals at companies similar to {{CompanyName}}.\n\nBoth placements were filled within 14 days because we focus on pre-qualified candidates who are actively looking.\n\nIf you're hiring or planning to soon, let's connect. I can share profiles that might fit.\n\nThanks,\n{{SenderName}}", 0),
    ("Manufacturing A - Day 11 (Breakup)", "Should I close your file?", "Hi {{FirstName}},\n\nHaven't heard back, so I'll assume the timing isn't right.\n\nIf things change and you need {{JobTitle}} candidates down the road, feel free to reach out.\n\nBest of luck with your hiring!\n\n{{SenderName}}", 0),

    # Manufacturing B (4)
    ("Manufacturing B - Day 1 (Opener)", "{{CompanyName}} - Manufacturing talent", "Hi {{FirstName}},\n\nI work with manufacturing companies on {{JobTitle}} placements.\n\nWe have candidates with experience in {{CompanyName}}'s industry who are looking for new opportunities.\n\nWould you be open to a quick intro call this week?\n\n{{SenderName}}", 0),
    ("Manufacturing B - Day 3 (Follow-up)", "Re: Manufacturing talent", "{{FirstName}},\n\nWanted to follow up on my note from Monday.\n\nWe specialize in manufacturing roles and have a few {{JobTitle}} candidates available now. All have been pre-screened and are ready to interview.\n\nAny interest in connecting?\n\n{{SenderName}}", 0),
    ("Manufacturing B - Day 7 (Value)", "Manufacturing hiring taking too long?", "Hi {{FirstName}},\n\nFinding quality {{JobTitle}} candidates in manufacturing shouldn't take months.\n\nOur average placement happens in under 3 weeks because we focus on active candidates who are ready to move.\n\nLet me know if you'd like to see some profiles.\n\n{{SenderName}}", 0),
    ("Manufacturing B - Day 11 (Breakup)", "Moving on", "{{FirstName}},\n\nI'll take your silence as a \"not now\" and close your file.\n\nIf you ever need {{JobTitle}} candidates, you know where to find me.\n\nGood luck!\n\n{{SenderName}}", 0),

    # SaaS/Product (5)
    ("SaaS/Product - Day 1 (Opener A)", "{{CompanyName}} hiring for {{JobTitle}}?", "Hi {{FirstName}},\n\nSaw {{CompanyName}} is growing and thought I'd reach out.\n\nWe place {{JobTitle}} professionals in tech and SaaS companies. Our candidates are actively interviewing and available within 2-4 weeks.\n\nOpen to a quick call this week?\n\n{{SenderName}}", 0),
    ("SaaS/Product - Day 1 (Opener B)", "Quick question, {{FirstName}}", "Hi {{FirstName}},\n\nI specialize in {{JobTitle}} placements for SaaS companies like {{CompanyName}}.\n\nWe have candidates with experience at similar-stage companies who are looking for their next opportunity.\n\nWould it make sense to connect?\n\n{{SenderName}}", 1),  # Default
    ("SaaS/Product - Day 3 (Follow-up)", "Re: {{JobTitle}} candidates", "{{FirstName}},\n\nFollowing up on my note about {{JobTitle}} candidates.\n\nWe've successfully placed professionals at companies in your space. Most of our candidates come from referrals and are passively exploring.\n\nAny interest in seeing a few profiles?\n\n{{SenderName}}", 0),
    ("SaaS/Product - Day 7 (Value)", "Tech hiring moving slow?", "Hi {{FirstName}},\n\nFinding good {{JobTitle}} talent in tech can be a grind.\n\nWe focus on pre-vetted candidates who are already interviewing. Our average time-to-hire is 18 days.\n\nIf you're hiring now or soon, let's connect. I can share relevant profiles.\n\n{{SenderName}}", 0),
    ("SaaS/Product - Day 11 (Breakup)", "Last note", "{{FirstName}},\n\nI'll assume the timing isn't right and close your file.\n\nIf you need {{JobTitle}} candidates in the future, feel free to reach out.\n\nBest,\n{{SenderName}}", 0),
]

print(f"Seeding {len(templates)} templates...")

for name, subject, body, is_default in templates:
    cursor.execute('''
        INSERT INTO email_template (name, subject_template, body_template, is_default, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, subject, body, is_default, datetime.now()))

conn.commit()

# Verify
cursor.execute('SELECT COUNT(*) FROM email_template')
final_count = cursor.fetchone()[0]
print(f"✓ Seeded successfully!")
print(f"✓ Total templates: {final_count}")

# Show breakdown
cursor.execute('SELECT name FROM email_template ORDER BY id')
for row in cursor.fetchall():
    print(f"  - {row[0]}")

conn.close()
