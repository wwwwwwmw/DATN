import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientPortal from './pages/PatientPortal'
import ChatAI from './pages/ChatAI'
import SmartBooking from './pages/SmartBooking'
import XrayAnalysis from './pages/XrayAnalysis'
import ClinicMap from './pages/ClinicMap'
import MedicalRecords from './pages/MedicalRecords'
import Telehealth from './pages/Telehealth'
import Settings from './pages/Settings'
import './i18n'

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