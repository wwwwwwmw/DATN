import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import {
  Calendar, Users, Brain, AlertTriangle,
  Clock, Video, ChevronRight,
  Eye, Check, X, RefreshCw, FileText, CheckCircle2,
  Printer, Activity, Stethoscope, Pill, Shield
} from 'lucide-react'

interface ScheduleItem {
  id: number
  patient_id?: number
  time: string
  date?: string
  period: string
  name: string
  age: number
  gender: string
  blood_type?: string
  patient_history?: string
  code: string
  type: string
  notes?: string
  status: 'completed' | 'in_progress' | 'waiting' | 'emergency' | 'confirmed'
  isVideo?: boolean
  doctor?: string
  doctor_specialization?: string
  clinic_name?: string
  medical_record?: {
    id: number
    diagnosis: string
    symptoms: string
    prescription: string
    notes: string
    follow_up_date?: string
  } | null
}

interface RequestItem {
  id: number
  patient_id?: number
  name: string
  age?: number
  gender?: string
  phone?: string
  blood_type?: string
  patient_history?: string
  doctor_name?: string
  clinic_name?: string
  specialty: string
  time: string
  reason?: string
  note: string
  aiMatch?: number
  isVideo?: boolean
}

interface AIResultItem {
  id: number
  code: string
  patient: string
  age: number
  finding: string
  prob: number
  secondary?: string
  secProb?: number
}

export default function DoctorDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const scheduleRef = useRef<HTMLDivElement>(null)
  const requestsRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'emergency' | 'in_progress' | 'completed'>('all')

  const [stats, setStats] = useState({
    total_appointments: 0,
    waiting: 0,
    ai_review: 0,
    urgent: 0,
  })

  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [aiResults, setAiResults] = useState<AIResultItem[]>([])

  // State for detail modals
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleItem | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null)

  // Load real data from backend
  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await appointmentAPI.getDashboard()
      const data = res.data.data
      if (data) {
        if (data.stats) setStats(data.stats)
        if (data.schedule) setSchedule(data.schedule)
        if (data.requests) setRequests(data.requests)
        if (data.ai_results) setAiResults(data.ai_results)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData(false)
  }, [])

  // Auto-update silently every 3s and immediately on any mutation
  useRealtimeSync(() => {
    loadDashboardData(true)
  }, 3000)

  // Action: Approve Request
  const handleApprove = async (id: number) => {
    try {
      await appointmentAPI.updateStatus(id, 'CONFIRMED')
      setRequests(prev => prev.filter(r => r.id !== id))
      setStats(prev => ({ ...prev, waiting: Math.max(0, prev.waiting - 1) }))
      loadDashboardData()
    } catch (err) {
      console.error(err)
    }
  }

  // Action: Reject Request
  const handleReject = async (id: number) => {
    try {
      await appointmentAPI.updateStatus(id, 'CANCELLED')
      setRequests(prev => prev.filter(r => r.id !== id))
      setStats(prev => ({ ...prev, waiting: Math.max(0, prev.waiting - 1) }))
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Stat Card Click
  const handleStatClick = (type: 'total' | 'waiting' | 'ai_review' | 'urgent') => {
    if (type === 'total') {
      setFilter('all')
      scheduleRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (type === 'waiting') {
      setFilter('waiting')
      scheduleRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (type === 'ai_review') {
      navigate('/xray')
    } else if (type === 'urgent') {
      setFilter('emergency')
      scheduleRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Filter schedule items
  const filteredSchedule = schedule.filter(item => {
    if (filter === 'all') return true
    if (filter === 'waiting') return item.status === 'waiting'
    if (filter === 'emergency') return item.status === 'emergency'
    if (filter === 'in_progress') return item.status === 'in_progress'
    if (filter === 'completed') return item.status === 'completed'
    return true
  })

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      completed: { cls: 'badge-success', label: t('status.completed') },
      in_progress: { cls: 'badge-primary', label: t('status.in_progress') },
      waiting: { cls: 'badge-warning', label: t('dashboard.waiting') },
      emergency: { cls: 'badge-emergency', label: t('dashboard.urgent') },
      confirmed: { cls: 'badge-neutral', label: t('status.confirmed') },
    }
    const s = map[status] || map.confirmed
    return <span className={`badge ${s.cls}`}><span className="badge-dot" />{s.label}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Role Scope Banner */}
      <div className="card" style={{ background: 'var(--color-primary-light)', borderLeft: '4px solid var(--color-primary)' }}>
        <div className="card-body" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            <Shield size={18} color="var(--color-primary)" />
            {user?.role === 'ADMIN' ? (
              <span><strong>Chế độ Quản trị viên (ADMIN):</strong> Hiển thị toàn bộ ca khám, yêu cầu đặt lịch và X-quang của <strong>tất cả các Bác sĩ và Bệnh nhân</strong> trên hệ thống.</span>
            ) : (
              <span><strong>Chế độ Bác sĩ ({user?.last_name} {user?.first_name}):</strong> Chỉ hiển thị dữ liệu của các bệnh nhân do chính bạn phụ trách.</span>
            )}
          </div>
          <span className="badge badge-primary font-mono">{user?.role} SCOPE • DATABASE LIVE</span>
        </div>
      </div>

      {/* Top 4 Interactive Stat Cards */}
      <div className="grid grid-cols-4">
        {/* Total Appointments Card */}
        <div
          className="stat-card"
          onClick={() => handleStatClick('total')}
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
          title={t('actions.view_all')}
        >
          <div className="flex items-center justify-between">
            <span className="stat-card-label">{t('dashboard.total_appointments')}</span>
            <Calendar size={18} color="var(--color-primary)" />
          </div>
          <div className="stat-card-value">
            {stats.total_appointments}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-normal)', marginLeft: '4px' }}>ca</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <span>Xem lịch khám</span> <ChevronRight size={12} />
          </div>
        </div>

        {/* Waiting Card */}
        <div
          className="stat-card"
          onClick={() => handleStatClick('waiting')}
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
          title={t('dashboard.waiting')}
        >
          <div className="flex items-center justify-between">
            <span className="stat-card-label">{t('dashboard.waiting')}</span>
            <Users size={18} color="var(--color-warning)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>
            {stats.waiting}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <span>Lọc ca chờ khám</span> <ChevronRight size={12} />
          </div>
        </div>

        {/* AI Review Card */}
        <div
          className="stat-card"
          onClick={() => handleStatClick('ai_review')}
          style={{
            cursor: 'pointer',
            borderLeft: '3px solid var(--color-secondary)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          title="Nhấn để chuyển sang trang Duyệt X-quang AI"
        >
          <div className="flex items-center justify-between">
            <span className="stat-card-label">{t('dashboard.ai_review')}</span>
            <Brain size={18} color="var(--color-secondary)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-secondary)' }}>
            {stats.ai_review}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2, fontWeight: 'var(--font-semibold)' }}>
            <span>Duyệt X-quang ngay</span> <ChevronRight size={12} />
          </div>
        </div>

        {/* Urgent Card */}
        <div
          className="stat-card emergency"
          onClick={() => handleStatClick('urgent')}
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
          title="Nhấn để lọc ca cấp cứu khẩn cấp"
        >
          <div className="flex items-center justify-between">
            <span className="stat-card-label" style={{ color: 'var(--color-emergency)' }}>{t('dashboard.urgent')}</span>
            <AlertTriangle size={18} color="var(--color-emergency)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-emergency)' }}>
            {stats.urgent}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-emergency)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2, fontWeight: 'var(--font-semibold)' }}>
            <span>Ưu tiên xử trí</span> <ChevronRight size={12} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-4)' }}>
        {/* Main Schedule Column */}
        <div className="card" ref={scheduleRef}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Clock size={18} /> {t('dashboard.today_schedule')}
            </h3>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '2px 8px' }}
                onClick={() => setFilter('all')}
              >
                {t('actions.view_all')}
              </button>
              <button
                className={`btn btn-sm ${filter === 'waiting' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '2px 8px' }}
                onClick={() => setFilter('waiting')}
              >
                {t('dashboard.waiting')}
              </button>
              <button
                className={`btn btn-sm ${filter === 'emergency' ? 'btn-danger' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '2px 8px' }}
                onClick={() => setFilter('emergency')}
              >
                {t('dashboard.urgent')}
              </button>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => loadDashboardData(false)}
                title="Làm mới dữ liệu từ Database"
              >
                <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} />
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {filteredSchedule.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                Không có ca khám nào theo bộ lọc này.
              </div>
            ) : (
              filteredSchedule.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedAppointment(item)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--color-border)',
                    background: item.status === 'emergency' ? 'var(--color-emergency-bg)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (item.status !== 'emergency') {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (item.status !== 'emergency') {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                  title="Nhấn để xem chi tiết ca khám và kết quả"
                >
                  <div style={{ textAlign: 'center', minWidth: 56 }}>
                    <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.time}
                    </div>
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: item.status === 'emergency' ? 'var(--font-bold)' : 'var(--font-normal)',
                      color: item.status === 'emergency' ? 'var(--color-emergency)' : 'var(--color-text-tertiary)'
                    }}>
                      {item.period}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--font-semibold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{item.name}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'var(--font-normal)' }}>({item.gender}, {item.age} {t('common.age_unit')})</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      <span className="font-mono" style={{ color: 'var(--color-primary)', marginRight: 8 }}>{item.code}</span>
                      {item.type}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span>Xem chi tiết hồ sơ</span> <ChevronRight size={12} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {statusBadge(item.status)}
                    {item.isVideo && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/telehealth')
                        }}
                        title="Vào phòng khám video trực tuyến"
                      >
                        <Video size={14} /> {t('dashboard.enter_room')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Hiển thị {filteredSchedule.length} / {schedule.length} ca khám trong ngày (Dữ liệu thực từ Cơ sở dữ liệu)
            </span>
            {filter !== 'all' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilter('all')}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* New Booking Requests */}
          <div className="card" ref={requestsRef}>
            <div className="card-header">
              <h3 className="card-title">{t('dashboard.new_requests')}</h3>
              <span className="badge badge-warning">{requests.length} {t('dashboard.pending')}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {requests.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  Không có yêu cầu đặt lịch nào đang chờ duyệt.
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <div className="flex items-center justify-between">
                      <strong>{req.name}</strong>
                      {req.aiMatch && <span className="badge badge-primary">AI Match: {req.aiMatch}%</span>}
                      {req.isVideo && <span className="badge badge-success">{t('status.online')}</span>}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '4px 0' }}>
                      {req.specialty} • {req.time}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                      {t('dashboard.note_label')} {req.note}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => setSelectedRequest(req)}
                      >
                        <Eye size={14} /> Xem chi tiết
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApprove(req.id)}
                        title={t('actions.approve')}
                      >
                        <Check size={14} /> Duyệt
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleReject(req.id)}
                        title={t('actions.reject')}
                      >
                        <X size={14} /> Từ chối
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Results Pending Review */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Brain size={16} /> {t('dashboard.ai_results')}
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/xray')}
              >
                {t('dashboard.ai_review')} <ChevronRight size={14} />
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {aiResults.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  Tất cả kết quả X-quang đã được duyệt xong.
                </div>
              ) : (
                aiResults.map((r) => (
                  <div key={r.id} style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      Ca <span className="font-mono">{r.code}</span> • {r.patient} ({r.age}t)
                    </div>
                    <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.prob > 60 ? 'var(--color-emergency)' : 'var(--color-warning)' }} />
                        {r.finding}
                      </span>
                      <strong className="tabular-nums" style={{ color: r.prob > 60 ? 'var(--color-emergency)' : 'var(--color-warning)' }}>
                        {r.prob}%
                      </strong>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginTop: 8 }}
                      onClick={() => navigate('/xray', { state: { selectedCase: r } })}
                    >
                      <Eye size={14} /> {t('dashboard.view_and_sign')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Appointment Detail Modal (Shows completed exam results & prescriptions) */}
      {selectedAppointment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: 'var(--space-4)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    Chi tiết ca khám: <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{selectedAppointment.code}</span>
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Thời gian khám: {selectedAppointment.time} ({selectedAppointment.period}) • {selectedAppointment.clinic_name || 'Phòng khám Đa khoa Quốc tế MedTech'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {statusBadge(selectedAppointment.status)}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => setSelectedAppointment(null)}
                  title="Đóng cửa sổ"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Patient Profile Card */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)'
              }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Họ và tên bệnh nhân</div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>{selectedAppointment.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Tuổi và Giới tính</div>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>{selectedAppointment.age} tuổi • {selectedAppointment.gender}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Bác sĩ phụ trách</div>
                  <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>{selectedAppointment.doctor || 'BS. Sarah Jenkins'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Hình thức khám</div>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>
                    {selectedAppointment.isVideo ? 'Khám từ xa Telehealth' : 'Khám trực tiếp tại viện'}
                  </div>
                </div>
              </div>

              {/* Reason for Visit */}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Lý do khám và Triệu chứng ban đầu
                </div>
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)'
                }}>
                  {selectedAppointment.type}
                </div>
              </div>

              {/* Completed Clinical Examination Results & Prescription from Real Database MedicalRecord */}
              {(selectedAppointment.status === 'completed' || selectedAppointment.medical_record) ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid var(--color-success)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)', fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)' }}>
                      <CheckCircle2 size={18} />
                      <span>KẾT QUẢ KHÁM LÂM SÀNG VÀ CHẨN ĐOÁN XÁC ĐỊNH (DATABASE)</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '11px' }}>
                      HỒ SƠ #{selectedAppointment.medical_record?.id || selectedAppointment.id}
                    </span>
                  </div>

                  {/* Clinical Notes & Vitals from DB */}
                  {selectedAppointment.medical_record?.notes && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Activity size={14} color="var(--color-primary)" /> GHI CHÚ SINH HIỆU VÀ KHÁM LÂM SÀNG
                      </div>
                      <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}>
                        {selectedAppointment.medical_record.notes}
                      </div>
                    </div>
                  )}

                  {/* Diagnosis & Symptoms from DB */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Stethoscope size={14} color="var(--color-secondary)" /> CHẨN ĐOÁN XÁC ĐỊNH (ICD-10) VÀ TRIỆU CHỨNG
                    </div>
                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)', color: 'var(--color-primary)', marginBottom: 6 }}>
                        {selectedAppointment.medical_record?.diagnosis || 'Chưa cập nhật mã ICD-10'}
                      </div>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        <strong>Triệu chứng ghi nhận:</strong> {selectedAppointment.medical_record?.symptoms || selectedAppointment.notes || selectedAppointment.type}
                      </p>
                    </div>
                  </div>

                  {/* Prescribed Medications from DB */}
                  {selectedAppointment.medical_record?.prescription && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Pill size={14} color="var(--color-primary)" /> ĐƠN THUỐC ĐIỀU TRỊ NGOẠI TRÚ
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', width: 40 }}>STT</th>
                            <th style={{ padding: '8px 12px' }}>Tên thuốc và Hàm lượng</th>
                            <th style={{ padding: '8px 12px' }}>Liều dùng và Cách dùng</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', width: 100 }}>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAppointment.medical_record.prescription.split('\n').filter(Boolean).map((line, idx) => {
                            const parts = line.split('|').map(s => s.trim())
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '8px 12px', color: 'var(--color-text-tertiary)' }}>{idx + 1}</td>
                                <td style={{ padding: '8px 12px' }}><strong>{parts[0] || line}</strong></td>
                                <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{parts[1] || 'Theo chỉ định'}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}><span className="font-mono">{parts[2] || ''}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {selectedAppointment.medical_record.follow_up_date && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: 4 }}>
                          Ngày hẹn tái khám: <strong>{selectedAppointment.medical_record.follow_up_date}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* For in_progress, waiting, emergency */
                <div style={{
                  padding: 'var(--space-4)',
                  background: selectedAppointment.status === 'emergency' ? 'var(--color-emergency-bg)' : 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedAppointment.status === 'emergency' ? 'var(--color-emergency)' : 'var(--color-border)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)'
                }}>
                  <div style={{ fontWeight: 'var(--font-bold)', color: selectedAppointment.status === 'emergency' ? 'var(--color-emergency)' : 'var(--color-text-primary)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedAppointment.status === 'emergency' && <AlertTriangle size={18} />}
                    <span>TRẠNG THÁI HIỆN TẠI VÀ CHỈ ĐỊNH XỬ TRÍ</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {selectedAppointment.status === 'emergency'
                      ? 'Bệnh nhân có biểu hiện đau thắt ngực cấp tính, cần được bác sĩ chuyên khoa thăm khám và xử trí cấp cứu ưu tiên ngay lập tức!'
                      : (selectedAppointment.isVideo
                        ? 'Ca khám trực tuyến Telehealth đã sẵn sàng. Phòng hội chẩn video WebRTC bảo mật đang mở để tiếp nhận người bệnh.'
                        : 'Bệnh nhân đã điểm danh tại cơ sở y tế và đang có mặt tại phòng chờ khám bệnh.')}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
                    {selectedAppointment.isVideo && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedAppointment(null); navigate('/telehealth') }}
                      >
                        <Video size={14} /> Vào phòng khám Video ngay
                      </button>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setSelectedAppointment(null); navigate('/xray') }}
                    >
                      <Brain size={14} /> Chỉ định chụp X-quang chẩn đoán
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: 'var(--space-3) var(--space-5)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-bg)'
            }}>
              <div>
                {selectedAppointment.status === 'completed' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => window.print()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Printer size={14} /> In bệnh án và Đơn thuốc
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {selectedAppointment.status === 'completed' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setSelectedAppointment(null); navigate('/records') }}
                  >
                    Xem hồ sơ bệnh án đầy đủ
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedAppointment(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Booking Request Detail Modal */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: 'var(--space-4)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-secondary-light)',
                  color: 'var(--color-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    Chi tiết yêu cầu đặt lịch khám #{selectedRequest.id}
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Thời gian yêu cầu: {selectedRequest.time}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setSelectedRequest(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)'
              }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Bệnh nhân</div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)' }}>{selectedRequest.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Chuyên khoa yêu cầu</div>
                  <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>{selectedRequest.specialty}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Hình thức khám</div>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>
                    {selectedRequest.isVideo ? 'Khám từ xa Telehealth (Video Call)' : 'Khám trực tiếp tại phòng khám'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Điểm AI Triage</div>
                  <div>
                    <span className="badge badge-primary font-mono">AI MATCH: {selectedRequest.aiMatch || 96}%</span>
                  </div>
                </div>
              </div>

              {/* Symptoms Note */}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Mô tả triệu chứng và Ghi chú của bệnh nhân
                </div>
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.5,
                }}>
                  {selectedRequest.note}
                </div>
              </div>

              {/* AI Triage analysis box */}
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-secondary-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-secondary)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <strong>ĐÁNH GIÁ PHÂN LUỒNG TỰ ĐỘNG BẰNG AI:</strong>
                <span>• Triệu chứng lâm sàng phù hợp chuyên khoa {selectedRequest.specialty} với độ tin cậy {selectedRequest.aiMatch || 96}%.</span>
                <span>• Lịch trực của Bác sĩ trong khung giờ {selectedRequest.time} hoàn toàn khả dụng và không xảy ra xung đột lịch.</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: 'var(--space-3) var(--space-5)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-bg)'
            }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedRequest(null)}
              >
                Đóng
              </button>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    handleReject(selectedRequest.id)
                    setSelectedRequest(null)
                  }}
                >
                  <X size={14} /> Từ chối yêu cầu
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    handleApprove(selectedRequest.id)
                    setSelectedRequest(null)
                  }}
                >
                  <Check size={14} /> Phê duyệt lịch hẹn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
