"""
AI-Powered Lead Scoring System
Intelligent lead prioritization using multiple factors and machine learning
"""

from typing import Dict, List, Optional, Tuple
import re
from datetime import datetime


class AILeadScorer:
    """
    Advanced lead scoring system that evaluates leads based on:
    - Company characteristics (size, revenue, tech stack)
    - Job relevance and seniority
    - Contact quality and email validity
    - Industry and location fit
    - Engagement potential
    """

    def __init__(self):
        # Scoring weights (total = 100)
        self.weights = {
            'company_quality': 25,      # Company size, revenue, funding
            'job_relevance': 20,         # How relevant is the job
            'contact_quality': 20,       # Contact seniority, email quality
            'industry_fit': 15,          # Industry match
            'tech_stack_fit': 10,        # Technology alignment
            'engagement_potential': 10   # Likelihood to respond
        }

        # High-value industries for recruitment
        self.premium_industries = [
            'information technology', 'software', 'saas', 'technology',
            'financial services', 'fintech', 'healthcare', 'biotech',
            'consulting', 'artificial intelligence', 'machine learning'
        ]

        # Valuable tech stacks (indicates modern, growing company)
        self.premium_tech = [
            'react', 'python', 'node.js', 'aws', 'kubernetes', 'docker',
            'tensorflow', 'machine learning', 'ai', 'cloud', 'microservices'
        ]

    def score_lead(self, lead_data: Dict, job_query: Optional[str] = None) -> Dict:
        """
        Comprehensive lead scoring

        Args:
            lead_data: Dictionary containing lead information
            job_query: Original search query for relevance scoring

        Returns:
            Dictionary with score, breakdown, and recommendations
        """
        scores = {}

        # 1. Company Quality Score (25 points)
        scores['company_quality'] = self._score_company_quality(lead_data)

        # 2. Job Relevance Score (20 points)
        scores['job_relevance'] = self._score_job_relevance(lead_data, job_query)

        # 3. Contact Quality Score (20 points)
        scores['contact_quality'] = self._score_contact_quality(lead_data)

        # 4. Industry Fit Score (15 points)
        scores['industry_fit'] = self._score_industry_fit(lead_data)

        # 5. Tech Stack Fit Score (10 points)
        scores['tech_stack_fit'] = self._score_tech_stack(lead_data)

        # 6. Engagement Potential Score (10 points)
        scores['engagement_potential'] = self._score_engagement_potential(lead_data)

        # Calculate total score
        total_score = sum(scores.values())

        # Determine grade and priority
        grade, priority, color = self._calculate_grade(total_score)

        # Generate insights and recommendations
        insights = self._generate_insights(scores, lead_data)
        recommendations = self._generate_recommendations(scores, lead_data)

        return {
            'total_score': round(total_score, 1),
            'grade': grade,
            'priority': priority,
            'color': color,
            'breakdown': {k: round(v, 1) for k, v in scores.items()},
            'insights': insights,
            'recommendations': recommendations,
            'scored_at': datetime.utcnow().isoformat()
        }

    def _score_company_quality(self, lead: Dict) -> float:
        """
        Score based on company characteristics
        Max: 25 points
        """
        score = 0.0
        max_score = self.weights['company_quality']

        # Employee count (10 points)
        employees = self._extract_number(lead.get('company_size', '0'))
        if employees > 0:
            if 50 <= employees <= 200:
                score += 10  # Sweet spot for recruitment
            elif 200 < employees <= 500:
                score += 8
            elif 500 < employees <= 1000:
                score += 6
            elif employees > 1000:
                score += 5  # Larger companies, harder to reach decision makers
            else:
                score += 3  # Small companies

        # Revenue (8 points)
        revenue_str = str(lead.get('annual_revenue', '')).lower()
        if 'b' in revenue_str or 'billion' in revenue_str:
            score += 8  # Billion+ revenue
        elif 'm' in revenue_str or 'million' in revenue_str:
            revenue_num = self._extract_number(revenue_str)
            if revenue_num >= 100:
                score += 7  # $100M+
            elif revenue_num >= 10:
                score += 5  # $10M+
            else:
                score += 3

        # Funding status (4 points)
        funding = str(lead.get('total_funding', '')).lower()
        if funding and funding != 'none':
            if 'b' in funding:
                score += 4
            elif 'm' in funding:
                score += 3

        # Stock symbol (public company) (3 points)
        if lead.get('publicly_traded'):
            score += 3

        return min(score, max_score)

    def _score_job_relevance(self, lead: Dict, query: Optional[str]) -> float:
        """
        Score based on job title relevance
        Max: 20 points
        """
        score = 0.0
        max_score = self.weights['job_relevance']

        job_title = str(lead.get('job_title', '')).lower()

        if not job_title:
            return 0

        # Check if job title contains query keywords (10 points)
        if query:
            query_words = set(query.lower().split())
            title_words = set(job_title.split())
            match_ratio = len(query_words & title_words) / len(query_words) if query_words else 0
            score += match_ratio * 10

        # Seniority indicators in job title (5 points)
        seniority_keywords = ['senior', 'lead', 'principal', 'architect', 'director', 'vp', 'head']
        if any(keyword in job_title for keyword in seniority_keywords):
            score += 5

        # Technical/specialized roles (5 points)
        specialized_keywords = ['engineer', 'developer', 'scientist', 'analyst', 'architect', 'specialist']
        if any(keyword in job_title for keyword in specialized_keywords):
            score += 5

        return min(score, max_score)

    def _score_contact_quality(self, lead: Dict) -> float:
        """
        Score based on contact/decision maker quality
        Max: 20 points
        """
        score = 0.0
        max_score = self.weights['contact_quality']

        contact_title = str(lead.get('contact_title', '')).lower()
        contact_email = lead.get('contact_email', '')

        # Contact seniority (12 points)
        if any(keyword in contact_title for keyword in ['ceo', 'chief executive', 'president', 'owner', 'founder']):
            score += 12  # C-level/Founder
        elif any(keyword in contact_title for keyword in ['cto', 'cfo', 'coo', 'cmo', 'vp', 'vice president']):
            score += 10  # C-suite/VP
        elif any(keyword in contact_title for keyword in ['director', 'head of', 'lead']):
            score += 7  # Director level
        elif any(keyword in contact_title for keyword in ['manager', 'supervisor']):
            score += 4  # Manager level

        # Email quality (8 points)
        if contact_email:
            if '@' in contact_email and '.' in contact_email:
                score += 4  # Valid email format

                # Check email status
                email_status = lead.get('email_status', '').lower()
                if email_status == 'verified':
                    score += 4  # Verified email
                elif email_status == 'guessed':
                    score += 2  # Guessed email
                elif email_status:
                    score += 1  # Has status info

        return min(score, max_score)

    def _score_industry_fit(self, lead: Dict) -> float:
        """
        Score based on industry alignment
        Max: 15 points
        """
        score = 0.0
        max_score = self.weights['industry_fit']

        industry = str(lead.get('industry', '')).lower()
        subindustry = str(lead.get('subindustry', '')).lower()

        # Check if in premium industries
        combined = f"{industry} {subindustry}"
        for premium in self.premium_industries:
            if premium in combined:
                score += 15
                break

        # Partial match for related industries
        if score == 0:
            related_keywords = ['software', 'technology', 'digital', 'consulting', 'services']
            if any(keyword in combined for keyword in related_keywords):
                score += 8

        return min(score, max_score)

    def _score_tech_stack(self, lead: Dict) -> float:
        """
        Score based on technology stack
        Max: 10 points
        """
        score = 0.0
        max_score = self.weights['tech_stack_fit']

        technologies = lead.get('technologies', [])
        if not technologies:
            return 0

        # Convert to lowercase list
        tech_list = [str(t).lower() for t in technologies]

        # Count premium tech matches
        matches = sum(1 for premium in self.premium_tech if any(premium in tech for tech in tech_list))

        # Score based on matches (max 10 points)
        score = min(matches * 2, max_score)

        return score

    def _score_engagement_potential(self, lead: Dict) -> float:
        """
        Score based on likelihood to engage
        Max: 10 points
        """
        score = 5.0  # Base score
        max_score = self.weights['engagement_potential']

        # Recent company activity indicators
        funding_date = lead.get('latest_funding_date')
        if funding_date:
            # Companies that recently raised funding are more likely to hire
            score += 3

        # Multiple tech stack = actively building
        tech_count = len(lead.get('technologies', []))
        if tech_count > 10:
            score += 2  # Active tech adoption

        return min(score, max_score)

    def _calculate_grade(self, score: float) -> Tuple[str, str, str]:
        """
        Calculate letter grade, priority level, and color code
        """
        if score >= 85:
            return ('A+', 'Critical', '#10B981')  # Green
        elif score >= 75:
            return ('A', 'High', '#3B82F6')  # Blue
        elif score >= 65:
            return ('B+', 'Medium-High', '#8B5CF6')  # Purple
        elif score >= 55:
            return ('B', 'Medium', '#F59E0B')  # Yellow
        elif score >= 45:
            return ('C', 'Low-Medium', '#F97316')  # Orange
        else:
            return ('D', 'Low', '#EF4444')  # Red

    def _generate_insights(self, scores: Dict, lead: Dict) -> List[str]:
        """Generate AI insights about the lead"""
        insights = []

        # Company quality insights
        if scores['company_quality'] >= 20:
            insights.append("[PREMIUM] Premium company profile with strong fundamentals")
        elif scores['company_quality'] < 10:
            insights.append("[WARN] Limited company information available")

        # Contact quality insights
        if scores['contact_quality'] >= 15:
            insights.append("[TARGET] Direct access to C-level decision maker")
        elif scores['contact_quality'] < 10:
            insights.append("[EMAIL] Email quality needs verification")

        # Job relevance insights
        if scores['job_relevance'] >= 15:
            insights.append("[OK] Highly relevant job opening")

        # Tech stack insights
        if scores['tech_stack_fit'] >= 6:
            insights.append("[ROCKET] Modern tech stack indicates growth")

        return insights

    def _generate_recommendations(self, scores: Dict, lead: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recs = []

        total = sum(scores.values())

        if total >= 75:
            recs.append("[FIRE] Priority lead - reach out immediately")
            recs.append("[BUSINESS] Consider personalized video message")
        elif total >= 60:
            recs.append("[THUMBSUP] Strong lead - add to top of queue")
            recs.append("[NOTE] Customize email with specific company details")
        elif total < 50:
            recs.append("[THINK] Consider if worth pursuing")
            if scores['contact_quality'] < 10:
                recs.append("[EMAIL] Verify email before sending")

        # Specific recommendations
        if scores['job_relevance'] < 10:
            recs.append("[WARN] Job may not be highly relevant - review carefully")

        if not lead.get('contact_email'):
            recs.append("[!] No email available - need to find contact")

        return recs

    def _extract_number(self, text: str) -> float:
        """Extract numeric value from text"""
        try:
            # Remove commas and extract numbers
            numbers = re.findall(r'[\d,]+\.?\d*', str(text))
            if numbers:
                return float(numbers[0].replace(',', ''))
        except:
            pass
        return 0

    def batch_score_leads(self, leads: List[Dict], query: Optional[str] = None) -> List[Dict]:
        """
        Score multiple leads at once

        Returns leads with scoring information added
        """
        scored_leads = []

        for lead in leads:
            scoring = self.score_lead(lead, query)
            lead['ai_score'] = scoring
            scored_leads.append(lead)

        # Sort by score (highest first)
        scored_leads.sort(key=lambda x: x['ai_score']['total_score'], reverse=True)

        return scored_leads

    def get_lead_priority_distribution(self, scored_leads: List[Dict]) -> Dict:
        """Get distribution of leads by priority"""
        distribution = {
            'Critical': 0,
            'High': 0,
            'Medium-High': 0,
            'Medium': 0,
            'Low-Medium': 0,
            'Low': 0
        }

        for lead in scored_leads:
            priority = lead.get('ai_score', {}).get('priority', 'Low')
            distribution[priority] = distribution.get(priority, 0) + 1

        return distribution
