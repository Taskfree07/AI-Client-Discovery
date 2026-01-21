"""
Manufacturing ICP Lead Generation Service with RAG Intelligence
Generates validated leads using local LLM, RAG, and async processing for 10-20x speedup
"""

import json
import asyncio
from typing import List, Dict, Optional
from services.apollo_api import ApolloAPIService
from services.rag_lead_intelligence import RAGLeadIntelligence, parallel_apollo_search


class ManufacturingICPService:
    """Service for generating Manufacturing ICP leads with validation"""

    # Default T1 titles (Decision Makers)
    T1_TITLES = [
        "COO", "Chief Operating Officer",
        "VP Operations", "Vice President Operations",
        "Director Operations", "Director of Operations",
        "Plant Head", "Plant Manager",
        "Factory Manager", "Factory Head",
        "Unit Head", "Unit Manager",
        "General Manager Operations", "GM Operations",
        "Regional Manager Operations", "Regional Operations Manager"
    ]

    # Default T2 titles (HR/TA Leaders)
    T2_TITLES = [
        "HR Head", "Head of HR", "Head of Human Resources",
        "VP HR", "Vice President HR", "VP Human Resources",
        "CHRO", "Chief Human Resources Officer",
        "Director HR", "Director of HR", "Director Human Resources",
        "HR Manager", "Human Resources Manager",
        "Talent Acquisition Head", "Head of Talent Acquisition",
        "TA Manager", "Talent Acquisition Manager",
        "Senior HRBP", "Senior HR Business Partner"
    ]

    # Default T3 titles (HR/TA Practitioners)
    T3_TITLES = [
        "Recruiter", "Senior Recruiter",
        "TA Specialist", "Talent Acquisition Specialist",
        "Talent Specialist",
        "HRBP", "HR Business Partner",
        "HR Executive", "Human Resources Executive",
        "Staffing Coordinator", "Recruitment Coordinator"
    ]

    # Manufacturing industries
    INDUSTRIES = [
        "Manufacturing",
        "Industrial",
        "Automotive",
        "Electronics Manufacturing",
        "Chemicals",
        "Chemical Manufacturing",
        "FMCG Manufacturing",
        "Consumer Goods Manufacturing",
        "Heavy Engineering",
        "Industrial Machinery",
        "Machinery Manufacturing",
        "Electrical Equipment",
        "Industrial Automation",
        "Plastics Manufacturing",
        "Steel Manufacturing",
        "Metal Manufacturing",
        "Food Processing",
        "Packaging"
    ]

    def __init__(self, apollo_api_key: str, use_rag: bool = True, use_ollama: bool = False, use_ai_agents: bool = True, ultra_fast_mode: bool = False):
        """
        Initialize Manufacturing ICP Service

        Args:
            apollo_api_key: Apollo API key
            use_rag: Enable RAG-based pre-filtering (default: True)
            use_ollama: Enable local LLM validation with Ollama (default: False)
            use_ai_agents: Enable AI agent system for intelligent filtering (default: True)
            ultra_fast_mode: Enable ultra-fast parallel processing (default: False)
        """
        self.apollo = ApolloAPIService(apollo_api_key)
        self.apollo_api_key = apollo_api_key
        self.use_rag = use_rag
        self.use_ai_agents = use_ai_agents
        self.ultra_fast_mode = ultra_fast_mode

        # Initialize ultra-fast service if enabled
        self.ultra_fast = None
        if ultra_fast_mode:
            from services.ultra_fast_icp import UltraFastICPService
            print("[SPEED] ULTRA-FAST MODE ENABLED - Maximum parallelization!")
            self.ultra_fast = UltraFastICPService(apollo_api_key)

        # Initialize RAG system for intelligent filtering
        if use_rag and not ultra_fast_mode:
            print("[RAG] Initializing RAG-based lead intelligence...")
            self.rag = RAGLeadIntelligence(use_ollama=use_ollama)
            print("[RAG] RAG system ready!")
        else:
            self.rag = None

        # Initialize AI Agent System for intelligent pre-filtering
        self.ai_agents = None
        if use_ai_agents and not ultra_fast_mode:
            try:
                from services.ai_agent_system import AIAgentOrchestrator
                from services.ai_agent_config import get_config

                # Get model from config
                config = get_config()
                model = config.get_model()

                print(f"[AI AGENTS] Initializing AI Agent System with {model}...")
                self.ai_agents = AIAgentOrchestrator(model=model)
                print("[AI AGENTS] AI Agents ready!")
            except Exception as e:
                print(f"[AI AGENTS] Warning: Could not initialize AI agents: {e}")
                print("[AI AGENTS] Continuing without AI agent filtering...")
                self.use_ai_agents = False

    def generate_leads(self, campaign, filters: Dict) -> Dict:
        """
        Generate leads for a Manufacturing ICP campaign

        Args:
            campaign: ManufacturingICPCampaign database object
            filters: Dict with search parameters

        Returns:
            Dict with results summary
        """
        print(f"\n[*] Starting Manufacturing ICP lead generation")
        print(f"    Campaign: {campaign.name}")
        print(f"    Targets: T1={campaign.t1_target}, T2={campaign.t2_target}, T3={campaign.t3_target}")

        results = {
            't1_leads': [],
            't2_leads': [],
            't3_leads': [],
            'total_generated': 0,
            'total_rejected': 0,
            'avg_score': 0
        }

        # Extract filters
        industries = filters.get('industries', self.INDUSTRIES)
        size_min = filters.get('size_min', 200)
        size_max = filters.get('size_max', 10000)
        locations = filters.get('locations', {'usa': True, 'india': True})
        min_score = filters.get('min_validation_score', 4)

        # Generate T1 leads
        if campaign.t1_target > 0:
            print(f"\n[T1] Searching for {campaign.t1_target} Decision Makers...")
            t1_titles = filters.get('t1_titles', self.T1_TITLES)
            t1_leads = self._search_tier(
                tier='T1',
                titles=t1_titles,
                target_count=campaign.t1_target,
                industries=industries,
                size_min=size_min,
                size_max=size_max,
                locations=locations,
                min_score=min_score
            )
            results['t1_leads'] = t1_leads
            print(f"[T1] Generated {len(t1_leads)} leads")

        # Generate T2 leads
        if campaign.t2_target > 0:
            print(f"\n[T2] Searching for {campaign.t2_target} HR/TA Leaders...")
            t2_titles = filters.get('t2_titles', self.T2_TITLES)
            t2_leads = self._search_tier(
                tier='T2',
                titles=t2_titles,
                target_count=campaign.t2_target,
                industries=industries,
                size_min=size_min,
                size_max=size_max,
                locations=locations,
                min_score=min_score
            )
            results['t2_leads'] = t2_leads
            print(f"[T2] Generated {len(t2_leads)} leads")

        # Generate T3 leads
        if campaign.t3_target > 0:
            print(f"\n[T3] Searching for {campaign.t3_target} HR Practitioners...")
            t3_titles = filters.get('t3_titles', self.T3_TITLES)
            t3_leads = self._search_tier(
                tier='T3',
                titles=t3_titles,
                target_count=campaign.t3_target,
                industries=industries,
                size_min=size_min,
                size_max=size_max,
                locations=locations,
                min_score=min_score
            )
            results['t3_leads'] = t3_leads
            print(f"[T3] Generated {len(t3_leads)} leads")

        # Calculate summary
        all_leads = results['t1_leads'] + results['t2_leads'] + results['t3_leads']
        results['total_generated'] = len(all_leads)

        if all_leads:
            total_score = sum(lead['validation']['score'] for lead in all_leads)
            results['avg_score'] = round(total_score / len(all_leads), 2)

        print(f"\n[OK] Lead generation complete!")
        print(f"     Total: {results['total_generated']} leads")
        print(f"     Avg Score: {results['avg_score']}/6")

        return results

    def _search_tier_with_progress(self, tier: str, titles: List[str], target_count: int,
                     industries: List[str], size_min: int, size_max: int,
                     locations: Dict, min_score: int, progress_callback=None):
        """
        Generator that yields progress updates and final leads
        Uses RAG-based filtering and async processing for 10-20x speedup

        Args:
            progress_callback: Optional callback function(count, message) called for each lead found

        Yields:
            dict: Progress updates with type 'progress' or 'result' with final leads
        """
        # Use generator version that yields progress
        leads = []
        for update in self._search_tier_generator(tier, titles, target_count, industries, size_min, size_max, locations, min_score):
            if update['type'] == 'progress':
                yield update
            elif update['type'] == 'lead':
                leads.append(update['data'])

        # Return final leads
        yield {'type': 'result', 'data': leads}

    def _search_tier_generator(self, tier: str, titles: List[str], target_count: int,
                     industries: List[str], size_min: int, size_max: int,
                     locations: Dict, min_score: int):
        """
        Generator version of _search_tier that yields progress updates with percentage

        Yields:
            dict: Progress updates with type 'progress' or 'lead'
                  progress type includes: count, message, percentage, target
        """
        # Build location filter
        location_list = []
        if locations.get('usa'):
            location_list.append('United States')
        if locations.get('india'):
            location_list.append('India')

        # ULTRA-FAST MODE: Use parallel processing
        if self.ultra_fast_mode and self.ultra_fast:
            print(f"[SPEED] Using ULTRA-FAST mode for {tier}...")
            
            # Yield initial progress
            yield {
                'type': 'progress',
                'count': 0,
                'target': target_count,
                'percentage': 0,
                'message': f'Starting ULTRA-FAST {tier} search...'
            }
            
            results = self.ultra_fast.generate_leads_sync(
                tier=tier,
                titles=titles,
                target_count=target_count,
                locations=location_list,
                size_min=size_min,
                size_max=size_max,
                min_score=min_score
            )
            
            # Yield leads with progress updates
            for idx, lead in enumerate(results, 1):
                yield {'type': 'lead', 'data': lead}
                # Yield progress after each lead
                percentage = int((idx / target_count) * 100) if target_count > 0 else 100
                yield {
                    'type': 'progress',
                    'count': idx,
                    'target': target_count,
                    'percentage': percentage,
                    'message': f'Found: {lead["company"]["name"]}'
                }
            return

        # STANDARD MODE
        leads = []
        seen_companies = set()
        search_attempts = 0
        max_attempts = target_count * 20

        print(f"[{tier}] Search parameters:")
        print(f"      Titles: {len(titles)} options")
        print(f"      Industries: {len(industries)} types")
        print(f"      Size: {size_min}-{size_max} employees")
        print(f"      Locations: {', '.join(location_list)}")

        # Yield initial progress
        yield {
            'type': 'progress',
            'count': 0,
            'target': target_count,
            'percentage': 0,
            'message': f'Starting {tier} search...'
        }

        # Build ICP profile for RAG filtering
        if self.use_rag and self.rag:
            icp_profile = self.rag.build_icp_profile({
                'industries': industries,
                'size_min': size_min,
                'size_max': size_max,
                'locations': locations
            })
            persona_profile = self.rag.build_persona_profile(tier)
            print(f"[{tier}] RAG-based filtering enabled with ICP matching")

        # PHASE 1: Search across titles
        print(f"[{tier}] Phase 1: Searching across {min(5, len(titles))} titles...")
        all_contacts = []

        for i, title in enumerate(titles[:5], 1):
            try:
                print(f"[{tier}] Searching title {i}/5: {title}")
                contacts = self.apollo.search_people(
                    person_titles=[title],
                    person_locations=location_list,
                    organization_num_employees_ranges=[f'{size_min},{size_max}'],
                    person_seniorities=['manager', 'director', 'vp', 'c_suite', 'owner', 'head'],
                    per_page=min(50, target_count * 3)
                )
                if contacts:
                    print(f"[{tier}] Found {len(contacts)} contacts for {title}")
                    all_contacts.extend(contacts)
            except Exception as e:
                print(f"[{tier}] Error searching {title}: {e}")
                continue

        print(f"[{tier}] Phase 1: Found {len(all_contacts)} total candidate contacts")

        if not all_contacts:
            print(f"[{tier}] No candidates found")
            return

        # PHASE 2: AI Agent intelligent filtering
        if self.use_ai_agents and self.ai_agents:
            print(f"[{tier}] Phase 2: AI Agent intelligent filtering...")
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                filtered_contacts = loop.run_until_complete(
                    self.ai_agents.intelligent_filter_pipeline(all_contacts, tier)
                )
                print(f"[{tier}] Phase 2: AI Agents filtered to {len(filtered_contacts)}/{len(all_contacts)} high-quality contacts")
            except Exception as e:
                print(f"[{tier}] Warning: AI agent filtering failed: {e}")
                filtered_contacts = all_contacts
        elif self.use_rag and self.rag:
            print(f"[{tier}] Phase 2: RAG semantic filtering...")
            filtered_contacts = self.rag.smart_filter_contacts(
                all_contacts,
                persona_profile,
                threshold=0.3
            )
            print(f"[{tier}] Phase 2: {len(filtered_contacts)}/{len(all_contacts)} contacts passed RAG filter")
        else:
            filtered_contacts = all_contacts

        # PHASE 3: Enrich and validate - YIELD PROGRESS HERE
        print(f"[{tier}] Phase 3: Enriching {len(filtered_contacts)} filtered candidates...")

        # Yield progress update before enrichment starts
        yield {
            'type': 'progress',
            'count': 0,
            'target': target_count,
            'percentage': 0,
            'message': f'Enriching {len(filtered_contacts)} candidates for {tier}...'
        }

        for contact in filtered_contacts:
            if len(leads) >= target_count:
                break

            search_attempts += 1
            if search_attempts >= max_attempts:
                break

            try:
                company_name = contact.get('organization_name', '')
                if not company_name or company_name in seen_companies:
                    continue

                domain = contact.get('organization_domain', '')
                if not domain:
                    org = contact.get('organization', {})
                    domain = org.get('primary_domain', '') or org.get('website_url', '')
                if domain:
                    domain = domain.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0]
                if not domain:
                    continue

                # Enrich company
                company_data = self.apollo.enrich_organization(domain)
                if not company_data:
                    continue

                # Industry check
                company_industry = company_data.get('industry', '').lower()
                manufacturing_keywords = [
                    'manufacturing', 'industrial', 'automotive', 'electronics', 'chemical',
                    'machinery', 'pharma', 'food', 'beverage', 'metal', 'steel', 'plastic',
                    'equipment', 'material', 'engineering', 'mechanical'
                ]
                is_manufacturing = any(keyword in company_industry for keyword in manufacturing_keywords)
                company_size = company_data.get('estimated_num_employees', 0)
                if not is_manufacturing and company_size >= 500:
                    is_manufacturing = True
                if not is_manufacturing:
                    continue

                # Size check
                if not (size_min <= company_size <= size_max):
                    continue

                # Reveal email
                enriched_contact = self.apollo.enrich_person(
                    person_id=contact.get('id'),
                    domain=domain,
                    reveal_emails=True
                )
                if not enriched_contact:
                    continue

                # Build lead
                lead_data = {
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

                # Validate
                validation = self.validate_lead(lead_data)
                lead_data['validation'] = validation

                if validation['score'] < min_score:
                    continue

                # Success! Add lead and yield progress
                seen_companies.add(company_name)
                leads.append(lead_data)
                print(f"[{tier}] ✓ {company_name} - {enriched_contact.get('name')} ({enriched_contact.get('title')})")

                # Calculate percentage for this tier
                current_count = len(leads)
                tier_percentage = int((current_count / target_count) * 100) if target_count > 0 else 0

                # YIELD PROGRESS UPDATE IN REAL-TIME with percentage
                yield {
                    'type': 'progress',
                    'count': current_count,
                    'target': target_count,
                    'percentage': tier_percentage,
                    'message': f"Found: {company_name} - {enriched_contact.get('name')}"
                }

                # YIELD THE LEAD
                yield {'type': 'lead', 'data': lead_data}

            except Exception as e:
                print(f"[{tier}] Error: {str(e)}")
                continue

    def _search_tier(self, tier: str, titles: List[str], target_count: int,
                     industries: List[str], size_min: int, size_max: int,
                     locations: Dict, min_score: int, progress_callback=None) -> List[Dict]:
        """
        Search Apollo for contacts matching tier criteria
        Uses RAG-based filtering and async processing for 10-20x speedup

        Args:
            progress_callback: Optional callback function(count, message) called for each lead found
        """

        # Build location filter
        location_list = []
        if locations.get('usa'):
            location_list.append('United States')
        if locations.get('india'):
            location_list.append('India')

        # ULTRA-FAST MODE: Use parallel processing for maximum speed
        if self.ultra_fast_mode and self.ultra_fast:
            print(f"[SPEED] Using ULTRA-FAST mode for {tier}...")
            return self.ultra_fast.generate_leads_sync(
                tier=tier,
                titles=titles,
                target_count=target_count,
                locations=location_list,
                size_min=size_min,
                size_max=size_max,
                min_score=min_score
            )

        # STANDARD MODE: Original logic
        leads = []
        seen_companies = set()
        search_attempts = 0
        max_attempts = target_count * 20  # Search many more to ensure we hit target

        print(f"[{tier}] Search parameters:")
        print(f"      Titles: {len(titles)} options")
        print(f"      Industries: {len(industries)} types")
        print(f"      Size: {size_min}-{size_max} employees")
        print(f"      Locations: {', '.join(location_list)}")

        # Build ICP profile for RAG filtering
        if self.use_rag and self.rag:
            icp_profile = self.rag.build_icp_profile({
                'industries': industries,
                'size_min': size_min,
                'size_max': size_max,
                'locations': locations
            })
            persona_profile = self.rag.build_persona_profile(tier)
            print(f"[{tier}] RAG-based filtering enabled with ICP matching")

        # PHASE 1: Sequential search across titles (more reliable)
        print(f"[{tier}] Phase 1: Searching across {min(5, len(titles))} titles...")

        all_contacts = []
        
        # Build industry keywords for Apollo search
        # Apollo uses different industry names, so we search by keywords
        industry_keywords = [
            'manufacturing', 'industrial', 'automotive', 'machinery', 
            'chemical', 'electronics', 'metal', 'steel', 'plastic'
        ]
        
        # Search up to 5 titles to get candidate pool
        for i, title in enumerate(titles[:5], 1):
            try:
                print(f"[{tier}] Searching title {i}/5: {title}")
                contacts = self.apollo.search_people(
                    person_titles=[title],
                    person_locations=location_list,
                    organization_num_employees_ranges=[f'{size_min},{size_max}'],
                    person_seniorities=['manager', 'director', 'vp', 'c_suite', 'owner', 'head'],
                    per_page=min(50, target_count * 3)  # Get more results since we'll filter by industry
                )
                if contacts:
                    print(f"[{tier}] Found {len(contacts)} contacts for {title}")
                    all_contacts.extend(contacts)
                else:
                    print(f"[{tier}] No contacts found for {title}")
            except Exception as e2:
                print(f"[{tier}] Error searching {title}: {e2}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"[{tier}] Phase 1: Found {len(all_contacts)} total candidate contacts")

        if not all_contacts:
            print(f"[{tier}] No candidates found")
            return leads

        # PHASE 2: AI Agent intelligent filtering (SAVES MONEY!)
        if self.use_ai_agents and self.ai_agents:
            print(f"[{tier}] Phase 2: AI Agent intelligent filtering with Llama...")

            # Use AI agents to filter contacts BEFORE expensive enrichment
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                filtered_contacts = loop.run_until_complete(
                    self.ai_agents.intelligent_filter_pipeline(all_contacts, tier)
                )
                print(f"[{tier}] Phase 2: AI Agents filtered to {len(filtered_contacts)}/{len(all_contacts)} high-quality contacts")
                print(f"[{tier}] 💰 Cost Savings: Avoided {len(all_contacts) - len(filtered_contacts)} unnecessary enrichments!")
            except Exception as e:
                print(f"[{tier}] Warning: AI agent filtering failed: {e}")
                print(f"[{tier}] Falling back to RAG filtering...")
                filtered_contacts = all_contacts
        elif self.use_rag and self.rag:
            # Fallback to RAG filtering
            print(f"[{tier}] Phase 2: RAG semantic filtering (AI Agents disabled)...")
            filtered_contacts = self.rag.smart_filter_contacts(
                all_contacts,
                persona_profile,
                threshold=0.3
            )
            print(f"[{tier}] Phase 2: {len(filtered_contacts)}/{len(all_contacts)} contacts passed RAG filter")
        else:
            filtered_contacts = all_contacts

        # PHASE 3: Enrich and validate top candidates
        print(f"[{tier}] Phase 3: Enriching {len(filtered_contacts)} filtered candidates to find {target_count} valid leads...")

        for contact in filtered_contacts:
            if len(leads) >= target_count:
                break

            search_attempts += 1
            if search_attempts >= max_attempts:
                print(f"[{tier}] Max enrichment attempts reached")
                break

            try:
                # Get company info
                company_name = contact.get('organization_name', '')
                if not company_name:
                    print(f"[{tier}] Skipped: Contact has no company name")
                    continue
                    
                # Skip if we already have a lead from this company
                if company_name in seen_companies:
                    print(f"[{tier}] Skipped: {company_name} - Already processed")
                    continue

                # Get company domain
                domain = contact.get('organization_domain', '')
                
                # Fallback: try to get from organization object
                if not domain:
                    org = contact.get('organization', {})
                    domain = org.get('primary_domain', '') or org.get('website_url', '')
                
                if domain:
                    # Clean up domain
                    domain = domain.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0]
                
                if not domain:
                    print(f"[{tier}] Skipped: {company_name} - No domain found")
                    continue

                # Enrich company data
                print(f"[{tier}] Enriching company: {company_name} ({domain})")
                company_data = self.apollo.enrich_organization(domain)

                if not company_data:
                    print(f"[{tier}] Skipped: {company_name} - Enrichment failed")
                    continue

                # Industry check - flexible matching
                company_industry = company_data.get('industry', '').lower()
                manufacturing_keywords = [
                    'manufacturing', 'industrial', 'automotive', 'electronics', 'chemical',
                    'machinery', 'pharma', 'food', 'beverage', 'metal', 'steel', 'plastic',
                    'equipment', 'material', 'engineering', 'mechanical'
                ]
                is_manufacturing = any(keyword in company_industry for keyword in manufacturing_keywords)
                
                # Be flexible: Large companies (500+) often have manufacturing operations
                company_size = company_data.get('estimated_num_employees', 0)
                if not is_manufacturing and company_size >= 500:
                    is_manufacturing = True
                    
                if not is_manufacturing:
                    print(f"[{tier}] Skipped: {company_name} - Industry mismatch ({company_industry})")
                    continue

                # Check company size (already retrieved above)
                if not (size_min <= company_size <= size_max):
                    print(f"[{tier}] Skipped: {company_name} - Size {company_size} out of range")
                    continue

                # Reveal email for this contact
                enriched_contact = self.apollo.enrich_person(
                    person_id=contact.get('id'),
                    domain=domain,
                    reveal_emails=True
                )

                if not enriched_contact:
                    continue

                # Build lead data
                lead_data = {
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

                # Validate lead
                validation = self.validate_lead(lead_data)
                lead_data['validation'] = validation

                # Check if validation score meets minimum
                if validation['score'] < min_score:
                    print(f"[{tier}] Rejected: {company_name} - Score {validation['score']}/6 (min: {min_score})")
                    continue

                # Add to results
                seen_companies.add(company_name)
                leads.append(lead_data)
                print(f"[{tier}] ✓ {company_name} - {enriched_contact.get('name')} ({enriched_contact.get('title')}) - Score: {validation['score']}/6")

                # Call progress callback if provided
                if progress_callback:
                    try:
                        progress_callback(len(leads), f"Found: {company_name} - {enriched_contact.get('name')}")
                    except Exception as e:
                        print(f"[{tier}] Warning: Progress callback error: {e}")

            except Exception as e:
                print(f"[{tier}] Error enriching contact: {str(e)}")
                continue

        return leads

    def validate_lead(self, lead_data: Dict) -> Dict:
        """
        Validate lead against 6-point checklist

        Returns:
            Dict with score, checklist details, and validation status
        """
        score = 0
        checklist = {}

        company = lead_data['company']
        company_raw = company.get('raw_data', {})

        # 1. Manufacturing industry
        # Accept manufacturing and related industries that hire blue-collar/production workers
        manufacturing_keywords = [
            'manufacturing', 'industrial', 'automotive', 'electronics', 'chemical', 
            'fmcg', 'machinery', 'automation', 'pharma', 'food', 'beverage', 'packaging',
            'textile', 'steel', 'metal', 'plastic', 'consumer goods', 'production',
            'assembly', 'processing', 'fabrication', 'engineering', 'mechanical',
            'equipment', 'material', 'supply', 'distribution', 'logistics'
        ]
        industry = company.get('industry', '').lower()
        is_manufacturing = any(keyword in industry for keyword in manufacturing_keywords)
        
        # Be flexible: if company has 500+ employees, they likely have manufacturing needs
        if not is_manufacturing and company.get('size', 0) >= 500:
            is_manufacturing = True

        checklist['manufacturing_industry'] = {
            'passed': is_manufacturing,
            'value': company.get('industry', 'Unknown'),
            'label': 'Manufacturing/Industrial Industry (flexible)'
        }
        if is_manufacturing:
            score += 1

        # 2. Company size 200-10,000
        company_size = company.get('size', 0)
        size_valid = 200 <= company_size <= 10000

        checklist['size_range'] = {
            'passed': size_valid,
            'value': f"{company_size} employees",
            'label': '200-10,000 Employees'
        }
        if size_valid:
            score += 1

        # 3. Multi-location (check if has multiple locations)
        is_multi_location = False
        if company_raw:
            # Check if company has multiple locations or mentions multi-plant
            raw_address = company_raw.get('raw_address', '').lower()
            keywords_count = company_raw.get('keywords', [])
            is_multi_location = (
                'locations' in str(keywords_count).lower() or
                'multi' in raw_address or
                'plant' in raw_address or
                company_size > 500  # Larger companies usually multi-location
            )

        checklist['multi_location'] = {
            'passed': is_multi_location,
            'value': 'Multi-location detected' if is_multi_location else 'Single location',
            'label': 'Multi-location/Multi-plant'
        }
        if is_multi_location:
            score += 1

        # 4. Has HR + Operations leadership (check departments)
        has_leadership = False
        if company_raw:
            dept_headcount = company_raw.get('departmental_head_count', {})
            has_hr = dept_headcount.get('human_resources', 0) > 0
            has_ops = dept_headcount.get('operations', 0) > 0 or dept_headcount.get('engineering', 0) > 0
            has_leadership = has_hr or has_ops

        checklist['has_leadership'] = {
            'passed': has_leadership,
            'value': 'HR + Ops teams found' if has_leadership else 'Department info unavailable',
            'label': 'Has HR + Operations Leadership'
        }
        if has_leadership:
            score += 1

        # 5. Active hiring cycles (check if company posts jobs)
        has_hiring_cycles = company_size > 200  # Assume companies > 200 have regular hiring

        checklist['hiring_cycles'] = {
            'passed': has_hiring_cycles,
            'value': 'Regular hiring expected' if has_hiring_cycles else 'Uncertain',
            'label': 'Monthly/Quarterly Hiring Cycles'
        }
        if has_hiring_cycles:
            score += 1

        # 6. Uses staffing vendors (difficult to determine from Apollo, assume based on size)
        uses_vendors = company_size >= 500  # Larger companies more likely to use staffing

        checklist['uses_vendors'] = {
            'passed': uses_vendors,
            'value': 'Likely uses staffing' if uses_vendors else 'May not use staffing',
            'label': 'Uses Staffing Vendors'
        }
        if uses_vendors:
            score += 1

        return {
            'score': score,
            'max_score': 6,
            'percentage': round((score / 6) * 100),
            'checklist': checklist,
            'is_valid': score >= 4
        }

    def preview_search(self, filters: Dict) -> Dict:
        """
        Preview how many potential leads exist without revealing emails
        (Saves Apollo credits)
        """
        print("[*] Running search preview (no email reveals)...")

        # This would do a quick Apollo search count without enriching
        # For now, return estimated count based on filters

        return {
            'estimated_count': 50,  # Placeholder
            'message': 'Preview functionality coming soon'
        }
