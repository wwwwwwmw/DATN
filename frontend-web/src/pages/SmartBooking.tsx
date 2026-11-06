import { useState } from 'react'
import { useTranslation } from 'react-i18next'
// import { appointmentAPI, clinicAPI } from '../services/api'
import {
  MapPin, Clock, ChevronRight, ChevronLeft,
  Zap, Shield, CheckCircle
} from 'lucide-react'

export default function SmartBooking() {
  const { t } = useTranslation()
  const [symptoms, setSymptoms] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [radius, setRadius] = useState(5)
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)


  const weights = { wait: 40, distance: 35, experience: 25 }
  const doctors = [
    { id: 1, name: 'BS. CKI Marcus Vance', fitness: 0.042, match: 96, clinic: 'Viện Tim mạch Trung ương', dept: 'Khoa Cấp cứu Can thiệp Mạch vành', exp: 16, distance: 1.8, distTime: `6 ${t('common.minutes')}`, nextSlot: `14:15 ${t('common.today')}`, insurance: '45.000đ', room: 'A204', queue: 3, avatar: 'MV' },
    { id: 2, name: 'BS. CKI Sarah Jenkins', fitness: 0.089, match: 91, clinic: 'Bệnh viện Đa khoa MedTech', dept: 'Khoa Nội Tim mạch', exp: 12, distance: 3.2, distTime: `11 ${t('common.minutes')}`, nextSlot: `15:00 ${t('common.today')}`, insurance: '50.000đ', room: 'B102', queue: 5, avatar: 'SJ' },
    { id: 3, name: 'ThS. BS Trần Quốc Toản', fitness: 0.134, match: 87, clinic: 'Phòng khám Chuyên gia MedTech', dept: 'Chẩn đoán Siêu âm Tim mạch', exp: 19, distance: 2.1, distTime: `8 ${t('common.minutes')}`, nextSlot: `16:30 ${t('common.today')}`, insurance: '60.000đ', room: 'C6-01', queue: 1, avatar: 'TT' },
  ]

  const timeSlots = {
    morning: ['08:30', '09:30', '10:30'],
    afternoon: ['14:15', '15:00', '16:00'],
  }

  const selected = doctors.find(d => d.id === selectedDoctor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* SA Header */}
      <div className="card" style={{ background: 'var(--color-primary-light)' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Zap size={22} />
            </div>
            <div>
              <h3>{t('booking.title')}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {t('booking.subtitle')}
              </p>
            </div>
          </div>
          <span className="badge badge-primary">{t('booking.algorithm_badge')}</span>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">{t('booking.symptom_label')}</label>
            <input className="form-input" placeholder={t('booking.symptom_placeholder')} value={symptoms} onChange={e => setSymptoms(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">{t('booking.specialty_label')}</label>
            <select className="form-input" value={specialty} onChange={e => setSpecialty(e.target.value)}>
              <option value="">{t('booking.specialty_default')}</option>
              <option value="cardiology">Tim mạch</option>
              <option value="respiratory">Hô hấp</option>
              <option value="neurology">Thần kinh</option>
            </select>
          </div>
          <div className="form-group" style={{ width: 180, flexShrink: 0 }}>
            <label className="form-label">{t('booking.max_distance')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input type="range" min={1} max={20} value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ flex: 1, minWidth: 80 }} />
              <span className="tabular-nums" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)', whiteSpace: 'nowrap', minWidth: 42 }}>{radius} km</span>
            </div>
          </div>
        </div>
        <div className="card-footer" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          {t('booking.weights')} <strong>{t('booking.weight_time')} ({weights.wait}%)</strong> &bull; <strong>{t('booking.weight_distance')} ({weights.distance}%)</strong> &bull; <strong>{t('booking.weight_experience')} ({weights.experience}%)</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-4)' }}>
        {/* SA Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3>{t('booking.sa_results_title')}</h3>
          {doctors.map((doc, i) => (
            <div key={doc.id} className="card" style={{
              borderLeft: i === 0 ? '3px solid var(--color-primary)' : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
              background: selectedDoctor === doc.id ? 'var(--color-primary-light)' : undefined,
            }}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <div className="header-avatar" style={{ width: 48, height: 48 }}>{doc.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 'var(--font-semibold)' }}>{doc.name}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{doc.dept}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{doc.clinic} • {doc.exp} {t('common.years_exp')}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {i === 0 && <span className="badge badge-success" style={{ marginBottom: 4 }}>{t('booking.sa_best_match')}</span>}
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('booking.sa_function')}: f(x) = {doc.fitness}</div>
                    <div style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{t('booking.match_score', { score: doc.match })}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {doc.distance} km ({doc.distTime})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {doc.nextSlot}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={12} /> BHYT: {doc.insurance}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <span className="badge badge-neutral">{t('booking.room', { room: doc.room })}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('booking.queue', { count: doc.queue })}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setSelectedDoctor(doc.id)}>
                    {t('actions.choose_time')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="card" style={{ alignSelf: 'flex-start' }}>
          <div className="card-header">
            <h3 className="card-title">{t('booking.time_grid_title')}</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-ghost btn-icon btn-sm"><ChevronLeft size={16} /></button>
              <span className="badge badge-neutral">{t('booking.current_week')}</span>
              <button className="btn btn-ghost btn-icon btn-sm"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {['T2 14/10', 'T3 15/10', 'T4 16/10', 'T5 17/10'].map((day, i) => (
                <div key={i} style={{
                  textAlign: 'center', padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  background: i === 1 ? 'var(--color-primary)' : 'transparent',
                  color: i === 1 ? 'white' : 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)',
                }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
              {t('booking.morning_shift')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {timeSlots.morning.flatMap(time =>
                [0,1,2,3].map(col => {
                  const isSelected = selectedSlot === `${time}-${col}`
                  const isAvailable = Math.random() > 0.3
                  return (
                    <button
                      key={`${time}-${col}`}
                      className="btn btn-sm"
                      style={{
                        background: isSelected ? 'var(--color-primary)' : isAvailable ? 'var(--color-primary-light)' : 'var(--color-neutral-bg)',
                        color: isSelected ? 'white' : isAvailable ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                        opacity: isAvailable ? 1 : 0.5,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(`${time}-${col}`)}
                    >
                      {time}
                    </button>
                  )
                })
              )}
            </div>

            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
              {t('booking.afternoon_shift')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {timeSlots.afternoon.flatMap(time =>
                [0,1,2,3].map(col => {
                  const isSelected = selectedSlot === `pm-${time}-${col}`
                  const isAvailable = Math.random() > 0.2
                  return (
                    <button
                      key={`pm-${time}-${col}`}
                      className="btn btn-sm"
                      style={{
                        background: isSelected ? 'var(--color-primary)' : isAvailable ? 'var(--color-primary-light)' : 'var(--color-neutral-bg)',
                        color: isSelected ? 'white' : isAvailable ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                        opacity: isAvailable ? 1 : 0.5,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(`pm-${time}-${col}`)}
                    >
                      {time}
                    </button>
                  )
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--color-primary)' }} /> {t('booking.legend_selected')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--color-primary-light)' }} /> {t('booking.legend_available')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--color-neutral-bg)', opacity: 0.5 }} /> {t('booking.legend_booked')}</span>
            </div>
          </div>

          {selectedDoctor && selectedSlot && (
            <div className="card-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)', background: 'var(--color-primary-light)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>{selected?.name}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>14:15 {t('common.today')} (15/10)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-lg)' }}>45.000đ</div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                <CheckCircle size={16} /> {t('actions.confirm')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
