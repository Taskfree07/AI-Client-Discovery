"""
Lead Engine Service
Orchestrates the job search -> company enrichment -> POC extraction pipeline
"""

from typing import List, Dict, Optional, Generator
from services.google_jobs_search import get_google_jobs_service
from services.apollo_api import ApolloAPIService
from services.api_keys import APOLLO_API_KEY
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
                    per_page=6,
                    reveal_emails=False  # Don't reveal yet, we'll use bulk_match
                )

                # If no results, try without any filters
                if not pocs:
                    print(f"[POC] No senior contacts, trying broad search...")
                    pocs = self.apollo_service.find_contacts(
                        domain=domain,
                        titles=None,
                        seniorities=None,  # No seniority filter
                        per_page=6,
                        reveal_emails=False
                    )

                if not pocs:
                    print(f"[Skip] {company_name} - No POCs found")
                    skipped_no_pocs += 1
                    continue

                # Use bulk_match to reveal emails for all POCs at once
                # Add domain to each POC for better matching
                for poc in pocs:
                    poc['domain'] = domain

                pocs = self.apollo_service.bulk_reveal_emails(pocs)

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
                    } for p in pocs[:4]]  # Max 4 POCs per company
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
