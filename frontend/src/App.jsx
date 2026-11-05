import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DonorsPage from './pages/DonorsPage'
import DonorProfilePage from './pages/DonorProfilePage'
import Navbar from './components/Navbar'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import DonorExperiences from './components/landing/DonorExperiences'
import DonorLeaderboard from './components/landing/DonorLeaderboard'
import { LanguageProvider } from './contexts/LanguageProvider'
import BlogPage from './pages/BlogPage'
import BlogDetailsPage from './pages/BlogDetailsPage'
import BloodRequestsPage from './pages/BloodRequestsPage'

function LandingPage() {
  return (
    <AppLayout>
      <Navbar />
      <HomePage />
    </AppLayout>
  )
}

function DonorDirectoryRoute() {
  return (
    <AppLayout>
      <Navbar />
      <DonorsPage />
    </AppLayout>
  )
}

function DonorProfileRoute() {
  return (
    <AppLayout>
      <Navbar />
      <DonorProfilePage />
    </AppLayout>
  )
}

function DonorExperiencesRoute() {
  return (
    <AppLayout>
      <Navbar />
      <DonorExperiences />
    </AppLayout>
  )
}

function TopDonorsRoute() {
  return (
    <AppLayout>
      <Navbar />
      <DonorLeaderboard />
    </AppLayout>
  )
}

function BlogRoute({ children }) {
  return (
    <AppLayout>
      <Navbar />
      {children}
    </AppLayout>
  )
}

function AuthenticationRoute({ children }) {
  return (
    <AppLayout>
      <Navbar />
      {children}
    </AppLayout>
  )
}

function UserProfileRoute() {
  return (
    <AppLayout>
      <Navbar />
      <ProfilePage />
    </AppLayout>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<LandingPage />} path="/" />
            <Route element={<AuthenticationRoute><RegisterPage /></AuthenticationRoute>} path="/register" />
            <Route element={<AuthenticationRoute><LoginPage /></AuthenticationRoute>} path="/login" />
            <Route element={<DonorDirectoryRoute />} path="/donors" />
            <Route element={<DonorProfileRoute />} path="/donors/:id" />
            <Route element={<DonorExperiencesRoute />} path="/donor-experiences" />
            <Route element={<BlogRoute><BloodRequestsPage /></BlogRoute>} path="/blood-requests" />
            <Route element={<BlogRoute><BlogPage /></BlogRoute>} path="/blog" />
            <Route element={<BlogRoute><BlogDetailsPage /></BlogRoute>} path="/blog/:slug" />
            <Route element={<TopDonorsRoute />} path="/top-donors" />
            <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
              <Route element={<AppLayout><Navbar /><AdminDashboardPage /></AppLayout>} path="/admin" />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<UserProfileRoute />} path="/profile" />
              <Route element={<Navigate replace to="/profile" />} path="/dashboard" />
            </Route>
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
