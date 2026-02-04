'use client'

export default function TopNav({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="logo">
          <img 
            src="/logo.png" 
            alt="Techgene Logo" 
            className="logo-image"
          />
        </div>
      </div>
      <div className="top-nav-right">
        <button className="nav-icon-btn">
          <i className="far fa-bell"></i>
        </button>
        <button className="nav-icon-btn">
          <i className="fas fa-cog"></i>
        </button>
      </div>
    </nav>
  )
}
