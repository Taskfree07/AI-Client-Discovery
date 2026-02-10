'use client'

export default function TopNav() {
  return (
    <nav className="top-nav">
      <div className="top-nav-left">
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
