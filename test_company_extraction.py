"""
Test company extraction from job titles
Verify that "Company hiring JobTitle" patterns are correctly parsed
"""

import sys
import io

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from services.job_parser import JobParserService

# Test cases
test_cases = [
    {
        'name': 'Capgemini hiring Java Developer',
        'result': {
            'title': 'Capgemini hiring Java Developer',
            'snippet': 'Nashville, Tennessee - Full time position at Capgemini',
            'link': 'https://www.linkedin.com/jobs/view/123456',
            'platform': 'linkedin'
        },
        'expected_company': 'Capgemini',
        'expected_job': 'Java Developer'
    },
    {
        'name': 'Google hiring Software Engineer',
        'result': {
            'title': 'Google hiring Software Engineer - Mountain View',
            'snippet': 'Join Google in Mountain View, CA',
            'link': 'https://www.linkedin.com/jobs/view/789012',
            'platform': 'linkedin'
        },
        'expected_company': 'Google',
        'expected_job': 'Software Engineer - Mountain View'
    },
    {
        'name': 'Microsoft hiring Data Scientist',
        'result': {
            'title': 'Microsoft hiring Data Scientist | LinkedIn',
            'snippet': 'Seattle, WA - Microsoft is looking for a Data Scientist',
            'link': 'https://www.linkedin.com/jobs/view/345678',
            'platform': 'linkedin'
        },
        'expected_company': 'Microsoft',
        'expected_job': 'Data Scientist'
    },
    {
        'name': 'Standard LinkedIn format (no hiring)',
        'result': {
            'title': 'Senior Developer - Apple Inc | LinkedIn',
            'snippet': 'Cupertino, CA - Join our team',
            'link': 'https://www.linkedin.com/jobs/view/901234',
            'platform': 'linkedin'
        },
        'expected_company': 'Apple Inc',
        'expected_job': 'Senior Developer'
    }
]

print("🧪 Testing Company Extraction from Job Titles")
print("="*60)

parser = JobParserService()

passed = 0
failed = 0

for test in test_cases:
    print(f"\n📝 Test: {test['name']}")
    print(f"   Input title: {test['result']['title']}")

    parsed = parser.parse_job_data(test['result'])

    company_match = parsed['company_name'] == test['expected_company']

    # Check if all significant words from expected job title are in extracted job title
    expected_words = set(test['expected_job'].lower().replace('-', ' ').split())
    extracted_words = set(parsed['job_title'].lower().replace('-', ' ').split())
    job_match = expected_words.issubset(extracted_words) or extracted_words.issubset(expected_words)

    print(f"   Extracted company: {parsed['company_name']}")
    print(f"   Expected: {test['expected_company']}")
    print(f"   Company match: {'✅' if company_match else '❌'}")

    print(f"   Extracted job: {parsed['job_title']}")
    print(f"   Expected: {test['expected_job']}")
    print(f"   Job match: {'✅' if job_match else '❌'}")

    if company_match and job_match:
        print(f"   ✅ PASSED")
        passed += 1
    else:
        print(f"   ❌ FAILED")
        failed += 1

print("\n" + "="*60)
print(f"📊 Results: {passed} passed, {failed} failed")

if failed == 0:
    print("✅ All tests passed! Company extraction is working correctly.")
else:
    print(f"❌ {failed} test(s) failed. Review the logic.")
