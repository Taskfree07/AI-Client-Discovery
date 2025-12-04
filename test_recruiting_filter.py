"""
Test to verify recruiting agency posts are filtered out
"""

from services.vector_search import VectorSearchService


def test_recruiting_agency_filter():
    """Test that recruiting agency posts are properly filtered"""

    print("\n" + "="*80)
    print("TEST: Recruiting Agency Post Filter")
    print("="*80 + "\n")

    vector_search = VectorSearchService()

    # Test case 1: The exact case you encountered
    recruiting_post = {
        'title': 'Vivid Soft Global hiring W2 Requirements',
        'snippet': 'Vivid Soft Global is hiring for W2 contract positions. Competitive pay rates.',
        'link': 'https://linkedin.com/jobs/view/12345'
    }

    print("Test Case 1: Recruiting Agency Post (W2 Requirements)")
    print(f"Title: {recruiting_post['title']}")
    print(f"Snippet: {recruiting_post['snippet']}\n")

    is_valid, quality_score, reason = vector_search.validate_job_result(recruiting_post)

    print(f"Result: {'✅ VALID' if is_valid else '❌ INVALID'}")
    print(f"Quality Score: {quality_score:.2f}")
    print(f"Reason: {reason}")

    if not is_valid:
        print("\n✅ SUCCESS: Recruiting post correctly filtered out!")
    else:
        print("\n❌ FAIL: Recruiting post should have been filtered!")

    # Test case 2: Staffing agency pattern
    staffing_post = {
        'title': 'Software Engineer - Contract Position',
        'snippet': 'Our staffing agency is hiring for our client. C2C available.',
        'link': 'https://linkedin.com/jobs/view/67890'
    }

    print("\n" + "-"*80 + "\n")
    print("Test Case 2: Staffing Agency Post (C2C)")
    print(f"Title: {staffing_post['title']}")
    print(f"Snippet: {staffing_post['snippet']}\n")

    is_valid, quality_score, reason = vector_search.validate_job_result(staffing_post)

    print(f"Result: {'✅ VALID' if is_valid else '❌ INVALID'}")
    print(f"Quality Score: {quality_score:.2f}")
    print(f"Reason: {reason}")

    if not is_valid:
        print("\n✅ SUCCESS: Staffing post correctly filtered out!")
    else:
        print("\n❌ FAIL: Staffing post should have been filtered!")

    # Test case 3: Legitimate direct job posting (should pass)
    legitimate_post = {
        'title': 'AIML Engineer - Visa Inc.',
        'snippet': 'Visa is hiring an AI/ML Engineer to join our data science team in San Francisco.',
        'link': 'https://visa.com/careers/aiml-engineer'
    }

    print("\n" + "-"*80 + "\n")
    print("Test Case 3: Legitimate Direct Job Posting")
    print(f"Title: {legitimate_post['title']}")
    print(f"Snippet: {legitimate_post['snippet']}\n")

    is_valid, quality_score, reason = vector_search.validate_job_result(legitimate_post)

    print(f"Result: {'✅ VALID' if is_valid else '❌ INVALID'}")
    print(f"Quality Score: {quality_score:.2f}")
    print(f"Reason: {reason}")

    if is_valid and quality_score >= 0.5:
        print("\n✅ SUCCESS: Legitimate post correctly accepted!")
    else:
        print("\n❌ FAIL: Legitimate post should have been accepted!")

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80 + "\n")


if __name__ == '__main__':
    import sys
    import io
    # Handle encoding issues on Windows
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    test_recruiting_agency_filter()
