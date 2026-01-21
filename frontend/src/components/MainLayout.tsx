import TopNav from './TopNav'
import Sidebar from './Sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <div className="main-wrapper">
        <Sidebar />
        <div className="content-wrapper">
          <main className="container">{children}</main>
        </div>
      </div>
    </>
  )
}
