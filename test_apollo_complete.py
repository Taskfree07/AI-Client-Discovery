"""
Complete Apollo API Test - Tests all endpoints used in Manufacturing ICP
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

print(f"Using API Key: {APOLLO_API_KEY[:15]}...")

BASE_URL = "https://api.apollo.io/api/v1"
headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'x-api-key': APOLLO_API_KEY
}

print("\n" + "="*80)
print("TEST 1: People Search - Looking for COO in Manufacturing")
print("="*80)

# Test 1: Search for people
people_search_url = f"{BASE_URL}/mixed_people/search"
people_payload = {
    'person_titles': ['COO'],
    'person_locations': ['United States'],
    'organization_num_employees_ranges': ['200,10000'],
    'person_seniorities': ['c_suite', 'vp', 'director'],
    'per_page': 5,
    'page': 1
}

print(f"\nRequest URL: {people_search_url}")
print(f"Request Payload: {json.dumps(people_payload, indent=2)}")

try:
    response = requests.post(people_search_url, json=people_payload, headers=headers)
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nResponse Keys: {list(data.keys())}")
        
        if 'people' in data:
            people = data['people']
            print(f"Number of people found: {len(people)}")
            
            if people:
                print("\n--- FIRST PERSON DETAILS ---")
                person = people[0]
                print(f"Person Keys: {list(person.keys())}")
                print(f"\nName: {person.get('name')}")
                print(f"Title: {person.get('title')}")
                print(f"Email: {person.get('email')}")
                print(f"Email Status: {person.get('email_status')}")
                print(f"Organization Name (direct): {person.get('organization_name')}")
                print(f"Organization ID: {person.get('organization_id')}")
                
                if 'organization' in person and person['organization']:
                    org = person['organization']
                    print(f"\n--- ORGANIZATION OBJECT ---")
                    print(f"Organization Keys: {list(org.keys())}")
                    print(f"Org Name: {org.get('name')}")
                    print(f"Org Domain: {org.get('primary_domain')}")
                    print(f"Org Website: {org.get('website_url')}")
                    print(f"Org Employees: {org.get('estimated_num_employees')}")
                    print(f"Org Industry: {org.get('industry')}")
                else:
                    print("\nNO ORGANIZATION OBJECT IN RESPONSE!")
                
                print("\n--- FULL FIRST PERSON JSON ---")
                print(json.dumps(person, indent=2)[:1000] + "...")
        else:
            print("No 'people' key in response!")
            print(f"Response: {json.dumps(data, indent=2)}")
    else:
        print(f"Error Response: {response.text}")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("TEST 2: Organization Enrichment")
print("="*80)

# Test 2: Enrich organization
test_domain = "microsoft.com"
org_enrich_url = f"{BASE_URL}/organizations/enrich"

print(f"\nRequest URL: {org_enrich_url}?domain={test_domain}")

try:
    response = requests.get(org_enrich_url, params={'domain': test_domain}, headers=headers)
    print(f"Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response Keys: {list(data.keys())}")
        
        if 'organization' in data:
            org = data['organization']
            print(f"\nOrganization Name: {org.get('name')}")
            print(f"Domain: {org.get('primary_domain')}")
            print(f"Employees: {org.get('estimated_num_employees')}")
            print(f"Industry: {org.get('industry')}")
            print(f"Founded: {org.get('founded_year')}")
        else:
            print("No 'organization' key in response!")
    else:
        print(f"Error Response: {response.text}")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("TEST 3: People Enrichment (Email Reveal)")
print("="*80)

# Test 3: Get person ID from first search and try to reveal email
try:
    # Re-do search to get a person ID
    response = requests.post(people_search_url, json=people_payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data.get('people') and len(data['people']) > 0:
            person_id = data['people'][0].get('id')
            print(f"\nTesting email reveal for Person ID: {person_id}")
            
            # Use people enrichment endpoint
            enrich_url = f"{BASE_URL}/people/match"
            enrich_payload = {
                'id': person_id,
                'reveal_personal_emails': True
            }
            
            print(f"Request URL: {enrich_url}")
            print(f"Request Payload: {json.dumps(enrich_payload, indent=2)}")
            
            response = requests.post(enrich_url, json=enrich_payload, headers=headers)
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                person = data.get('person', {})
                print(f"\nEmail: {person.get('email')}")
                print(f"Email Status: {person.get('email_status')}")
                print(f"Name: {person.get('name')}")
                print(f"Organization: {person.get('organization_name')}")
            else:
                print(f"Error Response: {response.text}")
        else:
            print("No people found to test enrichment")
    else:
        print(f"Search failed: {response.text}")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print("If all tests passed, the Apollo API integration is working correctly.")
print("If you see 0 people in Test 1, check your API key permissions or credits.")
print("="*80)
