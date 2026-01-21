"""
ULTRA-FAST Manufacturing ICP Service
Optimized for MAXIMUM SPEED with parallel processing everywhere
"""

import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional
import time
from services.apollo_api import ApolloAPIService


class UltraFastICPService:
    """Ultra-fast ICP service with aggressive parallelization"""

    def __init__(self, apollo_api_key: str):
        """Initialize ultra-fast service"""
        self.apollo = ApolloAPIService(apollo_api_key)
        self.apollo_api_key = apollo_api_key

        # Cache for company data (avoid re-enrichment)
        self.company_cache = {}

        # Performance settings
        self.max_parallel_searches = 10  # Search 10 titles at once
        self.max_parallel_enrichments = 20  # Enrich 20 at once
        self.batch_size = 50  # Process in batches of 50

        print("[ULTRA-FAST] Initialized with maximum parallelization")
        print(f"[ULTRA-FAST] Parallel searches: {self.max_parallel_searches}")
        print(f"[ULTRA-FAST] Parallel enrichments: {self.max_parallel_enrichments}")

    async def parallel_apollo_search(self, titles: List[str], locations: List[str],
                                     size_min: int, size_max: int, per_page: int = 100) -> List[Dict]:
        """
        Search Apollo for multiple titles IN PARALLEL

        This is 5-10x faster than sequential searching
        """
        print(f"[ULTRA-FAST] Parallel searching {len(titles)} titles at once...")
        start_time = time.time()

        async def search_single_title(title: str) -> List[Dict]:
            """Search a single title (async)"""
            try:
                # Use threadpool for Apollo API (it's synchronous)
                loop = asyncio.get_event_loop()
                contacts = await loop.run_in_executor(
                    None,
                    lambda: self.apollo.search_people(
                        person_titles=[title],
                        person_locations=locations,
                        organization_num_employees_ranges=[f'{size_min},{size_max}'],
                        person_seniorities=['manager', 'director', 'vp', 'c_suite', 'owner', 'head'],
                        per_page=per_page
                    )
                )
                print(f"[ULTRA-FAST] Found {len(contacts) if contacts else 0} for {title}")
                return contacts or []
            except Exception as e:
                print(f"[ULTRA-FAST] Error searching {title}: {e}")
                return []

        # Search all titles in parallel
        tasks = [search_single_title(title) for title in titles[:self.max_parallel_searches]]
        results = await asyncio.gather(*tasks)

        # Flatten results
        all_contacts = []
        for contacts in results:
            all_contacts.extend(contacts)

        elapsed = time.time() - start_time
        print(f"[ULTRA-FAST] Parallel search complete: {len(all_contacts)} contacts in {elapsed:.1f}s")

        return all_contacts

    async def parallel_enrichment(self, contacts: List[Dict], tier: str) -> List[Dict]:
        """
        Enrich multiple contacts IN PARALLEL

        This is 10-20x faster than sequential enrichment
        """
        print(f"[ULTRA-FAST] Parallel enriching {len(contacts)} contacts...")
        start_time = time.time()

        async def enrich_single_contact(contact: Dict) -> Optional[Dict]:
            """Enrich a single contact (async)"""
            try:
                company_name = contact.get('organization_name', '')
                if not company_name:
                    return None

                # Check cache first (HUGE speedup!)
                if company_name in self.company_cache:
                    print(f"[CACHE HIT] {company_name}")
                    company_data = self.company_cache[company_name]
                else:
                    # Get domain
                    domain = contact.get('organization_domain', '')
                    if not domain:
                        org = contact.get('organization', {})
                        domain = org.get('primary_domain', '') or org.get('website_url', '')

                    if domain:
                        domain = domain.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0]

                    if not domain:
                        return None

                    # Enrich company (async via threadpool)
                    loop = asyncio.get_event_loop()
                    company_data = await loop.run_in_executor(
                        None,
                        lambda: self.apollo.enrich_organization(domain)
                    )

                    if company_data:
                        # Cache it!
                        self.company_cache[company_name] = company_data

                if not company_data:
                    return None

                # Quick validation (before email reveal)
                company_industry = company_data.get('industry', '').lower()
                manufacturing_keywords = [
                    'manufacturing', 'industrial', 'automotive', 'electronics', 'chemical',
                    'machinery', 'pharma', 'food', 'beverage', 'metal', 'steel', 'plastic',
                    'equipment', 'material', 'engineering', 'mechanical'
                ]
                is_manufacturing = any(keyword in company_industry for keyword in manufacturing_keywords)

                company_size = company_data.get('estimated_num_employees', 0)
                if not is_manufacturing and company_size < 500:
                    return None

                # Enrich person (async via threadpool)
                loop = asyncio.get_event_loop()
                enriched_contact = await loop.run_in_executor(
                    None,
                    lambda: self.apollo.enrich_person(
                        person_id=contact.get('id'),
                        domain=domain,
                        reveal_emails=True
                    )
                )

                if not enriched_contact:
                    return None

                # Build lead data
                domain = contact.get('organization_domain', '')
                lead = {
                    'tier': tier,
                    'company': {
                        'name': company_name,
                        'domain': domain,
                        'size': company_size,
                        'industry': company_industry,
                        'location': f"{company_data.get('city', '')}, {company_data.get('state', '')}, {company_data.get('country', '')}".strip(', '),
                        'revenue': company_data.get('annual_revenue_printed', ''),
                        'linkedin': company_data.get('linkedin_url', ''),
                        'website': company_data.get('website_url', ''),
                        'raw_data': company_data
                    },
                    'contact': {
                        'name': enriched_contact.get('name', ''),
                        'title': enriched_contact.get('title', ''),
                        'email': enriched_contact.get('email', ''),
                        'phone': ', '.join(enriched_contact.get('phone_numbers', [])) if enriched_contact.get('phone_numbers') else '',
                        'linkedin': enriched_contact.get('linkedin_url', ''),
                        'email_status': enriched_contact.get('email_status', 'unavailable')
                    }
                }

                return lead

            except Exception as e:
                print(f"[ULTRA-FAST] Error enriching: {str(e)[:50]}")
                return None

        # Process in batches to avoid overwhelming API
        enriched_leads = []
        for i in range(0, len(contacts), self.batch_size):
            batch = contacts[i:i + self.batch_size]
            print(f"[ULTRA-FAST] Processing batch {i//self.batch_size + 1}/{(len(contacts)-1)//self.batch_size + 1}")

            # Enrich batch in parallel (up to max_parallel_enrichments at once)
            semaphore = asyncio.Semaphore(self.max_parallel_enrichments)

            async def enrich_with_limit(contact):
                async with semaphore:
                    return await enrich_single_contact(contact)

            tasks = [enrich_with_limit(contact) for contact in batch]
            batch_results = await asyncio.gather(*tasks)

            # Filter out None results
            batch_leads = [lead for lead in batch_results if lead is not None]
            enriched_leads.extend(batch_leads)

            print(f"[ULTRA-FAST] Batch enriched: {len(batch_leads)}/{len(batch)} succeeded")

        elapsed = time.time() - start_time
        print(f"[ULTRA-FAST] Parallel enrichment complete: {len(enriched_leads)} leads in {elapsed:.1f}s")

        return enriched_leads

    async def ultra_fast_generate(self, tier: str, titles: List[str], target_count: int,
                                   locations: List[str], size_min: int, size_max: int,
                                   min_score: int = 4) -> List[Dict]:
        """
        Ultra-fast lead generation with maximum parallelization

        Returns:
            List of validated leads
        """
        print(f"\n[ULTRA-FAST] ====== ULTRA-FAST MODE ======")
        print(f"[ULTRA-FAST] Tier: {tier}")
        print(f"[ULTRA-FAST] Target: {target_count} leads")
        start_total = time.time()

        # STEP 1: Parallel Apollo search (5-10x faster)
        all_contacts = await self.parallel_apollo_search(
            titles[:self.max_parallel_searches],
            locations,
            size_min,
            size_max,
            per_page=min(100, target_count * 5)  # Get 5x target to ensure we hit it after filtering
        )

        if not all_contacts:
            print(f"[ULTRA-FAST] No contacts found")
            return []

        print(f"[ULTRA-FAST] Total candidates: {len(all_contacts)}")

        # STEP 2: Deduplicate by company (avoid enriching same company twice)
        seen_companies = set()
        unique_contacts = []
        for contact in all_contacts:
            company_name = contact.get('organization_name', '')
            if company_name and company_name not in seen_companies:
                seen_companies.add(company_name)
                unique_contacts.append(contact)

        print(f"[ULTRA-FAST] After deduplication: {len(unique_contacts)} unique companies")

        # STEP 3: Parallel enrichment (10-20x faster)
        # Only enrich what we need (target * 2 to account for validation failures)
        contacts_to_enrich = unique_contacts[:target_count * 2]
        enriched_leads = await self.parallel_enrichment(contacts_to_enrich, tier)

        # STEP 4: Quick validation
        print(f"[ULTRA-FAST] Validating {len(enriched_leads)} leads...")
        validated_leads = []
        for lead in enriched_leads:
            # Quick validation
            score = 0
            company = lead['company']

            # Manufacturing check
            industry = company.get('industry', '').lower()
            manufacturing_keywords = ['manufacturing', 'industrial', 'automotive', 'electronics', 'chemical',
                                     'machinery', 'pharma', 'food', 'beverage', 'metal', 'steel', 'plastic',
                                     'equipment', 'material', 'engineering', 'mechanical']
            if any(keyword in industry for keyword in manufacturing_keywords):
                score += 1

            # Size check
            size = company.get('size', 0)
            if 200 <= size <= 10000:
                score += 1

            # Large company auto-pass some checks
            if size > 500:
                score += 2

            # Email check
            if lead['contact'].get('email'):
                score += 1

            # LinkedIn check
            if lead['contact'].get('linkedin'):
                score += 1

            # Store validation
            lead['validation'] = {
                'score': min(score, 6),
                'max_score': 6,
                'percentage': round((min(score, 6) / 6) * 100),
                'is_valid': score >= min_score
            }

            if score >= min_score:
                validated_leads.append(lead)
                if len(validated_leads) >= target_count:
                    break

        total_elapsed = time.time() - start_total
        print(f"\n[ULTRA-FAST] ====== COMPLETE ======")
        print(f"[ULTRA-FAST] Generated {len(validated_leads)}/{target_count} leads")
        print(f"[ULTRA-FAST] Total time: {total_elapsed:.1f}s")
        print(f"[ULTRA-FAST] Speed: {len(validated_leads)/total_elapsed:.1f} leads/sec")
        print(f"[ULTRA-FAST] Cache hits: {len(self.company_cache)} companies cached")

        return validated_leads[:target_count]

    def generate_leads_sync(self, tier: str, titles: List[str], target_count: int,
                           locations: List[str], size_min: int, size_max: int,
                           min_score: int = 4) -> List[Dict]:
        """Synchronous wrapper for ultra-fast generation"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.ultra_fast_generate(tier, titles, target_count, locations, size_min, size_max, min_score)
            )
        finally:
            loop.close()
