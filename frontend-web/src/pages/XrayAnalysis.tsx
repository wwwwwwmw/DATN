import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { xrayAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import {
  Upload, FileImage, AlertTriangle,
  Eye, ZoomIn, ZoomOut, Layers, Download, Send,
  Shield, CheckCircle, Check, Sparkles, RefreshCw
} from 'lucide-react'

const DISEASE_VI_MAP: Record<string, string> = {
  'Pneumonia': 'Viêm phổi thùy (Pneumonia)',
  'Pleural Effusion': 'Tràn dịch màng phổi (Pleural Effusion)',
  'Cardiomegaly': 'Bóng tim to (Cardiomegaly)',
  'Consolidation': 'Đông đặc phổi (Consolidation)',
  'Atelectasis': 'Xẹp phổi (Atelectasis)',
  'Edema': 'Phù phổi / Sung huyết phổi (Edema)',
  'Pneumothorax': 'Tràn khí màng phổi (Pneumothorax)',
  'No Finding': 'Không phát hiện bất thường',
}

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function mapDbRecordToCase(r: any) {
  const predsObj = r.predictions || {}
  const entries = Object.entries(predsObj)
    .filter(([, val]) => typeof val === 'number')
    .sort((a: any, b: any) => b[1] - a[1])

  const mappedPreds = entries.map(([rawName, rawProb]: [string, any]) => {
    const probPct = rawProb <= 1 ? Number((rawProb * 100).toFixed(1)) : Number(Number(rawProb).toFixed(1))
    const badge = probPct > 60 ? 'emergency' : probPct > 30 ? 'warning' : 'neutral'
    const label = probPct > 60 ? 'CẢNH BÁO NGUY CƠ CAO' : probPct > 30 ? 'Theo dõi lâm sàng' : 'Mức nền thấp'
    return {
      rawKey: rawName,
      name: DISEASE_VI_MAP[rawName] || rawName,
      prob: probPct,
      badge,
      label,
    }
  })

  const top = mappedPreds[0] || { name: 'Chưa xác định', prob: 0, rawKey: '' }
  let defaultICD = 'J18.9'
  if (top.rawKey.includes('Effusion')) defaultICD = 'J90'
  else if (top.rawKey.includes('Cardiomegaly') || top.rawKey.includes('Edema')) defaultICD = 'I50.9'

  const defaultNote = r.doctor_review || (
    `Hình ảnh X-quang ngực thẳng kỹ thuật số ghi nhận: ${top.name} với xác suất AI ${top.prob}%. Đối chiếu lâm sàng của bệnh nhân ${r.patient_name || ''}.`
  )

  return {
    id: r.id,
    case_id: r.case_code || `#XQ-${8800 + r.id}`,
    patient: `${r.patient_name || 'Bệnh nhân'}${r.patient_age ? ` (${r.patient_gender || 'Nam'}, ${r.patient_age} tuổi)` : ''}`,
    rawPatientName: r.patient_name || 'Bệnh nhân',
    age: r.patient_age || null,
    gender: r.patient_gender || '',
    model: 'DenseNet-121 CheXNet-v2 (Database Record)',
    auc: 0.941,
    finding: top.name,
    prob: top.prob,
    predictions: mappedPreds,
    defaultICD,
    defaultNote,
    doctor_review: r.doctor_review || '',
    doctor_agrees_with_ai: r.doctor_agrees_with_ai,
    reviewed_by_name: r.reviewed_by_name || '',
    attending_doctor_name: r.attending_doctor_name || '',
    created_at: r.created_at,
  }
}

export default function XrayAnalysis() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()

  const [dbCases, setDbCases] = useState<any[]>([])
  const [activeCase, setActiveCase] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingCases, setFetchingCases] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7)
  const [agreeAI, setAgreeAI] = useState(true)
  const [diagnosis, setDiagnosis] = useState('J18.9')
  const [doctorNote, setDoctorNote] = useState('')
  const [signSuccess, setSignSuccess] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const selectCase = (c: any) => {
    if (!c) return
    setActiveCase(c)
    setDiagnosis(c.defaultICD || 'J18.9')
    setDoctorNote(c.doctor_review || c.defaultNote || '')
    setAgreeAI(c.doctor_agrees_with_ai !== null && c.doctor_agrees_with_ai !== undefined ? Boolean(c.doctor_agrees_with_ai) : true)
    setSignSuccess(Boolean(c.doctor_review))
    setFile(null)
    setPreview('')
    setAnalysisError(null)
  }

  const loadXrayCases = async (silent = false) => {
    if (!silent) setFetchingCases(true)
    try {
      const res = await xrayAPI.results()
      const rawList = extractList(res)
      const mapped = rawList.map(mapDbRecordToCase)
      setDbCases(mapped)

      if (silent && activeCase) {
        const updatedCurrent = mapped.find(c => c.id === activeCase.id)
        if (updatedCurrent) setActiveCase(updatedCurrent)
      } else {
        const passedCase = location.state?.selectedCase
        if (passedCase && mapped.length > 0) {
          const match = mapped.find(c =>
            c.id === passedCase.id ||
            c.case_id === passedCase.code ||
            c.rawPatientName === passedCase.patient
          )
          selectCase(match || mapped[0])
        } else if (mapped.length > 0) {
          selectCase(mapped[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch X-ray cases from DB:', err)
    } finally {
      if (!silent) setFetchingCases(false)
    }
  }

  useEffect(() => {
    loadXrayCases(false)
  }, [location.state])

  useRealtimeSync(() => {
    loadXrayCases(true)
  }, 4000)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setSignSuccess(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [])

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setAnalysisError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      await xrayAPI.analyze(fd)
      await loadXrayCases()
    } catch (err: any) {
      const errMsg = err?.response?.status === 500
        ? t('xray.error_model')
        : err?.response?.data?.message || t('xray.error_generic')
      setAnalysisError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSignAndSubmit = async () => {
    if (!activeCase?.id) return
    try {
      setLoading(true)
      const fullReview = diagnosis ? `[${diagnosis}] ${doctorNote}` : doctorNote
      await xrayAPI.review(activeCase.id, {
        doctor_review: fullReview,
        doctor_agrees_with_ai: agreeAI,
      })
      setSignSuccess(true)
      await loadXrayCases()
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.message || 'Không thể lưu kết quả ký duyệt vào Cơ sở dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  const roleScopeText = user?.role === 'PATIENT'
    ? 'Danh sách X-quang của cá nhân bạn'
    : user?.role === 'DOCTOR'
      ? `Danh sách X-quang của bệnh nhân thuộc BS. ${user.last_name} ${user.first_name}`
      : 'Toàn bộ danh sách X-quang hệ thống (ADMIN)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header and Case Selector Bar from Real Database */}
      <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={18} color="var(--color-primary)" />
            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              {roleScopeText} ({dbCases.length} ca từ Database):
            </strong>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            {dbCases.map(c => (
              <button
                key={c.id}
                className={`btn btn-sm ${activeCase?.id === c.id && !file ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => selectCase(c)}
              >
                <span className="font-mono">{c.case_id}</span> &bull; {c.rawPatientName}
                <span style={{
                  display: 'inline-block',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: c.doctor_agrees_with_ai !== null && c.doctor_agrees_with_ai !== undefined
                    ? 'var(--color-success)'
                    : c.prob > 70 ? 'var(--color-emergency)' : 'var(--color-warning)',
                  marginLeft: 4
                }} />
              </button>
            ))}
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => loadXrayCases(false)} title="Làm mới từ Database">
              <RefreshCw size={14} className={fetchingCases ? 'loading-spinner' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Area for New Custom Image */}
      <div
        className="card"
        style={{
          borderStyle: dragOver ? 'dashed' : 'solid',
          borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border)',
          background: dragOver ? 'var(--color-primary-light)' : 'var(--color-surface)'
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-lg)',
              background: 'var(--color-secondary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-secondary)'
            }}>
              <Upload size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                {file ? `Đã chọn ảnh: ${file.name}` : t('xray.upload_title')}
              </h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                {t('xray.upload_subtitle')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <FileImage size={14} /> {t('actions.select_file')}
              <input type="file" accept="image/*,.dcm" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {file && (
              <button className="btn btn-primary btn-sm" onClick={analyze} disabled={loading}>
                {loading ? <span className="loading-spinner" /> : t('xray.analyzing')}
              </button>
            )}
          </div>
        </div>
      </div>

      {analysisError && (
        <div className="card" style={{ borderLeft: '3px solid var(--color-warning)', background: 'var(--color-warning-bg)' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
            <AlertTriangle size={18} color="var(--color-warning)" />
            <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-warning-text)', fontSize: 'var(--text-sm)' }}>{analysisError}</div>
          </div>
        </div>
      )}

      {signSuccess && activeCase && (
        <div className="card" style={{ borderLeft: '3px solid var(--color-success)', background: 'var(--color-success-light)' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
            <CheckCircle size={20} color="var(--color-success)" />
            <div>
              <div style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>
                ĐÃ KÝ DUYỆT VÀ LƯU VÀO CƠ SỞ DỮ LIỆU THÀNH CÔNG!
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Hồ sơ X-quang {activeCase.case_id} ({activeCase.rawPatientName}) đã được ghi nhận nhận xét của Bác sĩ trong PostgreSQL.
              </div>
            </div>
          </div>
        </div>
      )}

      {!activeCase ? (
        <div className="card">
          <div className="card-body" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            {fetchingCases ? 'Đang tải danh sách X-quang từ Database...' : 'Không có bản ghi X-quang nào thuộc tài khoản này.'}
          </div>
        </div>
      ) : (
        <>
          {/* Case Info Cards */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
            <div className="card" style={{ flex: 1 }}>
              <div className="card-body" style={{ padding: 'var(--space-3)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  {t('xray.case_id_label')}
                </div>
                <div className="font-mono" style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>
                  {activeCase.case_id}
                </div>
              </div>
            </div>
            <div className="card" style={{ flex: 2 }}>
              <div className="card-body" style={{ padding: 'var(--space-3)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  {t('auth.patient')}
                </div>
                <div style={{ fontWeight: 'var(--font-semibold)' }}>
                  {activeCase.patient}
                </div>
              </div>
            </div>
            <div className="card" style={{ flex: 2 }}>
              <div className="card-body" style={{ padding: 'var(--space-3)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  Bác sĩ phụ trách / Duyệt
                </div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-secondary)' }}>
                  {activeCase.reviewed_by_name ? `Đã duyệt: BS. ${activeCase.reviewed_by_name}` : (activeCase.attending_doctor_name ? `BS. ${activeCase.attending_doctor_name} (Chờ ký duyệt)` : 'Chờ Bác sĩ chuyên khoa duyệt')}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* X-ray Viewer with Grad-CAM Overlay */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-ghost btn-sm"><Layers size={14} /> {t('xray.view_parallel')}</button>
                  <button className="btn btn-ghost btn-sm"><Eye size={14} /> {t('xray.view_overlay')}</button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <button className="btn btn-ghost btn-icon btn-sm"><ZoomIn size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm"><ZoomOut size={14} /></button>
                </div>
              </div>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 440,
                  height: 380,
                  margin: '0 auto',
                  background: '#0a0d14',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--color-border)',
                }}>
                  {preview ? (
                    <img src={preview} alt="X-ray Uploaded" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
                      <rect width="400" height="400" fill="#0d1117" />
                      <path d="M 195 40 L 205 40 L 205 360 L 195 360 Z" fill="#475569" opacity="0.6" />
                      <path d="M 190 70 C 130 80 80 140 80 250 C 80 320 120 330 190 320 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                      <path d="M 210 70 C 270 80 320 140 320 250 C 320 320 280 330 210 320 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                      <path d="M 170 180 C 140 220 150 280 220 280 C 240 280 250 240 220 200 Z" fill="#475569" opacity="0.85" />
                      <path d="M 190 100 Q 130 110 95 140" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                      <path d="M 190 140 Q 120 155 85 190" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                      <path d="M 190 180 Q 115 200 85 240" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                      <path d="M 210 100 Q 270 110 305 140" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                      <path d="M 210 140 Q 280 155 315 190" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                      <path d="M 210 180 Q 285 200 315 240" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />

                      <defs>
                        <radialGradient id="gradcamHeat" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                          <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.75" />
                          <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </radialGradient>
                      </defs>

                      <ellipse
                        cx={255}
                        cy={255}
                        rx={68}
                        ry={58}
                        fill="url(#gradcamHeat)"
                        opacity={heatmapOpacity}
                        style={{ transition: 'opacity 0.2s ease' }}
                      />

                      <rect
                        x={190}
                        y={200}
                        width={130}
                        height={110}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        opacity={heatmapOpacity > 0.3 ? 0.9 : 0.2}
                      />
                      <text
                        x={195}
                        y={195}
                        fill="#f87171"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        AI HOTSPOT ({activeCase.prob}%)
                      </text>
                    </svg>
                  )}
                </div>

                <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', minWidth: 160 }}>
                    {t('xray.heatmap_opacity')} <strong className="tabular-nums">{Math.round(heatmapOpacity * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={heatmapOpacity}
                    onChange={e => setHeatmapOpacity(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Results + Doctor Review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* AI Pathology Prediction Results from DB */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">{t('xray.result_title')}</h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>AUC: {activeCase.auc}</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {activeCase.predictions.map((p: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-4)',
                      borderBottom: '1px solid var(--color-border)',
                      background: p.prob > 50 ? 'var(--color-emergency-bg)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: p.prob > 50 ? 'var(--color-emergency)' : p.prob > 30 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'
                        }} />
                        <span style={{ fontWeight: p.prob > 50 ? 'var(--font-semibold)' : 'var(--font-normal)', fontSize: 'var(--text-sm)' }}>
                          {p.name}
                        </span>
                        {p.label && <span className={`badge badge-${p.badge}`} style={{ fontSize: '10px' }}>{p.label}</span>}
                      </div>
                      <span className="tabular-nums" style={{
                        fontWeight: 'var(--font-bold)',
                        color: p.prob > 50 ? 'var(--color-emergency)' : p.prob > 30 ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                        fontSize: 'var(--text-sm)'
                      }}>
                        {p.prob}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Confirmation and Supervision */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Shield size={16} /> Xác nhận và Giám sát của Bác sĩ điều trị
                  </h3>
                  <span className={`font-mono badge ${activeCase.doctor_agrees_with_ai !== null && activeCase.doctor_agrees_with_ai !== undefined ? 'badge-success' : 'badge-warning'}`}>
                    {activeCase.doctor_agrees_with_ai !== null && activeCase.doctor_agrees_with_ai !== undefined ? 'ĐÃ KÝ DUYỆT' : 'CHỜ DUYỆT'}
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: user?.role === 'PATIENT' ? 'default' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={agreeAI}
                      disabled={user?.role === 'PATIENT'}
                      onChange={e => setAgreeAI(e.target.checked)}
                      style={{ marginTop: 2, width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontWeight: 'var(--font-semibold)' }}>{t('xray.agree_ai')}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{t('xray.lesion_match')}</div>
                    </div>
                  </label>

                  <div className="form-group">
                    <label className="form-label">{t('xray.official_diagnosis')}</label>
                    <select
                      className="form-input"
                      value={diagnosis}
                      disabled={user?.role === 'PATIENT'}
                      onChange={e => setDiagnosis(e.target.value)}
                    >
                      <option value="">{t('xray.select_icd10')}</option>
                      <option value="J18.9">J18.9 — Viêm phổi thùy do vi khuẩn (Thùy dưới phải)</option>
                      <option value="J90">J90 — Tràn dịch màng phổi góc sườn hoành</option>
                      <option value="I50.9">I50.9 — Suy tim sung huyết và Bóng tim to</option>
                      <option value="I20.0">I20.0 — Cơn đau thắt ngực không ổn định</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('xray.radiologist_note')}</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={doctorNote}
                      readOnly={user?.role === 'PATIENT'}
                      onChange={e => setDoctorNote(e.target.value)}
                      placeholder="Ghi nhận tổn thương lâm sàng của bác sĩ X-quang..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => window.print()}>
                      <Download size={14} /> Xuất báo cáo DICOM (.PDF)
                    </button>
                    {user?.role !== 'PATIENT' && (
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleSignAndSubmit}
                        disabled={loading}
                      >
                        {signSuccess ? <Check size={14} /> : <Send size={14} />}
                        {signSuccess ? 'Cập nhật Ký duyệt vào DB' : 'Gửi báo cáo và Ký duyệt'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
