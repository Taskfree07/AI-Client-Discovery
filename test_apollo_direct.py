"""
Direct Apollo API Test - Minimal test to verify API works
"""
import requests

# Your Apollo API key
API_KEY = "7POGBYCC6etw1Xl"  # First 15 chars from settings

print("="*60)
print("DIRECT APOLLO API TEST")
print("="*60)

# Test 1: Simple people search
print("\nTest 1: Searching for COO in United States...")
url = "https://api.apollo.io/v1/mixed_people/search"
headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
}
payload = {
    'person_titles': ['COO'],
    'person_locations': ['United States'],
    'organization_num_employees_ranges': ['200,10000'],
    'per_page': 3
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        people = data.get('people', [])
        print(f"✓ SUCCESS! Found {len(people)} people")
        
        if people:
            print("\nFirst person:")
            p = people[0]
            print(f"  Name: {p.get('name')}")
            print(f"  Title: {p.get('title')}")
            print(f"  Company: {p.get('organization_name')}")
            org = p.get('organization', {})
            print(f"  Domain: {org.get('primary_domain', 'N/A')}")
            print(f"  Industry: {org.get('industry', 'N/A')}")
            print(f"  Size: {org.get('estimated_num_employees', 'N/A')} employees")
    else:
        print(f"✗ ERROR! Status: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"✗ EXCEPTION: {e}")

print("\n" + "="*60)
