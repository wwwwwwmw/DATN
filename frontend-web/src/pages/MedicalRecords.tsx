import { useTranslation } from 'react-i18next'
import {
  FileText, Shield, ExternalLink,
  Printer, Activity
} from 'lucide-react'

export default function MedicalRecords() {
  const { t } = useTranslation()

  const patient = {
    id: 'BN-88341-VN',
    name: 'Nguyễn Văn Bình',
    age: 58,
    gender: t('common.male'),
    doctor: 'BS. CKI Sarah Jenkins — Khoa Tim mạch Can thiệp',
    clinic: 'Bệnh viện Đa khoa Quốc tế MedTech',
    date: '15/10/2024',
    status: t('records.treatment_dot'),
  }

  const timeline = [
    { date: `${t('common.today')} - 14:30`, type: t('records.visit_emergency'), label: 'Khám Cấp cứu Tim mạch', doctor: 'BS. CKI Sarah Jenkins', dept: 'Khoa Tim mạch', icd: 'I20.0', icdName: 'Đau thắt ngực không ổn định', isActive: true },
    { date: '10/10/2024 - 08:45', type: t('records.visit_outpatient'), label: 'Khám Nội Hô hấp Ngoại trú', doctor: 'ThS. BS Marc Lindqvist', dept: 'Khoa Hô hấp', icd: 'J18.9', icdName: 'Viêm phổi không đặc hiệu' },
    { date: '15/08/2024 - 09:30', type: t('records.visit_routine'), label: 'Khám Định kỳ Tim mạch', doctor: 'BS. Trần Quốc Toản', icd: 'I10', icdName: 'Tăng huyết áp nguyên phát' },
  ]

  const diagnoses = [
    { icd: 'I20.0', name: 'Cơn đau thắt ngực không ổn định', desc: 'Triệu chứng khởi phát khi nghỉ ngơi, kèm cảm giác đè nặng sau xương ức', role: t('records.primary_diagnosis'), color: 'var(--color-emergency)' },
    { icd: 'J18.9', name: 'Viêm phổi không đặc hiệu', desc: 'Tổn thương đông đặc thùy dưới phổi phải ghi nhận qua hình ảnh học', role: t('records.secondary_diagnosis'), color: 'var(--color-warning)' },
    { icd: 'I10', name: 'Tăng huyết áp nguyên phát', desc: 'Tiền sử điều trị ngoại trú liên tục trong 5 năm', role: t('records.comorbid'), color: 'var(--color-neutral-text)' },
  ]

  const medications = [
    { name: 'Aspirin', generic: 'Acid Acetylsalicylic', dose: '81 mg', usage: 'Uống 1 viên sau ăn sáng', days: 30, note: 'Uống với nhiều nước' },
    { name: 'Clopidogrel', generic: 'Plavix', dose: '75 mg', usage: 'Uống 1 viên vào buổi tối', days: 30, note: 'Theo dõi xuất huyết dưới da' },
    { name: 'Amoxicillin-Clavulanate', generic: 'Kháng sinh phổ rộng', dose: '875/125 mg', usage: 'Uống 2 lần/ngày (sáng-tối)', days: 7, note: 'Uống đủ liều' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <FileText size={24} color="var(--color-primary)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <h3>{t('records.title')}</h3>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{t('records.identifier_label')} <span className="font-mono">{patient.id}</span> &bull; {patient.name} &bull; {patient.age} {t('common.age_unit')} ({patient.gender})</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
                <span className="badge badge-success">{t('status.synced')}</span>
                <button className="btn btn-ghost btn-sm">{t('records.access_log')}</button>
              </div>
            </div>
          </div>
          <span className="badge badge-emergency"><span className="badge-dot" />{patient.status}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-4)' }}>
        {/* Timeline */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title" style={{ fontSize: 'var(--text-sm)' }}>{t('records.timeline_title')}</h4>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('records.timeline_count', { count: timeline.length })}</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {timeline.map((entry, i) => (
              <div key={i} style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                borderLeft: entry.isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                background: entry.isActive ? 'var(--color-primary-light)' : 'transparent',
                cursor: 'pointer',
              }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{entry.date}</span>
                  <span className={`badge ${entry.type === t('records.visit_emergency') ? 'badge-emergency' : 'badge-neutral'}`}>{entry.type}</span>
                </div>
                <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginTop: 4 }}>{entry.label}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{entry.doctor}</div>
                <div className="font-mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  <span style={{ color: 'var(--color-emergency)', fontWeight: 'var(--font-bold)' }}>{entry.icd}</span> - {entry.icdName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="card-body">
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Cơ sở: {patient.clinic} &bull; Ngày khám: {patient.date}</div>
              <h2 style={{ marginTop: 'var(--space-2)' }}>Bác sĩ phụ trách: {patient.doctor}</h2>
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
                    background: d.color === 'var(--color-emergency)' ? 'var(--color-emergency-bg)' : d.color === 'var(--color-warning)' ? 'var(--color-warning-bg)' : 'var(--color-neutral-bg)',
                    color: d.color, fontWeight: 'var(--font-bold)', fontSize: 'var(--text-md)',
                  }}>{d.icd}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--font-semibold)' }}>{d.name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{d.desc}</div>
                  </div>
                  <span className={`badge ${d.role === t('records.primary_diagnosis') ? 'badge-emergency' : d.role === t('records.secondary_diagnosis') ? 'badge-warning' : 'badge-neutral'}`}>
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
                      <td style={{ fontSize: 'var(--text-sm)', color: med.note.includes('Theo dõi') ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>{med.note}</td>
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
                <Shield size={14} /> {t('records.audit_hash')} <span className="font-mono">8f4b52c091da3e7a79e49...</span>
                <span className="badge badge-success">{t('records.fips_compliant')}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-secondary btn-sm"><Printer size={14} /> {t('records.print_summary')}</button>
                <button className="btn btn-primary btn-sm"><ExternalLink size={14} /> {t('records.export_hl7')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
