"""
Apollo API Usage Checker - Feb 10, 2026
Checks both local database AND Apollo API directly for today's usage
"""
import sqlite3
import json
import requests
from datetime import datetime

# ============================================================
# PART 1: Check Local Database
# ============================================================
DB_PATH = 'instance/database.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print('=' * 60)
print('PART 1: LOCAL DATABASE CHECK')
print('=' * 60)

# Activity log today
cursor.execute("SELECT * FROM activity_log WHERE created_at >= '2026-02-10' ORDER BY created_at DESC")
rows = cursor.fetchall()
print(f'\nActivity log entries today: {len(rows)}')
for r in rows:
    print(f'  [{r[5]}] {r[2]} - {str(r[3])[:150]}')

# Session leads today
cursor.execute("SELECT * FROM session_lead WHERE created_at >= '2026-02-10' ORDER BY created_at DESC")
lead_rows = cursor.fetchall()
print(f'\nSession leads created today: {len(lead_rows)}')

# Job leads today
cursor.execute("SELECT * FROM job_lead WHERE created_at >= '2026-02-10' ORDER BY created_at DESC")
job_rows = cursor.fetchall()
print(f'Job leads created today: {len(job_rows)}')

# Summary of ALL activity by day (last 7 days)
print('\n--- Activity by Day (last 7 days) ---')
cursor.execute("""
    SELECT DATE(created_at) as day, action, COUNT(*) as cnt 
    FROM activity_log 
    WHERE created_at >= '2026-02-03'
    GROUP BY day, action
    ORDER BY day DESC, cnt DESC
""")
for r in cursor.fetchall():
    print(f'  {r[0]} | {r[1]}: {r[2]}')

# Count all leads by day
print('\n--- Leads Created by Day (last 7 days) ---')
cursor.execute("""
    SELECT DATE(created_at) as day, COUNT(*) as cnt 
    FROM session_lead 
    WHERE created_at >= '2026-02-03'
    GROUP BY day
    ORDER BY day DESC
""")
for r in cursor.fetchall():
    print(f'  {r[0]}: {r[1]} leads (each = 1-3 Apollo API calls)')

conn.close()

# ============================================================
# PART 2: Query Apollo API Directly
# ============================================================
print('\n' + '=' * 60)
print('PART 2: APOLLO API DIRECT CHECK')
print('=' * 60)

# Try both API keys - from api_keys.py and env
API_KEY = "tY-idLVz3uh3XxYm5eir5w"

headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'x-api-key': API_KEY
}

# 1. Check API health / auth
print('\n--- Apollo API Health Check ---')
try:
    resp = requests.get(
        'https://api.apollo.io/v1/auth/health',
        headers=headers,
        timeout=10
    )
    print(f'Status: {resp.status_code}')
    
    # Rate limit headers
    rate_headers = {k: v for k, v in resp.headers.items() 
                    if any(x in k.lower() for x in ['rate', 'limit', 'remaining', 'x-'])}
    if rate_headers:
        print('Rate Limit Headers:')
        for k, v in rate_headers.items():
            print(f'  {k}: {v}')
    
    if resp.status_code == 200:
        data = resp.json()
        print(f'Response: {json.dumps(data, indent=2)[:500]}')
    else:
        print(f'Response: {resp.text[:500]}')
except Exception as e:
    print(f'Error: {e}')

# 2. Check usage endpoint (if available)
print('\n--- Apollo API Usage/Credits Check ---')
try:
    resp = requests.get(
        'https://api.apollo.io/v1/usage',
        headers=headers,
        timeout=10
    )
    print(f'Usage endpoint status: {resp.status_code}')
    if resp.status_code == 200:
        data = resp.json()
        print(f'Usage: {json.dumps(data, indent=2)[:500]}')
    else:
        print(f'Response: {resp.text[:300]}')
except Exception as e:
    print(f'Error: {e}')

# 3. Try credits endpoint  
print('\n--- Apollo API Credits Check ---')
try:
    resp = requests.post(
        'https://api.apollo.io/api/v1/auth/health',
        headers=headers,
        json={'api_key': API_KEY},
        timeout=10
    )
    print(f'Credits endpoint status: {resp.status_code}')
    rate_headers = {k: v for k, v in resp.headers.items() 
                    if any(x in k.lower() for x in ['rate', 'limit', 'remaining', 'x-', 'credit', 'usage', 'quota'])}
    if rate_headers:
        print('Headers with usage info:')
        for k, v in rate_headers.items():
            print(f'  {k}: {v}')
    if resp.status_code == 200:
        data = resp.json()
        print(f'Response: {json.dumps(data, indent=2)[:800]}')
    else:
        print(f'Response: {resp.text[:500]}')
except Exception as e:
    print(f'Error: {e}')

# 4. Check rate limit by examining headers from any endpoint
print('\n--- Rate Limit Check (via people/search) ---')
try:
    resp = requests.post(
        'https://api.apollo.io/v1/people/search',
        headers=headers,
        json={'page': 1, 'per_page': 1, 'q_organization_domains': 'example.com'},
        timeout=10
    )
    print(f'Status: {resp.status_code}')
    
    # Show ALL response headers
    print('All Response Headers:')
    for k, v in resp.headers.items():
        print(f'  {k}: {v}')
    
    if resp.status_code == 200:
        data = resp.json()
        # Check if there's pagination/usage info
        if 'pagination' in data:
            print(f'\nPagination info: {json.dumps(data["pagination"], indent=2)}')
        if 'num_fetch_result' in data:
            print(f'Fetch results: {data["num_fetch_result"]}')
        if 'credits' in data:
            print(f'Credits info: {json.dumps(data.get("credits"), indent=2)}')
    else:
        print(f'Response: {resp.text[:500]}')
except Exception as e:
    print(f'Error: {e}')

print('\n' + '=' * 60)
print('ANALYSIS COMPLETE')
print('=' * 60)
