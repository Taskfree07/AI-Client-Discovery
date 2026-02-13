"""
Lead Engine Service
Orchestrates the job search -> company enrichment -> POC extraction pipeline
"""

import requests
from typing import List, Dict, Optional, Generator
from services.google_jobs_search import get_google_jobs_service
from services.apollo_api import ApolloAPIService
from services.api_keys import APOLLO_API_KEY, GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID
from services.google_search import GoogleAPIQuotaExceeded


class LeadEngineService:
    """
    Lead Engine - Main service for generating leads from job openings
    """

    # Company size mapping
    SIZE_RANGES = {
        'small': (1, 50),
        'mid': (51, 500),
        'large': (501, 1000000)
    }

    # Title priority for ranking POCs by hiring influence (lower = higher priority)
    TITLE_PRIORITY = [
        ['talent acquisition', 'head of talent'],
        ['hr manager', 'hr business partner'],
        ['engineering manager', 'hiring manager'],
        ['vp engineering', 'vp it', 'vp of engineering', 'vp of it'],
        ['cto', 'technical director', 'chief technology officer'],
        ['senior recruiter'],
    ]
    MAX_POCS_PER_LEAD = 5

    def __init__(self):
        self.google_service = get_google_jobs_service()
        self.apollo_service = ApolloAPIService(APOLLO_API_KEY)

    def generate_leads(self,
                       job_titles: List[str],
                       num_jobs: int = 100,
                       locations: List[str] = None,
                       industries: List[str] = None,
                       keywords: List[str] = None,
                       company_sizes: List[str] = None,
                       poc_roles: List[str] = None,
                       session_title: str = None) -> Generator[Dict, None, None]:
        """
        Generate leads from job openings
        """

        print(f"\n{'='*60}")
        print(f"LEAD ENGINE - Starting Generation")
        print(f"Session: {session_title or 'Unnamed'}")
        print(f"Job Titles: {job_titles}")
        print(f"Target: {num_jobs} companies")
        print(f"Size Filter: {company_sizes}")
        print(f"POC Role Filter: {poc_roles}")
        print(f"{'='*60}\n")

        # PHASE 1: Search job openings
        yield {
            'type': 'status',
            'phase': 'search',
            'message': 'Searching job openings...',
            'progress': 5
        }

        # Get more results to account for filtering losses
        # Each job board can return up to 100 results, so we can get many more
        target_search_results = min(num_jobs * 3, 200)  # Get 3x more to account for filtering

        try:
            job_results = self.google_service.search_jobs(
                job_titles=job_titles,
                locations=locations,
                industries=industries,
                keywords=keywords,
                num_results=target_search_results
            )
        except GoogleAPIQuotaExceeded as e:
            yield {
                'type': 'quota_exceeded',
                'message': str(e)
            }
            return

        if not job_results:
            yield {
                'type': 'error',
                'message': 'No job openings found. Try different search terms.'
            }
            return

        yield {
            'type': 'status',
            'phase': 'search_complete',
            'message': f'Found {len(job_results)} companies with job openings',
            'progress': 15
        }

        # PHASE 2: Enrich companies and find POCs
        leads = []
        skipped_no_data = 0
        skipped_size = 0
        skipped_no_pocs = 0

        total_to_process = len(job_results)

        for idx, job_result in enumerate(job_results):
            if len(leads) >= num_jobs:
                break

            company_name = job_result['company_name']
            progress = 15 + int((idx / total_to_process) * 75)

            yield {
                'type': 'status',
                'phase': 'enriching',
                'message': f'Processing: {company_name} ({idx+1}/{total_to_process})',
                'progress': progress,
                'current': idx + 1,
                'total': total_to_process
            }

            try:
                # Get company data from Apollo
                company_data = self._enrich_company(company_name)

                if not company_data:
                    print(f"[Skip] {company_name} - No company data")
                    skipped_no_data += 1
                    continue

                # Get domain (check both fields)
                domain = company_data.get('domain') or company_data.get('primary_domain', '')

                if not domain:
                    print(f"[Skip] {company_name} - No domain found")
                    skipped_no_data += 1
                    continue

                # Check company size filter
                company_size = company_data.get('estimated_num_employees', 0)
                if company_sizes and company_size > 0:
                    if not self._matches_size_filter(company_size, company_sizes):
                        print(f"[Skip] {company_name} - Size: {company_size} (filter: {company_sizes})")
                        skipped_size += 1
                        continue

                # Find POCs - first try broad search, then with titles
                print(f"\n[POC] Finding contacts for {company_name} ({domain})...")

                # Try with seniority filter first (executives, VPs, directors)
                pocs = self.apollo_service.find_contacts(
                    domain=domain,
                    titles=None,  # Don't filter by specific titles
                    seniorities=['owner', 'founder', 'c_suite', 'partner', 'vp', 'director', 'head', 'manager'],
                    per_page=15,
                    reveal_emails=False  # Don't reveal yet, we'll use bulk_match
                )

                # If no results, try without any filters
                if not pocs:
                    print(f"[POC] No senior contacts, trying broad search...")
                    pocs = self.apollo_service.find_contacts(
                        domain=domain,
                        titles=None,
                        seniorities=None,  # No seniority filter
                        per_page=15,
                        reveal_emails=False
                    )

                # Fallback: people/search is blocked for this key.
                # Step 1: Google search for VP/Senior/Director names at the company
                # Step 2: Apollo People Enrichment (people/match) with each name → verified emails
                if not pocs:
                    print(f"[POC] People search returned empty, searching for senior contacts...")
                    senior_names = self._find_senior_names(company_name, domain)
                    print(f"[POC] Found {len(senior_names)} senior name(s) via Google for {company_name}")

                    enriched_pocs = []
                    for entry in senior_names[:5]:
                        enriched = self.apollo_service.enrich_person(
                            first_name=entry['first_name'],
                            last_name=entry['last_name'],
                            domain=domain,
                            linkedin_url=entry.get('linkedin_url'),
                            reveal_emails=True
                        )
                        if enriched and enriched.get('email'):
                            enriched_pocs.append(enriched)
                            print(f"[POC] {enriched.get('name')} → {enriched.get('email')} ({enriched.get('email_status')})")
                        if len(enriched_pocs) >= 3:
                            break

                    if enriched_pocs:
                        pocs = enriched_pocs
                    else:
                        print(f"[POC] No senior contacts enriched, using info@{domain} as fallback")
                        pocs = [{
                            'name': '',
                            'email': f'info@{domain}',
                            'title': '',
                            'email_status': 'guessed',
                            'id': '',
                            'phone_numbers': [],
                            'linkedin_url': ''
                        }]

                if not pocs:
                    print(f"[Note] {company_name} - No POCs found, saving company without contacts")
                    skipped_no_pocs += 1
                else:
                    # If pocs came from find_contacts (no emails yet), do bulk reveal
                    if not any(p.get('email') for p in pocs):
                        for poc in pocs:
                            poc['domain'] = domain
                        pocs = self.apollo_service.bulk_reveal_emails(pocs)

                # Deduplicate, filter by selected roles, rank by hiring influence, pick top 5
                ranked_pocs = self._rank_and_deduplicate_pocs(pocs, poc_roles=poc_roles)

                # Build lead entry
                website = company_data.get('website_url') or f'https://{domain}'
                lead = {
                    'company': {
                        'name': company_data.get('name', company_name),
                        'domain': domain,
                        'industry': company_data.get('industry', ''),
                        'size': company_size,
                        'location': self._format_location(company_data),
                        'linkedin_url': company_data.get('linkedin_url', ''),
                        'website': website
                    },
                    'job_opening': job_result['job_title'],
                    'source': job_result['source'],
                    'source_url': job_result['source_url'],
                    'pocs': [{
                        'id': p.get('id', ''),
                        'name': p.get('name', ''),
                        'title': p.get('title', ''),
                        'email': p.get('email', ''),
                        'email_status': p.get('email_status', ''),
                        'phone': ', '.join(p.get('phone_numbers', [])) if p.get('phone_numbers') else '',
                        'linkedin_url': p.get('linkedin_url', '')
                    } for p in ranked_pocs]
                }

                leads.append(lead)

                # Yield the lead
                yield {
                    'type': 'lead',
                    'data': lead,
                    'count': len(leads),
                    'progress': progress
                }

                poc_emails = [p['email'] for p in lead['pocs'] if p['email']]
                print(f"[OK] {company_name} - {len(lead['pocs'])} POCs, {len(poc_emails)} emails")

            except Exception as e:
                print(f"[Error] {company_name}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # PHASE 3: Complete
        total_pocs = sum(len(lead['pocs']) for lead in leads)
        total_emails = sum(1 for lead in leads for poc in lead['pocs'] if poc.get('email'))

        yield {
            'type': 'complete',
            'message': f'Generated {len(leads)} leads with {total_pocs} POCs ({total_emails} emails)',
            'total_leads': len(leads),
            'total_pocs': total_pocs,
            'total_emails': total_emails,
            'progress': 100
        }

        print(f"\n{'='*60}")
        print(f"LEAD ENGINE - Complete")
        print(f"Total Leads: {len(leads)}")
        print(f"Total POCs: {total_pocs}")
        print(f"Total Emails: {total_emails}")
        print(f"Skipped - No Data/Domain: {skipped_no_data}")
        print(f"Skipped - Size Filter: {skipped_size}")
        print(f"Skipped - No POCs: {skipped_no_pocs}")
        print(f"{'='*60}\n")

    def _find_senior_names(self, company_name: str, domain: str) -> List[Dict]:
        """Search Google for VP/Senior/Director names at a company via LinkedIn profiles.
        Returns list of dicts with first_name, last_name, linkedin_url."""
        try:
            query = f'"{company_name}" "VP" OR "Senior VP" OR "Director" OR "Head of" OR "Senior" site:linkedin.com'
            response = requests.get(
                'https://www.googleapis.com/customsearch/v1',
                params={
                    'key': GOOGLE_API_KEY,
                    'cx': GOOGLE_SEARCH_ENGINE_ID,
                    'q': query,
                    'num': 10
                }
            )
            if response.status_code != 200:
                print(f"[WARN] Google search returned {response.status_code} for {company_name}")
                return []

            items = response.json().get('items', [])
            names = []
            seen = set()
            for item in items:
                title = item.get('title', '')
                link = item.get('link', '')
                # LinkedIn titles: "FirstName LastName - Title at Company"
                name_part = title.split(' - ')[0].strip()
                words = name_part.split()
                # Valid name: 2-4 words, each starts with uppercase letter
                if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                    key = name_part.lower()
                    if key not in seen:
                        seen.add(key)
                        names.append({
                            'first_name': words[0],
                            'last_name': words[-1],
                            'linkedin_url': link if 'linkedin.com' in link else ''
                        })
            return names

        except Exception as e:
            print(f"[WARN] Google search for senior names at {company_name} failed: {e}")
            return []

    # Mapping from poc_roles filter keys to TITLE_PRIORITY indices
    ROLE_FILTER_MAP = {
        'talent_acquisition': 0,  # Talent Acquisition / Head of Talent
        'hr_manager': 1,          # HR Manager / HR Business Partner
        'engineering_manager': 2,  # Engineering Manager / Hiring Manager
        'vp_engineering': 3,       # VP Engineering / VP IT
        'cto': 4,                  # CTO / Technical Director
        'senior_recruiter': 5,     # Senior Recruiter
        'others': -1,              # Any title not in TITLE_PRIORITY
    }

    def _rank_and_deduplicate_pocs(self, pocs: List[Dict], poc_roles: List[str] = None) -> List[Dict]:
        """
        Deduplicate, optionally filter by selected roles, rank by hiring influence.
        1. Remove duplicate emails
        2. Remove duplicate names
        3. Filter by poc_roles (if any selected)
        4. Rank by title priority
        5. Return top MAX_POCS_PER_LEAD (5)
        """
        if not pocs:
            return []

        # Step 1: Remove duplicate emails
        seen_emails = set()
        deduped = []
        for poc in pocs:
            email = (poc.get('email') or '').strip().lower()
            if email and email in seen_emails:
                continue
            if email:
                seen_emails.add(email)
            deduped.append(poc)

        # Step 2: Remove duplicate names
        seen_names = set()
        unique = []
        for poc in deduped:
            name = (poc.get('name') or '').strip().lower()
            if name and name in seen_names:
                continue
            if name:
                seen_names.add(name)
            unique.append(poc)

        # Step 3: Rank by title priority
        def get_title_rank(poc: Dict) -> int:
            title = (poc.get('title') or '').lower()
            for rank, keywords in enumerate(self.TITLE_PRIORITY):
                for keyword in keywords:
                    if keyword in title:
                        return rank
            return len(self.TITLE_PRIORITY)  # "Other" — lowest priority

        # Step 3b: Filter by selected POC roles (before ranking/trimming)
        if poc_roles:
            allowed_indices = set()
            include_others = False
            for role_key in poc_roles:
                idx = self.ROLE_FILTER_MAP.get(role_key)
                if idx == -1:
                    include_others = True
                elif idx is not None:
                    allowed_indices.add(idx)

            filtered = []
            for poc in unique:
                rank = get_title_rank(poc)
                if rank in allowed_indices:
                    filtered.append(poc)
                elif include_others and rank == len(self.TITLE_PRIORITY):
                    filtered.append(poc)

            print(f"[POC Role Filter] {len(unique)} after dedup → {len(filtered)} after role filter (roles: {poc_roles})")
            unique = filtered

        unique.sort(key=get_title_rank)

        # Step 4: Return top N
        result = unique[:self.MAX_POCS_PER_LEAD]
        print(f"[POC Rank] {len(pocs)} raw → {len(deduped)} after email dedup → {len(result)} selected")
        return result

    def _format_location(self, company_data: Dict) -> str:
        """Format location string from company data"""
        parts = [
            company_data.get('city', ''),
            company_data.get('state', ''),
            company_data.get('country', '')
        ]
        return ', '.join(p for p in parts if p)

    def _enrich_company(self, company_name: str) -> Optional[Dict]:
        """Enrich company data via Apollo"""

        try:
            # Search for the company by name
            results = self.apollo_service.search_organizations(
                organization_name=company_name,
                per_page=3
            )

            if not results:
                return None

            # Find best match (prefer one with domain)
            for org in results:
                domain = org.get('primary_domain', '')
                if domain:
                    # Get full enrichment
                    enriched = self.apollo_service.enrich_organization(domain)
                    if enriched:
                        return enriched
                    return org

            # Return first result even without domain
            return results[0] if results else None

        except Exception as e:
            print(f"[Error] Enriching {company_name}: {e}")
            return None

    def _matches_size_filter(self, company_size: int, size_filters: List[str]) -> bool:
        """Check if company size matches the selected filters"""

        if not size_filters:
            return True

        for size_filter in size_filters:
            if size_filter in self.SIZE_RANGES:
                min_size, max_size = self.SIZE_RANGES[size_filter]
                if min_size <= company_size <= max_size:
                    return True

        return False


# Singleton instance
_engine_instance = None

def get_lead_engine() -> LeadEngineService:
    """Get singleton instance of LeadEngineService"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = LeadEngineService()
    return _engine_instance
