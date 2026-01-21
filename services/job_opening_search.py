"""
Job Opening-Based Lead Discovery Service
Searches for companies with active job openings, then enriches with T1/T2/T3 contacts
Uses parallel processing and batching for maximum speed
"""

import asyncio
import aiohttp
import re
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from urllib.parse import urlparse, quote_plus
from concurrent.futures import ThreadPoolExecutor
from services.apollo_api import ApolloAPIService
from services.google_search import GoogleAPIQuotaExceeded


class JobOpeningSearchService:
    """Search for companies with active job openings and enrich with contacts"""

    def __init__(self, apollo_api_key: str, google_api_key: Optional[str] = None,
                 google_cse_id: Optional[str] = None):
        """
        Initialize Job Opening Search Service

        Args:
            apollo_api_key: Apollo API key for enrichment
            google_api_key: Google Custom Search API key (optional)
            google_cse_id: Google Custom Search Engine ID (optional)
        """
        self.apollo = ApolloAPIService(apollo_api_key)
        self.google_api_key = google_api_key
        self.google_cse_id = google_cse_id

        # Job board domains to search
        self.job_boards = [
            'linkedin.com/jobs',
            'indeed.com',
            'glassdoor.com',
            'monster.com',
            'naukri.com',
            'shine.com',
            'timesjobs.com'
        ]

    async def search_job_openings(
        self,
        job_title: str,
        locations: List[str],
        icp_profile: Dict,
        max_results: int = 50
    ) -> List[Dict]:
        """
        Search for companies with active job openings

        Args:
            job_title: Job title to search for
            locations: List of locations (e.g., ['United States', 'India'])
            icp_profile: ICP profile with industries, size, etc.
            max_results: Maximum number of results

        Returns:
            List of companies with job openings
        """
        print(f"\n[JOB SEARCH] Searching for companies hiring: {job_title}")
        print(f"[JOB SEARCH] Locations: {locations}")

        all_companies = []
        seen_domains = set()

        # Phase 1: Search for job openings in parallel across locations
        tasks = []
        for location in locations:
            tasks.append(self._search_location(job_title, location, icp_profile))

        location_results = await asyncio.gather(*tasks)

        # Combine results and deduplicate
        for results in location_results:
            for company in results:
                domain = company.get('domain')
                if domain and domain not in seen_domains:
                    seen_domains.add(domain)
                    all_companies.append(company)

        print(f"[JOB SEARCH] Found {len(all_companies)} unique companies with job openings")

        # Limit results
        return all_companies[:max_results]

    async def _search_location(
        self,
        job_title: str,
        location: str,
        icp_profile: Dict
    ) -> List[Dict]:
        """Search for job openings in a specific location"""

        print(f"[JOB SEARCH] Searching {location} for {job_title} openings...")

        companies = []

        # Build search queries
        queries = self._build_search_queries(job_title, location, icp_profile)

        # Search in parallel
        async with aiohttp.ClientSession() as session:
            tasks = [
                self._google_search(session, query)
                for query in queries[:3]  # Limit to 3 queries per location
            ]

            search_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Extract companies from search results
            for results in search_results:
                if isinstance(results, Exception):
                    print(f"[JOB SEARCH] Search error: {results}")
                    continue

                extracted = self._extract_companies_from_results(results, icp_profile)
                companies.extend(extracted)

        # If no results from Google, use Apollo fallback
        if not companies:
            print(f"[JOB SEARCH] No results from Google, using Apollo fallback...")
            companies = await self._apollo_fallback_search(job_title, location, icp_profile)

        return companies

    def _build_search_queries(
        self,
        job_title: str,
        location: str,
        icp_profile: Dict
    ) -> List[str]:
        """Build Google search queries for job openings"""

        queries = []
        industries = icp_profile.get('industries', [])

        # Query 1: Direct job search with location
        queries.append(f'"{job_title}" job opening {location} hiring 2025')

        # Query 2: Include industry
        if industries:
            industry = industries[0]
            queries.append(f'"{job_title}" job {industry} {location} hiring now')

        # Query 3: Career pages
        queries.append(f'"{job_title}" careers {location} apply now')

        # Query 4: Job boards
        queries.append(f'site:linkedin.com/jobs "{job_title}" {location}')

        return queries

    async def _google_search(
        self,
        session: aiohttp.ClientSession,
        query: str
    ) -> List[Dict]:
        """
        Perform Google search for job openings
        Uses custom search if API key available, otherwise uses Apollo fallback
        """

        results = []

        if self.google_api_key and self.google_cse_id:
            # Use Google Custom Search API
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'cx': self.google_cse_id,
                'q': query,
                'num': 10
            }

            print(f"[GOOGLE] Searching: {query[:60]}...")

            try:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        items = data.get('items', [])

                        for item in items:
                            results.append({
                                'title': item.get('title', ''),
                                'link': item.get('link', ''),
                                'snippet': item.get('snippet', '')
                            })

                        print(f"[GOOGLE] ✓ Found {len(results)} results")
                    elif response.status == 429:
                        print(f"[GOOGLE] ⚠ Rate limit exceeded")
                        raise GoogleAPIQuotaExceeded("Google Search API quota exceeded. Please update your API key in Settings.")
                    elif response.status == 403:
                        error_text = await response.text()
                        if 'rateLimitExceeded' in error_text or 'dailyLimitExceeded' in error_text:
                            raise GoogleAPIQuotaExceeded("Google Search API quota exceeded. Please update your API key in Settings.")
                        print(f"[GOOGLE] ✗ Error 403: {error_text[:100]}")
                    else:
                        error_text = await response.text()
                        print(f"[GOOGLE] ✗ Error {response.status}: {error_text[:100]}")
            except asyncio.TimeoutError:
                print(f"[GOOGLE] ✗ Request timeout")
            except GoogleAPIQuotaExceeded:
                raise  # Re-raise quota exceptions
            except Exception as e:
                print(f"[GOOGLE] ✗ Error: {str(e)[:100]}")
        else:
            # Fallback: Use Apollo direct search
            print(f"[GOOGLE] ✗ No API credentials - using Apollo fallback")

        return results

    async def _apollo_fallback_search(
        self,
        job_title: str,
        location: str,
        icp_profile: Dict
    ) -> List[Dict]:
        """
        Fallback: Search Apollo directly for people with this job title
        Extract their companies as potential hiring companies
        """
        companies = []
        seen_domains = set()

        try:
            print(f"[APOLLO FALLBACK] Searching for '{job_title}' in {location}...")

            # Search Apollo for people with this title
            contacts = self.apollo.search_people(
                person_titles=[job_title],
                person_locations=[location],
                organization_num_employees_ranges=[f"{icp_profile.get('sizeMin', 200)},{icp_profile.get('sizeMax', 10000)}"],
                per_page=50
            )

            print(f"[APOLLO FALLBACK] Found {len(contacts)} people with title '{job_title}'")

            # Extract unique companies
            for contact in contacts:
                domain = contact.get('organization_domain')
                company_name = contact.get('organization_name')

                if domain and domain not in seen_domains:
                    seen_domains.add(domain)
                    companies.append({
                        'domain': domain,
                        'company_name': company_name,
                        'job_url': '',
                        'job_title': f"{job_title} at {company_name}",
                        'snippet': f"Found via Apollo: {contact.get('title', job_title)} position"
                    })

            print(f"[APOLLO FALLBACK] Extracted {len(companies)} unique companies")

        except Exception as e:
            print(f"[APOLLO FALLBACK] Error: {e}")

        return companies

    def _extract_companies_from_results(
        self,
        search_results: List[Dict],
        icp_profile: Dict
    ) -> List[Dict]:
        """Extract company information from search results"""

        companies = []
        seen_domains = set()

        for result in search_results:
            link = result.get('link', '')
            title = result.get('title', '')
            snippet = result.get('snippet', '')

            # Extract domain
            domain = self._extract_domain(link)
            if not domain or domain in seen_domains:
                continue

            # Skip job boards themselves
            if any(board in domain for board in ['linkedin.com', 'indeed.com', 'glassdoor.com', 'naukri.com']):
                # Try to extract company domain from job board URL or snippet
                company_domain = self._extract_company_from_job_board(link, snippet)
                if company_domain:
                    domain = company_domain
                else:
                    continue

            seen_domains.add(domain)

            # Extract company name from title/snippet
            company_name = self._extract_company_name(title, snippet, domain)

            companies.append({
                'domain': domain,
                'company_name': company_name,
                'job_url': link,
                'job_title': title,
                'snippet': snippet
            })

        print(f"[EXTRACT] Extracted {len(companies)} companies from {len(search_results)} results")

        return companies

    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract clean domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            domain = domain.replace('www.', '')
            return domain
        except:
            return None

    def _extract_company_from_job_board(self, url: str, snippet: str) -> Optional[str]:
        """Try to extract actual company domain from job board listing"""

        # Look for company website mentions in snippet
        # Pattern: "Visit companyname.com" or "Apply at company.com"
        website_pattern = r'(?:visit|apply at|website:|@)\s*([a-zA-Z0-9-]+\.[a-zA-Z]{2,})'
        match = re.search(website_pattern, snippet, re.IGNORECASE)

        if match:
            return match.group(1).replace('www.', '')

        return None

    def _extract_company_name(self, title: str, snippet: str, domain: str) -> str:
        """Extract company name from title/snippet"""

        # Try to find company name patterns
        # "Company Name is hiring" or "Join Company Name"
        patterns = [
            r'([\w\s&]+)\s+is hiring',
            r'Join\s+([\w\s&]+)',
            r'([\w\s&]+)\s+careers',
            r'Work at\s+([\w\s&]+)'
        ]

        for pattern in patterns:
            match = re.search(pattern, title + ' ' + snippet, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        # Fallback: Use domain name
        return domain.split('.')[0].title()

    async def enrich_companies_with_contacts(
        self,
        companies: List[Dict],
        icp_profile: Dict,
        tier_distribution: Dict = {'t1': 40, 't2': 40, 't3': 20}
    ) -> List[Dict]:
        """
        Enrich companies with T1, T2, T3 contacts using Apollo
        Uses parallel processing for speed

        Args:
            companies: List of companies with job openings
            icp_profile: ICP profile with T1/T2/T3 titles
            tier_distribution: Percentage distribution (default: 40% T1, 40% T2, 20% T3)

        Returns:
            List of enriched leads with company + contact info
        """

        print(f"\n[ENRICH] Enriching {len(companies)} companies with T1/T2/T3 contacts...")
        print(f"[DEBUG] ICP Profile keys: {list(icp_profile.keys())}")
        print(f"[DEBUG] T1 titles: {icp_profile.get('t1Titles', 'MISSING')[:5] if icp_profile.get('t1Titles') else 'MISSING'}")
        print(f"[DEBUG] T2 titles: {icp_profile.get('t2Titles', 'MISSING')[:5] if icp_profile.get('t2Titles') else 'MISSING'}")
        print(f"[DEBUG] T3 titles: {icp_profile.get('t3Titles', 'MISSING')[:5] if icp_profile.get('t3Titles') else 'MISSING'}")

        # Calculate targets per tier
        total_target = len(companies) * 3  # 3 contacts per company on average
        t1_target = int(total_target * tier_distribution['t1'] / 100)
        t2_target = int(total_target * tier_distribution['t2'] / 100)
        t3_target = int(total_target * tier_distribution['t3'] / 100)

        print(f"[ENRICH] Targets - T1: {t1_target}, T2: {t2_target}, T3: {t3_target}")

        # Use ThreadPoolExecutor for parallel Apollo API calls
        all_leads = []

        with ThreadPoolExecutor(max_workers=5) as executor:
            # Process companies in batches
            batch_size = 10
            for i in range(0, len(companies), batch_size):
                batch = companies[i:i + batch_size]

                # Submit enrichment tasks
                futures = [
                    executor.submit(
                        self._enrich_single_company,
                        company,
                        icp_profile
                    )
                    for company in batch
                ]

                # Collect results
                for future in futures:
                    try:
                        leads = future.result(timeout=30)
                        if leads:
                            all_leads.extend(leads)
                    except Exception as e:
                        print(f"[ENRICH] Error: {e}")

                print(f"[ENRICH] Processed {min(i + batch_size, len(companies))}/{len(companies)} companies, {len(all_leads)} leads so far")

        # Balance tiers
        balanced_leads = self._balance_tiers(all_leads, t1_target, t2_target, t3_target)

        print(f"[ENRICH] Complete! Generated {len(balanced_leads)} leads")

        return balanced_leads

    def _enrich_single_company(
        self,
        company: Dict,
        icp_profile: Dict
    ) -> List[Dict]:
        """Enrich a single company with contacts"""

        domain = company.get('domain')
        if not domain:
            return []

        leads = []

        try:
            # Enrich company data
            company_data = self.apollo.enrich_organization(domain)

            if not company_data:
                print(f"[ENRICH] Could not enrich: {domain}")
                return []

            # Validate against ICP
            if not self._validate_company_icp(company_data, icp_profile):
                print(f"[ENRICH] {domain} doesn't match ICP")
                return []

            # Search for T1, T2, T3 contacts
            for tier in ['t1', 't2', 't3']:
                tier_titles = icp_profile.get(f'{tier}Titles', [])
                print(f"[DEBUG] Tier {tier.upper()} titles from ICP: {tier_titles}")
                if not tier_titles:
                    print(f"[WARNING] No {tier.upper()} titles found in ICP profile!")
                    continue

                # Search for contacts with these titles
                for title in tier_titles[:3]:  # Limit to 3 titles per tier per company
                    try:
                        contacts = self.apollo.find_contacts(
                            domain=domain,
                            titles=[title],
                            per_page=2,  # 2 contacts per title
                            reveal_emails=True
                        )

                        for contact in contacts:
                            # Enrich contact to reveal email
                            enriched = self.apollo.enrich_person(
                                person_id=contact.get('id'),
                                domain=domain,
                                reveal_emails=True
                            )

                            if enriched and enriched.get('email'):
                                lead = {
                                    'tier': tier.upper(),
                                    'job_opening': {
                                        'title': company.get('job_title', ''),
                                        'url': company.get('job_url', ''),
                                        'found_via': 'Google Search'
                                    },
                                    'company': {
                                        'name': company_data.get('name', company.get('company_name', '')),
                                        'domain': domain,
                                        'size': company_data.get('estimated_num_employees', 0),
                                        'industry': company_data.get('industry', ''),
                                        'location': f"{company_data.get('city', '')}, {company_data.get('state', '')}, {company_data.get('country', '')}".strip(', '),
                                        'website': company_data.get('website_url', ''),
                                        'linkedin': company_data.get('linkedin_url', '')
                                    },
                                    'contact': {
                                        'name': enriched.get('name', ''),
                                        'title': enriched.get('title', ''),
                                        'email': enriched.get('email', ''),
                                        'phone': ', '.join(enriched.get('phone_numbers', [])),
                                        'linkedin': enriched.get('linkedin_url', '')
                                    }
                                }

                                leads.append(lead)

                    except Exception as e:
                        print(f"[ENRICH] Error searching {title} at {domain}: {e}")
                        continue

            print(f"[ENRICH] ✓ {domain} - {len(leads)} contacts")

        except Exception as e:
            print(f"[ENRICH] Error enriching {domain}: {e}")

        return leads

    def _validate_company_icp(self, company_data: Dict, icp_profile: Dict) -> bool:
        """Validate company against ICP criteria"""

        # Check size
        size = company_data.get('estimated_num_employees', 0)
        size_min = icp_profile.get('sizeMin', 0)
        size_max = icp_profile.get('sizeMax', 999999)

        if not (size_min <= size <= size_max):
            return False

        # Check industry
        industries = icp_profile.get('industries', [])
        company_industry = company_data.get('industry', '').lower()

        industry_match = any(
            ind.lower() in company_industry
            for ind in industries
        )

        # Be flexible with large companies
        if not industry_match and size < 500:
            return False

        return True

    def _balance_tiers(
        self,
        leads: List[Dict],
        t1_target: int,
        t2_target: int,
        t3_target: int
    ) -> List[Dict]:
        """Balance leads across T1, T2, T3 tiers"""

        # Separate by tier
        t1_leads = [l for l in leads if l['tier'] == 'T1']
        t2_leads = [l for l in leads if l['tier'] == 'T2']
        t3_leads = [l for l in leads if l['tier'] == 'T3']

        # Trim to targets
        balanced = []
        balanced.extend(t1_leads[:t1_target])
        balanced.extend(t2_leads[:t2_target])
        balanced.extend(t3_leads[:t3_target])

        print(f"[BALANCE] T1: {len(t1_leads[:t1_target])}, T2: {len(t2_leads[:t2_target])}, T3: {len(t3_leads[:t3_target])}")

        return balanced


# Synchronous wrapper for Flask
def search_job_openings_sync(
    job_title: str,
    locations: List[str],
    icp_profile: Dict,
    apollo_api_key: str,
    max_results: int = 50
) -> List[Dict]:
    """Synchronous wrapper for job opening search"""

    service = JobOpeningSearchService(apollo_api_key)

    # Run async function in sync context
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Search for companies
        companies = loop.run_until_complete(
            service.search_job_openings(job_title, locations, icp_profile, max_results)
        )

        # Enrich with contacts
        leads = loop.run_until_complete(
            service.enrich_companies_with_contacts(companies, icp_profile)
        )

        return leads
    finally:
        loop.close()
