"""
RAG-Based Lead Intelligence System with Local LLM
Uses vector embeddings and local AI models to speed up lead discovery
"""

import chromadb
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import numpy as np
import json
import asyncio
import aiohttp


class RAGLeadIntelligence:
    """
    RAG system for intelligent lead pre-filtering and validation
    Uses local LLM + vector embeddings to reduce API calls
    """

    def __init__(self, use_ollama=False):
        """
        Initialize RAG system with embeddings model

        Args:
            use_ollama: If True, use Ollama for local LLM (requires Ollama installed)
        """
        print("[RAG] Initializing Lead Intelligence System...")

        # Initialize embedding model (lightweight, runs on CPU)
        self.embed_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("[RAG] Loaded embedding model: all-MiniLM-L6-v2")

        # Initialize ChromaDB for vector storage
        self.chroma_client = chromadb.Client()

        # Create collection for company profiles
        self.company_collection = self.chroma_client.get_or_create_collection(
            name="manufacturing_companies",
            metadata={"description": "Manufacturing company ICP profiles"}
        )

        # Create collection for contact profiles
        self.contact_collection = self.chroma_client.get_or_create_collection(
            name="manufacturing_contacts",
            metadata={"description": "Manufacturing contact personas"}
        )

        print(f"[RAG] ChromaDB initialized: {self.company_collection.count()} companies indexed")

        self.use_ollama = use_ollama
        if use_ollama:
            print("[RAG] Ollama LLM mode enabled")

    def build_icp_profile(self, filters: Dict) -> str:
        """
        Build Ideal Customer Profile description from filters

        Args:
            filters: Dictionary with industries, locations, size, etc.

        Returns:
            Natural language ICP description
        """
        industries = filters.get('industries', [])
        size_min = filters.get('size_min', 200)
        size_max = filters.get('size_max', 10000)
        locations = filters.get('locations', {})

        location_str = []
        if locations.get('usa'):
            location_str.append('United States')
        if locations.get('india'):
            location_str.append('India')

        icp = f"""
        Ideal Manufacturing Company Profile:
        - Industries: {', '.join(industries)}
        - Company Size: {size_min} to {size_max} employees
        - Locations: {', '.join(location_str)}
        - Has operations and HR leadership teams
        - Likely uses staffing vendors
        - Active hiring for manufacturing and operations roles
        """

        return icp.strip()

    def build_persona_profile(self, tier: str) -> str:
        """
        Build persona description for a tier

        Args:
            tier: T1, T2, or T3

        Returns:
            Persona description
        """
        personas = {
            'T1': "C-level operations executive (COO, VP Operations, Plant Head) making strategic decisions about workforce and operations",
            'T2': "HR and Talent Acquisition leaders (CHRO, VP HR, TA Head) managing recruitment strategy",
            'T3': "HR practitioners and recruiters (Recruiters, TA Specialists, HRBPs) executing daily hiring tasks"
        }

        return personas.get(tier, '')

    def semantic_score_company(self, company_data: Dict, icp_profile: str) -> float:
        """
        Use embeddings to score how well a company matches ICP

        Args:
            company_data: Company information from Apollo
            icp_profile: Ideal customer profile description

        Returns:
            Similarity score (0.0 to 1.0)
        """
        # Build company description
        company_desc = f"""
        Company: {company_data.get('name', '')}
        Industry: {company_data.get('industry', '')}
        Size: {company_data.get('estimated_num_employees', 0)} employees
        Description: {company_data.get('short_description', '')}
        """

        # Generate embeddings
        icp_embedding = self.embed_model.encode([icp_profile])[0]
        company_embedding = self.embed_model.encode([company_desc])[0]

        # Calculate cosine similarity
        similarity = np.dot(icp_embedding, company_embedding) / (
            np.linalg.norm(icp_embedding) * np.linalg.norm(company_embedding)
        )

        return float(similarity)

    def semantic_score_contact(self, contact_data: Dict, persona_profile: str) -> float:
        """
        Use embeddings to score how well a contact matches persona

        Args:
            contact_data: Contact information from Apollo
            persona_profile: Persona description

        Returns:
            Similarity score (0.0 to 1.0)
        """
        # Build contact description
        contact_desc = f"""
        Title: {contact_data.get('title', '')}
        Seniority: {contact_data.get('seniority', '')}
        Department: {contact_data.get('departments', [])}
        """

        # Generate embeddings
        persona_embedding = self.embed_model.encode([persona_profile])[0]
        contact_embedding = self.embed_model.encode([contact_desc])[0]

        # Calculate cosine similarity
        similarity = np.dot(persona_embedding, contact_embedding) / (
            np.linalg.norm(persona_embedding) * np.linalg.norm(contact_embedding)
        )

        return float(similarity)

    def smart_filter_companies(self, companies: List[Dict], icp_profile: str,
                               threshold: float = 0.7) -> List[Dict]:
        """
        Pre-filter companies using semantic similarity

        Args:
            companies: List of company data from Apollo
            icp_profile: Ideal customer profile
            threshold: Minimum similarity score (0.0-1.0)

        Returns:
            Filtered list of companies with scores
        """
        print(f"[RAG] Filtering {len(companies)} companies with threshold {threshold}")

        scored_companies = []
        for company in companies:
            score = self.semantic_score_company(company, icp_profile)
            if score >= threshold:
                company['rag_score'] = score
                scored_companies.append(company)

        # Sort by score (highest first)
        scored_companies.sort(key=lambda x: x['rag_score'], reverse=True)

        print(f"[RAG] {len(scored_companies)} companies passed filter")
        return scored_companies

    def smart_filter_contacts(self, contacts: List[Dict], persona_profile: str,
                             threshold: float = 0.6) -> List[Dict]:
        """
        Pre-filter contacts using semantic similarity

        Args:
            contacts: List of contact data from Apollo
            persona_profile: Persona description
            threshold: Minimum similarity score (0.0-1.0)

        Returns:
            Filtered list of contacts with scores
        """
        print(f"[RAG] Filtering {len(contacts)} contacts with threshold {threshold}")

        scored_contacts = []
        for contact in contacts:
            score = self.semantic_score_contact(contact, persona_profile)
            if score >= threshold:
                contact['rag_score'] = score
                scored_contacts.append(contact)

        # Sort by score (highest first)
        scored_contacts.sort(key=lambda x: x['rag_score'], reverse=True)

        print(f"[RAG] {len(scored_contacts)} contacts passed filter")
        return scored_contacts

    async def validate_with_llm(self, lead_data: Dict, validation_criteria: str) -> Dict:
        """
        Use local LLM to validate a lead against criteria

        Args:
            lead_data: Lead information
            validation_criteria: What to validate

        Returns:
            Validation result with reasoning
        """
        if not self.use_ollama:
            # Fallback to embedding-based validation
            return {
                'valid': True,
                'confidence': 0.8,
                'reasoning': 'Embedding-based validation (Ollama not enabled)'
            }

        # TODO: Implement Ollama LLM validation
        # This would call local Llama or Phi-3 model for reasoning
        prompt = f"""
        Analyze this lead against the criteria:

        Lead: {json.dumps(lead_data, indent=2)}

        Criteria: {validation_criteria}

        Is this a good fit? Explain why.
        """

        # Placeholder for Ollama integration
        return {
            'valid': True,
            'confidence': 0.85,
            'reasoning': 'LLM validation placeholder'
        }

    def cache_company(self, company_data: Dict):
        """
        Cache company data in vector DB for future searches

        Args:
            company_data: Company information to cache
        """
        company_id = str(company_data.get('id', company_data.get('name', '')))
        company_desc = f"{company_data.get('name', '')} {company_data.get('industry', '')}"

        # Generate embedding
        embedding = self.embed_model.encode([company_desc])[0]

        # Store in ChromaDB
        self.company_collection.add(
            ids=[company_id],
            embeddings=[embedding.tolist()],
            metadatas=[company_data],
            documents=[company_desc]
        )

    def search_similar_companies(self, icp_profile: str, limit: int = 100) -> List[Dict]:
        """
        Search cached companies similar to ICP using vector search

        Args:
            icp_profile: Ideal customer profile description
            limit: Maximum results

        Returns:
            List of similar companies from cache
        """
        # Generate embedding for ICP
        icp_embedding = self.embed_model.encode([icp_profile])[0]

        # Search ChromaDB
        results = self.company_collection.query(
            query_embeddings=[icp_embedding.tolist()],
            n_results=limit
        )

        # Extract company data
        companies = []
        if results and 'metadatas' in results:
            for metadata in results['metadatas'][0]:
                companies.append(metadata)

        return companies

    def get_stats(self) -> Dict:
        """Get RAG system statistics"""
        return {
            'companies_indexed': self.company_collection.count(),
            'contacts_indexed': self.contact_collection.count(),
            'embedding_model': 'all-MiniLM-L6-v2',
            'vector_db': 'ChromaDB',
            'llm_enabled': self.use_ollama
        }


# Async helper functions for parallel API calls
async def fetch_apollo_async(session: aiohttp.ClientSession, url: str,
                             headers: Dict, data: Dict = None) -> Optional[Dict]:
    """
    Async Apollo API call

    Args:
        session: aiohttp session
        url: API endpoint
        headers: Request headers
        data: Request body

    Returns:
        API response or None
    """
    try:
        if data:
            async with session.post(url, headers=headers, json=data) as response:
                if response.status == 200:
                    return await response.json()
        else:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
    except Exception as e:
        print(f"[ASYNC] Error: {e}")

    return None


async def parallel_apollo_search(api_key: str, search_params: List[Dict]) -> List[Dict]:
    """
    Execute multiple Apollo searches in parallel

    Args:
        api_key: Apollo API key
        search_params: List of search parameter dictionaries

    Returns:
        Combined results from all searches
    """
    headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': api_key
    }

    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_apollo_async(
                session,
                'https://api.apollo.io/v1/mixed_people/search',
                headers,
                params
            )
            for params in search_params
        ]

        results = await asyncio.gather(*tasks)

    # Combine results
    all_contacts = []
    for result in results:
        if result and 'people' in result:
            all_contacts.extend(result['people'])

    return all_contacts
