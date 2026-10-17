import Footer from '../components/Footer'

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      {children}
      <Footer />
    </div>
  )
}

export default AppLayout
