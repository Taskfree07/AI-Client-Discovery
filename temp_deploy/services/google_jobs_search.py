"""
Google Custom Search API Service for Job Openings
Searches multiple job portals simultaneously for active job postings
"""

import requests
import re
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from services.api_keys import GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID, GOOGLE_SEARCH_URL
from services.google_search import GoogleAPIQuotaExceeded


class GoogleJobsSearchService:
    """Service for searching job openings using Google Custom Search API"""

    # Job board sites to search
    JOB_BOARDS = [
        {'name': 'LinkedIn', 'site': 'linkedin.com/jobs'},
        {'name': 'Indeed', 'site': 'indeed.com'},
        {'name': 'Glassdoor', 'site': 'glassdoor.com'},
        {'name': 'Naukri', 'site': 'naukri.com'},
    ]

    # Words that are DEFINITELY not company names
    INVALID_COMPANY_WORDS = {
        'indeed', 'linkedin', 'glassdoor', 'naukri', 'monster', 'ziprecruiter',
        'jobs', 'careers', 'hiring', 'apply', 'now',
        'remote', 'hybrid', 'onsite',
        'posted', 'ago', 'today', 'yesterday',
    }

    def __init__(self):
        self.api_key = GOOGLE_API_KEY
        self.search_engine_id = GOOGLE_SEARCH_ENGINE_ID
        self.base_url = GOOGLE_SEARCH_URL

    def search_jobs(self,
                    job_titles: List[str],
                    locations: List[str] = None,
                    industries: List[str] = None,
                    keywords: List[str] = None,
                    num_results: int = 100) -> List[Dict]:
        """
        Search for job openings across multiple job boards simultaneously
        """
        all_results = []
        seen_companies = set()

        print(f"\n{'='*60}")
        print(f"GOOGLE JOB SEARCH - Starting Multi-Board Search")
        print(f"Job Titles: {job_titles}")
        print(f"Locations: {locations}")
        print(f"Target Results: {num_results}")
        print(f"{'='*60}\n")

        # Calculate results per board (distribute evenly, with extra for filtering)
        results_per_board = max(30, (num_results * 2) // len(self.JOB_BOARDS))

        # Search each job board
        for board in self.JOB_BOARDS:
            if len(all_results) >= num_results:
                break

            print(f"\n[{board['name']}] Searching...")
            board_results = self._search_single_board(
                board=board,
                job_titles=job_titles,
                locations=locations,
                industries=industries,
                keywords=keywords,
                num_results=results_per_board
            )

            # Add unique companies
            for result in board_results:
                company_key = result['company_name'].lower().strip()
                if company_key not in seen_companies:
                    seen_companies.add(company_key)
                    all_results.append(result)
                    print(f"    + {result['company_name']}")

                    if len(all_results) >= num_results:
                        break

            print(f"[{board['name']}] Found {len(board_results)} results, {len(all_results)} total unique companies")

        print(f"\n{'='*60}")
        print(f"SEARCH COMPLETE - Total unique companies: {len(all_results)}")
        print(f"{'='*60}\n")

        return all_results[:num_results]

    def _search_single_board(self,
                             board: Dict,
                             job_titles: List[str],
                             locations: List[str] = None,
                             industries: List[str] = None,
                             keywords: List[str] = None,
                             num_results: int = 30) -> List[Dict]:
        """Search a single job board"""

        results = []

        # Build query for this board
        query = self._build_query(job_titles, locations, industries, keywords, board['site'])
        print(f"    Query: {query[:100]}...")

        # Google CSE: max 10 results per request, max 100 total (start index 1-91)
        results_per_page = 10
        pages_needed = min((num_results + results_per_page - 1) // results_per_page, 10)

        for page in range(pages_needed):
            start_index = page * results_per_page + 1

            try:
                params = {
                    'key': self.api_key,
                    'cx': self.search_engine_id,
                    'q': query,
                    'start': start_index,
                    'num': results_per_page
                }

                response = requests.get(self.base_url, params=params, timeout=30)

                if response.status_code == 429:
                    print(f"    [QUOTA EXCEEDED] Google API daily limit reached!")
                    raise GoogleAPIQuotaExceeded("Search credits are over. Please update your Google API key in Settings.")

                if response.status_code == 403:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get('error', {}).get('message', '')
                    if 'rateLimitExceeded' in error_msg or 'dailyLimitExceeded' in error_msg or 'quotaExceeded' in error_msg:
                        raise GoogleAPIQuotaExceeded("Search credits are over. Please update your Google API key in Settings.")

                if response.status_code != 200:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get('error', {}).get('message', response.text[:200])
                    print(f"    [Error] API returned {response.status_code}: {error_msg}")
                    break

                data = response.json()

                items = data.get('items', [])
                if not items:
                    break

                for item in items:
                    parsed = self._parse_result(item, board['name'])
                    if parsed:
                        results.append(parsed)

                        if len(results) >= num_results:
                            break

                if len(results) >= num_results:
                    break

            except requests.exceptions.RequestException as e:
                print(f"    [Error] Page {page + 1}: {e}")
                break

        return results

    def _build_query(self,
                     job_titles: List[str],
                     locations: List[str] = None,
                     industries: List[str] = None,
                     keywords: List[str] = None,
                     site: str = None) -> str:
        """Build optimized boolean search query for individual job postings"""

        parts = []

        # Job titles - use OR for multiple titles
        if job_titles:
            if len(job_titles) == 1:
                parts.append(f'"{job_titles[0]}"')
            else:
                titles_str = ' OR '.join([f'"{t}"' for t in job_titles])
                parts.append(f'({titles_str})')

        # Site-specific query patterns to get individual job postings (not listing pages)
        if site:
            if 'linkedin.com' in site:
                # LinkedIn individual jobs have "at" in title and /view/ in URL
                parts.append('"at"')
                parts.append('inurl:view')
            elif 'indeed.com' in site:
                # Indeed job pages have specific patterns
                parts.append('inurl:viewjob OR inurl:pagead')
            elif 'glassdoor.com' in site:
                # Glassdoor job listings
                parts.append('inurl:job-listing')
            elif 'naukri.com' in site:
                # Naukri job detail pages
                parts.append('inurl:job-listings')

        # Locations
        if locations:
            if len(locations) == 1:
                parts.append(f'"{locations[0]}"')
            else:
                locs_str = ' OR '.join([f'"{loc}"' for loc in locations])
                parts.append(f'({locs_str})')

        # Industries (optional context)
        if industries:
            ind_str = ' OR '.join(industries)
            parts.append(f'({ind_str})')

        # Keywords (optional context)
        if keywords:
            kw_str = ' OR '.join(keywords)
            parts.append(f'({kw_str})')

        # Site restriction
        if site:
            parts.append(f'site:{site}')

        return ' '.join(parts)

    def _parse_result(self, item: Dict, source: str) -> Optional[Dict]:
        """Parse a search result to extract company info"""

        title = item.get('title', '')
        link = item.get('link', '')
        snippet = item.get('snippet', '')

        # Extract company name based on source
        company = self._extract_company(title, snippet, link, source)

        if not company:
            return None

        # Validate company name
        if not self._is_valid_company(company):
            return None

        # Extract job title
        job_title = self._extract_job_title(title, source)

        return {
            'company_name': company,
            'job_title': job_title,
            'source_url': link,
            'source': source,
            'snippet': snippet[:200] if snippet else '',
            'raw_title': title
        }

    def _extract_company(self, title: str, snippet: str, url: str, source: str) -> Optional[str]:
        """Extract company name from search result"""

        company = None

        if source == 'LinkedIn':
            # LinkedIn URL: linkedin.com/jobs/view/title-at-company-123456
            match = re.search(r'/jobs/view/[^/]+-at-([a-z0-9-]+)-\d+', url.lower())
            if match:
                company = match.group(1).replace('-', ' ').title()
            else:
                # Title: "Job Title at Company | LinkedIn"
                match = re.search(r'\bat\s+([^|]+?)\s*(?:\||$)', title, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()

        elif source == 'Indeed':
            # Indeed title: "Job Title - Company - Location"
            parts = title.split(' - ')
            if len(parts) >= 2:
                company = parts[1].strip()
                # Remove trailing location
                company = re.sub(r'\s*,.*$', '', company)

        elif source == 'Glassdoor':
            # "Job Title at Company" or "Company hiring Job Title"
            match = re.search(r'\bat\s+([A-Z][A-Za-z0-9\s&.,\']+?)(?:\s*[-|]|\s*$)', title)
            if match:
                company = match.group(1).strip()
            else:
                match = re.search(r'^([A-Z][A-Za-z0-9\s&\']+?)\s+(?:hiring|is hiring)', title, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()

        elif source == 'Naukri':
            # Naukri: "Job in Company at Location" or company suffix patterns
            parts = title.split(' in ')
            if len(parts) >= 2:
                potential = parts[-1].strip()
                if ' at ' in potential:
                    potential = potential.split(' at ')[0].strip()
                if potential and not self._is_tech_term(potential):
                    company = potential

            if not company:
                # Look for company suffix patterns
                match = re.search(
                    r'([A-Z][A-Za-z0-9\s&]+(?:Pvt\.?\s*Ltd\.?|Limited|Inc\.?|Corp\.?|Technologies|Solutions|Services|Software|Tech|Labs|Consulting))',
                    title + ' ' + snippet
                )
                if match:
                    company = match.group(1).strip()

        # Fallback: "at Company" pattern
        if not company:
            match = re.search(r'\bat\s+([A-Z][A-Za-z0-9\s&\']+?)(?:\s*[-|,]|\s+(?:in|for|is)\s|\s*$)', title + ' ' + snippet)
            if match:
                company = match.group(1).strip()

        # Clean up
        if company:
            company = self._clean_company(company)

        return company if company and len(company) >= 2 else None

    def _is_tech_term(self, text: str) -> bool:
        """Check if text is a technology term"""
        tech = {'python', 'java', 'javascript', 'react', 'angular', 'node', 'sql',
                'machine learning', 'data science', 'ai', 'ml', 'aws', 'azure', 'devops'}
        return text.lower().strip() in tech

    def _clean_company(self, company: str) -> str:
        """Clean company name"""
        # Remove legal suffixes
        company = re.sub(r'\s*(Pvt\.?\s*Ltd\.?|Private\s+Limited|Limited|Inc\.?|LLC|Corp\.?|Co\.?)?\s*$', '', company, flags=re.IGNORECASE)
        # Remove location suffixes
        company = re.sub(r'\s*[-,]\s*(India|USA|UK|Remote|Hybrid|Delhi|Mumbai|Bangalore|Hyderabad|Chennai|Pune|New York|California|Texas|London).*$', '', company, flags=re.IGNORECASE)
        # Remove time references
        company = re.sub(r'\s*\d+\s*(days?|weeks?|months?|years?)\s*ago.*$', '', company, flags=re.IGNORECASE)
        # Clean whitespace
        company = re.sub(r'\s+', ' ', company).strip(' -|,.:;')
        # Fix case
        if company.isupper() or company.islower():
            company = company.title()
        return company

    def _is_valid_company(self, company: str) -> bool:
        """Validate company name"""
        if not company or len(company) < 2 or len(company) > 80:
            return False

        words = company.lower().split()
        valid_words = [w for w in words if w not in self.INVALID_COMPANY_WORDS]
        if not valid_words:
            return False

        if not any(c.isupper() for c in company):
            return False

        # Too many digits
        if sum(c.isdigit() for c in company) > len(company) * 0.3:
            return False

        # Garbage patterns
        if re.search(r'^\d+\s+|\.\.\.', company):
            return False

        return True

    def _extract_job_title(self, title: str, source: str) -> str:
        """Extract job title from result"""
        # "Job at Company | Site"
        match = re.match(r'^([^|]+?)\s+at\s+', title)
        if match:
            return match.group(1).strip()[:60]

        # "Job - Company"
        match = re.match(r'^([^-]+?)\s*-\s*', title)
        if match:
            job = match.group(1).strip()
            if 3 < len(job) < 60:
                return job

        # First part before separator
        parts = re.split(r'[-|]', title)
        if parts:
            return parts[0].strip()[:60]

        return title[:60]


# Singleton
_service_instance = None

def get_google_jobs_service() -> GoogleJobsSearchService:
    """Get singleton instance"""
    global _service_instance
    if _service_instance is None:
        _service_instance = GoogleJobsSearchService()
    return _service_instance
