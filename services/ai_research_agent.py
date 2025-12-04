"""
AI Company Research Agent
Automated company research using AI and web data
"""

from typing import Dict, List, Optional
import requests
from datetime import datetime
import re


class AIResearchAgent:
    """
    Intelligent research agent that auto-researches companies before outreach

    Features:
    - Company news and recent activity
    - Pain point identification
    - Competitive insights
    - Growth signals
    - Personalization suggestions
    """

    def __init__(self, google_api_key: Optional[str] = None, google_cx: Optional[str] = None):
        self.google_api_key = google_api_key
        self.google_cx = google_cx
        self.google_search_url = "https://www.googleapis.com/customsearch/v1"

    def research_company(self, company_name: str, company_domain: str,
                        company_data: Optional[Dict] = None) -> Dict:
        """
        Comprehensive company research

        Args:
            company_name: Name of the company
            company_domain: Company website domain
            company_data: Optional existing company data from Apollo

        Returns:
            Research report with insights and recommendations
        """
        print(f"\n🔬 AI Research Agent: Analyzing {company_name}...")

        research = {
            'company_name': company_name,
            'domain': company_domain,
            'researched_at': datetime.utcnow().isoformat(),
            'sections': {}
        }

        # 1. Extract insights from existing data
        if company_data:
            research['sections']['company_profile'] = self._analyze_company_profile(company_data)

        # 2. Identify growth signals
        research['sections']['growth_signals'] = self._identify_growth_signals(company_data or {})

        # 3. Find recent news (if Google API available)
        if self.google_api_key and self.google_cx:
            research['sections']['recent_news'] = self._find_recent_news(company_name)
        else:
            research['sections']['recent_news'] = {'articles': [], 'note': 'Google API not configured'}

        # 4. Analyze tech stack
        if company_data and company_data.get('technologies'):
            research['sections']['tech_insights'] = self._analyze_tech_stack(company_data['technologies'])

        # 5. Identify pain points and opportunities
        research['sections']['pain_points'] = self._identify_pain_points(company_data or {})

        # 6. Generate personalization suggestions
        research['personalization_hooks'] = self._generate_personalization_hooks(research)

        # 7. Create executive summary
        research['executive_summary'] = self._create_executive_summary(research)

        print(f"✅ Research complete for {company_name}")
        return research

    def _analyze_company_profile(self, company_data: Dict) -> Dict:
        """Analyze company profile from Apollo data"""
        profile = {
            'overview': [],
            'key_facts': [],
            'highlights': []
        }

        # Basic info
        employees = company_data.get('estimated_num_employees', 0)
        if employees:
            profile['key_facts'].append(f"Company size: {employees:,} employees")

            # Size category
            if employees < 50:
                profile['overview'].append("Small startup - agile and fast-moving")
            elif employees < 200:
                profile['overview'].append("Mid-sized company - good growth stage")
            elif employees < 1000:
                profile['overview'].append("Established mid-market company")
            else:
                profile['overview'].append("Large enterprise organization")

        # Revenue
        revenue = company_data.get('annual_revenue_printed', '')
        if revenue:
            profile['key_facts'].append(f"Annual revenue: {revenue}")
            profile['highlights'].append(f"💰 Revenue: {revenue}")

        # Funding
        funding = company_data.get('total_funding_printed', '')
        if funding:
            profile['key_facts'].append(f"Total funding raised: {funding}")
            profile['highlights'].append(f"🚀 Funding: {funding}")

            latest_round = company_data.get('latest_funding_round_type', '')
            if latest_round:
                profile['overview'].append(f"Recently raised {latest_round} round")

        # Industry
        industry = company_data.get('industry', '')
        if industry:
            profile['key_facts'].append(f"Industry: {industry}")

        # Founded year
        founded = company_data.get('founded_year', '')
        if founded:
            age = datetime.now().year - int(founded) if founded.isdigit() else 0
            if age > 0:
                profile['key_facts'].append(f"Founded: {founded} ({age} years old)")

                if age < 3:
                    profile['overview'].append("Very young startup - early stage")
                elif age < 10:
                    profile['overview'].append("Growing company in scale-up phase")
                else:
                    profile['overview'].append("Established, mature organization")

        # Public status
        if company_data.get('publicly_traded_symbol'):
            symbol = company_data['publicly_traded_symbol']
            profile['highlights'].append(f"📈 Publicly traded: {symbol}")
            profile['overview'].append("Publicly traded company - financial transparency")

        return profile

    def _identify_growth_signals(self, company_data: Dict) -> Dict:
        """Identify signals that company is growing"""
        signals = {
            'positive': [],
            'neutral': [],
            'score': 0  # 0-10 growth score
        }

        score = 5  # Start with neutral

        # Recent funding
        funding_date = company_data.get('latest_funding_date', '')
        if funding_date:
            signals['positive'].append(f"💸 Recently raised funding ({funding_date})")
            score += 2

        # Large tech stack = active development
        tech_count = len(company_data.get('technologies', []))
        if tech_count > 15:
            signals['positive'].append(f"🔧 Diverse tech stack ({tech_count} technologies)")
            score += 1
        elif tech_count > 5:
            signals['neutral'].append(f"Standard tech stack ({tech_count} technologies)")

        # Department growth
        dept_headcount = company_data.get('departmental_head_count', {})
        if dept_headcount:
            if dept_headcount.get('engineering', 0) > 50:
                signals['positive'].append("👨‍💻 Large engineering team - actively building")
                score += 1

            if dept_headcount.get('sales', 0) > 20:
                signals['positive'].append("💼 Growing sales team - scaling revenue")
                score += 1

        # Employee count range suggests growth
        employees = company_data.get('estimated_num_employees', 0)
        if 50 <= employees <= 500:
            signals['positive'].append("📈 In rapid growth employee range (50-500)")
            score += 1

        signals['score'] = min(score, 10)
        return signals

    def _find_recent_news(self, company_name: str) -> Dict:
        """
        Find recent news about the company
        Uses Google Custom Search API
        """
        news = {
            'articles': [],
            'summary': ''
        }

        if not self.google_api_key or not self.google_cx:
            return news

        try:
            # Search for recent news
            query = f'{company_name} news'
            params = {
                'key': self.google_api_key,
                'cx': self.google_cx,
                'q': query,
                'num': 5,
                'sort': 'date'  # Try to get recent articles
            }

            response = requests.get(self.google_search_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'items' in data:
                for item in data['items'][:5]:  # Top 5 results
                    article = {
                        'title': item.get('title', ''),
                        'snippet': item.get('snippet', ''),
                        'link': item.get('link', ''),
                        'source': item.get('displayLink', '')
                    }
                    news['articles'].append(article)

                # Create summary
                if news['articles']:
                    news['summary'] = f"Found {len(news['articles'])} recent mentions"

        except Exception as e:
            print(f"Error fetching news: {e}")
            news['error'] = str(e)

        return news

    def _analyze_tech_stack(self, technologies: List[str]) -> Dict:
        """Analyze company's technology stack"""
        insights = {
            'categories': {},
            'insights': [],
            'tech_maturity': ''
        }

        # Categorize technologies
        categories = {
            'Frontend': ['react', 'vue', 'angular', 'next', 'typescript'],
            'Backend': ['node', 'python', 'ruby', 'java', 'go', 'php'],
            'Cloud': ['aws', 'azure', 'google cloud', 'gcp', 'heroku'],
            'Data': ['postgresql', 'mongodb', 'redis', 'elasticsearch', 'mysql'],
            'DevOps': ['docker', 'kubernetes', 'jenkins', 'terraform', 'ansible'],
            'Analytics': ['google analytics', 'mixpanel', 'amplitude', 'segment'],
            'AI/ML': ['tensorflow', 'pytorch', 'machine learning', 'ai']
        }

        for category, keywords in categories.items():
            matches = [tech for tech in technologies if any(k in tech.lower() for k in keywords)]
            if matches:
                insights['categories'][category] = matches

        # Generate insights
        if insights['categories'].get('AI/ML'):
            insights['insights'].append("🤖 Using AI/ML - cutting edge tech company")

        if insights['categories'].get('Cloud'):
            insights['insights'].append("☁️ Cloud-native infrastructure - modern architecture")

        if len(insights['categories']) >= 5:
            insights['tech_maturity'] = "Advanced - diverse modern stack"
            insights['insights'].append("💎 Sophisticated tech organization")
        elif len(insights['categories']) >= 3:
            insights['tech_maturity'] = "Mature - solid tech foundation"
        else:
            insights['tech_maturity'] = "Basic - growing tech capabilities"

        return insights

    def _identify_pain_points(self, company_data: Dict) -> Dict:
        """
        Identify potential pain points and opportunities
        Based on company characteristics
        """
        pain_points = {
            'hiring_challenges': [],
            'growth_challenges': [],
            'opportunities': []
        }

        employees = company_data.get('estimated_num_employees', 0)

        # Hiring pain points
        if 50 <= employees <= 200:
            pain_points['hiring_challenges'].append(
                "Rapid growth phase - likely struggling to hire fast enough"
            )
            pain_points['opportunities'].append(
                "Offer fast candidate placement to support growth"
            )

        if employees > 500:
            pain_points['hiring_challenges'].append(
                "Large organization - need specialized talent quickly"
            )
            pain_points['opportunities'].append(
                "Position as specialist recruiter for niche roles"
            )

        # Tech stack insights
        tech_count = len(company_data.get('technologies', []))
        if tech_count > 20:
            pain_points['hiring_challenges'].append(
                "Complex tech stack requires specialized developers"
            )
            pain_points['opportunities'].append(
                "Highlight technical screening capabilities"
            )

        # Recent funding
        if company_data.get('latest_funding_date'):
            pain_points['growth_challenges'].append(
                "Recently funded - pressure to scale team quickly"
            )
            pain_points['opportunities'].append(
                "Emphasize fast turnaround and pre-vetted candidates"
            )

        return pain_points

    def _generate_personalization_hooks(self, research: Dict) -> List[Dict]:
        """
        Generate personalization hooks for outreach
        """
        hooks = []

        # Hook from growth signals
        growth = research['sections'].get('growth_signals', {})
        if growth.get('score', 0) >= 7:
            hooks.append({
                'hook': f"Noticed {research['company_name']} is in rapid growth mode",
                'evidence': ', '.join(growth.get('positive', [])[:2]),
                'angle': 'Support your growth with pre-vetted talent'
            })

        # Hook from tech stack
        tech = research['sections'].get('tech_insights', {})
        if tech and tech.get('categories'):
            categories = list(tech['categories'].keys())[:2]
            hooks.append({
                'hook': f"Saw you're using {', '.join(categories)} technologies",
                'evidence': 'Modern tech stack',
                'angle': 'We specialize in finding developers with these skills'
            })

        # Hook from recent news
        news = research['sections'].get('recent_news', {})
        if news.get('articles'):
            first_article = news['articles'][0]
            hooks.append({
                'hook': f"Read about: {first_article['title'][:60]}...",
                'evidence': first_article['snippet'][:100],
                'angle': 'Congratulate on milestone and offer support'
            })

        # Hook from funding
        profile = research['sections'].get('company_profile', {})
        if any('funding' in str(h).lower() for h in profile.get('highlights', [])):
            hooks.append({
                'hook': "Congratulations on your recent funding round",
                'evidence': 'Growing fast',
                'angle': 'Help scale your team with the funding'
            })

        return hooks[:3]  # Return top 3 hooks

    def _create_executive_summary(self, research: Dict) -> str:
        """Create a concise executive summary"""
        summary_parts = []

        # Company profile
        profile = research['sections'].get('company_profile', {})
        if profile.get('overview'):
            summary_parts.append(profile['overview'][0])

        # Growth signals
        growth = research['sections'].get('growth_signals', {})
        score = growth.get('score', 0)
        if score >= 7:
            summary_parts.append("Strong growth signals - high priority target")
        elif score >= 5:
            summary_parts.append("Moderate growth indicators")

        # Pain points
        pain = research['sections'].get('pain_points', {})
        if pain.get('opportunities'):
            summary_parts.append(pain['opportunities'][0])

        # Combine
        summary = '. '.join(summary_parts) + '.' if summary_parts else 'Research completed.'

        return summary

    def quick_research(self, company_name: str, company_data: Dict) -> Dict:
        """
        Quick research mode - faster, less comprehensive
        For real-time pipeline use
        """
        return {
            'company_name': company_name,
            'growth_score': self._identify_growth_signals(company_data).get('score', 5),
            'key_insights': self._analyze_company_profile(company_data).get('overview', [])[:2],
            'tech_level': self._analyze_tech_stack(company_data.get('technologies', [])).get('tech_maturity', 'Unknown'),
            'quick_summary': f"{company_name} - {company_data.get('estimated_num_employees', 0)} employees in {company_data.get('industry', 'Unknown')} industry"
        }
