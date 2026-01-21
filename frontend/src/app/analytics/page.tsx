'use client'

import MainLayout from '@/components/MainLayout'

export default function AnalyticsPage() {
  return (
    <MainLayout>
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          <i className="fas fa-chart-line"></i>
        </div>
        <h1 className="coming-soon-title">Analytics Dashboard</h1>
        <p className="coming-soon-description">
          Track key performance indicators: Daily quota completion, email delivery rates, response rates,
          and follow-up compliance metrics. Visualize trends and optimize your outreach strategy with data-driven insights.
        </p>
        <span className="coming-soon-badge">Coming Soon</span>
      </div>
    </MainLayout>
  )
}
