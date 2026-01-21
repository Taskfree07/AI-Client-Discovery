'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Auto-expand groups based on current path
  useEffect(() => {
    const groups = new Set<string>()
    if (pathname.startsWith('/lead-engine') || pathname.startsWith('/session-manager')) {
      groups.add('lead-engine')
    }
    if (pathname.startsWith('/campaign-manager')) {
      groups.add('campaign-manager')
    }
    setExpandedGroups(groups)
  }, [pathname])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const isActive = (path: string) => pathname === path

  return (
    <aside className="sidebar">
      <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <i className="fas fa-th-large"></i>
        <span>Dashboard</span>
      </Link>

      {/* Lead Engine Group */}
      <div className={`nav-group ${expandedGroups.has('lead-engine') ? 'expanded' : ''}`}>
        <div className="nav-item nav-group-header" onClick={() => toggleGroup('lead-engine')}>
          <i className="fas fa-bullseye"></i>
          <span>Lead Engine</span>
          <span className="nav-arrow">
            <i className="fas fa-chevron-down"></i>
          </span>
        </div>
        <div className={`nav-submenu ${expandedGroups.has('lead-engine') ? 'show' : ''}`}>
          <Link href="/lead-engine" className={`nav-item ${isActive('/lead-engine') ? 'active' : ''}`}>
            <span>Lead Search</span>
          </Link>
          <Link href="/session-manager" className={`nav-item ${isActive('/session-manager') ? 'active' : ''}`}>
            <span>Session Manager</span>
          </Link>
        </div>
      </div>

      {/* Campaign Manager Group */}
      <div className={`nav-group ${expandedGroups.has('campaign-manager') ? 'expanded' : ''}`}>
        <div className="nav-item nav-group-header" onClick={() => toggleGroup('campaign-manager')}>
          <i className="fas fa-users"></i>
          <span>Campaign Manager</span>
          <span className="nav-arrow">
            <i className="fas fa-chevron-down"></i>
          </span>
        </div>
        <div className={`nav-submenu ${expandedGroups.has('campaign-manager') ? 'show' : ''}`}>
          <Link href="/campaign-manager/new" className={`nav-item ${isActive('/campaign-manager/new') ? 'active' : ''}`}>
            <span>Start New Campaign</span>
          </Link>
          <Link href="/campaign-manager" className={`nav-item ${isActive('/campaign-manager') ? 'active' : ''}`}>
            <span>Campaign Stats</span>
          </Link>
          <Link href="/campaign-manager/templates" className={`nav-item ${isActive('/campaign-manager/templates') ? 'active' : ''}`}>
            <span>Email Templates</span>
          </Link>
        </div>
      </div>

      <Link href="/response-manager" className={`nav-item ${isActive('/response-manager') ? 'active' : ''}`}>
        <i className="fas fa-comment-dots"></i>
        <span>Response Manager</span>
      </Link>

      <Link href="/analytics" className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}>
        <i className="fas fa-chart-line"></i>
        <span>Analytics</span>
      </Link>

      <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
        <i className="fas fa-cog"></i>
        <span>Settings</span>
      </Link>
    </aside>
  )
}
