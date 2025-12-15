import requests
from typing import List, Dict, Optional
from .vector_search import VectorSearchService

class GoogleSearchService:
    def __init__(self, api_key: str, cx_code: str, use_vector_search: bool = True):
        self.api_key = api_key
        self.cx_code = cx_code
        self.base_url = "https://www.googleapis.com/customsearch/v1"

        # Job platforms to search
        self.job_platforms = [
            'linkedin.com/jobs',
            'indeed.com',
            'glassdoor.com',
            'monster.com',
            'ziprecruiter.com',
            'simplyhired.com',
            'careerbuilder.com'
        ]

        # Initialize vector search service
        self.use_vector_search = use_vector_search
        self.vector_search = None
        if use_vector_search:
            try:
                print("[*] Initializing Vector Search Service...")
                self.vector_search = VectorSearchService()
                print("[+] Vector Search ready for enhanced job search\n")
            except Exception as e:
                print(f"[!] Could not initialize Vector Search: {e}")
                print("   Falling back to standard search\n")
                self.use_vector_search = False

    def search_jobs(self, keywords: str, num_results: int = 10,
                   use_enhanced_search: bool = True) -> List[Dict]:
        """
        Search for job openings using Google Custom Search API
        Enhanced with vector search for better quality and diversity

        Args:
            keywords: Search keywords
            num_results: Number of results to return
            use_enhanced_search: Use vector search processing pipeline
        """
        try:
            results = []
            # Fetch more results than needed for better filtering
            fetch_multiplier = 3 if (use_enhanced_search and self.use_vector_search) else 1
            fetch_count = min(num_results * fetch_multiplier, 50)  # Max 50 to avoid quota issues

            # Google Custom Search returns max 10 results per request
            for start_index in range(1, fetch_count + 1, 10):
                params = {
                    'key': self.api_key,
                    'cx': self.cx_code,
                    'q': keywords,
                    'num': min(10, fetch_count - len(results)),
                    'start': start_index
                }

                response = requests.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()

                if 'items' in data:
                    for item in data['items']:
                        results.append({
                            'title': item.get('title', ''),
                            'link': item.get('link', ''),
                            'snippet': item.get('snippet', ''),
                            'displayLink': item.get('displayLink', '')
                        })

                if len(results) >= fetch_count:
                    break

            # Apply vector search processing if enabled
            if use_enhanced_search and self.use_vector_search and self.vector_search:
                print(f"\n[*] Applying Vector Search Processing...")
                results = self.vector_search.process_search_results(
                    query=keywords,
                    results=results,
                    max_results=num_results,
                    validate=True,
                    deduplicate=True,
                    ensure_diversity=True,
                    rerank=True
                )
            else:
                results = results[:num_results]

            return results

        except Exception as e:
            print(f"Error searching jobs: {str(e)}")
            return []

    def search_linkedin_jobs(self, keywords: str, num_results: int = 10,
                            use_enhanced_search: bool = True) -> List[Dict]:
        """
        Search for individual LinkedIn job postings only (not search pages)
        Returns actual job listings with proper URLs
        Enhanced with vector search for better quality and diversity

        Args:
            keywords: Search keywords
            num_results: Number of results to return
            use_enhanced_search: Use vector search processing pipeline
        """
        all_results = []

        # Fetch more results for better filtering
        fetch_multiplier = 3 if (use_enhanced_search and self.use_vector_search) else 1
        fetch_target = num_results * fetch_multiplier

        # Search for individual LinkedIn job view pages
        # Use multiple search attempts to get more results
        search_queries = [
            f'{keywords} site:linkedin.com/jobs/view',
            f'{keywords} job opening site:linkedin.com/jobs/view',
            f'{keywords} hiring site:linkedin.com/jobs/view',
        ]

        seen_urls = set()

        for query in search_queries:
            if len(all_results) >= fetch_target:
                break

            try:
                params = {
                    'key': self.api_key,
                    'cx': self.cx_code,
                    'q': query,
                    'num': min(10, fetch_target - len(all_results))
                }

                response = requests.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()

                if 'items' in data:
                    for item in data['items']:
                        link = item.get('link', '')

                        # Only include individual job view pages, exclude search pages
                        if 'linkedin.com/jobs/view' in link and 'search' not in link.lower():
                            if link not in seen_urls:
                                seen_urls.add(link)
                                all_results.append({
                                    'title': item.get('title', ''),
                                    'link': link,
                                    'snippet': item.get('snippet', ''),
                                    'displayLink': item.get('displayLink', ''),
                                    'platform': 'LinkedIn'
                                })

                                print(f"[+] Found LinkedIn job: {item.get('title', '')[:50]}...")

                print(f"Found {len(data.get('items', []))} results in this batch")

            except Exception as e:
                print(f"Error searching LinkedIn: {str(e)}")
                continue

        print(f"Total individual LinkedIn jobs found: {len(all_results)}")

        # Apply vector search processing if enabled
        if use_enhanced_search and self.use_vector_search and self.vector_search and len(all_results) > 0:
            print(f"\n[*] Applying Vector Search Processing to LinkedIn results...")
            all_results = self.vector_search.process_search_results(
                query=keywords,
                results=all_results,
                max_results=num_results,
                validate=True,
                deduplicate=True,
                ensure_diversity=True,
                rerank=True
            )
        else:
            all_results = all_results[:num_results]

        return all_results

    def search_multi_platform(self, keywords: str, results_per_platform: int = 5) -> List[Dict]:
        """
        Search across multiple job platforms (LinkedIn, Indeed, Glassdoor, etc.)
        Returns more comprehensive results from various sources

        NOTE: Currently deprecated in favor of search_linkedin_jobs for better accuracy
        """
        all_results = []

        for platform in self.job_platforms:
            try:
                # Create platform-specific search query
                query = f'{keywords} site:{platform}'

                params = {
                    'key': self.api_key,
                    'cx': self.cx_code,
                    'q': query,
                    'num': min(10, results_per_platform)
                }

                response = requests.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()

                if 'items' in data:
                    for item in data['items']:
                        all_results.append({
                            'title': item.get('title', ''),
                            'link': item.get('link', ''),
                            'snippet': item.get('snippet', ''),
                            'displayLink': item.get('displayLink', ''),
                            'platform': self._get_platform_name(platform)
                        })

                print(f"Found {len(data.get('items', []))} jobs on {platform}")

            except Exception as e:
                print(f"Error searching {platform}: {str(e)}")
                continue

        return all_results

    def _get_platform_name(self, platform: str) -> str:
        """Get friendly platform name"""
        platform_names = {
            'linkedin.com/jobs': 'LinkedIn',
            'indeed.com': 'Indeed',
            'glassdoor.com': 'Glassdoor',
            'monster.com': 'Monster',
            'ziprecruiter.com': 'ZipRecruiter',
            'simplyhired.com': 'SimplyHired',
            'careerbuilder.com': 'CareerBuilder'
        }
        return platform_names.get(platform, platform)

    def extract_company_from_url(self, url: str) -> str:
        """Extract company domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc.replace('www.', '')
            return domain
        except:
            return ""
