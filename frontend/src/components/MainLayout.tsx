'use client'

import TopNav from './TopNav'
import Sidebar from './Sidebar'
import { useState } from 'react'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <>
      <TopNav />
      <div className="main-wrapper">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`content-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <main className="container">{children}</main>
        </div>
      </div>
    </>
  )
}
