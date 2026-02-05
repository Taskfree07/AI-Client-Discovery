import requests
from typing import Dict, List, Optional

class ApolloAPIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Apollo API base URL - note: some endpoints use /api/v1, others use /v1
        self.base_url = "https://api.apollo.io"
        self.headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'x-api-key': api_key  # Apollo requires API key in header
        }

    def search_organization(self, domain: str) -> Optional[Dict]:
        """
        Search for organization details including size
        """
        try:
            url = f"{self.base_url}/v1/organizations/enrich"
            params = {
                'domain': domain
            }

            response = requests.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            if data.get('organization'):
                org = data['organization']
                return {
                    'id': org.get('id', ''),
                    'name': org.get('name', ''),
                    'domain': org.get('primary_domain', domain),
                    'estimated_num_employees': org.get('estimated_num_employees', 0),
                    'industry': org.get('industry', ''),
                    'linkedin_url': org.get('linkedin_url', ''),
                    'founded_year': org.get('founded_year', ''),
                    'publicly_traded_symbol': org.get('publicly_traded_symbol', ''),
                    'phone': org.get('phone', ''),
                    'city': org.get('city', ''),
                    'state': org.get('state', ''),
                    'country': org.get('country', '')
                }

            return None

        except Exception as e:
            print(f"Error searching organization {domain}: {str(e)}")
            return None

    def enrich_organization(self, domain: str) -> Optional[Dict]:
        """
        Enrich organization data using Apollo API
        Returns comprehensive company information including:
        - Basic info (name, industry, employees)
        - Financial data (revenue, funding rounds, funding amounts)
        - Contact details (phone, address, social links)
        - Technologies used
        - Keywords and specializations
        """
        try:
            print(f"[SEARCH] Enriching company data for: {domain}")

            # Use correct Apollo API endpoint
            url = f"{self.base_url}/api/v1/organizations/enrich"
            params = {
                'domain': domain
            }

            response = requests.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            if data.get('organization'):
                org = data['organization']
                
                # Format revenue for display
                annual_revenue = org.get('annual_revenue')
                annual_revenue_printed = org.get('annual_revenue_printed', '')
                if annual_revenue and not annual_revenue_printed:
                    if annual_revenue >= 1000000000:
                        annual_revenue_printed = f"${annual_revenue/1000000000:.1f}B"
                    elif annual_revenue >= 1000000:
                        annual_revenue_printed = f"${annual_revenue/1000000:.0f}M"
                    elif annual_revenue >= 1000:
                        annual_revenue_printed = f"${annual_revenue/1000:.0f}K"
                    else:
                        annual_revenue_printed = f"${annual_revenue}"
                
                # Format total funding
                total_funding = org.get('total_funding')
                total_funding_printed = org.get('total_funding_printed', '')
                if total_funding and not total_funding_printed:
                    if total_funding >= 1000000000:
                        total_funding_printed = f"${total_funding/1000000000:.1f}B"
                    elif total_funding >= 1000000:
                        total_funding_printed = f"${total_funding/1000000:.0f}M"
                    elif total_funding >= 1000:
                        total_funding_printed = f"${total_funding/1000:.0f}K"
                    else:
                        total_funding_printed = f"${total_funding}"
                
                enriched_data = {
                    # Basic Info
                    'id': org.get('id', ''),
                    'name': org.get('name', ''),
                    'domain': org.get('primary_domain', domain),
                    'website_url': org.get('website_url', f'https://{domain}'),
                    'logo_url': org.get('logo_url', ''),
                    'short_description': org.get('short_description', ''),
                    'seo_description': org.get('seo_description', ''),
                    'industry': org.get('industry', ''),
                    'subindustry': org.get('subindustry', ''),
                    'keywords': org.get('keywords', []),
                    'languages': org.get('languages', []),
                    
                    # Company Size & Type
                    'estimated_num_employees': org.get('estimated_num_employees', 0),
                    'founded_year': org.get('founded_year', ''),
                    'publicly_traded_symbol': org.get('publicly_traded_symbol', ''),
                    'publicly_traded_exchange': org.get('publicly_traded_exchange', ''),
                    
                    # Financial Info
                    'annual_revenue': annual_revenue,
                    'annual_revenue_printed': annual_revenue_printed,
                    'total_funding': total_funding,
                    'total_funding_printed': total_funding_printed,
                    'latest_funding_round_type': org.get('latest_funding_round_type', ''),
                    'latest_funding_amount': org.get('latest_funding_amount', ''),
                    'latest_funding_stage': org.get('latest_funding_stage', ''),
                    'latest_funding_date': org.get('latest_funding_date', ''),
                    'number_of_funding_rounds': org.get('number_of_funding_rounds', 0),
                    
                    # Location
                    'city': org.get('city', ''),
                    'state': org.get('state', ''),
                    'country': org.get('country', ''),
                    'raw_address': org.get('raw_address', ''),
                    'postal_code': org.get('postal_code', ''),
                    'street_address': org.get('street_address', ''),
                    
                    # Contact & Social
                    'phone': org.get('phone', ''),
                    'sanitized_phone': org.get('sanitized_phone', ''),
                    'linkedin_url': org.get('linkedin_url', ''),
                    'facebook_url': org.get('facebook_url', ''),
                    'twitter_url': org.get('twitter_url', ''),
                    'crunchbase_url': org.get('crunchbase_url', ''),
                    'blog_url': org.get('blog_url', ''),
                    'angellist_url': org.get('angellist_url', ''),
                    
                    # Technology Stack
                    'technology_names': org.get('technology_names', []),
                    'current_technologies': org.get('current_technologies', []),
                    
                    # Extras
                    'alexa_ranking': org.get('alexa_ranking', None),
                    'departmental_head_count': org.get('departmental_head_count', {})
                }

                print(f"[OK] Enriched: {enriched_data['name']}")
                print(f"   [STATS] Employees: {enriched_data['estimated_num_employees']}")
                print(f"   [INDUSTRY] Industry: {enriched_data['industry']}")
                if annual_revenue_printed:
                    print(f"   [MONEY] Revenue: {annual_revenue_printed}")
                if total_funding_printed:
                    print(f"   [ROCKET] Funding: {total_funding_printed}")
                if enriched_data['technology_names']:
                    print(f"   [TECH] Tech Stack: {', '.join(enriched_data['technology_names'][:5])}")
                
                return enriched_data

            print(f"[WARN] No organization data found for {domain}")
            return None

        except Exception as e:
            print(f"[ERROR] Error enriching organization {domain}: {str(e)}")
            return None

    def search_organizations(self, organization_name: str, per_page: int = 5) -> List[Dict]:
        """
        Search for organizations by name
        Returns list of matching organizations
        """
        try:
            print(f"[SEARCH] Searching organizations by name: {organization_name}")

            url = f"{self.base_url}/api/v1/mixed_companies/search"

            payload = {
                'q_organization_name': organization_name,
                'page': 1,
                'per_page': per_page
            }

            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            organizations = []
            if data.get('organizations'):
                for org in data['organizations']:
                    organizations.append({
                        'id': org.get('id', ''),
                        'name': org.get('name', ''),
                        'primary_domain': org.get('primary_domain', ''),
                        'website_url': org.get('website_url', ''),
                        'estimated_num_employees': org.get('estimated_num_employees', 0),
                        'industry': org.get('industry', ''),
                        'city': org.get('city', ''),
                        'state': org.get('state', ''),
                        'country': org.get('country', ''),
                        'linkedin_url': org.get('linkedin_url', '')
                    })
                print(f"[OK] Found {len(organizations)} organizations matching '{organization_name}'")
            else:
                print(f"[WARN] No organizations found for '{organization_name}'")

            return organizations

        except Exception as e:
            print(f"[ERROR] Error searching organizations: {str(e)}")
            return []

    def find_contacts(self, domain: str, titles: List[str] = None,
                      seniorities: List[str] = None, departments: List[str] = None,
                      per_page: int = 10, reveal_emails: bool = True) -> List[Dict]:
        """
        Find decision maker contacts for a company

        Args:
            domain: Company domain to search
            titles: Specific job titles to search for (None = no title filter)
            seniorities: Seniority levels ('owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', etc.)
            departments: Departments ('executive', 'engineering', 'sales', 'hr', 'marketing', 'finance', etc.)
            per_page: Number of results (default 10)
            reveal_emails: Set True to unlock email addresses (uses Apollo credits)

        Note: reveal_phone_number requires webhook_url, so we skip it
        """
        try:
            print(f"\n[SEARCH] Searching for contacts at {domain}")
            print(f"   Reveal emails: {reveal_emails}")
            print(f"   Per page: {per_page}")

            url = f"{self.base_url}/api/v1/people/search"

            payload = {
                'api_key': self.api_key,
                'organization_domains': [domain],
                'page': 1,
                'per_page': per_page,
                'reveal_personal_emails': reveal_emails
            }

            # Add title filter only if specified
            if titles:
                payload['person_titles'] = titles
                print(f"   Titles filter: {len(titles)} titles")

            # Add seniority filter if specified
            if seniorities:
                payload['person_seniorities'] = seniorities
                print(f"   Seniorities: {seniorities}")

            # Add department filter if specified
            if departments:
                payload['person_departments'] = departments
                print(f"   Departments: {departments}")

            response = requests.post(url, json=payload, headers=self.headers)
            if response.status_code != 200:
                print(f"   [DEBUG] Apollo {response.status_code} response: {response.text[:500]}")
            response.raise_for_status()
            data = response.json()

            contacts = []
            if data.get('people'):
                print(f"\n   Found {len(data['people'])} contacts:")
                for person in data['people']:
                    email = person.get('email', '')
                    email_status = person.get('email_status', '')
                    
                    # Categorize the contact by role type
                    title = person.get('title', '').lower()
                    role_category = self._categorize_role(title)

                    contact = {
                        'id': person.get('id', ''),
                        'name': person.get('name', ''),
                        'first_name': person.get('first_name', ''),
                        'last_name': person.get('last_name', ''),
                        'title': person.get('title', ''),
                        'role_category': role_category,
                        'email': email,
                        'email_status': email_status,
                        'phone_numbers': person.get('phone_numbers', []),
                        'linkedin_url': person.get('linkedin_url', ''),
                        'twitter_url': person.get('twitter_url', ''),
                        'organization_name': person.get('organization_name', ''),
                        'organization_id': person.get('organization_id', ''),
                        'city': person.get('city', ''),
                        'state': person.get('state', ''),
                        'country': person.get('country', ''),
                        'seniority': person.get('seniority', ''),
                        'departments': person.get('departments', []),
                        'photo_url': person.get('photo_url', '')
                    }
                    contacts.append(contact)

                    # Log contact info
                    status_icon = "[OK]" if email else "[WARN]"
                    email_display = email if email else f"No email (status: {email_status})"
                    print(f"   {status_icon} [{role_category}] {person.get('name')} - {person.get('title')}")
                    print(f"      [EMAIL] {email_display}")

            print(f"\n[OK] Total contacts found: {len(contacts)}")
            return contacts

        except Exception as e:
            print(f"[ERROR] Error finding contacts for {domain}: {str(e)}")
            return []
    
    def _categorize_role(self, title: str) -> str:
        """Categorize a job title into a role type for easier filtering"""
        title_lower = title.lower()
        
        if any(x in title_lower for x in ['ceo', 'chief executive', 'president', 'owner', 'founder', 'managing director']):
            return 'Executive'
        elif any(x in title_lower for x in ['cto', 'chief technology', 'vp engineering', 'head of engineering', 'director of engineering']):
            return 'Tech Leadership'
        elif any(x in title_lower for x in ['cfo', 'chief financial', 'vp finance', 'finance director']):
            return 'Finance'
        elif any(x in title_lower for x in ['coo', 'chief operating', 'operations director', 'vp operations']):
            return 'Operations'
        elif any(x in title_lower for x in ['cmo', 'chief marketing', 'vp marketing', 'marketing director', 'head of marketing']):
            return 'Marketing'
        elif any(x in title_lower for x in ['hr', 'human resources', 'people', 'talent', 'chro', 'recruiting']):
            return 'HR/Recruiting'
        elif any(x in title_lower for x in ['sales', 'revenue', 'business development', 'account executive']):
            return 'Sales'
        elif any(x in title_lower for x in ['partner', 'principal']):
            return 'Partner'
        else:
            return 'Other'
    
    def search_people(self, person_titles: List[str] = None, person_locations: List[str] = None,
                     organization_num_employees_ranges: List[str] = None, 
                     person_seniorities: List[str] = None, organization_industry_tag_ids: List[str] = None,
                     per_page: int = 25, page: int = 1, reveal_emails: bool = True) -> List[Dict]:
        """
        Search for people across companies using Apollo's /people_search endpoint
        
        Args:
            person_titles: List of job titles to search for
            person_locations: List of locations (e.g., ['United States', 'India'])
            organization_num_employees_ranges: List of employee ranges (e.g., ['200,10000'])
            person_seniorities: List of seniority levels
            organization_industry_tag_ids: List of industry IDs
            per_page: Results per page (max 100)
            page: Page number
            reveal_emails: Set True to unlock email addresses (uses Apollo credits)
            
        Returns:
            List of contact dictionaries
        """
        try:
            print(f"\n[SEARCH] Searching for people using /people_search")
            if person_titles:
                print(f"   Titles: {person_titles[:3]}..." if len(person_titles) > 3 else f"   Titles: {person_titles}")
            if person_locations:
                print(f"   Locations: {person_locations}")
            if organization_num_employees_ranges:
                print(f"   Company size: {organization_num_employees_ranges}")
            print(f"   Reveal emails: {reveal_emails}")

            url = f"{self.base_url}/api/v1/people/search"

            payload = {
                'api_key': self.api_key,
                'page': page,
                'per_page': min(per_page, 100),  # Apollo max is 100
                'reveal_personal_emails': reveal_emails
            }
            
            # Add filters
            if person_titles:
                payload['person_titles'] = person_titles
            if person_locations:
                payload['person_locations'] = person_locations
            if organization_num_employees_ranges:
                payload['organization_num_employees_ranges'] = organization_num_employees_ranges
            if person_seniorities:
                payload['person_seniorities'] = person_seniorities
            if organization_industry_tag_ids:
                payload['organization_industry_tag_ids'] = organization_industry_tag_ids

            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            contacts = []
            if data.get('people'):
                print(f"   Found {len(data['people'])} contacts")
                for person in data['people']:
                    # Extract organization info properly - it's always in nested 'organization' object
                    org = person.get('organization', {})
                    if not org:
                        org = {}
                    
                    org_name = org.get('name', '')
                    org_domain = org.get('primary_domain', '')
                    
                    contact = {
                        'id': person.get('id', ''),
                        'name': person.get('name', ''),
                        'first_name': person.get('first_name', ''),
                        'last_name': person.get('last_name', ''),
                        'title': person.get('title', ''),
                        'email': person.get('email', ''),
                        'email_status': person.get('email_status', ''),
                        'phone_numbers': person.get('phone_numbers', []),
                        'linkedin_url': person.get('linkedin_url', ''),
                        'organization_name': org_name,  # From nested organization.name
                        'organization_id': person.get('organization_id', ''),
                        'organization': org,
                        'organization_domain': org_domain,  # Add domain for easy access
                        'city': person.get('city', ''),
                        'state': person.get('state', ''),
                        'country': person.get('country', ''),
                        'seniority': person.get('seniority', ''),
                        'departments': person.get('departments', [])
                    }
                    contacts.append(contact)
            else:
                print(f"   No people found in response")

            return contacts

        except Exception as e:
            print(f"[ERROR] Error searching people: {str(e)}")
            import traceback
            traceback.print_exc()
            return []

    def find_contacts_by_role(self, domain: str, role_type: str = 'all', per_page: int = 10, reveal_emails: bool = True) -> List[Dict]:
        """
        Find contacts by role type (convenience method)
        
        Args:
            domain: Company domain
            role_type: One of 'executive', 'tech', 'hr', 'sales', 'marketing', 'finance', 'all'
            per_page: Number of results
            reveal_emails: Whether to reveal emails (uses credits)
        """
        role_configs = {
            'executive': {
                'titles': ['CEO', 'Chief Executive Officer', 'President', 'Owner', 'Founder', 'Co-Founder', 'Managing Director'],
                'seniorities': ['owner', 'founder', 'c_suite']
            },
            'tech': {
                'titles': ['CTO', 'Chief Technology Officer', 'VP Engineering', 'VP of Engineering', 'Director of Engineering', 'Head of Engineering', 'Tech Lead'],
                'seniorities': ['c_suite', 'vp', 'director', 'head']
            },
            'hr': {
                'titles': ['CHRO', 'VP Human Resources', 'HR Director', 'Head of HR', 'Head of People', 'Talent Acquisition Director', 'Recruiting Manager'],
                'seniorities': ['c_suite', 'vp', 'director', 'head', 'manager'],
                'departments': ['human_resources', 'recruiting']
            },
            'sales': {
                'titles': ['VP Sales', 'Sales Director', 'Head of Sales', 'Chief Revenue Officer', 'CRO'],
                'seniorities': ['c_suite', 'vp', 'director', 'head'],
                'departments': ['sales']
            },
            'marketing': {
                'titles': ['CMO', 'Chief Marketing Officer', 'VP Marketing', 'Marketing Director', 'Head of Marketing'],
                'seniorities': ['c_suite', 'vp', 'director', 'head'],
                'departments': ['marketing']
            },
            'finance': {
                'titles': ['CFO', 'Chief Financial Officer', 'VP Finance', 'Finance Director', 'Controller'],
                'seniorities': ['c_suite', 'vp', 'director'],
                'departments': ['finance']
            },
            'all': {
                'titles': None,  # Will use default comprehensive list
                'seniorities': ['owner', 'founder', 'c_suite', 'partner', 'vp', 'director', 'head']
            }
        }
        
        config = role_configs.get(role_type.lower(), role_configs['all'])
        
        return self.find_contacts(
            domain=domain,
            titles=config.get('titles'),
            seniorities=config.get('seniorities'),
            departments=config.get('departments'),
            per_page=per_page,
            reveal_emails=reveal_emails
        )
    
    def bulk_reveal_emails(self, contacts: List[Dict]) -> List[Dict]:
        """
        Reveal emails for multiple contacts using bulk_match endpoint

        POST https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=true

        Args:
            contacts: List of contact dicts with keys like:
                - id (Apollo person ID)
                - first_name, last_name, name
                - domain or organization_name
                - linkedin_url (optional)

        Returns:
            List of enriched contact dicts with revealed emails
        """
        if not contacts:
            return []

        print(f"\n[BULK REVEAL] Revealing emails for {len(contacts)} contacts...")

        try:
            # Use standard URL - reveal_personal_emails goes in payload body like other endpoints
            url = f"{self.base_url}/api/v1/people/bulk_match"

            # Build details array for bulk match
            details = []
            for contact in contacts:
                detail = {}

                # Add person identifiers - ID is most important
                if contact.get('id'):
                    detail['id'] = contact['id']
                if contact.get('first_name'):
                    detail['first_name'] = contact['first_name']
                if contact.get('last_name'):
                    detail['last_name'] = contact['last_name']
                if contact.get('name'):
                    detail['name'] = contact['name']
                if contact.get('linkedin_url'):
                    detail['linkedin_url'] = contact['linkedin_url']

                # Add email if present (critical for matching)
                if contact.get('email'):
                    detail['email'] = contact['email']

                # Add organization info for better matching
                if contact.get('organization_name'):
                    detail['organization_name'] = contact['organization_name']
                if contact.get('domain'):
                    detail['domain'] = contact['domain']
                elif contact.get('organization_domain'):
                    detail['domain'] = contact['organization_domain']

                if detail:
                    details.append(detail)
                    print(f"   Detail: {detail.get('name', detail.get('id', 'unknown'))} @ {detail.get('domain', 'no domain')}")

            if not details:
                print("[WARN] No valid contact details for bulk match")
                return contacts

            payload = {
                'api_key': self.api_key,
                'details': details,
                'reveal_personal_emails': True
            }

            print(f"\n   URL: {url}")
            print(f"   Sending {len(details)} contacts to bulk_match...")

            response = requests.post(url, json=payload, headers=self.headers)

            print(f"   Response status: {response.status_code}")

            if response.status_code != 200:
                print(f"   Response body: {response.text[:500]}")
                response.raise_for_status()

            data = response.json()

            # Debug: Show raw response structure
            print(f"   Response keys: {list(data.keys())}")
            if 'matches' in data and data['matches']:
                first_match = data['matches'][0] if data['matches'][0] else {}
                print(f"   First match keys: {list(first_match.keys()) if first_match else 'None/Empty'}")

            # Process results - Apollo returns 'matches' array
            matches = data.get('matches', [])
            print(f"   Got {len(matches)} matches back")

            # Update contacts with revealed emails
            revealed_count = 0
            for i, match in enumerate(matches):
                if match and i < len(contacts):
                    email = match.get('email', '')
                    email_status = match.get('email_status', '')

                    # Debug: show raw email value
                    print(f"   [{i}] Raw email: '{email}', status: '{email_status}'")

                    # Update the contact with revealed email
                    if email and 'email_not_unlocked' not in email and email_status not in ['unavailable', 'bounced']:
                        contacts[i]['email'] = email
                        contacts[i]['email_status'] = email_status
                        revealed_count += 1
                        print(f"   [OK] {contacts[i].get('name', 'Unknown')}: {email}")
                    else:
                        # Keep original contact data, email not available
                        reason = email_status if email_status else ('locked' if 'email_not_unlocked' in email else 'no email')
                        print(f"   [--] {contacts[i].get('name', 'Unknown')}: Not revealed ({reason})")

            print(f"[BULK REVEAL] Revealed {revealed_count}/{len(contacts)} emails")
            return contacts

        except Exception as e:
            print(f"[ERROR] Bulk reveal failed: {e}")
            import traceback
            traceback.print_exc()
            return contacts

    def reveal_multiple_emails(self, person_ids: List[str]) -> List[Dict]:
        """
        Reveal emails for multiple contacts at once (legacy method)
        Returns list of {person_id, email, success} dicts
        """
        results = []
        print(f"\n[LOCK] Revealing emails for {len(person_ids)} contacts...")

        for i, person_id in enumerate(person_ids, 1):
            print(f"   [{i}/{len(person_ids)}] Processing {person_id}...")
            email = self.reveal_email(person_id)
            results.append({
                'person_id': person_id,
                'email': email,
                'success': email is not None
            })

        success_count = sum(1 for r in results if r['success'])
        print(f"\n[OK] Revealed {success_count}/{len(person_ids)} emails")
        return results

    def reveal_email(self, person_id: str) -> Optional[str]:
        """
        Reveal email address for a contact (uses credits)
        Uses POST https://api.apollo.io/api/v1/people/match
        IMPORTANT: API key must be in header as 'x-api-key', not in payload
        
        Email Status meanings:
        - verified: Email is verified and deliverable
        - guessed: Email pattern guessed but not verified
        - unavailable: Apollo doesn't have email for this person
        - bounced: Email previously bounced
        - pending_manual_fulfillment: Being manually researched
        """
        try:
            print(f"[LOCK] Revealing email for person ID: {person_id}")

            # Apollo People Enrichment endpoint - note the /api/v1 path
            url = f"{self.base_url}/api/v1/people/match"

            payload = {
                'api_key': self.api_key,
                'id': person_id,
                'reveal_personal_emails': True,
            }

            response = requests.post(url, json=payload, headers=self.headers)
            if response.status_code != 200:
                print(f"   [DEBUG] Apollo {response.status_code}: {response.text[:500]}")
            response.raise_for_status()
            data = response.json()

            person = data.get('person', {})
            email = person.get('email', '')
            email_status = person.get('email_status', '')
            
            if email:
                print(f"[OK] Email revealed: {email} (status: {email_status})")
                return email
            
            # Explain why email wasn't found
            status_explanations = {
                'unavailable': 'Apollo does not have this email in their database',
                'bounced': 'This email previously bounced and is marked invalid',
                'pending_manual_fulfillment': 'Email is being manually researched by Apollo',
                'gdpr_restricted': 'Person is in a GDPR-protected region (EU)',
                '': 'No email status returned'
            }
            explanation = status_explanations.get(email_status, f'Status: {email_status}')
            print(f"[WARN] No email found - {explanation}")
            return None

        except Exception as e:
            print(f"[ERROR] Error revealing email for person {person_id}: {str(e)}")
            return None

    def enrich_person(self, person_id: str = None, first_name: str = None, last_name: str = None,
                     organization_name: str = None, domain: str = None,
                     email: str = None, linkedin_url: str = None, reveal_emails: bool = True) -> Optional[Dict]:
        """
        Enrich person data using Apollo API
        POST https://api.apollo.io/api/v1/people/match
        
        Can search by person_id OR by identifying information (name + company/domain/linkedin)
        Set reveal_emails=True to unlock email addresses (uses credits)

        IMPORTANT: API key must be in header as 'x-api-key', not in payload
        Note: reveal_phone_number requires webhook_url, so we only reveal emails
        
        Email Status meanings:
        - verified: Email is verified and deliverable  
        - guessed: Email pattern guessed but not verified
        - unavailable: Apollo doesn't have email for this person
        - bounced: Email previously bounced
        - pending_manual_fulfillment: Being manually researched
        """
        try:
            print(f"\n[SEARCH] Calling Apollo POST /api/v1/people/match endpoint...")
            print(f"   Person ID: {person_id}")
            print(f"   Reveal Personal Emails: {reveal_emails}")

            # Apollo People Enrichment endpoint - note the /api/v1 path
            url = f"{self.base_url}/api/v1/people/match"

            payload = {
                'api_key': self.api_key,
                'reveal_personal_emails': reveal_emails
            }

            # Add search criteria
            if person_id:
                payload['id'] = person_id
            else:
                # For matching without ID, provide identifying info
                if first_name:
                    payload['first_name'] = first_name
                if last_name:
                    payload['last_name'] = last_name
                if organization_name:
                    payload['organization_name'] = organization_name
                if domain:
                    payload['domain'] = domain
                if email:
                    payload['email'] = email
                if linkedin_url:
                    payload['linkedin_url'] = linkedin_url

            print(f"   Request Headers: x-api-key present = {'x-api-key' in self.headers}")
            print(f"   Payload keys: {list(payload.keys())}")
            print(f"   Full URL: {url}")

            response = requests.post(url, json=payload, headers=self.headers)
            
            # Debug response before raising
            print(f"   Apollo Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"   Response Body: {response.text[:500]}")
            
            response.raise_for_status()
            data = response.json()

            if data.get('person'):
                person = data['person']

                # Debug: print organization info from Apollo
                print(f"   Organization name: {person.get('organization_name', 'N/A')}")
                if person.get('organization'):
                    print(f"   Organization object: {person['organization'].get('name', 'N/A')} - {person['organization'].get('primary_domain', 'N/A')}")
                
                # Debug email info
                email_value = person.get('email', '')
                email_status = person.get('email_status', '')
                print(f"   Email from Apollo: {email_value if email_value else 'NONE'}")
                print(f"   Email Status: {email_status if email_status else 'NONE'}")
                
                # Explain email status if no email
                if not email_value and email_status:
                    status_explanations = {
                        'unavailable': '[WARN] Apollo does not have this email in their database',
                        'bounced': '[WARN] This email previously bounced and is marked invalid',
                        'pending_manual_fulfillment': '[WAIT] Email is being manually researched by Apollo',
                        'gdpr_restricted': '[LOCK] Person is in a GDPR-protected region (EU) - email not disclosed'
                    }
                    explanation = status_explanations.get(email_status, f'Status: {email_status}')
                    print(f"   {explanation}")

                enriched_person = {
                    'id': person.get('id', ''),
                    'name': person.get('name', ''),
                    'first_name': person.get('first_name', ''),
                    'last_name': person.get('last_name', ''),
                    'title': person.get('title', ''),
                    'email': email_value,
                    'email_status': email_status,
                    'email_status_explanation': self._get_email_status_explanation(email_status),
                    'phone_numbers': person.get('phone_numbers', []),
                    'linkedin_url': person.get('linkedin_url', ''),
                    'twitter_url': person.get('twitter_url', ''),
                    'facebook_url': person.get('facebook_url', ''),
                    'organization_name': person.get('organization_name', ''),
                    'organization_id': person.get('organization_id', ''),
                    'city': person.get('city', ''),
                    'state': person.get('state', ''),
                    'country': person.get('country', '')
                }
                
                # Get organization domain from multiple possible sources
                org_domain = None
                # Try organization object first
                if person.get('organization'):
                    org_domain = person['organization'].get('primary_domain') or person['organization'].get('website_url', '').replace('https://', '').replace('http://', '').split('/')[0]
                # Try employment_history
                if not org_domain and person.get('employment_history') and len(person['employment_history']) > 0:
                    current_job = person['employment_history'][0]
                    if current_job.get('organization'):
                        org_domain = current_job['organization'].get('primary_domain')
                # Fallback to passed domain
                if not org_domain:
                    org_domain = domain
                
                enriched_person['organization_domain'] = org_domain
                print(f"   Organization domain for email guess: {org_domain}")
                
                # Generate guessed work emails if Apollo doesn't have email
                if not email_value and enriched_person.get('first_name') and enriched_person.get('last_name'):
                    if org_domain:
                        guessed_emails = self._guess_work_emails(
                            enriched_person['first_name'],
                            enriched_person['last_name'],
                            org_domain
                        )
                        enriched_person['guessed_emails'] = guessed_emails
                        print(f"   [TIP] Suggested work email patterns: {', '.join(guessed_emails[:3])}")

                print(f"[OK] Enriched: {enriched_person['name']} ({enriched_person['title']})")
                if enriched_person['email']:
                    print(f"[EMAIL] Email revealed: {enriched_person['email']} (status: {enriched_person['email_status']})")
                else:
                    print(f"[WARN] No email returned by Apollo - status: {email_status}")

                return enriched_person

            print(f"[WARN] No person data in Apollo response")
            return None

        except requests.exceptions.HTTPError as e:
            print(f"[ERROR] HTTP Error from Apollo: {e}")
            print(f"   Response: {e.response.text if e.response else 'No response'}")
            return None
        except Exception as e:
            print(f"[ERROR] Error enriching person: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def _get_email_status_explanation(self, status: str) -> str:
        """Get human-readable explanation for Apollo email status"""
        explanations = {
            'verified': 'Email is verified and deliverable',
            'guessed': 'Email pattern guessed based on company format (not verified)',
            'unavailable': 'Apollo does not have this email in their database',
            'bounced': 'Email previously bounced - likely invalid',
            'pending_manual_fulfillment': 'Being manually researched by Apollo team',
            'gdpr_restricted': 'Person is in GDPR-protected region (EU) - email not disclosed',
            '': 'No status information available'
        }
        return explanations.get(status, f'Unknown status: {status}')
    
    def _guess_work_emails(self, first_name: str, last_name: str, domain: str) -> List[str]:
        """
        Generate common work email patterns when Apollo doesn't have the email.
        These are GUESSES and should be verified before sending.
        
        Common patterns:
        - firstname@domain.com (most common)
        - firstname.lastname@domain.com
        - flastname@domain.com
        - firstnamel@domain.com
        - f.lastname@domain.com
        """
        first = first_name.lower().strip()
        last = last_name.lower().strip()
        
        # Handle compound names
        first = first.split()[0] if ' ' in first else first
        last = last.split()[-1] if ' ' in last else last
        
        # Remove special characters
        import re
        first = re.sub(r'[^a-z]', '', first)
        last = re.sub(r'[^a-z]', '', last)
        
        if not first or not last or not domain:
            return []
        
        patterns = [
            f"{first}@{domain}",                    # john@company.com
            f"{first}.{last}@{domain}",             # john.doe@company.com  
            f"{first[0]}{last}@{domain}",           # jdoe@company.com
            f"{first}{last[0]}@{domain}",           # johnd@company.com
            f"{first}_{last}@{domain}",             # john_doe@company.com
            f"{first[0]}.{last}@{domain}",          # j.doe@company.com
            f"{last}@{domain}",                     # doe@company.com
            f"{first}{last}@{domain}",              # johndoe@company.com
        ]
        
        return patterns

    def search_companies_by_name(self, company_name: str, location: str = None,
                                 min_employees: int = None, max_employees: int = None,
                                 per_page: int = 10) -> List[Dict]:
        """
        Search for companies by name and optional location
        Uses Apollo's /api/v1/mixed_companies/search endpoint

        Args:
            company_name: Company name to search for
            location: Location filter (e.g., "United States", "New York", "India")
            min_employees: Minimum number of employees
            max_employees: Maximum number of employees
            per_page: Number of results (max 100)

        Returns:
            List of company dictionaries with full details
        """
        try:
            print(f"\n[SEARCH] Searching for companies by name: '{company_name}'")
            if location:
                print(f"   Location: {location}")
            if min_employees or max_employees:
                print(f"   Employee range: {min_employees or 0}-{max_employees or 'unlimited'}")

            url = f"{self.base_url}/api/v1/mixed_companies/search"

            payload = {
                'q_organization_name': company_name,
                'page': 1,
                'per_page': min(per_page, 100)
            }

            # Add location filter if provided
            if location:
                payload['organization_locations'] = [location]

            # Add employee range filter
            if min_employees is not None or max_employees is not None:
                min_emp = min_employees or 1
                max_emp = max_employees or 1000000
                payload['organization_num_employees_ranges'] = [f"{min_emp},{max_emp}"]

            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            data = response.json()

            companies = []
            if data.get('organizations'):
                print(f"   Found {len(data['organizations'])} companies")

                for org in data['organizations']:
                    company = {
                        # Basic Info
                        'id': org.get('id', ''),
                        'name': org.get('name', ''),
                        'domain': org.get('primary_domain', ''),
                        'website_url': org.get('website_url', ''),
                        'logo_url': org.get('logo_url', ''),
                        'short_description': org.get('short_description', ''),

                        # Size & Industry
                        'employees': org.get('estimated_num_employees', 0),
                        'industry': org.get('industry', ''),
                        'founded_year': org.get('founded_year', ''),

                        # Location
                        'city': org.get('city', ''),
                        'state': org.get('state', ''),
                        'country': org.get('country', ''),
                        'address': org.get('raw_address', ''),

                        # Contact
                        'phone': org.get('phone', ''),
                        'linkedin_url': org.get('linkedin_url', ''),

                        # Financial
                        'annual_revenue': org.get('annual_revenue_printed', ''),
                        'total_funding': org.get('total_funding_printed', '')
                    }
                    companies.append(company)

                    location_str = f"{company['city']}, {company['state']}" if company['city'] or company['state'] else company['country']
                    print(f"   [OK] {company['name']} - {company['employees']} employees - {location_str}")
            else:
                print(f"   No companies found")

            return companies

        except Exception as e:
            print(f"[ERROR] Error searching companies: {str(e)}")
            import traceback
            traceback.print_exc()
            return []

    def check_company_size(self, employee_count: int, min_size: int = 50, max_size: int = 200) -> bool:
        """
        Check if company size is within the specified range (in millions)
        Note: Apollo returns employee count, not revenue.
        You may need to adjust this logic based on your criteria.
        """
        # Convert employee count to a rough revenue estimate (very rough!)
        # Or use this as employee count filter
        return min_size <= employee_count <= max_size
