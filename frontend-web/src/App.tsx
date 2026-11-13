import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import './i18n'

// Lazy-loaded pages for high-speed performance and optimal bundle splitting
const Login = lazy(() => import('./pages/Login'))
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'))
const PatientPortal = lazy(() => import('./pages/PatientPortal'))
const ChatAI = lazy(() => import('./pages/ChatAI'))
const SmartBooking = lazy(() => import('./pages/SmartBooking'))
const XrayAnalysis = lazy(() => import('./pages/XrayAnalysis'))
const ClinicMap = lazy(() => import('./pages/ClinicMap'))
const MedicalRecords = lazy(() => import('./pages/MedicalRecords'))
const Telehealth = lazy(() => import('./pages/Telehealth'))
const Settings = lazy(() => import('./pages/Settings'))

function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--color-primary, #0284c7)',
        fontSize: 'var(--text-sm, 14px)',
        fontWeight: 600,
        gap: 10,
      }}
    >
      <span className="loading-spinner" />
      <span>Đang tải nội dung...</span>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (user?.role === 'DOCTOR' || user?.role === 'ADMIN') {
    return <DoctorDashboard />
  }
  return <PatientPortal />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<DashboardRedirect />} />
          <Route path="/chat" element={<ChatAI />} />
          <Route path="/booking" element={<SmartBooking />} />
          <Route path="/xray" element={<XrayAnalysis />} />
          <Route path="/map" element={<ClinicMap />} />
          <Route path="/records" element={<MedicalRecords />} />
          <Route path="/telehealth" element={<Telehealth />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
