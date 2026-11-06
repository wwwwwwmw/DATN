import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import {
  MessageCircle, Calendar, Video, Image, FileText,
  MapPin, Settings
} from 'lucide-react'

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  useAuth() // ensure auth context available

  const clinicalLinks = [
    { to: '/chat', icon: <MessageCircle size={18} />, label: t('nav.chat_ai') },
    { to: '/booking', icon: <Calendar size={18} />, label: t('nav.smart_booking') },
    { to: '/telehealth', icon: <Video size={18} />, label: t('nav.telehealth') },
    { to: '/xray', icon: <Image size={18} />, label: t('nav.xray_analysis') },
    { to: '/records', icon: <FileText size={18} />, label: t('nav.medical_records') },
    { to: '/map', icon: <MapPin size={18} />, label: t('nav.clinic_map') },
  ]

  const systemLinks = [
    { to: '/settings', icon: <Settings size={18} />, label: t('nav.settings') },
  ]

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <aside className="app-sidebar">
      <Link to="/" className="sidebar-brand" style={{ textDecoration: 'none' }}>
        <div className="sidebar-brand-icon">M+</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">{t('app_name')}</span>
          <span className="sidebar-brand-sub">{t('app_subtitle')}</span>
        </div>
      </Link>

      <div className="sidebar-section">
        <div className="sidebar-section-title">{t('nav.clinical')}</div>
        <nav className="sidebar-nav">
          {clinicalLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">{t('nav.system')}</div>
        <nav className="sidebar-nav">
          {systemLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="sidebar-status-dot"></span>
          {t('status.system_ready')} &bull; v2.4-MED
        </div>
      </div>
    </aside>
  )
}