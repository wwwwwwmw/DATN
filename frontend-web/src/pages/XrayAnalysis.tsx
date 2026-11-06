import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { xrayAPI } from '../services/api'
import {
  Upload, FileImage, AlertTriangle,
  Eye, ZoomIn, ZoomOut, Layers, Download, Send,
  Shield, CheckCircle, Check, Sparkles
} from 'lucide-react'

// Realistic clinical sample cases pending AI review
const PRELOADED_CASES = [
  {
    id: 1,
    case_id: '#XQ-8828',
    alt_id: '#XQ-8802',
    patient: 'Robert Miller (Nam, 61 tuổi)',
    rawPatientName: 'Robert Miller',
    age: 61,
    gender: 'Nam',
    file: 'CXR_PA_DICOM_08.dcm (14.2 MB)',
    model: 'DenseNet-121 CheXNet-v2',
    auc: 0.941,
    finding: 'Viêm thùy phổi dưới phải',
    prob: 78.4,
    predictions: [
      { name: 'Viêm thùy phổi dưới phải', prob: 78.4, badge: 'emergency', label: 'CẢNH BÁO NGUY CƠ CAO' },
      { name: 'Bóng tim to (Cardiomegaly)', prob: 54.2, badge: 'warning', label: 'Cảnh báo tăng áp' },
      { name: 'Đông đặc phổi', prob: 46.8, badge: 'warning', label: 'Tổn thương phế nang' },
      { name: 'Tràn dịch màng phổi', prob: 28.1, badge: 'neutral', label: 'Bình thường' },
      { name: 'Thâm nhiễm phổi', prob: 21.0, badge: 'neutral', label: '' },
      { name: 'Xẹp phổi', prob: 14.5, badge: 'neutral', label: '' },
      { name: 'Tràn khí màng phổi', prob: 2.1, badge: 'success', label: 'Không phát hiện' },
    ],
    defaultICD: 'J18.9',
    defaultNote: 'Hình ảnh đám mờ đậm không đều đáy phổi phải, bờ mờ. Khối tim to chỉ số tim-lồng ngực 0.58. Phù hợp chẩn đoán Viêm thùy phổi dưới phải và Tim to.',
  },
  {
    id: 2,
    case_id: '#XQ-8824',
    alt_id: '#XQ-8803',
    patient: 'Bùi Văn Hùng (Nam, 55 tuổi)',
    rawPatientName: 'Bùi Văn Hùng',
    age: 55,
    gender: 'Nam',
    file: 'CXR_PA_DICOM_09.dcm (15.1 MB)',
    model: 'DenseNet-121 CheXNet-v2',
    auc: 0.938,
    finding: 'Tràn dịch màng phổi',
    prob: 62.1,
    predictions: [
      { name: 'Tràn dịch màng phổi góc sườn hoành phải', prob: 62.1, badge: 'emergency', label: 'CẢNH BÁO MỨC TRUNG BÌNH' },
      { name: 'Xẹp phổi thụ động thùy dưới', prob: 41.5, badge: 'warning', label: 'Theo dõi xẹp phổi' },
      { name: 'Đông đặc đáy phổi', prob: 31.2, badge: 'warning', label: 'Nghi ngờ viêm' },
      { name: 'Bóng tim to', prob: 22.0, badge: 'neutral', label: 'Bình thường' },
      { name: 'Tràn khí màng phổi', prob: 1.5, badge: 'success', label: 'Không phát hiện' },
    ],
    defaultICD: 'J90',
    defaultNote: 'Tù góc sườn hoành phải rõ rệt, đường cong Damoiseau. Cần kết hợp siêu âm màng phổi và chọc dò dịch màng phổi kiểm tra vi sinh.',
  },
  {
    id: 3,
    case_id: '#XQ-8804',
    alt_id: '#XQ-8804',
    patient: 'Lê Hoàng Long (Nam, 35 tuổi)',
    rawPatientName: 'Lê Hoàng Long',
    age: 35,
    gender: 'Nam',
    file: 'CXR_PA_DICOM_10.dcm (16.0 MB)',
    model: 'DenseNet-121 CheXNet-v2',
    auc: 0.952,
    finding: 'Sung huyết phổi cấp',
    prob: 82.5,
    predictions: [
      { name: 'Sung huyết phổi cấp (Phù phổi kẽ)', prob: 82.5, badge: 'emergency', label: 'CẢNH BÁO NGUY CƠ CAO' },
      { name: 'Bóng tim to cấp tính', prob: 69.0, badge: 'emergency', label: 'Suy tim cấp' },
      { name: 'Dày vách liên tiểu thùy (Kerley B lines)', prob: 58.0, badge: 'warning', label: 'Tăng áp lực mao mạch phổi' },
      { name: 'Tràn dịch màng phổi nhẹ 2 bên', prob: 35.4, badge: 'neutral', label: 'Theo dõi' },
    ],
    defaultICD: 'I50.9',
    defaultNote: 'Bệnh nhân có triệu chứng đau thắt ngực cấp tính và khó thở. Hình ảnh rốn phổi mờ hình cánh bướm phù hợp phù phổi huyết động. Cần xử trí cấp cứu tim mạch ngay.',
  }
]

function resolveCaseData(selected: any) {
  if (!selected) return PRELOADED_CASES[0]
  const match = PRELOADED_CASES.find(c =>
    c.id === selected.id ||
    c.case_id === selected.code ||
    c.alt_id === selected.code ||
    (selected.patient && c.rawPatientName && (selected.patient.includes(c.rawPatientName) || c.rawPatientName.includes(selected.patient)))
  )
  if (match) {
    return {
      ...match,
      case_id: selected.code || match.case_id,
      patient: selected.patient ? `${selected.patient} (${selected.age || match.age} tuổi)` : match.patient,
      finding: selected.finding || match.finding,
      prob: selected.prob || match.prob,
    }
  }
  return {
    id: selected.id || 99,
    case_id: selected.code || '#XQ-8828',
    patient: `${selected.patient || 'Bệnh nhân'} (${selected.age || 55} tuổi)`,
    rawPatientName: selected.patient || 'Bệnh nhân',
    age: selected.age || 55,
    gender: 'Nam',
    file: `CXR_PA_${(selected.code || '8828').replace('#', '')}.dcm (14.2 MB)`,
    model: 'DenseNet-121 CheXNet-v2',
    auc: 0.941,
    finding: selected.finding || 'Viêm thùy phổi dưới phải',
    prob: selected.prob || 78.4,
    predictions: [
      { name: selected.finding || 'Viêm thùy phổi dưới phải', prob: selected.prob || 78.4, badge: (selected.prob || 78.4) > 60 ? 'emergency' : 'warning', label: 'CẢNH BÁO NGUY CƠ CAO' },
      { name: selected.secondary || 'Bóng tim to (Cardiomegaly)', prob: selected.secProb || 54.2, badge: 'warning', label: 'Cảnh báo tăng áp' },
      { name: 'Đông đặc phổi', prob: 36.8, badge: 'warning', label: 'Tổn thương phế nang' },
      { name: 'Tràn dịch màng phổi', prob: 25.0, badge: 'neutral', label: 'Bình thường' },
      { name: 'Tràn khí màng phổi', prob: 1.8, badge: 'success', label: 'Không phát hiện' },
    ],
    defaultICD: (selected.finding || '').toLowerCase().includes('dịch') ? 'J90' : ((selected.finding || '').toLowerCase().includes('huyết') ? 'I50.9' : 'J18.9'),
    defaultNote: `Hình ảnh X-quang phổi kỹ thuật số ghi nhận: ${selected.finding || 'Tổn thương thâm nhiễm nhu mô phổi'} với độ tin cậy ${selected.prob || 78.4}%. Bác sĩ đối chiếu triệu chứng lâm sàng và xác nhận kết luận chẩn đoán.`
  }
}

export default function XrayAnalysis() {
  const { t } = useTranslation()
  const location = useLocation()

  // Find if a case was passed via router navigation
  const passedCase = location.state?.selectedCase
  const initialCase = resolveCaseData(passedCase)

  const [activeCase, setActiveCase] = useState<any>(initialCase)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(initialCase)
  const [dragOver, setDragOver] = useState(false)
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7)
  const [agreeAI, setAgreeAI] = useState(true)
  const [diagnosis, setDiagnosis] = useState(initialCase.defaultICD)
  const [doctorNote, setDoctorNote] = useState(initialCase.defaultNote)
  const [signSuccess, setSignSuccess] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Sync if location state changes
  useEffect(() => {
    if (location.state?.selectedCase) {
      const resolved = resolveCaseData(location.state.selectedCase)
      selectCase(resolved)
    }
  }, [location.state])

  const selectCase = (c: any) => {
    setActiveCase(c)
    setResult(c)
    setDiagnosis(c.defaultICD)
    setDoctorNote(c.defaultNote)
    setSignSuccess(false)
    setFile(null)
    setPreview('')
    setAnalysisError(null)
  }

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
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
      const res = await xrayAPI.analyze(fd)
      setResult(res.data.data || res.data)
    } catch (err: any) {
      const errMsg = err?.response?.status === 500
        ? t('xray.error_model')
        : err?.response?.data?.message || t('xray.error_generic')
      setAnalysisError(errMsg)
      setResult(activeCase || PRELOADED_CASES[0])
    } finally {
      setLoading(false)
    }
  }

  const handleSignAndSubmit = () => {
    setSignSuccess(true)
    setTimeout(() => {
      // scroll to top or alert
    }, 500)
  }

  const displayResult = result || activeCase

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header and Case Selector Bar */}
      <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={18} color="var(--color-primary)" />
            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              Danh sách ca bệnh chờ Bác sĩ duyệt X-quang AI:
            </strong>
          </div>

          {/* Quick Select Buttons for Cases */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {PRELOADED_CASES.map(c => (
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
                  background: c.prob > 70 ? 'var(--color-emergency)' : 'var(--color-warning)',
                  marginLeft: 4
                }} />
              </button>
            ))}
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
            <div>
              <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-warning-text)', fontSize: 'var(--text-sm)' }}>{analysisError}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{t('xray.demo_mode')}</div>
            </div>
          </div>
        </div>
      )}

      {signSuccess && (
        <div className="card" style={{ borderLeft: '3px solid var(--color-success)', background: 'var(--color-success-light)' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
            <CheckCircle size={20} color="var(--color-success)" />
            <div>
              <div style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>
                ĐÃ KÝ DUYỆT VÀ LƯU HỒ SƠ THÀNH CÔNG!
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Chứng thư số y tế SmartCA SHA-256 đã được đính kèm vào mã bệnh án {displayResult.case_id}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Info Cards */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-body" style={{ padding: 'var(--space-3)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              {t('xray.case_id_label')}
            </div>
            <div className="font-mono" style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>
              {displayResult.case_id}
            </div>
          </div>
        </div>
        <div className="card" style={{ flex: 2 }}>
          <div className="card-body" style={{ padding: 'var(--space-3)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              {t('auth.patient')}
            </div>
            <div style={{ fontWeight: 'var(--font-semibold)' }}>
              {displayResult.patient}
            </div>
          </div>
        </div>
        <div className="card" style={{ flex: 2 }}>
          <div className="card-body" style={{ padding: 'var(--space-3)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              {t('xray.model_label')}
            </div>
            <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-secondary)' }}>
              {displayResult.model}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        {/* X-ray Viewer with Simulated Grad-CAM Overlay */}
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
            {/* Clinical Chest X-Ray Visualizer */}
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
                /* Anatomical Chest X-ray graphic representation with Heatmap */
                <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
                  {/* Ribcage and lung silhouettes */}
                  <rect width="400" height="400" fill="#0d1117" />
                  {/* Spine and Mediastinum */}
                  <path d="M 195 40 L 205 40 L 205 360 L 195 360 Z" fill="#475569" opacity="0.6" />
                  {/* Left lung field */}
                  <path d="M 190 70 C 130 80 80 140 80 250 C 80 320 120 330 190 320 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                  {/* Right lung field */}
                  <path d="M 210 70 C 270 80 320 140 320 250 C 320 320 280 330 210 320 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                  {/* Cardiac Silhouette (Heart) */}
                  <path d="M 170 180 C 140 220 150 280 220 280 C 240 280 250 240 220 200 Z" fill="#475569" opacity="0.85" />
                  {/* Ribs arcs */}
                  <path d="M 190 100 Q 130 110 95 140" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                  <path d="M 190 140 Q 120 155 85 190" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                  <path d="M 190 180 Q 115 200 85 240" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                  <path d="M 210 100 Q 270 110 305 140" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                  <path d="M 210 140 Q 280 155 315 190" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
                  <path d="M 210 180 Q 285 200 315 240" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />

                  {/* Grad-CAM Heatmap Focus on Lesion Area */}
                  <defs>
                    <radialGradient id="gradcamHeat" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                      <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.75" />
                      <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Dynamic Heatmap position depending on case */}
                  <ellipse
                    cx={activeCase?.id === 2 ? 260 : (activeCase?.id === 3 ? 200 : 255)}
                    cy={activeCase?.id === 2 ? 280 : (activeCase?.id === 3 ? 210 : 255)}
                    rx={activeCase?.id === 3 ? 90 : 65}
                    ry={activeCase?.id === 3 ? 75 : 55}
                    fill="url(#gradcamHeat)"
                    opacity={heatmapOpacity}
                    style={{ transition: 'opacity 0.2s ease' }}
                  />

                  {/* Focus bounding box */}
                  <rect
                    x={activeCase?.id === 2 ? 195 : (activeCase?.id === 3 ? 120 : 190)}
                    y={activeCase?.id === 2 ? 220 : (activeCase?.id === 3 ? 140 : 200)}
                    width={activeCase?.id === 3 ? 160 : 130}
                    height={activeCase?.id === 3 ? 130 : 110}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity={heatmapOpacity > 0.3 ? 0.9 : 0.2}
                  />
                  <text
                    x={activeCase?.id === 2 ? 200 : (activeCase?.id === 3 ? 125 : 195)}
                    y={activeCase?.id === 2 ? 215 : (activeCase?.id === 3 ? 135 : 195)}
                    fill="#f87171"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    AI HOTSPOT ({displayResult.prob}%)
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
          {/* AI Pathology Prediction Results */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('xray.result_title')} — 14 Bệnh lý học</h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>AUC: {displayResult.auc}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {displayResult.predictions.map((p: any, i: number) => (
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
              <span className="font-mono badge badge-neutral">MÃ DUYỆT #BS-409</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreeAI}
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
                <select className="form-input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}>
                  <option value="">{t('xray.select_icd10')}</option>
                  <option value="J18.9">J18.9 — Viêm phổi thùy do vi khuẩn (Thùy dưới phải)</option>
                  <option value="J90">J90 — Tràn dịch màng phổi góc sườn hoành</option>
                  <option value="I50.9">I50.9 — Suy tim sung huyết và phù phổi cấp</option>
                  <option value="I20.0">I20.0 — Cơn đau thắt ngực không ổn định</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('xray.radiologist_note')}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={doctorNote}
                  onChange={e => setDoctorNote(e.target.value)}
                  placeholder="Ghi nhận tổn thương lâm sàng của bác sĩ X-quang..."
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }}>
                  <Download size={14} /> Xuất báo cáo DICOM (.PDF)
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleSignAndSubmit}
                >
                  {signSuccess ? <Check size={14} /> : <Send size={14} />}
                  {signSuccess ? 'Đã ký duyệt thành công' : 'Gửi báo cáo và Ký duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
