"""
Test script for Vector Search Service
Demonstrates the enhanced search capabilities
"""

from services.vector_search import VectorSearchService


def test_result_validation():
    """Test the result validation system"""
    print("\n" + "="*80)
    print("TEST 1: Result Validation and Quality Scoring")
    print("="*80)

    vector_search = VectorSearchService()

    # Test cases: valid and invalid job postings
    test_results = [
        {
            'title': 'Senior Software Engineer - Remote',
            'snippet': 'We are hiring a Senior Software Engineer to join our growing team. Apply now!',
            'link': 'https://linkedin.com/jobs/view/12345'
        },
        {
            'title': 'Free Download - Software Tools',
            'snippet': 'Click here to download free software. Limited time offer! Act now!!!',
            'link': 'https://spamsite.com/download'
        },
        {
            'title': 'Full Stack Developer at TechCorp',
            'snippet': 'TechCorp is looking for a talented Full Stack Developer. 5+ years experience required.',
            'link': 'https://techcorp.com/careers/fullstack-dev'
        },
        {
            'title': 'Browse All Jobs - Job Search',
            'snippet': 'Search results for software engineer. Showing page 1 of 100 results.',
            'link': 'https://jobsite.com/search?q=software'
        },
        {
            'title': 'Data Scientist - Machine Learning',
            'snippet': 'Join our AI team as a Data Scientist. Work on cutting-edge ML projects.',
            'link': 'https://company.com/jobs/data-scientist'
        }
    ]

    for i, result in enumerate(test_results, 1):
        is_valid, quality_score, reason = vector_search.validate_job_result(result)
        status = "✅ VALID" if is_valid else "❌ INVALID"

        print(f"\n--- Test Case {i} ---")
        print(f"Title: {result['title']}")
        print(f"Status: {status}")
        print(f"Quality Score: {quality_score:.2f}")
        print(f"Reason: {reason}")


def test_semantic_deduplication():
    """Test semantic deduplication"""
    print("\n" + "="*80)
    print("TEST 2: Semantic Deduplication")
    print("="*80)

    vector_search = VectorSearchService()

    # Similar job postings (duplicates)
    duplicate_results = [
        {
            'title': 'Senior Software Engineer at Google',
            'snippet': 'Join Google as a Senior Software Engineer',
            'link': 'https://google.com/jobs/1'
        },
        {
            'title': 'Senior Software Engineer - Google',
            'snippet': 'Google is hiring Senior Software Engineers',
            'link': 'https://google.com/jobs/2'
        },
        {
            'title': 'Data Analyst at Microsoft',
            'snippet': 'Microsoft seeks Data Analyst for analytics team',
            'link': 'https://microsoft.com/jobs/1'
        },
        {
            'title': 'Senior SWE Position at Google Inc',
            'snippet': 'Google Inc is looking for experienced software engineers',
            'link': 'https://google.com/jobs/3'
        },
        {
            'title': 'Product Manager at Amazon',
            'snippet': 'Amazon hiring Product Manager for AWS team',
            'link': 'https://amazon.com/jobs/1'
        }
    ]

    print("\n📥 Input: 5 results (3 are semantically similar)")
    for r in duplicate_results:
        print(f"   - {r['title']}")

    deduplicated = vector_search.semantic_deduplication(duplicate_results)

    print(f"\n📤 Output: {len(deduplicated)} unique results")
    for r in deduplicated:
        print(f"   ✅ {r['title']}")


def test_diversity():
    """Test diversity algorithm"""
    print("\n" + "="*80)
    print("TEST 3: Diversity Algorithm (Maximal Marginal Relevance)")
    print("="*80)

    vector_search = VectorSearchService()

    # Mix of different job types
    diverse_results = [
        {'title': 'Senior Software Engineer at Google', 'snippet': '...', 'link': '...'},
        {'title': 'Software Engineer at Facebook', 'snippet': '...', 'link': '...'},
        {'title': 'Software Developer at Microsoft', 'snippet': '...', 'link': '...'},
        {'title': 'Data Scientist at Netflix', 'snippet': '...', 'link': '...'},
        {'title': 'Product Manager at Amazon', 'snippet': '...', 'link': '...'},
        {'title': 'Senior Engineer at Apple', 'snippet': '...', 'link': '...'},
        {'title': 'UX Designer at Adobe', 'snippet': '...', 'link': '...'},
        {'title': 'DevOps Engineer at Spotify', 'snippet': '...', 'link': '...'},
        {'title': 'Backend Developer at Twitter', 'snippet': '...', 'link': '...'},
        {'title': 'Frontend Engineer at Airbnb', 'snippet': '...', 'link': '...'},
    ]

    print(f"\n📥 Input: {len(diverse_results)} results")
    for r in diverse_results:
        print(f"   - {r['title']}")

    diverse_subset = vector_search.ensure_diversity(diverse_results, max_results=5)

    print(f"\n📤 Output: {len(diverse_subset)} diverse results selected")
    for r in diverse_subset:
        print(f"   ✅ {r['title']}")


def test_semantic_relevance():
    """Test semantic relevance scoring"""
    print("\n" + "="*80)
    print("TEST 4: Semantic Relevance Scoring")
    print("="*80)

    vector_search = VectorSearchService()

    query = "python machine learning engineer"

    candidates = [
        {
            'title': 'Machine Learning Engineer - Python',
            'snippet': 'Looking for ML Engineer with Python expertise',
            'link': '...'
        },
        {
            'title': 'Accountant Position',
            'snippet': 'Seeking experienced accountant for financial role',
            'link': '...'
        },
        {
            'title': 'Data Scientist - ML/AI',
            'snippet': 'Data scientist role focused on machine learning and AI',
            'link': '...'
        },
        {
            'title': 'Sales Representative',
            'snippet': 'Sales rep needed for SaaS company',
            'link': '...'
        },
        {
            'title': 'Python Developer - Backend',
            'snippet': 'Backend Python developer for web applications',
            'link': '...'
        }
    ]

    print(f"\n🎯 Query: '{query}'")
    print(f"📥 Candidates: {len(candidates)} results\n")

    ranked = vector_search.rank_results(query, candidates)

    print("📊 Results ranked by semantic relevance:\n")
    for i, result in enumerate(ranked, 1):
        score = result.get('relevance_score', 0)
        print(f"   {i}. [Score: {score:.3f}] {result['title']}")


def test_full_pipeline():
    """Test the complete processing pipeline"""
    print("\n" + "="*80)
    print("TEST 5: Complete Processing Pipeline")
    print("="*80)

    vector_search = VectorSearchService()

    query = "software engineer remote"

    # Mix of valid, invalid, duplicate, and diverse results
    raw_results = [
        {'title': 'Senior Software Engineer - Remote', 'snippet': 'Join our remote team...', 'link': 'https://company1.com/jobs/1'},
        {'title': 'Free Software Download!!!', 'snippet': 'Click here for free download', 'link': 'https://spam.com'},
        {'title': 'Remote Software Engineer at TechCorp', 'snippet': 'TechCorp hiring remote engineers', 'link': 'https://techcorp.com/jobs/1'},
        {'title': 'Senior SWE - Work from Home', 'snippet': 'Work from home as senior engineer', 'link': 'https://company1.com/jobs/2'},
        {'title': 'Data Analyst - Remote', 'snippet': 'Remote data analyst position', 'link': 'https://company2.com/jobs/1'},
        {'title': 'Browse Jobs - Search Results', 'snippet': 'Showing results for software engineer', 'link': 'https://jobsite.com/search'},
        {'title': 'DevOps Engineer - Fully Remote', 'snippet': 'DevOps role, fully remote', 'link': 'https://company3.com/jobs/1'},
        {'title': 'Remote Software Engineer Position', 'snippet': 'Software engineering role, remote work', 'link': 'https://company1.com/jobs/3'},
        {'title': 'Product Manager - Remote', 'snippet': 'Remote PM position available', 'link': 'https://company4.com/jobs/1'},
        {'title': 'Frontend Developer - Remote Work', 'snippet': 'Remote frontend development role', 'link': 'https://company5.com/jobs/1'},
    ]

    processed = vector_search.process_search_results(
        query=query,
        results=raw_results,
        max_results=5,
        validate=True,
        deduplicate=True,
        ensure_diversity=True,
        rerank=True
    )

    print("\n📊 FINAL RESULTS:")
    print("="*80)
    for i, result in enumerate(processed, 1):
        quality = result.get('quality_score', 0)
        relevance = result.get('relevance_score', 0)
        print(f"\n{i}. {result['title']}")
        print(f"   Quality: {quality:.2f} | Relevance: {relevance:.3f}")
        print(f"   Link: {result['link']}")


if __name__ == '__main__':
    import sys
    import io
    # Handle encoding issues on Windows
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("\n")
    print("="*80)
    print("🧪 VECTOR SEARCH SERVICE - TEST SUITE")
    print("="*80)

    try:
        test_result_validation()
        test_semantic_deduplication()
        test_diversity()
        test_semantic_relevance()
        test_full_pipeline()

        print("\n" + "="*80)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*80)
        print("\n")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
