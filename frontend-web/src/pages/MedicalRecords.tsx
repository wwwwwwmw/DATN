import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { medicalRecordAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import InfoTooltip from '../components/InfoTooltip'
import {
  FileText, Shield, Download,
  Printer, Activity, RefreshCw, Users,
  AlertTriangle
} from 'lucide-react'
import { parseMedications, generatePrescriptionHtml } from '../utils/prescriptionTemplate'

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

  // Drug-Drug Interaction check
  const [drugInteractions, setDrugInteractions] = useState<any[]>([])

  useEffect(() => {
    if (!activeRecord?.prescription || medications.length < 2) {
      setDrugInteractions([])
      return
    }
    medicalRecordAPI.checkInteractions(activeRecord.prescription)
      .then(res => {
        const data = res.data?.data || res.data
        setDrugInteractions(data?.interactions || [])
      })
      .catch(() => setDrugInteractions([]))
  }, [activeRecord?.id, activeRecord?.prescription])

  const handlePrintPrescription = () => {
    if (!activeRecord) return
    const html = generatePrescriptionHtml(activeRecord)
    const printWindow = window.open('', '_blank', 'width=950,height=850')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 400)
    }
  }

  const handleDownloadPrescription = () => {
    if (!activeRecord) return
    const html = generatePrescriptionHtml(activeRecord)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = (activeRecord.patient_name || 'BenhNhan').replace(/\s+/g, '_')
    const safeDate = (activeRecord.appointment_date || 'NgayKham').replace(/-/g, '')
    a.download = `Don_Thuoc_${safeName}_DotKham_${safeDate}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header with Role Scope & Patient Selector */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <FileText size={24} color="var(--color-primary)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Hồ sơ bệnh án và đơn thuốc</h3>
                {activeRecord && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    &bull; <strong>{activeRecord.patient_name}</strong>
                    {activeRecord.patient_gender ? ` (${activeRecord.patient_gender})` : ''}
                    {activeRecord.patient_age ? ` • ${activeRecord.patient_age} tuổi` : ''}
                  </span>
                )}
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
                      {entry.patient_name}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h3 className="card-title" style={{ margin: 0 }}><Activity size={16} /> {t('records.icd10_title')}</h3>
                  <InfoTooltip
                    title="Mã chẩn đoán ICD-10"
                    content="Mã bệnh chuẩn quốc tế của Tổ chức Y tế Thế giới (WHO) giúp đồng bộ và theo dõi chính xác bệnh án trên toàn quốc."
                  />
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h3 className="card-title" style={{ margin: 0 }}>{t('records.rx_title')}</h3>
                  <InfoTooltip
                    title="Đơn thuốc của bạn"
                    content="Uống thuốc đúng liều lượng, số lần và hướng dẫn của bác sĩ. Không tự ý ngưng thuốc hoặc đổi thuốc khi chưa hỏi ý kiến chuyên môn."
                  />
                </div>
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

            {/* Drug-Drug Interaction Warnings */}
            {drugInteractions.length > 0 && (
              <div className="card" style={{ border: '2px solid var(--color-warning)' }}>
                <div className="card-header" style={{ background: 'var(--color-warning-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="var(--color-warning)" />
                    <h3 className="card-title" style={{ margin: 0, color: 'var(--color-warning)' }}>
                      Cảnh báo tương tác thuốc ({drugInteractions.length})
                    </h3>
                    <InfoTooltip
                      title="Tương tác thuốc"
                      content="Hệ thống phát hiện các cặp thuốc có thể gây tương tác bất lợi. Cảnh báo này chỉ mang tính tham khảo — luôn tuân theo chỉ định của bác sĩ điều trị."
                    />
                  </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {drugInteractions.map((interaction: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: 'var(--space-4) var(--space-5)',
                        borderBottom: idx < drugInteractions.length - 1 ? '1px solid var(--color-border)' : 'none',
                        borderLeft: `4px solid ${interaction.severity === 'HIGH' ? 'var(--color-emergency)' : 'var(--color-warning)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span
                          className={`badge ${interaction.severity === 'HIGH' ? 'badge-emergency' : 'badge-warning'}`}
                          style={{ fontSize: '10px' }}
                        >
                          {interaction.severity === 'HIGH' ? '⚠️ NGUY CƠ CAO' : '⚡ TRUNG BÌNH'}
                        </span>
                        <strong style={{ fontSize: 'var(--text-sm)' }}>
                          {interaction.drug_a} ↔ {interaction.drug_b}
                        </strong>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        {interaction.description}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
                        💡 {interaction.recommendation}
                      </div>
                    </div>
                  ))}
                  <div style={{
                    padding: 'var(--space-3) var(--space-5)',
                    background: 'var(--color-neutral-bg)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Shield size={13} color="var(--color-primary)" />
                    ⚠️ Tuân theo hướng dẫn của Bác sĩ — Đơn thuốc đã được Bác sĩ xem xét và chấp thuận.
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="card">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  <Shield size={15} color="var(--color-primary)" />
                  <span className="badge badge-success">{t('records.fips_compliant')}</span>
                  <InfoTooltip
                    title="Bảo mật hồ sơ y tế"
                    content="Hồ sơ bệnh án được bảo mật tuyệt đối theo quy định của Bộ Y tế. Chỉ bạn và bác sĩ điều trị mới có quyền truy cập."
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handlePrintPrescription}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <Printer size={14} /> In Đơn Thuốc
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleDownloadPrescription}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, background: '#0068ff', borderColor: '#0068ff' }}
                  >
                    <Download size={14} /> Tải Đơn Thuốc
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
