"""
Test all three tiers (T1, T2, T3) to see which ones return results
"""
import requests
import json
from app import app
from models import Settings

# Get Apollo API key from database
with app.app_context():
    api_key_setting = Settings.query.filter_by(key='apollo_api_key').first()
    APOLLO_API_KEY = api_key_setting.value if api_key_setting else None

if not APOLLO_API_KEY:
    print("ERROR: No Apollo API key found in database!")
    exit(1)

BASE_URL = "https://api.apollo.io/api/v1"
headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'x-api-key': APOLLO_API_KEY
}

def test_tier(tier_name, titles, max_tests=3):
    """Test a tier with multiple titles"""
    print("\n" + "="*80)
    print(f"TESTING {tier_name}")
    print("="*80)
    
    total_found = 0
    working_titles = []
    
    for i, title in enumerate(titles[:max_tests], 1):
        print(f"\n[{i}/{max_tests}] Testing: {title}")
        
        people_search_url = f"{BASE_URL}/mixed_people/search"
        payload = {
            'person_titles': [title],
            'person_locations': ['United States', 'India'],
            'organization_num_employees_ranges': ['200,10000'],
            'per_page': 3,
            'page': 1
        }
        
        try:
            response = requests.post(people_search_url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                people_count = len(data.get('people', []))
                total_found += people_count
                
                if people_count > 0:
                    working_titles.append(title)
                    print(f"   ✅ Found {people_count} people")
                    
                    # Show first person's organization
                    first_person = data['people'][0]
                    org = first_person.get('organization', {})
                    org_name = org.get('name', 'N/A')
                    org_domain = org.get('primary_domain', 'N/A')
                    print(f"   Example: {first_person.get('name')} at {org_name} ({org_domain})")
                else:
                    print(f"   ❌ No people found")
            else:
                print(f"   ❌ Error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
    
    print(f"\n{tier_name} SUMMARY:")
    print(f"  Total people found: {total_found}")
    print(f"  Working titles: {working_titles}")
    return total_found, working_titles

# Define titles
T1_TITLES = [
    "COO", "Chief Operating Officer",
    "VP Operations", "Vice President Operations",
    "Director Operations", "Director of Operations",
    "Plant Manager", "Factory Manager",
    "General Manager Operations"
]

T2_TITLES = [
    "HR Head", "Head of HR",
    "VP HR", "Vice President HR",
    "CHRO", "Chief Human Resources Officer",
    "Director HR", "HR Manager",
    "Talent Acquisition Head"
]

T3_TITLES = [
    "Recruiter", "Senior Recruiter",
    "TA Specialist", "Talent Acquisition Specialist",
    "HRBP", "HR Business Partner",
    "HR Executive", "Staffing Coordinator"
]

# Test all tiers
t1_total, t1_titles = test_tier("T1 - DECISION MAKERS", T1_TITLES, max_tests=5)
t2_total, t2_titles = test_tier("T2 - HR/TA LEADERS", T2_TITLES, max_tests=5)
t3_total, t3_titles = test_tier("T3 - HR PRACTITIONERS", T3_TITLES, max_tests=5)

# Final summary
print("\n" + "="*80)
print("FINAL SUMMARY")
print("="*80)
print(f"T1 Decision Makers:   {t1_total} people found from {len(t1_titles)} working titles")
print(f"T2 HR/TA Leaders:     {t2_total} people found from {len(t2_titles)} working titles")
print(f"T3 HR Practitioners:  {t3_total} people found from {len(t3_titles)} working titles")

if t1_total == 0:
    print("\n⚠️ WARNING: No T1 people found!")
    print("   Possible reasons:")
    print("   - T1 titles (COO, VP Operations) are very senior and rare")
    print("   - May need to broaden search (more industries, more locations)")
    print("   - May need to adjust seniority filters")
    
if t3_total == 0:
    print("\n⚠️ WARNING: No T3 people found!")
    print("   Possible reasons:")
    print("   - Title search too specific")
    print("   - Need to test without seniority filters")

print("\n" + "="*80)
