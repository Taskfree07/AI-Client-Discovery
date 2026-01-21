"""
AI Agent System using Local Llama for Intelligent Lead Processing
Uses Ollama to filter, categorize, and process leads 10-20x faster
"""

import asyncio
import aiohttp
import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime


class OllamaClient:
    """Client for interacting with local Ollama LLM"""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2:3b"):
        """
        Initialize Ollama client

        Args:
            base_url: Ollama API base URL
            model: Model to use (llama3.2:3b or gemma3:1b)
        """
        self.base_url = base_url
        self.model = model
        print(f"[OLLAMA] Initialized with model: {model}")

    async def generate(self, prompt: str, system: str = None, temperature: float = 0.3) -> str:
        """
        Generate text using Ollama

        Args:
            prompt: User prompt
            system: System prompt
            temperature: Sampling temperature (0-1)

        Returns:
            Generated text
        """
        url = f"{self.base_url}/api/generate"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": 500  # Max tokens
            }
        }

        if system:
            payload["system"] = system

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('response', '').strip()
                    else:
                        print(f"[OLLAMA] Error: {response.status}")
                        return ""
        except Exception as e:
            print(f"[OLLAMA] Exception: {e}")
            return ""

    async def generate_json(self, prompt: str, system: str = None) -> Dict:
        """
        Generate structured JSON response

        Args:
            prompt: User prompt
            system: System prompt

        Returns:
            Parsed JSON dict
        """
        response = await self.generate(prompt, system, temperature=0.1)

        # Extract JSON from response
        try:
            # Try to find JSON in response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                return json.loads(json_str)
            else:
                # Try parsing entire response
                return json.loads(response)
        except:
            print(f"[OLLAMA] Failed to parse JSON: {response[:100]}")
            return {}


class ContactFilterAgent:
    """Agent for filtering and validating contacts before enrichment"""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client
        self.system_prompt = """You are an expert recruiter analyzing contact relevance.
Your task is to determine if a contact is relevant for a manufacturing staffing/recruiting outreach.

Respond ONLY with a JSON object:
{
  "relevant": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "category": "decision_maker/hr_leader/hr_practitioner/irrelevant"
}"""

    async def filter_contact(self, contact: Dict, tier: str = "T1") -> Tuple[bool, Dict]:
        """
        Filter a single contact

        Args:
            contact: Contact data from Apollo
            tier: Target tier (T1, T2, T3)

        Returns:
            (is_relevant, analysis_dict)
        """
        title = contact.get('title', '')
        company = contact.get('organization_name', '')
        seniority = contact.get('seniority', '')

        prompt = f"""Analyze this contact for {tier} manufacturing staffing outreach:

Contact Details:
- Title: {title}
- Company: {company}
- Seniority: {seniority}

Target: {tier} = {"COO/VP Operations decision makers" if tier == "T1" else "HR/TA leaders" if tier == "T2" else "HR practitioners/recruiters"}

Is this contact relevant?"""

        result = await self.ollama.generate_json(prompt, self.system_prompt)

        is_relevant = result.get('relevant', False)

        return is_relevant, result

    async def filter_contacts_batch(self, contacts: List[Dict], tier: str = "T1") -> List[Dict]:
        """
        Filter multiple contacts in parallel

        Args:
            contacts: List of contacts
            tier: Target tier

        Returns:
            Filtered list with relevance scores
        """
        print(f"[FILTER] Filtering {len(contacts)} contacts for {tier}...")

        tasks = [self.filter_contact(contact, tier) for contact in contacts]
        results = await asyncio.gather(*tasks)

        filtered = []
        for contact, (is_relevant, analysis) in zip(contacts, results):
            if is_relevant:
                contact['ai_filter'] = analysis
                filtered.append(contact)

        print(f"[FILTER] {len(filtered)}/{len(contacts)} contacts passed filter ({len(filtered)/len(contacts)*100:.1f}%)")
        return filtered


class CompanyCategoryAgent:
    """Agent for categorizing and validating companies"""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client
        self.system_prompt = """You are an expert at analyzing manufacturing companies.
Your task is to categorize companies and assess their fit for staffing/recruiting services.

Respond ONLY with a JSON object:
{
  "is_manufacturing": true/false,
  "category": "automotive/electronics/industrial/pharma/fmcg/other",
  "size_category": "small/medium/large/enterprise",
  "fit_score": 0.0-1.0,
  "likely_needs_staffing": true/false,
  "reason": "brief explanation"
}"""

    async def categorize_company(self, company_data: Dict) -> Dict:
        """
        Categorize and validate a company

        Args:
            company_data: Company data from Apollo

        Returns:
            Categorization analysis
        """
        name = company_data.get('name', '')
        industry = company_data.get('industry', '')
        size = company_data.get('estimated_num_employees', 0)
        description = company_data.get('short_description', '')[:200]

        prompt = f"""Analyze this company for manufacturing staffing:

Company: {name}
Industry: {industry}
Size: {size} employees
Description: {description}

Categorize this company and assess staffing needs."""

        result = await self.ollama.generate_json(prompt, self.system_prompt)
        return result

    async def categorize_companies_batch(self, companies: List[Dict]) -> List[Dict]:
        """
        Categorize multiple companies in parallel

        Args:
            companies: List of company data

        Returns:
            Companies with categorization data
        """
        print(f"[CATEGORY] Categorizing {len(companies)} companies...")

        tasks = [self.categorize_company(company) for company in companies]
        results = await asyncio.gather(*tasks)

        categorized = []
        for company, analysis in zip(companies, results):
            company['ai_category'] = analysis
            # Only include manufacturing companies with high fit score
            if analysis.get('is_manufacturing', False) and analysis.get('fit_score', 0) > 0.5:
                categorized.append(company)

        print(f"[CATEGORY] {len(categorized)}/{len(companies)} companies are good fits ({len(categorized)/len(companies)*100:.1f}%)")
        return categorized


class ContactQualityAgent:
    """Agent for assessing contact quality and email likelihood"""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client
        self.system_prompt = """You are an expert at assessing contact data quality.
Your task is to determine if a contact is worth enriching (costs money).

Respond ONLY with a JSON object:
{
  "quality_score": 0.0-1.0,
  "email_likely": true/false,
  "decision_maker": true/false,
  "worth_enriching": true/false,
  "reason": "brief explanation"
}"""

    async def assess_quality(self, contact: Dict, company_data: Dict = None) -> Dict:
        """
        Assess contact quality

        Args:
            contact: Contact data
            company_data: Optional company data

        Returns:
            Quality assessment
        """
        title = contact.get('title', '')
        seniority = contact.get('seniority', '')
        has_linkedin = bool(contact.get('linkedin_url'))
        company_name = contact.get('organization_name', '')
        company_size = company_data.get('estimated_num_employees', 0) if company_data else 0

        prompt = f"""Assess this contact's quality for recruiting outreach:

Title: {title}
Seniority: {seniority}
Has LinkedIn: {has_linkedin}
Company: {company_name} ({company_size} employees)

Is this contact worth enriching (costs API credits)?"""

        result = await self.ollama.generate_json(prompt, self.system_prompt)
        return result

    async def assess_batch(self, contacts: List[Dict], companies: Dict[str, Dict] = None) -> List[Dict]:
        """
        Assess multiple contacts in parallel

        Args:
            contacts: List of contacts
            companies: Dict of company_name -> company_data

        Returns:
            Contacts worth enriching
        """
        print(f"[QUALITY] Assessing {len(contacts)} contact quality...")

        companies = companies or {}
        tasks = []
        for contact in contacts:
            company_name = contact.get('organization_name', '')
            company_data = companies.get(company_name, {})
            tasks.append(self.assess_quality(contact, company_data))

        results = await asyncio.gather(*tasks)

        high_quality = []
        for contact, assessment in zip(contacts, results):
            contact['ai_quality'] = assessment
            if assessment.get('worth_enriching', False):
                high_quality.append(contact)

        print(f"[QUALITY] {len(high_quality)}/{len(contacts)} contacts worth enriching ({len(high_quality)/len(contacts)*100:.1f}%)")
        return high_quality


class PriorityScoringAgent:
    """Agent for final lead prioritization"""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client
        self.system_prompt = """You are an expert at prioritizing sales leads.
Your task is to score leads based on multiple factors.

Respond ONLY with a JSON object:
{
  "priority_score": 0.0-10.0,
  "urgency": "high/medium/low",
  "key_factors": ["factor1", "factor2"],
  "outreach_angle": "brief suggestion",
  "estimated_conversion": 0.0-1.0
}"""

    async def score_lead(self, lead_data: Dict) -> Dict:
        """
        Score a complete lead

        Args:
            lead_data: Complete lead with company + contact

        Returns:
            Priority scoring
        """
        company = lead_data.get('company', {})
        contact = lead_data.get('contact', {})
        validation = lead_data.get('validation', {})

        prompt = f"""Score this lead for manufacturing staffing outreach:

Company: {company.get('name')} ({company.get('size')} employees)
Industry: {company.get('industry')}
Revenue: {company.get('revenue', 'N/A')}

Contact: {contact.get('name')}
Title: {contact.get('title')}
Email: {'Yes' if contact.get('email') else 'No'}

Validation Score: {validation.get('score', 0)}/6

Provide priority score (0-10) and outreach strategy."""

        result = await self.ollama.generate_json(prompt, self.system_prompt)
        return result

    async def score_leads_batch(self, leads: List[Dict]) -> List[Dict]:
        """
        Score and prioritize multiple leads

        Args:
            leads: List of complete leads

        Returns:
            Leads sorted by priority
        """
        print(f"[PRIORITY] Scoring {len(leads)} leads...")

        tasks = [self.score_lead(lead) for lead in leads]
        results = await asyncio.gather(*tasks)

        for lead, scoring in zip(leads, results):
            lead['ai_priority'] = scoring

        # Sort by priority score
        leads.sort(key=lambda x: x.get('ai_priority', {}).get('priority_score', 0), reverse=True)

        print(f"[PRIORITY] Leads scored and sorted by priority")
        return leads


class AIAgentOrchestrator:
    """Main orchestrator coordinating all AI agents"""

    def __init__(self, model: str = None, config=None):
        """
        Initialize AI Agent System

        Args:
            model: Ollama model to use (optional, uses config if not provided)
            config: AIAgentConfig instance (optional)
        """
        print(f"\n{'='*60}")
        print(f"[AI AGENTS] Initializing AI Agent System")
        print(f"{'='*60}")

        # Load configuration
        if config is None:
            from services.ai_agent_config import get_config
            self.config = get_config()
        else:
            self.config = config

        # Use config model if not specified
        if model is None:
            model = self.config.get_model()

        print(f"[AI AGENTS] Using model: {model}")
        print(f"[AI AGENTS] Temperature: {self.config.get_temperature()}")

        # Initialize Ollama client
        self.ollama = OllamaClient(model=model)

        # Initialize specialized agents
        self.filter_agent = ContactFilterAgent(self.ollama)
        self.category_agent = CompanyCategoryAgent(self.ollama)
        self.quality_agent = ContactQualityAgent(self.ollama)
        self.priority_agent = PriorityScoringAgent(self.ollama)

        print(f"[AI AGENTS] Filters enabled:")
        print(f"  - Contact Filter: {self.config.is_contact_filter_enabled()}")
        print(f"  - Company Categorization: {self.config.is_company_categorization_enabled()}")
        print(f"  - Quality Assessment: {self.config.is_quality_assessment_enabled()}")
        print(f"  - Priority Scoring: {self.config.is_priority_scoring_enabled()}")
        print(f"[AI AGENTS] All agents initialized successfully")
        print(f"{'='*60}\n")

    async def intelligent_filter_pipeline(self, contacts: List[Dict], tier: str = "T1") -> List[Dict]:
        """
        Run contacts through intelligent filtering pipeline

        This dramatically reduces Apollo enrichment costs by filtering first

        Args:
            contacts: Raw contacts from Apollo search
            tier: Target tier

        Returns:
            Filtered contacts worth enriching
        """
        print(f"\n[PIPELINE] Starting intelligent filtering for {len(contacts)} contacts")

        # Stage 1: Filter by relevance (if enabled)
        if self.config.is_contact_filter_enabled():
            filtered = await self.filter_agent.filter_contacts_batch(contacts, tier)

            if not filtered:
                print(f"[PIPELINE] No contacts passed relevance filter")
                return []

            # Apply confidence threshold
            min_confidence = self.config.get_contact_filter_min_confidence()
            filtered = [c for c in filtered if c.get('ai_filter', {}).get('confidence', 0) >= min_confidence]
            print(f"[PIPELINE] After confidence filter (>= {min_confidence}): {len(filtered)} contacts")
        else:
            print(f"[PIPELINE] Contact filter disabled - skipping")
            filtered = contacts

        # Stage 2: Assess quality (if enabled)
        if self.config.is_quality_assessment_enabled():
            high_quality = await self.quality_agent.assess_batch(filtered)

            # Apply quality score threshold
            min_quality = self.config.get_min_quality_score()
            high_quality = [c for c in high_quality if c.get('ai_quality', {}).get('quality_score', 0) >= min_quality]
            print(f"[PIPELINE] After quality filter (>= {min_quality}): {len(high_quality)} contacts")
        else:
            print(f"[PIPELINE] Quality assessment disabled - skipping")
            high_quality = filtered

        print(f"[PIPELINE] Final: {len(high_quality)} contacts ready for enrichment")
        print(f"[PIPELINE] Savings: Avoided {len(contacts) - len(high_quality)} unnecessary enrichments\n")

        return high_quality

    async def intelligent_company_filter(self, companies: List[Dict]) -> List[Dict]:
        """
        Filter companies before enrichment

        Args:
            companies: Company data from Apollo

        Returns:
            Filtered companies worth enriching
        """
        print(f"\n[PIPELINE] Filtering {len(companies)} companies")

        categorized = await self.category_agent.categorize_companies_batch(companies)

        print(f"[PIPELINE] {len(categorized)} companies passed filter\n")
        return categorized

    async def prioritize_leads(self, leads: List[Dict]) -> List[Dict]:
        """
        Final lead prioritization

        Args:
            leads: Complete validated leads

        Returns:
            Prioritized leads
        """
        print(f"\n[PIPELINE] Prioritizing {len(leads)} leads")

        prioritized = await self.priority_agent.score_leads_batch(leads)

        # Print top 5 leads
        print(f"\n[TOP LEADS]")
        for i, lead in enumerate(prioritized[:5], 1):
            priority = lead.get('ai_priority', {})
            print(f"{i}. {lead['company']['name']} - {lead['contact']['title']}")
            print(f"   Priority: {priority.get('priority_score', 0):.1f}/10 | {priority.get('urgency', 'medium')} urgency")
            print(f"   Angle: {priority.get('outreach_angle', 'N/A')[:60]}")

        return prioritized

    def get_stats(self) -> Dict:
        """Get agent system statistics"""
        return {
            'model': self.ollama.model,
            'agents': {
                'filter': 'ContactFilterAgent',
                'category': 'CompanyCategoryAgent',
                'quality': 'ContactQualityAgent',
                'priority': 'PriorityScoringAgent'
            },
            'status': 'ready'
        }


# Synchronous wrapper functions for easy integration
def run_async(coro):
    """Run async function in sync context"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(coro)


def filter_contacts_sync(contacts: List[Dict], tier: str = "T1", model: str = "llama3.2:3b") -> List[Dict]:
    """
    Synchronous wrapper for contact filtering

    Args:
        contacts: List of contacts
        tier: Target tier
        model: Ollama model

    Returns:
        Filtered contacts
    """
    orchestrator = AIAgentOrchestrator(model=model)
    return run_async(orchestrator.intelligent_filter_pipeline(contacts, tier))


def prioritize_leads_sync(leads: List[Dict], model: str = "llama3.2:3b") -> List[Dict]:
    """
    Synchronous wrapper for lead prioritization

    Args:
        leads: List of leads
        model: Ollama model

    Returns:
        Prioritized leads
    """
    orchestrator = AIAgentOrchestrator(model=model)
    return run_async(orchestrator.prioritize_leads(leads))
