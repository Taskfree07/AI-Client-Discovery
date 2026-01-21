'use client'

import MainLayout from '@/components/MainLayout'

export default function ResponseManagerPage() {
  return (
    <MainLayout>
      <div className="coming-soon-container">
        <div className="coming-soon-icon">
          <i className="fas fa-comment-dots"></i>
        </div>
        <h1 className="coming-soon-title">Response Manager</h1>
        <p className="coming-soon-description">
          Track and categorize responses: Bounces, Out-of-Office, Positive, and Negative replies.
          Automatically recycle non-responsive clients for next month&apos;s campaigns and manage follow-ups intelligently.
        </p>
        <span className="coming-soon-badge">Coming Soon - Part 2 of MRA System</span>
      </div>
    </MainLayout>
  )
}
