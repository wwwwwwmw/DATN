import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { notificationAPI } from '../services/api'
import {
  Search, Bell, LogOut, Globe, CheckCheck,
  Calendar, Brain, AlertTriangle, Shield, Video, Info
} from 'lucide-react'

interface NotificationItem {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  related_object_type?: string
  related_object_id?: number
  created_at: string
}

export default function Header() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.list()
      const data = res.data.data || res.data || []
      setNotifications(Array.isArray(data) ? data : (data.results || []))
    } catch {
      // Fallback or silently handle
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await notificationAPI.markRead(notif.id)
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      } catch (err) {
        console.error(err)
      }
    }

    setIsOpen(false)

    // Navigate to corresponding screen based on type or related_object_type
    const rel = notif.related_object_type?.toLowerCase() || ''
    const titleLower = notif.title.toLowerCase()
    const type = notif.type?.toUpperCase()

    if (rel === 'xray' || type === 'XRAY_RESULT' || titleLower.includes('x-quang') || titleLower.includes('xray')) {
      navigate('/xray')
    } else if (rel === 'telehealth' || titleLower.includes('telehealth') || titleLower.includes('video')) {
      navigate('/telehealth')
    } else if (rel === 'appointment' || type === 'APPOINTMENT') {
      if (user?.role === 'PATIENT') {
        navigate('/booking')
      } else {
        navigate('/')
      }
    } else if (titleLower.includes('bảo hiểm') || titleLower.includes('vneid') || rel === 'system') {
      navigate('/settings')
    }
  }

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(next)
  }

  const getNotificationIcon = (type: string, title: string) => {
    const tLower = title.toLowerCase()
    if (tLower.includes('cấp cứu') || tLower.includes('khẩn')) {
      return <AlertTriangle size={18} color="var(--color-emergency)" />
    }
    if (type === 'XRAY_RESULT' || tLower.includes('x-quang')) {
      return <Brain size={18} color="var(--color-secondary)" />
    }
    if (tLower.includes('telehealth') || tLower.includes('video')) {
      return <Video size={18} color="var(--color-primary)" />
    }
    if (type === 'APPOINTMENT' || tLower.includes('lịch')) {
      return <Calendar size={18} color="var(--color-primary)" />
    }
    if (type === 'SYSTEM') {
      return <Shield size={18} color="var(--color-success)" />
    }
    return <Info size={18} color="var(--color-primary)" />
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'U'

  return (
    <header className="app-header">
      <div className="header-search">
        <Search size={16} className="header-search-icon" />
        <input type="text" placeholder={t('actions.search')} />
      </div>

      <div className="header-actions">
        {/* Language Switch Button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleLang}
          title={t('actions.switch_language')}
          style={{ gap: '4px' }}
        >
          <Globe size={16} />
          {i18n.language === 'vi' ? 'VI' : 'EN'}
        </button>

        {/* Notifications Button and Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="btn btn-ghost btn-icon notification-btn"
            onClick={() => setIsOpen(!isOpen)}
            title={i18n.language === 'vi' ? 'Thông báo hệ thống' : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {isOpen && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Bell size={16} color="var(--color-primary)" />
                  <strong style={{ fontSize: 'var(--text-sm)' }}>
                    {i18n.language === 'vi' ? 'Thông báo hệ thống' : 'System Notifications'}
                  </strong>
                  {unreadCount > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {unreadCount} {i18n.language === 'vi' ? 'mới' : 'new'}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleMarkAllRead}
                    style={{ fontSize: '11px', padding: '2px 6px', gap: 4 }}
                  >
                    <CheckCheck size={13} />
                    {i18n.language === 'vi' ? 'Đọc tất cả' : 'Mark all read'}
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                    {i18n.language === 'vi' ? 'Không có thông báo nào' : 'No notifications'}
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        {getNotificationIcon(notif.type, notif.title)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: notif.is_read ? 'var(--font-normal)' : 'var(--font-bold)',
                          color: 'var(--color-text-primary)',
                          marginBottom: 2
                        }}>
                          {notif.title}
                        </div>
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                          {notif.created_at ? new Date(notif.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                      {!notif.is_read && (
                        <div style={{
                          width: 8, height: 8,
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          marginTop: 6,
                          flexShrink: 0
                        }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="header-user">
          <div className="header-user-info">
            <span className="header-user-name">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="header-user-role">
              {user?.role === 'DOCTOR' ? t('auth.doctor') : user?.role === 'PATIENT' ? t('auth.patient') : user?.role}
            </span>
          </div>
          <div className="header-avatar">{initials}</div>
        </div>

        {/* Logout */}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={logout} title={t('actions.logout')}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
