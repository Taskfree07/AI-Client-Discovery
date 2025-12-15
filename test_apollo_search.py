"""
Quick test script to verify Apollo API is working
"""
from services.apollo_api import ApolloAPIService
from models import db, Settings
from app import app

# Get Apollo API key from settings
with app.app_context():
    apollo_key_setting = Settings.query.filter_by(key='apollo_api_key').first()
    if not apollo_key_setting or not apollo_key_setting.value:
        print("❌ ERROR: Apollo API key not configured!")
        print("Go to http://localhost:5000/settings and add your Apollo API key")
        exit(1)
    
    apollo_api_key = apollo_key_setting.value
    print(f"✓ Found Apollo API key: {apollo_api_key[:10]}...")

# Initialize Apollo service
apollo = ApolloAPIService(apollo_api_key)

print("\n" + "="*60)
print("Testing Apollo API - People Search")
print("="*60)

# Test search
print("\nSearching for: COO in United States, Manufacturing companies, 200-10000 employees")

try:
    results = apollo.search_people(
        person_titles=['COO', 'Chief Operating Officer'],
        person_locations=['United States'],
        organization_num_employees_ranges=['200,10000'],
        person_seniorities=['c_suite', 'owner'],
        per_page=5  # Just get 5 for testing
    )
    
    print(f"\n✓ Search successful! Found {len(results)} contacts")
    
    if results:
        print("\nFirst 3 results:")
        for i, contact in enumerate(results[:3], 1):
            print(f"\n{i}. {contact.get('name', 'N/A')}")
            print(f"   Title: {contact.get('title', 'N/A')}")
            print(f"   Company: {contact.get('organization_name', 'N/A')}")
            print(f"   Email: {contact.get('email', 'Not revealed')}")
            print(f"   Location: {contact.get('city', '')}, {contact.get('state', '')}, {contact.get('country', '')}")
            
            org = contact.get('organization', {})
            if org:
                print(f"   Domain: {org.get('primary_domain', 'N/A')}")
                print(f"   Size: {org.get('estimated_num_employees', 'N/A')} employees")
                print(f"   Industry: {org.get('industry', 'N/A')}")
    else:
        print("\n⚠ WARNING: No results found!")
        print("This could mean:")
        print("1. Apollo API key is invalid")
        print("2. No matching contacts in Apollo database")
        print("3. Search filters are too restrictive")
        
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nPossible issues:")
    print("1. Apollo API key is invalid or expired")
    print("2. Network connection issues")
    print("3. Apollo API rate limit reached")

print("\n" + "="*60)
print("Test complete!")
print("="*60)
