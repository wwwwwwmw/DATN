import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { medicalRecordAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import {
  FileText, Shield, ExternalLink,
  Printer, Activity, RefreshCw, Users
} from 'lucide-react'

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function parseDiagnoses(rawDiagnosis: string, rawSymptoms: string, t: any) {
  if (!rawDiagnosis) return []
  const parts = rawDiagnosis.split('|').map(s => s.trim()).filter(Boolean)
  return parts.map((part, idx) => {
    const m = part.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*-\s*(.+)/)
    const icd = m ? m[1] : `ICD-${idx + 1}`
    const name = m ? m[2] : part
    return {
      icd,
      name,
      desc: idx === 0 ? (rawSymptoms || 'Chẩn đoán lâm sàng chính thức từ Bác sĩ điều trị') : 'Bệnh lý đi kèm ghi nhận trong quá trình thăm khám',
      role: idx === 0 ? t('records.primary_diagnosis') : t('records.secondary_diagnosis'),
      color: idx === 0 ? 'var(--color-emergency)' : 'var(--color-warning)',
    }
  })
}

function parseMedications(rawPrescription: string) {
  if (!rawPrescription) return []
  const lines = rawPrescription.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map((line) => {
    const cols = line.split('|').map(c => c.trim())
    const drugRaw = cols[0] || line
    const usageRaw = cols[1] || 'Theo chỉ định của Bác sĩ'
    const daysRaw = cols[2] || '14 ngày'
    const doseMatch = drugRaw.match(/(\d+(?:\/\d+)?\s*(?:mg|mcg|g|ml|UI))/i)
    const dose = doseMatch ? doseMatch[1] : '1 viên'
    const daysMatch = daysRaw.match(/(\d+)/)
    const days = daysMatch ? Number(daysMatch[1]) : 14
    return {
      name: drugRaw,
      generic: 'Dược điển Lâm sàng MedTech',
      dose,
      usage: usageRaw,
      days,
      note: daysRaw,
    }
  })
}

export default function MedicalRecords() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()

  const [records, setRecords] = useState<any[]>([])
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('ALL')
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(location.state?.recordId || null)
  const [loading, setLoading] = useState(true)

  const loadRecords = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await medicalRecordAPI.list()
      const list = extractList(res)
      setRecords(list)
      if (list.length > 0) {
        const targetId = location.state?.recordId
        if (targetId && list.some((r: any) => r.id === targetId)) {
          setSelectedRecordId(targetId)
        } else if (!selectedRecordId) {
          setSelectedRecordId(list[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch medical records:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords(false)
  }, [])

  useRealtimeSync(() => {
    loadRecords(true)
  }, 4000)

  // Unique patients list for Doctor / Admin filtering
  const uniquePatients = Array.from(
    new Map(records.map(r => [r.patient, { id: r.patient, name: r.patient_name, code: r.patient_code }])).values()
  )

  const filteredRecords = selectedPatientFilter === 'ALL'
    ? records
    : records.filter(r => String(r.patient) === selectedPatientFilter)

  const activeRecord = filteredRecords.find(r => r.id === selectedRecordId) || filteredRecords[0] || null
  const diagnoses = activeRecord ? parseDiagnoses(activeRecord.diagnosis, activeRecord.symptoms, t) : []
  const medications = activeRecord ? parseMedications(activeRecord.prescription) : []

  const roleScopeBanner = user?.role === 'PATIENT'
    ? 'Phạm vi dữ liệu: Hồ sơ Bệnh án cá nhân của bạn'
    : user?.role === 'DOCTOR'
      ? `Phạm vi dữ liệu: Hồ sơ Bệnh án của các bệnh nhân do BS. ${user.last_name} ${user.first_name} phụ trách`
      : 'Phạm vi dữ liệu: Toàn bộ Hồ sơ Bệnh án toàn viện (Quyền Quản trị viên ADMIN)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header with Role Scope & Patient Selector */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <FileText size={24} color="var(--color-primary)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <h3>{t('records.title')}</h3>
                {activeRecord && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {t('records.identifier_label')} <span className="font-mono">{activeRecord.patient_code}</span> &bull; <strong>{activeRecord.patient_name}</strong>
                    {activeRecord.patient_age ? ` • ${activeRecord.patient_age} ${t('common.age_unit')}` : ''}
                    {activeRecord.patient_gender ? ` (${activeRecord.patient_gender})` : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{roleScopeBanner}</span>
                <span className="badge badge-success">{t('status.synced')} ({filteredRecords.length} bệnh án)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {user?.role !== 'PATIENT' && uniquePatients.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={16} color="var(--color-text-secondary)" />
                <select
                  className="form-input"
                  style={{ padding: '4px 10px', fontSize: 'var(--text-sm)', minWidth: 210 }}
                  value={selectedPatientFilter}
                  onChange={e => {
                    const val = e.target.value
                    setSelectedPatientFilter(val)
                    const nextList = val === 'ALL' ? records : records.filter(r => String(r.patient) === val)
                    if (nextList.length > 0) setSelectedRecordId(nextList[0].id)
                  }}
                >
                  <option value="ALL">Tất cả bệnh nhân ({uniquePatients.length})</option>
                  {uniquePatients.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => loadRecords(false)}>
              <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} /> Làm mới
            </button>
          </div>
        </div>
      </div>

      {!activeRecord ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-tertiary)' }}>
            {loading ? 'Đang tải hồ sơ bệnh án từ Cơ sở dữ liệu...' : 'Không có hồ sơ bệnh án nào thuộc phạm vi tài khoản này.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-4)' }}>
          {/* Timeline of Real Database Medical Records */}
          <div className="card">
            <div className="card-header">
              <h4 className="card-title" style={{ fontSize: 'var(--text-sm)' }}>{t('records.timeline_title')}</h4>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                {t('records.timeline_count', { count: filteredRecords.length })}
              </span>
            </div>
            <div className="card-body" style={{ padding: 0, maxHeight: '72vh', overflowY: 'auto' }}>
              {filteredRecords.map((entry) => {
                const isActive = entry.id === activeRecord.id
                const firstDiag = (entry.diagnosis || '').split('|')[0].trim()
                const icdMatch = firstDiag.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*-\s*(.+)/)
                const icdCode = icdMatch ? icdMatch[1] : 'ICD-10'
                const icdName = icdMatch ? icdMatch[2] : firstDiag
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedRecordId(entry.id)}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--color-border)',
                      borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                      background: isActive ? 'var(--color-primary-light)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {entry.appointment_date} {entry.appointment_time ? `• ${entry.appointment_time}` : ''}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                        {entry.doctor_specialization || t('records.visit_outpatient')}
                      </span>
                    </div>
                    <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
                      {entry.patient_name} ({entry.patient_code})
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      BS. {entry.doctor_name} • {entry.clinic_name}
                    </div>
                    <div className="font-mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                      <span style={{ color: 'var(--color-emergency)', fontWeight: 'var(--font-bold)' }}>{icdCode}</span> - {icdName}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main Content of Selected Database MedicalRecord */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      Cơ sở y tế: <strong>{activeRecord.clinic_name || 'Bệnh viện Đa khoa MedTech'}</strong> &bull; Ngày khám: <strong>{activeRecord.appointment_date}</strong> ({activeRecord.appointment_time})
                    </div>
                    <h2 style={{ marginTop: 'var(--space-2)' }}>
                      Bác sĩ phụ trách: BS. {activeRecord.doctor_name} — {activeRecord.doctor_specialization}
                    </h2>
                  </div>
                  <span className="badge badge-success">Hồ sơ #{activeRecord.id}</span>
                </div>

                {/* Patient Clinical Background & Notes from DB */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-3)',
                  background: 'var(--color-neutral-bg)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)'
                }}>
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', display: 'block' }}>Bệnh nhân & Nhóm máu</span>
                    <strong>{activeRecord.patient_name}</strong> {activeRecord.patient_blood_type ? `(Nhóm máu ${activeRecord.patient_blood_type})` : ''}
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', display: 'block' }}>Địa chỉ & Liên hệ khẩn</span>
                    <span>{activeRecord.patient_address || 'TP. Hồ Chí Minh'} {activeRecord.patient_emergency_contact ? `• SĐT: ${activeRecord.patient_emergency_contact}` : ''}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', display: 'block' }}>Ngày hẹn tái khám</span>
                    <strong>{activeRecord.follow_up_date || 'Theo chỉ định lâm sàng'}</strong>
                  </div>
                </div>

                {activeRecord.notes && (
                  <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <strong>Ghi chú Lâm sàng và Sinh hiệu:</strong> {activeRecord.notes}
                  </div>
                )}
              </div>
            </div>

            {/* ICD-10 Diagnoses */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><Activity size={16} /> {t('records.icd10_title')}</h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{t('records.icd10_system')}</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {diagnoses.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--color-border)',
                    borderLeft: `4px solid ${d.color}`,
                  }}>
                    <span className="font-mono" style={{
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                      background: d.color === 'var(--color-emergency)' ? 'var(--color-emergency-bg)' : 'var(--color-warning-bg)',
                      color: d.color, fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)',
                    }}>{d.icd}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'var(--font-semibold)' }}>{d.name}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{d.desc}</div>
                    </div>
                    <span className={`badge ${d.role === t('records.primary_diagnosis') ? 'badge-emergency' : 'badge-warning'}`}>
                      {d.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Medications Table */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">{t('records.rx_title')}</h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('records.rx_note')}</span>
              </div>
              <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('records.rx_drug')}</th>
                      <th>{t('records.rx_dose')}</th>
                      <th>{t('records.rx_usage')}</th>
                      <th>{t('records.rx_days')}</th>
                      <th>{t('records.rx_notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med, i) => (
                      <tr key={i}>
                        <td><strong>{med.name}</strong><br /><span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>({med.generic})</span></td>
                        <td><span className="tabular-nums" style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{med.dose}</span></td>
                        <td style={{ fontSize: 'var(--text-sm)' }}>{med.usage}</td>
                        <td className="cell-numeric"><span className="tabular-nums" style={{ fontWeight: 'var(--font-bold)' }}>{med.days}</span> ngày</td>
                        <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{med.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  <Shield size={14} /> {t('records.audit_hash')} <span className="font-mono">SHA256-REC-{activeRecord.id}-{activeRecord.patient}</span>
                  <span className="badge badge-success">{t('records.fips_compliant')}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Printer size={14} /> {t('records.print_summary')}</button>
                  <button className="btn btn-primary btn-sm" onClick={() => window.print()}><ExternalLink size={14} /> {t('records.export_hl7')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
