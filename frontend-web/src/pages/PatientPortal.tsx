import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { appointmentAPI, medicalRecordAPI, xrayAPI, authAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import {
  Calendar, Image, MessageCircle, QrCode, Pill,
  Video, FileText, Download, Shield, RefreshCw
} from 'lucide-react'

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

export default function PatientPortal() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [medicalRecords, setMedicalRecords] = useState<any[]>([])
  const [xrayResults, setXrayResults] = useState<any[]>([])

  const loadPatientData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [profRes, appRes, mrRes, xrayRes] = await Promise.all([
        authAPI.getProfile().catch(() => null),
        appointmentAPI.list().catch(() => null),
        medicalRecordAPI.list().catch(() => null),
        xrayAPI.results().catch(() => null),
      ])
      if (profRes?.data) {
        setProfile(profRes.data.data || profRes.data)
      }
      setAppointments(extractList(appRes))
      setMedicalRecords(extractList(mrRes))
      setXrayResults(extractList(xrayRes))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadPatientData(false)
  }, [])

  useRealtimeSync(() => {
    loadPatientData(true)
  }, 3000)

  const quickServices = [
    { icon: <Calendar size={28} />, title: t('nav.smart_booking'), desc: t('features.smart_booking_desc'), link: '/booking', color: '#0F52BA', badge: 'AI' },
    { icon: <Image size={28} />, title: t('nav.xray_analysis'), desc: t('features.xray_desc'), link: '/xray', color: '#0D9488', badge: 'CheXNet V4' },
    { icon: <MessageCircle size={28} />, title: t('nav.chat_ai'), desc: t('features.chat_desc'), link: '/chat', color: '#7C3AED', badge: '24/7' },
  ]

  const upcomingAppt = appointments.find(a => a.status === 'PENDING' || a.status === 'CONFIRMED') || appointments[0] || null
  const patientCode = user?.id ? `#BN-${10000 + user.id}` : '#BN-10000'
  const patDetails = profile?.profile || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Welcome Header with Real Patient Info from DB */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="header-avatar" style={{ width: 56, height: 56, fontSize: 'var(--text-xl)' }}>
              {user?.first_name?.[0] || 'B'}{user?.last_name?.[0] || 'N'}
            </div>
            <div>
              <h2 style={{ marginBottom: 4 }}>
                {t('dashboard.greeting')}, {user?.last_name} {user?.first_name}
              </h2>
              <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-success">{t('dashboard.verified_badge')}</span>
                <span className="font-mono">{patientCode}</span>
                {patDetails.blood_type && <span className="badge badge-primary">Nhóm máu: {patDetails.blood_type}</span>}
                {patDetails.date_of_birth && <span>Ngày sinh: {patDetails.date_of_birth}</span>}
                {patDetails.address && <span>• {patDetails.address}</span>}
              </div>
              {patDetails.medical_history && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  Tiền sử y tế: <strong>{patDetails.medical_history}</strong>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => loadPatientData(false)} title="Làm mới dữ liệu từ Database">
              <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} /> Làm mới
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings')}>
              <QrCode size={14} /> {t('dashboard.qr_code')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/records')}>
              <Pill size={14} /> {t('dashboard.request_medicine')}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Services */}
      <div className="grid grid-cols-3">
        {quickServices.map((svc, i) => (
          <Link key={i} to={svc.link} className="card" style={{ textDecoration: 'none', transition: 'all var(--transition-base)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: svc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  {svc.icon}
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{svc.badge}</span>
              </div>
              <h4 style={{ marginBottom: 4, color: 'var(--color-text-primary)' }}>{svc.title}</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{svc.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Real Appointments of Logged-In Patient */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Calendar size={18} /> {t('dashboard.upcoming_appointment')} ({appointments.length} lịch hẹn của bạn)</h3>
          {upcomingAppt && (
            <span className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              Mã ca hẹn: #BA-{1000 + upcomingAppt.id}
            </span>
          )}
        </div>
        <div className="card-body">
          {!upcomingAppt ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
              <p style={{ marginBottom: 'var(--space-3)' }}>Hiện tại bạn chưa có lịch hẹn khám nào trong cơ sở dữ liệu.</p>
              <Link to="/booking" className="btn btn-primary btn-sm">
                <Calendar size={14} /> Đặt lịch khám mới ngay
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
              <div>
                <span className={`badge ${upcomingAppt.status === 'COMPLETED' ? 'badge-success' : upcomingAppt.status === 'CONFIRMED' ? 'badge-primary' : 'badge-warning'}`} style={{ marginBottom: 'var(--space-3)' }}>
                  <span className="badge-dot" /> Ngày {upcomingAppt.date} • {String(upcomingAppt.start_time || '').slice(0, 5)} - {String(upcomingAppt.end_time || '').slice(0, 5)} ({upcomingAppt.status})
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <Video size={14} /> {upcomingAppt.reason || 'Khám chuyên khoa'}
                </div>
                {upcomingAppt.notes && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                    Ghi chú: {upcomingAppt.notes}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('dashboard.attending_doctor')}</div>
                    <div style={{ fontWeight: 'var(--font-semibold)', marginTop: 2 }}>BS. {upcomingAppt.doctor_name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{upcomingAppt.doctor_specialization}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('dashboard.facility')}</div>
                    <div style={{ fontWeight: 'var(--text-semibold)', marginTop: 2 }}>{upcomingAppt.clinic_name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{upcomingAppt.clinic_address || 'Cơ sở y tế trực thuộc MedTech'}</div>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', textAlign: 'center' }}>
                <span className="badge badge-success" style={{ marginBottom: 'var(--space-3)' }}>
                  <span className="badge-dot" /> {t('dashboard.room_ready')}
                </span>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', margin: 'var(--space-3) 0' }}>
                  <Link to="/telehealth" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    <Video size={14} /> {t('dashboard.join_video')}
                  </Link>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>
                  {t('dashboard.video_note')}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Link to="/records" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Xem bệnh án</Link>
                  <Link to="/booking" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>{t('dashboard.reschedule')}</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real Medical Records of Logged-In Patient */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><FileText size={18} /> {t('dashboard.history_title')} ({medicalRecords.length} hồ sơ bệnh án của bạn)</h3>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Download size={14} /> {t('actions.export_pdf')}
          </button>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {medicalRecords.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              Chưa có hồ sơ bệnh án nào cho tài khoản của bạn.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('dashboard.exam_date')}</th>
                  <th>{t('dashboard.facility_doctor')}</th>
                  <th>{t('dashboard.diagnosis')}</th>
                  <th>{t('dashboard.icd_code')}</th>
                  <th>{t('dashboard.prescription')}</th>
                </tr>
              </thead>
              <tbody>
                {medicalRecords.map((record) => {
                  const rawDiag = record.diagnosis || ''
                  const icdMatch = rawDiag.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*-\s*(.+)/)
                  const icdCode = icdMatch ? icdMatch[1] : 'ICD-10'
                  const diagText = icdMatch ? icdMatch[2] : rawDiag
                  return (
                    <tr
                      key={record.id}
                      onClick={() => navigate('/records', { state: { recordId: record.id } })}
                      style={{ cursor: 'pointer' }}
                      title="Nhấn để mở chi tiết hồ sơ bệnh án"
                    >
                      <td>
                        <div style={{ fontWeight: 'var(--font-semibold)', fontVariantNumeric: 'tabular-nums' }}>
                          {record.appointment_date || (record.created_at ? record.created_at.slice(0, 10) : '')}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                          {record.appointment_time || ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 'var(--font-medium)' }}>{record.doctor_specialization || 'Chuyên khoa'}</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>BS. {record.doctor_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{record.clinic_name}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 'var(--font-medium)' }}>{diagText}</div>
                        {record.symptoms && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                            Triệu chứng: {record.symptoms}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="font-mono badge badge-primary" style={{ fontWeight: 'var(--font-bold)' }}>{icdCode}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--text-sm)', whiteSpace: 'pre-line' }}>
                          {(record.prescription || '').split('\n').map((l: string) => l.split('|')[0]).join(', ')}
                        </div>
                        <span className="badge badge-success" style={{ marginTop: 4 }}>Đã ký số Bác sĩ</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Shield size={12} /> {t('patient.medical_auth_note')}
            </span>
            <span>Kết quả X-quang của bạn: <strong>{xrayResults.length}</strong> bản ghi (<Link to="/xray">Xem X-quang</Link>)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
