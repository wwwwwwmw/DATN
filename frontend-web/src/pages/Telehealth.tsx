import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Video, VideoOff, Mic, MicOff, Phone,
  MessageSquare, Share2, Heart, Activity, Droplets,
  Thermometer, Shield, AlertTriangle, Clock, FileText,

} from 'lucide-react'

export default function Telehealth() {
  const { t } = useTranslation()
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [callTime, setCallTime] = useState(0)
  const [isInCall, setIsInCall] = useState(false)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (isInCall) {
      interval = setInterval(() => setCallTime(prev => prev + 1), 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isInCall])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const patient = {
    id: '#BN-77290',
    name: 'Nguyễn Văn An',
    age: 42,
    gender: t('common.male'),
    location: 'Quận 1, Thành phố Hồ Chí Minh',
    allergy: t('telehealth.allergy_title', { drug: 'Penicillin' }),
    allergyDetail: t('telehealth.allergy_note'),
    history: [t('telehealth.history_hypertension'), t('telehealth.history_lipid'), t('telehealth.history_nosmoking')],
  }

  const vitals = [
    { icon: <Heart size={18} />, label: t('telehealth.vitals.hr'), value: '104', unit: t('telehealth.vitals.hr_unit'), color: 'var(--color-emergency)' },
    { icon: <Activity size={18} />, label: t('telehealth.vitals.bp'), value: '148/92', unit: t('telehealth.vitals.bp_unit'), color: 'var(--color-emergency)' },
    { icon: <Droplets size={18} />, label: t('telehealth.vitals.spo2'), value: '96', unit: t('telehealth.vitals.spo2_unit'), color: 'var(--color-secondary)' },
    { icon: <Thermometer size={18} />, label: t('telehealth.vitals.temp'), value: '37.1', unit: t('telehealth.vitals.temp_unit'), color: 'var(--color-success)' },
  ]

  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [prescription, setPrescription] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Session Header */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-5)' }}>
          <div>
            <h3>{t('telehealth.title')}</h3>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="badge-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-emergency)' }} />
              {t('telehealth.clinic_info')} {t('telehealth.session_id')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Clock size={16} color="var(--color-emergency)" />
              <span className="tabular-nums" style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-lg)' }}>{formatTime(callTime)}</span>
            </div>
            {isInCall && <span className="badge badge-emergency"><span className="badge-dot" /> {t('status.recording')}</span>}
            <span className="badge badge-success">{t('telehealth.encryption')}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-4)' }}>
        {/* Video Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              position: 'relative', height: 480,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {!isInCall ? (
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <Video size={64} style={{ opacity: 0.3, marginBottom: 'var(--space-4)' }} />
                  <h3 style={{ color: 'white', opacity: 0.7 }}>{t('status.ready_connect')}</h3>
                  <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-6)' }} onClick={() => setIsInCall(true)}>
                    <Video size={18} /> {t('actions.start_exam')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Network quality */}
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
                  }}>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>{t('telehealth.network_signal', { quality: '98' })}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{t('telehealth.latency', { ms: '18', fps: '60' })}</span>
                  </div>
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{t('telehealth.national_cert')}</span>
                  </div>

                  {/* Doctor Info */}
                  <div style={{ position: 'absolute', bottom: 80, left: 12, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="header-avatar" style={{ width: 40, height: 40 }}>SJ</div>
                    <div style={{ color: 'white' }}>
                      <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>BS. CKI Sarah Jenkins</div>
                      <div style={{ fontSize: '11px', opacity: 0.7 }}>Bác sĩ điều trị tim mạch &bull; Bệnh viện MedTech</div>
                    </div>
                  </div>

                  {/* Patient PiP */}
                  <div style={{
                    position: 'absolute', bottom: 80, right: 12,
                    width: 180, height: 120,
                    background: '#2a2a3e',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-xs)' }}>
                      BN. {patient.name}
                      <Mic size={12} style={{ marginLeft: 4 }} />
                    </div>
                  </div>

                  <div style={{ color: 'white', fontSize: 'var(--text-3xl)', opacity: 0.15, fontWeight: 'var(--font-bold)' }}>{t('status.live')}</div>
                </>
              )}

              {/* Controls */}
              {isInCall && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--space-3)', padding: 'var(--space-4)',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                }}>
                  <button className={`btn ${isMicOn ? 'btn-secondary' : 'btn-danger'}`} onClick={() => setIsMicOn(!isMicOn)} style={{ borderRadius: 'var(--radius-full)', width: 48, height: 48, padding: 0 }}>
                    {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button className={`btn ${isVideoOn ? 'btn-secondary' : 'btn-danger'}`} onClick={() => setIsVideoOn(!isVideoOn)} style={{ borderRadius: 'var(--radius-full)', width: 48, height: 48, padding: 0 }}>
                    {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                  <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-full)', width: 48, height: 48, padding: 0 }}>
                    <Share2 size={18} />
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsChatOpen(!isChatOpen)} style={{ borderRadius: 'var(--radius-full)', width: 48, height: 48, padding: 0 }}>
                    <MessageSquare size={18} />
                  </button>
                  <button className="btn btn-danger" onClick={() => { setIsInCall(false); setCallTime(0) }} style={{ borderRadius: 'var(--radius-full)', height: 48, padding: '0 var(--space-6)' }}>
                    <Phone size={18} /> {t('actions.end_call')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Vitals Bar */}
          <div className="grid grid-cols-4">
            {vitals.map((v, i) => (
              <div key={i} className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)' }}>
                <div style={{ color: v.color }}>{v.icon}</div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{v.label}</div>
                  <div className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
                    {v.value} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-normal)', color: 'var(--color-text-tertiary)' }}>{v.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Patient Summary */}
          <div className="card">
            <div className="card-header">
              <h4 className="card-title" style={{ fontSize: 'var(--text-sm)' }}><FileText size={14} /> {t('telehealth.patient_summary')}</h4>
              <span className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{patient.id}</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)' }}>{patient.name}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{patient.gender} &bull; {patient.age} {t('common.age_unit')}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{patient.location}</div>
              </div>

              <div style={{ padding: 'var(--space-3)', background: 'var(--color-emergency-bg)', border: '1px solid var(--color-emergency-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 'var(--font-semibold)', color: 'var(--color-emergency)', fontSize: 'var(--text-sm)' }}>
                  <AlertTriangle size={14} /> {patient.allergy}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-emergency-text)', marginTop: 4 }}>{patient.allergyDetail}</div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>{t('telehealth.medical_history')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {patient.history.map((h, i) => (
                    <span key={i} className="badge badge-neutral">{h}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Encounter Note */}
          <div className="card">
            <div className="card-header">
              <h4 className="card-title" style={{ fontSize: 'var(--text-sm)' }}>{t('telehealth.encounter_note')}</h4>
              {isInCall && <span className="badge badge-success"><span className="badge-dot" /> {t('status.live')}</span>}
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">{t('telehealth.icd10_label')}</label>
                <input className="form-input" placeholder={t('telehealth.icd10_placeholder')} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('telehealth.symptoms_label')}</label>
                <textarea className="form-input" rows={3} placeholder={t('telehealth.symptoms_placeholder')} value={symptoms} onChange={e => setSymptoms(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('telehealth.quick_rx')}</label>
                <textarea className="form-input" rows={2} placeholder={t('telehealth.quick_rx_placeholder')} value={prescription} onChange={e => setPrescription(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                <Shield size={14} /> {t('actions.sign_save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
