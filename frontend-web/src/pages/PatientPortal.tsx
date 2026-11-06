import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
  Calendar, Image, MessageCircle, QrCode, Pill,
  Video, FileText,
  Download, Shield
} from 'lucide-react'

export default function PatientPortal() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const quickServices = [
    { icon: <Calendar size={28} />, title: t('nav.smart_booking'), desc: t('features.smart_booking_desc'), link: '/booking', color: '#0F52BA', badge: 'AI' },
    { icon: <Image size={28} />, title: t('nav.xray_analysis'), desc: t('features.xray_desc'), link: '/xray', color: '#0D9488', badge: 'CheXNet V4' },
    { icon: <MessageCircle size={28} />, title: t('nav.chat_ai'), desc: t('features.chat_desc'), link: '/chat', color: '#7C3AED', badge: '24/7' },
  ]

  const upcomingAppointment = {
    date: t('dashboard.today_appointment') + ' - 14:30',
    type: t('dashboard.telehealth_exam'),
    doctor: 'BS. CKI Sarah Jenkins',
    specialty: t('map.specialty_level'),
    clinic: t('map.central_level'),
    room: t('booking.room', { room: '302' }),
    symptoms: t('booking.symptom_placeholder'),
    roomStatus: t('dashboard.room_ready'),
  }

  const medicalHistory = [
    { date: '12/10/2024', time: '08:45', dept: t('telehealth.vitals.hr'), doctor: 'BS. Marc Lindqvist', clinic: 'BV ĐKQT MedTech', diagnosis: 'Viêm phổi không đặc hiệu', icd: 'J18.9', meds: 'Amoxicillin 875mg, Clopidogrel 75mg', insurance: 'BHYT 80%' },
    { date: '28/09/2024', time: '14:15', dept: t('map.specialty_level'), doctor: 'BS. CKI Sarah Jenkins', clinic: 'TT Can thiệp Tim mạch', diagnosis: 'Thiếu máu cơ tim mạn tính', icd: 'I20.8', meds: 'Aspirin 81mg, Metoprolol 25mg', insurance: 'BHYT 80%' },
    { date: '15/08/2024', time: '09:30', dept: 'Khoa Nội tổng quát', doctor: 'BS. Trần Quốc Toản', clinic: 'PK Ngoại trú', diagnosis: 'Tăng huyết áp nguyên phát', icd: 'I10', meds: 'Amlodipine 5mg, Losartan 50mg', insurance: 'BHYT 80%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Welcome Header */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="header-avatar" style={{ width: 56, height: 56, fontSize: 'var(--text-xl)' }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <h2 style={{ marginBottom: 4 }}>{t('dashboard.greeting')}, {user?.first_name} {user?.last_name}</h2>
              <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <span className="badge badge-success">{t('dashboard.verified_badge')}</span>
                <span className="font-mono">BN-77290</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-secondary btn-sm"><QrCode size={14} /> {t('dashboard.qr_code')}</button>
            <button className="btn btn-primary btn-sm"><Pill size={14} /> {t('dashboard.request_medicine')}</button>
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

      {/* Upcoming Appointment */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Calendar size={18} /> {t('dashboard.upcoming_appointment')}</h3>
          <span className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('dashboard.session_id')}: TEL-88912-CARDIO</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
            <div>
              <span className="badge badge-emergency" style={{ marginBottom: 'var(--space-3)' }}>
                <span className="badge-dot" /> {upcomingAppointment.date}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <Video size={14} /> {upcomingAppointment.type}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('dashboard.attending_doctor')}</div>
                  <div style={{ fontWeight: 'var(--font-semibold)', marginTop: 2 }}>{upcomingAppointment.doctor}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{upcomingAppointment.specialty}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('dashboard.facility')}</div>
                  <div style={{ fontWeight: 'var(--font-semibold)', marginTop: 2 }}>{upcomingAppointment.clinic}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{upcomingAppointment.room}</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', textAlign: 'center' }}>
              <span className="badge badge-warning" style={{ marginBottom: 'var(--space-3)' }}>
                <span className="badge-dot" /> {upcomingAppointment.roomStatus}
              </span>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', margin: 'var(--space-3) 0' }}>
                {t('dashboard.join_video')}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>
                {t('dashboard.video_note')}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>{t('dashboard.guide')}</button>
                <Link to="/booking" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>{t('dashboard.reschedule')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><FileText size={18} /> {t('dashboard.history_title')}</h3>
          <button className="btn btn-primary btn-sm"><Download size={14} /> {t('actions.export_pdf')}</button>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
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
              {medicalHistory.map((record, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 'var(--font-semibold)', fontVariantNumeric: 'tabular-nums' }}>{record.date}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{record.time}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'var(--font-medium)' }}>{record.dept}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{record.doctor}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{record.clinic}</div>
                  </td>
                  <td>
                    <div>{record.diagnosis}</div>
                  </td>
                  <td>
                    <span className="font-mono badge badge-primary" style={{ fontWeight: 'var(--font-bold)' }}>{record.icd}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--text-sm)' }}>{record.meds}</div>
                    <span className="badge badge-success" style={{ marginTop: 4 }}>{record.insurance}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            <Shield size={12} /> {t('patient.medical_auth_note')}
          </div>
        </div>
      </div>
    </div>
  )
}
