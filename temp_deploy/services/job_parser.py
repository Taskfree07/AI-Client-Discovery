import re
import requests
from typing import Dict, Optional
from urllib.parse import urlparse

class JobParserService:
    """Extract company information from job search results"""

    def __init__(self, google_api_key: str = None, cx_code: str = None):
        self.google_api_key = google_api_key
        self.cx_code = cx_code
        self.google_search_url = "https://www.googleapis.com/customsearch/v1"

    def parse_job_data(self, search_result: Dict) -> Dict:
        """
        Parse a job search result to extract company information

        Args:
            search_result: Dict with keys: title, link, snippet, displayLink, platform

        Returns:
            Dict with parsed job data including company name and domain
        """
        title = search_result.get('title', '')
        snippet = search_result.get('snippet', '')
        link = search_result.get('link', '')
        platform = search_result.get('platform', 'Unknown')

        # Extract company name from the search result
        company_name = self._extract_company_name(title, snippet, platform)

        # Extract job title
        job_title = self._extract_job_title(title, company_name)

        return {
            'job_title': job_title,
            'company_name': company_name,
            'job_link': link,
            'job_snippet': snippet,
            'platform': platform,
            'raw_title': title
        }

    def _extract_company_name(self, title: str, snippet: str, platform: str) -> str:
        """Extract company name from job title or snippet"""

        # PRIORITY 1: Check for "Company hiring JobTitle" pattern (most specific)
        # This catches: "Capgemini hiring Java Developer", "Google hiring Software Engineer"
        hiring_pattern = re.search(r'^([A-Z][A-Za-z0-9\s&.,\']+?)\s+hiring\s+', title, re.IGNORECASE)
        if hiring_pattern:
            company = hiring_pattern.group(1).strip()
            # Remove common recruiting agency words if present
            company = re.sub(r'\s+(recruiting|staffing|solutions|inc\.|ltd\.|llc)$', '', company, flags=re.IGNORECASE)
            if len(company) > 2 and len(company) < 100:
                print(f"   [TARGET] Extracted company from 'X hiring Y' pattern: {company}")
                return company

        # LinkedIn format: "Job Title - Company Name | LinkedIn" or "Job Title - Company Name - Location | LinkedIn"
        if 'linkedin' in platform.lower():
            # First try: "Job Title - Company Name | LinkedIn"
            match = re.search(r'-\s*([^|-]+?)\s*(?:\||$)', title)
            if match:
                company = match.group(1).strip()
                # Remove location info if present (e.g., "Company - New York" -> "Company")
                company = re.sub(r'\s*-\s*[A-Z][a-z]+(?:,\s*[A-Z]{2})?$', '', company)
                if company and len(company) > 2:
                    return company

            # Second try: Look in snippet for "at Company" or company mention
            snippet_match = re.search(r'(?:at|for|with)\s+([A-Z][A-Za-z0-9\s&.,\']+?)(?:\s+(?:in|is|hiring|seeks|located)|\.|\,|$)', snippet)
            if snippet_match:
                company = snippet_match.group(1).strip()
                if len(company) > 2 and len(company) < 50:
                    return company

        # Indeed format: "Job Title - Company Name - Location"
        if 'indeed' in platform.lower():
            parts = title.split(' - ')
            if len(parts) >= 2:
                return parts[1].strip()

        # Glassdoor format: "Company Name Job Title"
        if 'glassdoor' in platform.lower():
            # Often starts with company name
            words = title.split()
            if len(words) > 0:
                # Take first 2-3 words as potential company name
                return ' '.join(words[:min(3, len(words))])

        # Generic pattern: Look for "at Company" or "@ Company"
        at_match = re.search(r'(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,\']+?)(?:\s*[-|]|$)', title + ' ' + snippet)
        if at_match:
            company = at_match.group(1).strip()
            if len(company) > 2:
                return company

        # Look for company name in snippet with common patterns
        # Pattern: "Company Name is hiring" or "Join Company Name"
        hiring_match = re.search(r'([A-Z][A-Za-z0-9\s&.,\']+?)\s+(?:is hiring|hiring|seeks|looking for)', snippet)
        if hiring_match:
            company = hiring_match.group(1).strip()
            if len(company) > 2 and len(company) < 50:
                return company

        join_match = re.search(r'Join\s+([A-Z][A-Za-z0-9\s&.,\']+?)(?:\s+(?:team|as|in)|\.|\,|$)', snippet)
        if join_match:
            company = join_match.group(1).strip()
            if len(company) > 2 and len(company) < 50:
                return company

        # Fallback: extract from displayLink if it's not a job board domain
        # This would catch company career pages

        return "Unknown Company"

    def _extract_job_title(self, title: str, company_name: str) -> str:
        """Extract job title by removing company name and platform info"""

        # Remove platform names
        job_title = re.sub(r'\s*[\|\-]\s*(?:LinkedIn|Indeed|Glassdoor|Monster|ZipRecruiter|SimplyHired|CareerBuilder).*$', '', title, flags=re.IGNORECASE)

        # Handle "Company hiring JobTitle" pattern specifically
        if company_name and company_name != "Unknown Company":
            # Remove "Company hiring" at the start
            hiring_pattern = f"^{re.escape(company_name)}\\s+hiring\\s+"
            job_title = re.sub(hiring_pattern, '', job_title, flags=re.IGNORECASE).strip()

            # Remove company name if still present
            job_title = job_title.replace(company_name, '').strip()
            job_title = re.sub(r'\s*[-|@]\s*', ' ', job_title).strip()

        # Clean up extra whitespace and dashes
        job_title = re.sub(r'\s+', ' ', job_title).strip(' -|')

        return job_title if job_title else title

    def find_company_domain(self, company_name: str) -> Optional[str]:
        """
        Find a company's website domain using Google search

        Args:
            company_name: Name of the company

        Returns:
            Domain name (e.g., 'example.com') or None
        """
        if not self.google_api_key or not self.cx_code:
            print("Google API credentials not available for domain search")
            return None

        if not company_name or company_name == "Unknown Company":
            return None

        try:
            # Search for company website
            query = f'{company_name} official website'

            params = {
                'key': self.google_api_key,
                'cx': self.cx_code,
                'q': query,
                'num': 3
            }

            response = requests.get(self.google_search_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'items' in data:
                for item in data['items']:
                    link = item.get('link', '')
                    display_link = item.get('displayLink', '')

                    # Skip social media and job boards
                    skip_domains = [
                        'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
                        'indeed.com', 'glassdoor.com', 'monster.com', 'ziprecruiter.com',
                        'youtube.com', 'wikipedia.org', 'crunchbase.com'
                    ]

                    if any(skip in display_link.lower() for skip in skip_domains):
                        continue

                    # Extract clean domain
                    domain = self._extract_domain(link)
                    if domain:
                        print(f"Found domain for {company_name}: {domain}")
                        return domain

            print(f"Could not find domain for company: {company_name}")
            return None

        except Exception as e:
            print(f"Error finding company domain: {str(e)}")
            return None

    def _extract_domain(self, url: str) -> str:
        """Extract clean domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.replace('www.', '')
            return domain
        except:
            return ""

    def extract_location_from_snippet(self, snippet: str) -> Optional[str]:
        """Extract location information from job snippet"""
        # Common patterns: "Location: City, State" or "City, State - Job title"
        location_match = re.search(r'(?:Location:|in)\s*([A-Z][a-z]+(?:,\s*[A-Z]{2})?)', snippet)
        if location_match:
            return location_match.group(1).strip()

        # Pattern: City, State at start
        state_match = re.search(r'^([A-Z][a-z]+,\s*[A-Z]{2})', snippet)
        if state_match:
            return state_match.group(1).strip()

        return None
