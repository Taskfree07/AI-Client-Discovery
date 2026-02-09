'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-expand groups based on current path
  useEffect(() => {
    if (!mounted) return

    const groups = new Set<string>()
    if (pathname.startsWith('/lead-engine') || pathname.startsWith('/session-manager')) {
      groups.add('lead-engine')
    }
    if (pathname.startsWith('/campaign-manager')) {
      groups.add('campaign-manager')
    }
    setExpandedGroups(groups)
  }, [pathname, mounted])

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
  const isGroupActive = (paths: string[]) => paths.some(p => pathname.startsWith(p))

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="nav-menu">
        <div className="nav-item">
          <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <i className="fas fa-th-large nav-icon"></i>
            {!collapsed && <span>Dashboard</span>}
          </Link>
        </div>

        {/* Session Manager */}
        <div className="nav-item">
          <Link href="/session-manager" className={`nav-link ${isActive('/session-manager') ? 'active' : ''}`}>
            <i className="fas fa-crosshairs nav-icon"></i>
            {!collapsed && <span>Session Manager</span>}
          </Link>
        </div>

        {/* Campaign Manager Group */}
        <div className={`nav-group ${expandedGroups.has('campaign-manager') ? 'expanded' : ''}`}>
          <div className="nav-item">
            <Link
              href="/campaign-manager"
              className={`nav-link nav-group-header ${isGroupActive(['/campaign-manager']) ? 'group-active' : ''}`}
              onClick={(e) => {
                if (!expandedGroups.has('campaign-manager')) {
                  toggleGroup('campaign-manager')
                }
              }}
            >
              <i className="fas fa-users nav-icon"></i>
              {!collapsed && (
                <>
                  <span>Campaign Manager</span>
                  <span className="nav-arrow">
                    <i className="fas fa-chevron-down"></i>
                  </span>
                </>
              )}
            </Link>
          </div>
          {!collapsed && (
            <div className={`nav-submenu ${expandedGroups.has('campaign-manager') ? 'show' : ''}`}>
              <div className="nav-item">
                <Link href="/campaign-manager/sender-profile" className={`nav-link ${isActive('/campaign-manager/sender-profile') ? 'active' : ''}`}>
                  <span>Sender Profile</span>
                </Link>
              </div>
              <div className="nav-item">
                <Link href="/campaign-manager/templates" className={`nav-link ${isActive('/campaign-manager/templates') ? 'active' : ''}`}>
                  <span>Email Templates</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Response Manager */}
        <div className="nav-item">
          <Link href="/response-manager" className={`nav-link ${isActive('/response-manager') ? 'active' : ''}`}>
            <i className="far fa-comment-dots nav-icon"></i>
            {!collapsed && <span>Response Manager</span>}
          </Link>
        </div>

        {/* Analytics */}
        <div className="nav-item">
          <Link href="/analytics" className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}>
            <i className="fas fa-chart-bar nav-icon"></i>
            {!collapsed && <span>Analytics</span>}
          </Link>
        </div>
      </nav>
    </aside>
  )
}
