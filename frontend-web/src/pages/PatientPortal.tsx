import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { appointmentAPI, medicalRecordAPI, xrayAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import {
  Calendar, Image, MessageCircle,
  Video, FileText, Shield
} from 'lucide-react'

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function isUpcomingAppointment(appt: any): boolean {
  if (!appt) return false
  if (['COMPLETED', 'CANCELLED'].includes(appt.status)) return false
  if (!appt.date) return false

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  if (appt.date > todayStr) return true
  if (appt.date === todayStr) {
    const endTime = appt.end_time || appt.start_time || '23:59:59'
    return endTime > nowTimeStr
  }
  return false
}

export default function PatientPortal() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState<any[]>([])
  const [medicalRecords, setMedicalRecords] = useState<any[]>([])
  const [xrayResults, setXrayResults] = useState<any[]>([])

  const loadPatientData = async () => {
    try {
      const [appRes, mrRes, xrayRes] = await Promise.all([
        appointmentAPI.list().catch(() => null),
        medicalRecordAPI.list().catch(() => null),
        xrayAPI.results().catch(() => null),
      ])
      if (appRes) {
        setAppointments(extractList(appRes))
      }
      if (mrRes) {
        setMedicalRecords(extractList(mrRes))
      }
      if (xrayRes) {
        setXrayResults(extractList(xrayRes))
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadPatientData()
  }, [])

  useRealtimeSync(() => {
    loadPatientData()
  }, 3000)

  const quickServices = [
    { icon: <Calendar size={28} />, title: t('nav.smart_booking'), desc: t('features.smart_booking_desc'), link: '/booking', color: '#0F52BA' },
    { icon: <Image size={28} />, title: t('nav.xray_analysis'), desc: t('features.xray_desc'), link: '/xray', color: '#0D9488' },
    { icon: <MessageCircle size={28} />, title: t('nav.chat_ai'), desc: t('features.chat_desc'), link: '/chat', color: '#7C3AED' },
  ]

  const upcomingAppointments = appointments.filter(a => isUpcomingAppointment(a))
  const pastAppointments = appointments.filter(a => !isUpcomingAppointment(a))

  // Combine past appointments and medical records into history items
  const historyItems = [
    ...pastAppointments.map(a => ({
      id: `appt-${a.id}`,
      date: a.date,
      time: `${String(a.start_time || '').slice(0, 5)} - ${String(a.end_time || '').slice(0, 5)}`,
      doctorName: a.doctor_name,
      doctorSpec: a.doctor_specialization,
      clinicName: a.clinic_name,
      title: a.reason || 'Khám chuyên khoa',
      notes: a.notes || '',
      type: 'APPOINTMENT',
      status: a.status === 'COMPLETED' ? 'Đã hoàn thành' : (a.status === 'CANCELLED' ? 'Đã hủy' : 'Đã diễn ra'),
      statusBadge: a.status === 'COMPLETED' ? 'badge-success' : (a.status === 'CANCELLED' ? 'badge-danger' : 'badge-neutral'),
      recordId: a.medical_record,
    })),
    ...medicalRecords.filter(mr => !pastAppointments.some(a => a.medical_record === mr.id)).map(mr => ({
      id: `mr-${mr.id}`,
      date: mr.appointment_date || (mr.created_at ? mr.created_at.slice(0, 10) : ''),
      time: mr.appointment_time || '',
      doctorName: mr.doctor_name,
      doctorSpec: mr.doctor_specialization || 'Chuyên khoa',
      clinicName: mr.clinic_name,
      title: mr.diagnosis || 'Hồ sơ khám bệnh',
      notes: mr.symptoms ? `Triệu chứng: ${mr.symptoms}` : '',
      type: 'RECORD',
      status: 'Đã có kết luận',
      statusBadge: 'badge-success',
      recordId: mr.id,
    }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Welcome Header */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user?.first_name || 'Avatar'}
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }}
            />
          ) : (
            <div className="header-avatar" style={{ width: 56, height: 56, fontSize: 'var(--text-xl)' }}>
              {user?.first_name?.[0] || 'B'}{user?.last_name?.[0] || 'N'}
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
              {t('dashboard.greeting')}, {user?.last_name} {user?.first_name}
            </h2>
          </div>
        </div>
      </div>

      {/* Quick Services (3 ô không còn badge xám) */}
      <div className="grid grid-cols-3">
        {quickServices.map((svc, i) => (
          <Link key={i} to={svc.link} className="card" style={{ textDecoration: 'none', transition: 'all var(--transition-base)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: svc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  {svc.icon}
                </div>
              </div>
              <h4 style={{ marginBottom: 4, color: 'var(--color-text-primary)' }}>{svc.title}</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{svc.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Real Upcoming Appointments */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Calendar size={18} /> {t('dashboard.upcoming_appointment')} ({upcomingAppointments.length} lịch hẹn sắp tới)
          </h3>
        </div>
        <div className="card-body">
          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
              <p style={{ marginBottom: 'var(--space-3)' }}>Hiện tại bạn không có lịch hẹn khám sắp tới nào.</p>
              <Link to="/booking" className="btn btn-primary btn-sm">
                <Calendar size={14} /> Đặt lịch khám mới ngay
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)', padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 6 }}>
                      <span className={`badge ${appt.status === 'COMPLETED' ? 'badge-success' : appt.status === 'CONFIRMED' ? 'badge-primary' : 'badge-warning'}`}>
                        <span className="badge-dot" /> Ngày {appt.date} • {String(appt.start_time || '').slice(0, 5)} - {String(appt.end_time || '').slice(0, 5)} ({appt.status})
                      </span>
                      <span className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        Mã ca hẹn: #BA-{1000 + appt.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      <Video size={14} /> {appt.reason || 'Khám chuyên khoa'}
                    </div>
                    {appt.notes && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        Ghi chú: {appt.notes}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('dashboard.attending_doctor')}</div>
                        <div style={{ fontWeight: 'var(--font-semibold)', marginTop: 2 }}>BS. {appt.doctor_name}</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{appt.doctor_specialization}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('dashboard.facility')}</div>
                        <div style={{ fontWeight: 'var(--text-semibold)', marginTop: 2 }}>{appt.clinic_name}</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{appt.clinic_address || 'Cơ sở y tế trực thuộc MedTech'}</div>
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Medical History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={18} /> Lịch sử khám
          </h3>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {historyItems.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              Chưa có lịch sử khám nào cho tài khoản của bạn.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian khám</th>
                  <th>Bác sĩ &amp; Bệnh viện</th>
                  <th>Nội dung / Chẩn đoán</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 'var(--font-semibold)', fontVariantNumeric: 'tabular-nums' }}>
                        {item.date}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {item.time}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'var(--font-semibold)' }}>BS. {item.doctorName}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.doctorSpec}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{item.clinicName}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'var(--font-medium)' }}>{item.title}</div>
                      {item.notes && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${item.statusBadge}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                        {item.recordId ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate('/records', { state: { recordId: item.recordId } })}
                          >
                            Xem bệnh án
                          </button>
                        ) : (
                          <Link to="/booking" className="btn btn-ghost btn-sm">
                            Đặt lại khám
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
