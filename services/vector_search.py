"""
Advanced Vector Search Service with Semantic Understanding and Result Validation
Uses sentence-transformers for embeddings and FAISS for efficient similarity search
"""

import re
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class VectorSearchService:
    """
    Advanced search service using semantic embeddings for:
    - Better relevance matching
    - Result deduplication via semantic similarity
    - Quality scoring and validation
    - Diverse result generation
    """

    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the vector search service

        Args:
            model_name: Sentence transformer model to use
                       'all-MiniLM-L6-v2' - Fast, good quality (default)
                       'all-mpnet-base-v2' - Better quality, slower
                       'paraphrase-multilingual-MiniLM-L12-v2' - Multilingual
        """
        print(f"🔧 Initializing Vector Search Service with model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.embedding_dimension = self.model.get_sentence_embedding_dimension()

        # FAISS index for fast similarity search
        self.index = None
        self.indexed_items = []

        # Quality thresholds
        self.MIN_QUALITY_SCORE = 0.4  # Minimum quality score (0-1)
        self.SIMILARITY_THRESHOLD = 0.85  # Semantic similarity threshold for deduplication
        self.DIVERSITY_THRESHOLD = 0.75  # Similarity threshold for diversity

        print(f"✅ Vector Search Service ready (embedding dim: {self.embedding_dimension})")

    def encode_text(self, text: str) -> np.ndarray:
        """
        Convert text to vector embedding

        Args:
            text: Text to encode

        Returns:
            numpy array of embeddings
        """
        if not text or not isinstance(text, str):
            # Return zero vector for invalid input
            return np.zeros(self.embedding_dimension)

        return self.model.encode(text, convert_to_numpy=True)

    def encode_batch(self, texts: List[str]) -> np.ndarray:
        """
        Encode multiple texts in batch (more efficient)

        Args:
            texts: List of texts to encode

        Returns:
            numpy array of embeddings (n_texts x embedding_dim)
        """
        # Filter out invalid texts
        valid_texts = [t if t and isinstance(t, str) else "" for t in texts]
        return self.model.encode(valid_texts, convert_to_numpy=True, show_progress_bar=False)

    def calculate_relevance_score(self, query: str, result_text: str) -> float:
        """
        Calculate semantic relevance between query and result

        Args:
            query: Search query
            result_text: Result text to score

        Returns:
            Relevance score (0-1, higher is more relevant)
        """
        query_embedding = self.encode_text(query)
        result_embedding = self.encode_text(result_text)

        # Cosine similarity
        similarity = cosine_similarity(
            query_embedding.reshape(1, -1),
            result_embedding.reshape(1, -1)
        )[0][0]

        return float(similarity)

    def validate_job_result(self, result: Dict) -> Tuple[bool, float, str]:
        """
        Validate if a search result is a legitimate job posting

        Args:
            result: Dictionary with 'title', 'snippet', 'link' keys

        Returns:
            Tuple of (is_valid, quality_score, reason)
        """
        title = result.get('title', '').lower()
        snippet = result.get('snippet', '').lower()
        link = result.get('link', '').lower()

        # Combined text for analysis
        full_text = f"{title} {snippet}".lower()

        quality_score = 1.0
        reasons = []

        # === VALIDATION CHECKS ===

        # 0. Check for recruiting agency / staffing patterns (CRITICAL FILTER)
        recruiting_agency_patterns = [
            'w2 requirement', 'w2 contract', 'w2 ', 'c2c', 'corp to corp',
            'staffing', 'staffing agency', 'recruiting agency',
            'we are hiring for', 'hiring for our client',
            'contract position', 'contract role', 'vendor',
            '1099', 'hourly rate', 'pay rate', 'our client'
        ]
        is_recruiting_post = any(pattern in full_text for pattern in recruiting_agency_patterns)
        if is_recruiting_post:
            quality_score -= 0.85  # Heavy penalty - almost always filters out
            reasons.append("Recruiting/staffing agency post (not direct employer)")

        # 1. Check for job-related keywords (POSITIVE signals)
        job_keywords = [
            'hiring', 'job', 'position', 'career', 'opening', 'vacancy',
            'apply', 'recruit', 'employment', 'opportunity', 'wanted',
            'looking for', 'join our team', 'we are hiring'
        ]
        has_job_keyword = any(keyword in full_text for keyword in job_keywords)
        if not has_job_keyword:
            quality_score -= 0.3
            reasons.append("No clear job-related keywords")

        # 2. Check for NEGATIVE patterns (spam, irrelevant)
        spam_patterns = [
            'free download', 'click here', 'buy now', 'discount',
            'limited time', 'act now', 'order now', '$$$',
            'make money fast', 'work from home scam', 'get rich',
            'viagra', 'casino', 'lottery', 'weight loss'
        ]
        has_spam = any(pattern in full_text for pattern in spam_patterns)
        if has_spam:
            quality_score -= 0.5
            reasons.append("Contains spam patterns")

        # 3. Check link validity
        invalid_domains = [
            'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
            'reddit.com', 'quora.com', 'pinterest.com', 'tiktok.com'
        ]
        is_social_media = any(domain in link for domain in invalid_domains)
        if is_social_media:
            quality_score -= 0.4
            reasons.append("Social media link (not direct job posting)")

        # 4. Check for job board domains (POSITIVE)
        job_boards = [
            'linkedin.com/jobs', 'indeed.com', 'glassdoor.com',
            'monster.com', 'careerbuilder.com', 'ziprecruiter.com',
            'simplyhired.com', 'jobs.', '/careers', '/jobs/'
        ]
        is_job_board = any(board in link for board in job_boards)
        if is_job_board:
            quality_score += 0.1  # Bonus for known job boards
            reasons.append("From known job board")

        # 5. Title length check (too short or too long is suspicious)
        title_length = len(result.get('title', ''))
        if title_length < 10:
            quality_score -= 0.2
            reasons.append("Title too short")
        elif title_length > 200:
            quality_score -= 0.1
            reasons.append("Title unusually long")

        # 6. Check for common job title patterns
        job_title_patterns = [
            r'\b(senior|junior|lead|principal|staff)\s+\w+',  # Senior Developer
            r'\b\w+\s+(engineer|developer|manager|director|analyst|designer|specialist)\b',
            r'\b(software|full[\s-]?stack|front[\s-]?end|back[\s-]?end|data)\s+\w+',
        ]
        has_job_title_pattern = any(re.search(pattern, title, re.IGNORECASE) for pattern in job_title_patterns)
        if has_job_title_pattern:
            quality_score += 0.1
            reasons.append("Matches common job title pattern")

        # 7. Check snippet quality
        snippet_length = len(snippet)
        if snippet_length < 20:
            quality_score -= 0.15
            reasons.append("Snippet too short")

        # 8. Check for "noise" words that indicate non-job content
        noise_patterns = [
            'search results for', 'related searches', 'you searched for',
            'browse jobs', 'job search', 'find jobs', 'all jobs',
            'showing results', 'page 1 of', 'no jobs found'
        ]
        has_noise = any(pattern in full_text for pattern in noise_patterns)
        if has_noise:
            quality_score -= 0.3
            reasons.append("Contains search interface text (not actual job)")

        # 9. Check for duplicate/template content indicators
        if snippet.count('...') > 3:
            quality_score -= 0.1
            reasons.append("Truncated/incomplete content")

        # Clamp score between 0 and 1
        quality_score = max(0.0, min(1.0, quality_score))

        # Determine if valid based on threshold
        is_valid = quality_score >= self.MIN_QUALITY_SCORE

        reason_str = "; ".join(reasons) if reasons else "Passed all checks"

        return is_valid, quality_score, reason_str

    def semantic_deduplication(self, results: List[Dict],
                               text_field: str = 'title') -> List[Dict]:
        """
        Remove semantically duplicate results

        Args:
            results: List of result dictionaries
            text_field: Field to use for comparison (default: 'title')

        Returns:
            Deduplicated list of results
        """
        if not results or len(results) <= 1:
            return results

        print(f"\n🔍 Deduplicating {len(results)} results using semantic similarity...")

        # Extract texts
        texts = [r.get(text_field, '') for r in results]

        # Encode all texts
        embeddings = self.encode_batch(texts)

        # Calculate similarity matrix
        similarity_matrix = cosine_similarity(embeddings)

        # Keep track of which items to keep
        keep_indices = []
        for i in range(len(results)):
            is_duplicate = False

            # Check against already kept items
            for kept_idx in keep_indices:
                similarity = similarity_matrix[i][kept_idx]
                if similarity >= self.SIMILARITY_THRESHOLD:
                    is_duplicate = True
                    print(f"   ❌ Removing duplicate: '{texts[i][:60]}...' (similarity: {similarity:.2f})")
                    break

            if not is_duplicate:
                keep_indices.append(i)

        deduplicated = [results[i] for i in keep_indices]
        print(f"✅ Kept {len(deduplicated)} unique results (removed {len(results) - len(deduplicated)} duplicates)")

        return deduplicated

    def ensure_diversity(self, results: List[Dict],
                         max_results: int = 10,
                         text_field: str = 'title') -> List[Dict]:
        """
        Select diverse results using Maximal Marginal Relevance (MMR)
        Balances relevance with diversity

        Args:
            results: List of result dictionaries
            max_results: Maximum number of results to return
            text_field: Field to use for diversity calculation

        Returns:
            Diverse subset of results
        """
        if not results or len(results) <= max_results:
            return results

        print(f"\n🎨 Ensuring diversity: selecting {max_results} diverse results from {len(results)}...")

        # Extract texts and encode
        texts = [r.get(text_field, '') for r in results]
        embeddings = self.encode_batch(texts)

        # MMR algorithm
        selected_indices = []
        remaining_indices = list(range(len(results)))

        # Start with the first result (presumably most relevant from original search)
        selected_indices.append(0)
        remaining_indices.remove(0)

        while len(selected_indices) < max_results and remaining_indices:
            max_mmr_score = -1
            best_idx = None

            for idx in remaining_indices:
                # Calculate similarity to already selected items
                similarities_to_selected = [
                    cosine_similarity(
                        embeddings[idx].reshape(1, -1),
                        embeddings[sel_idx].reshape(1, -1)
                    )[0][0]
                    for sel_idx in selected_indices
                ]

                # MMR score: penalize items similar to already selected
                max_similarity = max(similarities_to_selected)
                mmr_score = 1.0 - max_similarity  # Higher score for more diverse items

                if mmr_score > max_mmr_score:
                    max_mmr_score = mmr_score
                    best_idx = idx

            if best_idx is not None:
                selected_indices.append(best_idx)
                remaining_indices.remove(best_idx)
            else:
                break

        diverse_results = [results[i] for i in selected_indices]
        print(f"✅ Selected {len(diverse_results)} diverse results")

        return diverse_results

    def rank_results(self, query: str, results: List[Dict]) -> List[Dict]:
        """
        Re-rank results based on semantic relevance to query

        Args:
            query: Original search query
            results: List of result dictionaries

        Returns:
            Results sorted by relevance score (with scores added)
        """
        if not results:
            return results

        print(f"\n📊 Re-ranking {len(results)} results by semantic relevance...")

        # Encode query
        query_embedding = self.encode_text(query)

        # Encode all results (using title + snippet)
        result_texts = [
            f"{r.get('title', '')} {r.get('snippet', '')}"
            for r in results
        ]
        result_embeddings = self.encode_batch(result_texts)

        # Calculate relevance scores
        for i, result in enumerate(results):
            similarity = cosine_similarity(
                query_embedding.reshape(1, -1),
                result_embeddings[i].reshape(1, -1)
            )[0][0]
            result['relevance_score'] = float(similarity)

        # Sort by relevance (descending)
        ranked_results = sorted(results, key=lambda x: x['relevance_score'], reverse=True)

        print("✅ Results re-ranked by relevance")
        return ranked_results

    def process_search_results(self, query: str, results: List[Dict],
                               max_results: int = 10,
                               validate: bool = True,
                               deduplicate: bool = True,
                               ensure_diversity: bool = True,
                               rerank: bool = True) -> List[Dict]:
        """
        Complete pipeline: validate, deduplicate, diversify, and rank results

        Args:
            query: Original search query
            results: Raw search results
            max_results: Maximum number of results to return
            validate: Whether to validate result quality
            deduplicate: Whether to remove semantic duplicates
            ensure_diversity: Whether to ensure diverse results
            rerank: Whether to re-rank by semantic relevance

        Returns:
            Processed, high-quality results
        """
        if not results:
            return []

        print(f"\n{'='*60}")
        print(f"🚀 VECTOR SEARCH PROCESSING PIPELINE")
        print(f"{'='*60}")
        print(f"📥 Input: {len(results)} raw results")
        print(f"🎯 Query: '{query}'")
        print(f"⚙️  Pipeline: validate={validate}, deduplicate={deduplicate}, diversity={ensure_diversity}, rerank={rerank}")
        print(f"{'='*60}\n")

        processed = results.copy()

        # Step 1: Validate and score results
        if validate:
            print("🔍 STEP 1: Validating result quality...")
            valid_results = []

            for result in processed:
                is_valid, quality_score, reason = self.validate_job_result(result)
                result['quality_score'] = quality_score
                result['validation_reason'] = reason

                if is_valid:
                    valid_results.append(result)
                    print(f"   ✅ Valid (score: {quality_score:.2f}): {result.get('title', '')[:60]}...")
                else:
                    print(f"   ❌ Invalid (score: {quality_score:.2f}): {result.get('title', '')[:60]}... | Reason: {reason}")

            processed = valid_results
            print(f"\n✅ Validation complete: {len(processed)} valid results\n")

        # Step 2: Semantic deduplication
        if deduplicate and len(processed) > 1:
            processed = self.semantic_deduplication(processed)

        # Step 3: Re-rank by semantic relevance
        if rerank:
            processed = self.rank_results(query, processed)

        # Step 4: Ensure diversity
        if ensure_diversity and len(processed) > max_results:
            processed = self.ensure_diversity(processed, max_results)
        else:
            # Just limit to max_results
            processed = processed[:max_results]

        print(f"\n{'='*60}")
        print(f"✅ PIPELINE COMPLETE")
        print(f"{'='*60}")
        print(f"📤 Output: {len(processed)} high-quality, diverse results")
        print(f"{'='*60}\n")

        return processed

    def find_similar_items(self, query_text: str,
                          candidate_items: List[Dict],
                          text_field: str = 'title',
                          top_k: int = 10) -> List[Tuple[Dict, float]]:
        """
        Find most similar items to a query using vector search

        Args:
            query_text: Text to search for
            candidate_items: List of items to search through
            text_field: Field to use for similarity
            top_k: Number of results to return

        Returns:
            List of (item, similarity_score) tuples
        """
        if not candidate_items:
            return []

        # Encode query
        query_embedding = self.encode_text(query_text)

        # Encode all candidates
        candidate_texts = [item.get(text_field, '') for item in candidate_items]
        candidate_embeddings = self.encode_batch(candidate_texts)

        # Calculate similarities
        similarities = cosine_similarity(
            query_embedding.reshape(1, -1),
            candidate_embeddings
        )[0]

        # Get top-k
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = [
            (candidate_items[idx], float(similarities[idx]))
            for idx in top_indices
        ]

        return results
