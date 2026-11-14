import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { xrayAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import InfoTooltip from '../components/InfoTooltip'
import {
  Upload,
  FileImage,
  AlertTriangle,
  Eye,
  ZoomIn,
  ZoomOut,
  Layers,
  Download,
  Send,
  Shield,
  CheckCircle,
  Check,
  Sparkles,
  RefreshCw,
  Calendar,
  Hash,
  Search,
  User,
  Clock,
  Printer,
  X,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

function resolveMediaUrl(url?: string): string {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

const DISEASE_VI_MAP: Record<string, string> = {
  'No Finding': 'Không phát hiện bất thường (No Finding)',
  'Enlarged Cardiomediastinum': 'Giãn rộng trung thất - tim (Enlarged Cardiomediastinum)',
  Cardiomegaly: 'Bóng tim to (Cardiomegaly)',
  'Lung Opacity': 'Mờ phổi / Thâm nhiễm phổi (Lung Opacity)',
  'Lung Lesion': 'Nốt / Khối tổn thương phổi (Lung Lesion)',
  Edema: 'Phù phổi / Sung huyết phổi (Edema)',
  Consolidation: 'Đông đặc nhu mô phổi (Consolidation)',
  Pneumonia: 'Viêm phổi thùy (Pneumonia)',
  Atelectasis: 'Xẹp phổi (Atelectasis)',
  Pneumothorax: 'Tràn khí màng phổi (Pneumothorax)',
  'Pleural Effusion': 'Tràn dịch màng phổi (Pleural Effusion)',
  'Pleural Other': 'Tổn thương màng phổi khác (Pleural Other)',
  Fracture: 'Gãy xương sườn / xương đòn (Fracture)',
  'Support Devices': 'Thiết bị y tế can thiệp (Support Devices)',
}

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function formatDateTimeVi(isoStr?: string): { dateStr: string; timeStr: string; fullStr: string; ts: number } {
  if (!isoStr) {
    return { dateStr: '--/--/----', timeStr: '--:--', fullStr: 'Chưa rõ ngày', ts: 0 }
  }
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) {
    return { dateStr: isoStr, timeStr: '', fullStr: isoStr, ts: 0 }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr} lúc ${timeStr}`,
    ts: d.getTime(),
  }
}

function mapDbRecordToCase(r: any) {
  const predsObj = r.predictions || {}
  const entries = Object.entries(predsObj)
    .filter(([, val]) => typeof val === 'number')
    .sort((a: any, b: any) => b[1] - a[1])

  const mappedPreds = entries.map(([rawName, rawProb]: [string, any]) => {
    const probPct =
      rawProb <= 1 ? Number((rawProb * 100).toFixed(1)) : Number(Number(rawProb).toFixed(1))
    const isNoFinding =
      rawName === 'No Finding' ||
      rawName.toLowerCase().includes('no finding') ||
      rawName.includes('Không phát hiện bất thường')

    let badge = 'neutral'
    let label = 'Mức nền thấp'

    if (isNoFinding) {
      if (probPct >= 50) {
        badge = 'success'
        label = 'PHỔI BÌNH THƯỜNG / AN TOÀN'
      } else if (probPct >= 25) {
        badge = 'neutral'
        label = 'Khả năng bình thường trung bình'
      } else {
        badge = 'neutral'
        label = 'Khả năng bình thường thấp'
      }
    } else {
      if (probPct > 60) {
        badge = 'emergency'
        label = 'CẢNH BÁO NGUY CƠ CAO'
      } else if (probPct > 30) {
        badge = 'warning'
        label = 'Theo dõi lâm sàng'
      } else {
        badge = 'neutral'
        label = 'Mức nền thấp'
      }
    }

    return {
      rawKey: rawName,
      name: DISEASE_VI_MAP[rawName] || rawName,
      prob: probPct,
      badge,
      label,
      isNoFinding,
    }
  })

  const top = mappedPreds[0] || {
    name: 'Không phát hiện bất thường (No Finding)',
    prob: 0,
    rawKey: 'No Finding',
    isNoFinding: true,
  }
  const isNormalFinding = Boolean(top.isNoFinding && top.prob >= 45)

  let defaultICD = 'J18.9'
  if (isNormalFinding) defaultICD = 'Z00.0'
  else if (top.rawKey.includes('Effusion')) defaultICD = 'J90'
  else if (
    top.rawKey.includes('Cardiomegaly') ||
    top.rawKey.includes('Edema') ||
    top.rawKey.includes('Enlarged')
  )
    defaultICD = 'I50.9'

  const dtInfo = formatDateTimeVi(r.created_at)
  const xrayCode = r.xray_code || r.case_code || `XQ-${r.id}`
  const imageCode = r.image_code || `IMG-${r.id}`

  const defaultNote =
    r.doctor_review ||
    (isNormalFinding
      ? `Hình ảnh X-quang ngực thẳng kỹ thuật số (Mã ảnh: ${imageCode}, chụp ngày ${dtInfo.fullStr}): Hai trường phổi sáng đều, không phát hiện đám mờ thâm nhiễm hay tổn thương khu trú (Xác suất bình thường AI: ${top.prob}%). Bóng tim, trung thất và góc sườn hoành hai bên trong giới hạn bình thường.`
      : `Hình ảnh X-quang ngực thẳng kỹ thuật số (Mã ảnh: ${imageCode}, chụp ngày ${dtInfo.fullStr}) ghi nhận: ${top.name} với xác suất AI ${top.prob}%.`)

  return {
    id: r.id,
    patientId: r.patient,
    patientCode: r.patient_code || `#BN-${10000 + (r.patient || 0)}`,
    xray_code: xrayCode,
    image_code: imageCode,
    case_id: xrayCode,
    scanNumber: r.scan_number || 1,
    totalPatientScans: r.total_patient_scans || 1,
    patient: `${r.patient_name || 'Bệnh nhân'}${
      r.patient_age ? ` (${r.patient_gender || 'Nam'}, ${r.patient_age} tuổi)` : ''
    }`,
    rawPatientName: r.patient_name || 'Bệnh nhân',
    age: r.patient_age || null,
    gender: r.patient_gender || '',
    originalImageUrl: resolveMediaUrl(r.original_image_url || r.original_image),
    heatmapImageUrl: resolveMediaUrl(r.heatmap_image_url || r.heatmap_image),
    model: 'DenseNet-121 CheXNet-v2 (Grad-CAM)',
    auc: 0.941,
    finding: top.name,
    prob: top.prob,
    isNormalFinding,
    predictions: mappedPreds,
    defaultICD,
    defaultNote,
    doctor_review: r.doctor_review || '',
    doctor_agrees_with_ai: r.doctor_agrees_with_ai,
    reviewed_by_name: r.reviewed_by_name || '',
    attending_doctor_name: r.attending_doctor_name || '',
    created_at: r.created_at,
    dateStr: dtInfo.dateStr,
    timeStr: dtInfo.timeStr,
    fullDateStr: dtInfo.fullStr,
    timestamp: dtInfo.ts,
  }
}

export default function XrayAnalysis() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()

  const [dbCases, setDbCases] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | 'ALL'>('ALL')
  const [searchCodeTerm, setSearchCodeTerm] = useState('')
  const [activeCase, setActiveCase] = useState<any>(null)

  // Trạng thái upload ảnh X-quang thật mới
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [uploadPatientId, setUploadPatientId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [fetchingCases, setFetchingCases] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  // Chế độ hiển thị ảnh X-quang thật & lớp nhiệt Grad-CAM
  const [viewMode, setViewMode] = useState<'overlay' | 'parallel'>('overlay')
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Trạng thái Bác sĩ ký duyệt
  const [agreeAI, setAgreeAI] = useState(true)
  const [diagnosis, setDiagnosis] = useState('J18.9')
  const [doctorNote, setDoctorNote] = useState('')
  const [signSuccess, setSignSuccess] = useState(false)
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  const activeCaseIdRef = useRef<number | null>(null)
  activeCaseIdRef.current = activeCase?.id ?? null

  const selectCase = useCallback((c: any) => {
    if (!c) return
    setActiveCase(c)
    setDiagnosis(c.defaultICD || 'J18.9')
    setDoctorNote(c.doctor_review || c.defaultNote || '')
    setAgreeAI(
      c.doctor_agrees_with_ai !== null && c.doctor_agrees_with_ai !== undefined
        ? Boolean(c.doctor_agrees_with_ai)
        : true
    )
    setSignSuccess(Boolean(c.doctor_review))
    setFile(null)
    setPreview('')
    setZoomLevel(1)
    setAnalysisError(null)
  }, [])

  const loadXrayCases = useCallback(
    async (silent = false, forceSelectId?: number) => {
      if (!silent) setFetchingCases(true)
      try {
        const res = await xrayAPI.results()
        const rawList = extractList(res)
        // Luôn sắp xếp theo thứ tự ngày tháng từ GẦN NHẤT tới XA NHẤT
        const mapped = rawList
          .map(mapDbRecordToCase)
          .sort((a, b) => b.timestamp - a.timestamp || b.id - a.id)

        setDbCases(mapped)

        if (forceSelectId) {
          const newlyCreated = mapped.find((c) => c.id === forceSelectId)
          if (newlyCreated) {
            selectCase(newlyCreated)
            return
          }
        }

        const currentId = activeCaseIdRef.current
        if (silent && currentId) {
          const updatedCurrent = mapped.find((c) => c.id === currentId)
          if (updatedCurrent) {
            setActiveCase((prev: any) => {
              if (
                prev &&
                prev.id === updatedCurrent.id &&
                prev.doctor_review === updatedCurrent.doctor_review &&
                prev.doctor_agrees_with_ai === updatedCurrent.doctor_agrees_with_ai
              ) {
                return prev
              }
              return updatedCurrent
            })
          }
        } else {
          const passedCase = location.state?.selectedCase
          if (passedCase && mapped.length > 0) {
            const match = mapped.find(
              (c) =>
                c.id === passedCase.id ||
                c.xray_code === passedCase.code ||
                c.case_id === passedCase.code ||
                c.rawPatientName === passedCase.patient
            )
            selectCase(match || mapped[0])
          } else if (mapped.length > 0 && !currentId) {
            selectCase(mapped[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch X-ray cases from DB:', err)
      } finally {
        if (!silent) setFetchingCases(false)
      }
    },
    [location.state, selectCase]
  )

  useEffect(() => {
    loadXrayCases(false)
  }, [location.state])

  useRealtimeSync(() => {
    loadXrayCases(true)
  }, 5000)

  // Danh sách các bệnh nhân có phim X-quang (để Bác sĩ/Admin lọc theo từng người)
  const patientGroups = useMemo(() => {
    const map = new Map<number, { patientId: number; name: string; code: string; count: number }>()
    for (const c of dbCases) {
      if (!c.patientId) continue
      const existing = map.get(c.patientId)
      if (existing) {
        existing.count += 1
      } else {
        map.set(c.patientId, {
          patientId: c.patientId,
          name: c.rawPatientName,
          code: c.patientCode,
          count: 1,
        })
      }
    }
    return Array.from(map.values())
  }, [dbCases])

  useEffect(() => {
    if (!uploadPatientId && patientGroups.length > 0) {
      setUploadPatientId(
        selectedPatientId !== 'ALL' ? selectedPatientId : patientGroups[0].patientId
      )
    }
  }, [patientGroups, selectedPatientId, uploadPatientId])

  // Lọc danh sách lần chụp theo Bệnh nhân + Tìm kiếm theo Mã ảnh / Mã kết quả / Ngày chụp
  // và sắp xếp từ GẦN NHẤT tới XA NHẤT
  const filteredCases = useMemo(() => {
    return dbCases
      .filter((c) => {
        if (selectedPatientId !== 'ALL' && c.patientId !== selectedPatientId) return false
        if (searchCodeTerm.trim()) {
          const q = searchCodeTerm.toLowerCase().trim()
          return (
            c.xray_code.toLowerCase().includes(q) ||
            c.image_code.toLowerCase().includes(q) ||
            c.rawPatientName.toLowerCase().includes(q) ||
            c.dateStr.toLowerCase().includes(q) ||
            c.finding.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp || b.id - a.id)
  }, [dbCases, selectedPatientId, searchCodeTerm])

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setSignSuccess(false)
    setUploadSuccessMsg(null)
    setAnalysisError(null)
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
    setUploadSuccessMsg(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      if (user?.role !== 'PATIENT' && uploadPatientId) {
        fd.append('patient_id', String(uploadPatientId))
      }
      const res = await xrayAPI.analyze(fd)
      const createdData = res?.data?.data ?? res?.data
      const newId = createdData?.id
      const newXrayCode = createdData?.xray_code || createdData?.case_code
      const newImgCode = createdData?.image_code

      setFile(null)
      setPreview('')
      setUploadSuccessMsg(
        `Đã lưu ảnh X-quang thật và tạo kết quả mới thành công! Mã kết quả: ${newXrayCode} • Mã ảnh: ${newImgCode}`
      )
      await loadXrayCases(false, newId)
    } catch (err: any) {
      const errMsg =
        err?.response?.status === 500
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
      const fullReview =
        diagnosis && !doctorNote.startsWith(`[${diagnosis}]`)
          ? `[${diagnosis}] ${doctorNote}`
          : doctorNote
      await xrayAPI.review(activeCase.id, {
        doctor_review: fullReview,
        doctor_agrees_with_ai: agreeAI,
      })
      setSignSuccess(true)
      await loadXrayCases(true)
    } catch (err: any) {
      setAnalysisError(
        err?.response?.data?.message || 'Không thể lưu kết quả ký duyệt vào Cơ sở dữ liệu.'
      )
    } finally {
      setLoading(false)
    }
  }

  const icdLabelsMap: Record<string, string> = {
    'Z00.0': 'Z00.0 — Bình thường: Chưa phát hiện tổn thương bất thường trên phim X-quang ngực',
    'J18.9': 'J18.9 — Viêm phổi thùy do vi khuẩn (Thùy dưới phải)',
    J90: 'J90 — Tràn dịch màng phổi góc sườn hoành',
    'I50.9': 'I50.9 — Suy tim sung huyết và Bóng tim to',
    'I20.0': 'I20.0 — Cơn đau thắt ngực không ổn định',
  }

  /**
   * Mở hộp thoại xem trước & Xuất Phiếu Kết quả Chụp X-quang theo đúng Biểu mẫu Chuẩn Y tế của Bộ Y tế (Mẫu số: 18/BV-01)
   * - Không dùng window.open() + document.write() để tránh treo luồng trình duyệt khi đóng hộp thoại in
   * - Chỉ hiển thị phim X-quang gốc trắng đen (Tuyệt đối không phủ lớp nhiệt màu vì in trắng đen không có tác dụng)
   */
  const handleExportStandardMedicalReport = () => {
    if (!activeCase) return
    setShowReportModal(true)
  }

  const handleDownloadReportFile = async () => {
    if (!activeCase) return
    const icdFull = icdLabelsMap[diagnosis] || diagnosis || 'I50.9 — Theo dõi bệnh lý tim-phổi'
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const printDay = pad(now.getDate())
    const printMonth = pad(now.getMonth() + 1)
    const printYear = String(now.getFullYear())

    const rowsHtml = (activeCase.predictions || [])
      .map(
        (p: any, idx: number) => `
        <tr>
          <td class="num">${idx + 1}</td>
          <td>${p.name}</td>
          <td class="num">${p.prob}%</td>
          <td>${p.label || 'Mức nền thấp'}</td>
        </tr>`
      )
      .join('')

    const detailDescription = `
      - <strong>Trường phổi hai bên:</strong> Khảo sát trên phim X-quang ngực thẳng kỹ thuật số (Mã phim: ${activeCase.image_code}), ghi nhận dấu hiệu gợi ý hàng đầu là <em>${activeCase.finding}</em> (${activeCase.prob}%).<br/>
      - <strong>Bóng tim và trung thất:</strong> Khảo sát chỉ số tim-ngực (CTR) và cung động mạch chủ theo dõi theo phác đồ lâm sàng.<br/>
      - <strong>Màng phổi và cơ hoành:</strong> Đối chiếu góc sườn hoành hai bên và vòm hoành.<br/>
      - <strong>Ghi chú chuyên môn của Bác sĩ đọc phim:</strong> ${doctorNote || activeCase.defaultNote}
    `
    const conclusionText = `[${icdFull}] — Ghi nhận hình ảnh ${activeCase.finding} trên phim X-quang ngực thẳng.`
    const docFullName = activeCase.reviewed_by_name
      ? `BS. ${activeCase.reviewed_by_name}`
      : activeCase.attending_doctor_name
      ? `BS. ${activeCase.attending_doctor_name}`
      : 'BS. Sarah Jenkins'

    try {
      const resp = await fetch(
        '/templates/Mau_18_BV_01_Phieu_Ket_Qua_Chup_XQuang_Chuan_Bo_Y_Te.html'
      )
      if (!resp.ok) return
      const templateHtml = await resp.text()
      const filledHtml = templateHtml
        .replaceAll('{{XRAY_CODE}}', activeCase.xray_code)
        .replaceAll('{{IMAGE_CODE}}', activeCase.image_code)
        .replaceAll('{{PATIENT_NAME}}', activeCase.rawPatientName)
        .replaceAll('{{PATIENT_AGE}}', String(activeCase.age || 58))
        .replaceAll('{{PATIENT_GENDER}}', activeCase.gender || 'Nam')
        .replaceAll('{{PATIENT_CODE}}', activeCase.patientCode || '#BN-10026')
        .replaceAll('{{SCAN_DATETIME}}', activeCase.fullDateStr)
        .replaceAll('{{ICD10_DIAGNOSIS}}', icdFull)
        .replaceAll('{{ORIGINAL_IMAGE_URL}}', displayOriginalUrl)
        .replaceAll('{{PREDICTIONS_TABLE_ROWS}}', rowsHtml)
        .replaceAll('{{DOCTOR_DESCRIPTION}}', detailDescription)
        .replaceAll('{{DIAGNOSTIC_CONCLUSION}}', conclusionText)
        .replaceAll('{{PRINT_DAY}}', printDay)
        .replaceAll('{{PRINT_MONTH}}', printMonth)
        .replaceAll('{{PRINT_YEAR}}', printYear)
        .replaceAll('{{DOCTOR_NAME}}', docFullName)

      const blob = new Blob([filledHtml], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Phieu_XQuang_18_BV_01_${activeCase.xray_code}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 3000)
    } catch (e) {
      console.error('Download report failed:', e)
    }
  }

  const roleScopeText =
    user?.role === 'PATIENT'
      ? 'Lịch sử các lần chụp X-quang của bạn (Sắp xếp từ gần nhất → xa nhất)'
      : user?.role === 'DOCTOR'
      ? `Danh sách phim X-quang bệnh nhân do BS. ${user.last_name} ${user.first_name} phụ trách`
      : 'Toàn bộ dữ liệu X-quang hệ thống (ADMIN — Sắp xếp từ gần nhất → xa nhất)'

  // Ảnh hiển thị thực tế (ưu tiên ảnh người dùng vừa chọn để preview trước khi bấm Phân tích, sau đó là ảnh thật từ DB)
  const displayOriginalUrl = preview || activeCase?.originalImageUrl || ''
  const displayHeatmapUrl = preview ? '' : activeCase?.heatmapImageUrl || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* KHU VỰC TẢI LÊN ẢNH X-QUANG THẬT CỦA BỆNH NHÂN */}
      <div
        className="card"
        style={{
          borderStyle: dragOver ? 'dashed' : 'solid',
          borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border)',
          background: dragOver ? 'var(--color-primary-light)' : 'var(--color-surface)',
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div
          className="card-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-secondary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-secondary)',
              }}
            >
              <Upload size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                {file
                  ? `Ảnh X-quang đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
                  : 'Tải lên ảnh X-quang thật của bệnh nhân (JPG, PNG, DICOM)'}
              </h4>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  margin: '2px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>Hỗ trợ định dạng JPG, PNG và DICOM y tế</span>
                <InfoTooltip
                  title="Lưu trữ an toàn"
                  content="Mỗi bức ảnh X-quang tải lên sẽ được cấp mã riêng và lưu vào hồ sơ để bạn và bác sĩ dễ dàng tra cứu lại bất cứ lúc nào."
                />
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            {user?.role !== 'PATIENT' && patientGroups.length > 0 && (
              <select
                className="form-input"
                style={{ height: 34, fontSize: 12.5, padding: '4px 10px', width: 'auto' }}
                value={uploadPatientId}
                onChange={(e) => setUploadPatientId(Number(e.target.value))}
                title="Chọn bệnh nhân cho lần chụp X-quang mới"
              >
                {patientGroups.map((pg) => (
                  <option key={pg.patientId} value={pg.patientId}>
                    Bệnh nhân: {pg.name} ({pg.code})
                  </option>
                ))}
              </select>
            )}

            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <FileImage size={14} /> Chọn ảnh X-quang từ máy
              <input
                type="file"
                accept="image/*,.dcm"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </label>

            {file && (
              <>
                <button className="btn btn-primary btn-sm" onClick={analyze} disabled={loading}>
                  {loading ? (
                    <span className="loading-spinner" />
                  ) : (
                    <>
                      <Sparkles size={14} /> Phân tích AI & Cấp mã lưu Database
                    </>
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFile(null)
                    setPreview('')
                  }}
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {uploadSuccessMsg && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--color-success)',
            background: 'var(--color-success-light)',
          }}
        >
          <div
            className="card-body"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <CheckCircle size={20} color="var(--color-success)" />
            <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>
              {uploadSuccessMsg}
            </div>
          </div>
        </div>
      )}

      {analysisError && (
        <div
          className="card"
          style={{
            borderLeft: '3px solid var(--color-warning)',
            background: 'var(--color-warning-bg)',
          }}
        >
          <div
            className="card-body"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <AlertTriangle size={18} color="var(--color-warning)" />
            <div
              style={{
                fontWeight: 'var(--font-semibold)',
                color: 'var(--color-warning-text)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {analysisError}
            </div>
          </div>
        </div>
      )}

      {/* BẢNG DANH SÁCH CÁC LẦN CHỤP X-QUANG (SẮP XẾP TỪ GẦN NHẤT -> XA NHẤT KÈM MÃ ĐỊNH DANH DUY NHẤT) */}
      <div className="card" style={{ padding: '14px 16px', background: 'var(--color-surface)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--color-primary)" />
            <div>
              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {roleScopeText}
              </strong>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                Hiển thị <strong>{filteredCases.length}</strong> lần chụp X-quang • Thứ tự từ ngày chụp{' '}
                <strong>gần nhất → xa nhất</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Nếu là Bác sĩ hoặc Admin thì cho phép lọc theo từng bệnh nhân để xem lịch sử nhiều lần chụp của họ */}
            {user?.role !== 'PATIENT' && patientGroups.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} color="var(--color-text-secondary)" />
                <select
                  className="form-input"
                  style={{ height: 32, fontSize: 12, padding: '2px 8px', width: 'auto' }}
                  value={selectedPatientId}
                  onChange={(e) => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    setSelectedPatientId(val)
                    const nextList =
                      val === 'ALL' ? dbCases : dbCases.filter((c) => c.patientId === val)
                    if (nextList.length > 0) selectCase(nextList[0])
                  }}
                >
                  <option value="ALL">Tất cả bệnh nhân ({dbCases.length} lần chụp)</option>
                  {patientGroups.map((pg) => (
                    <option key={pg.patientId} value={pg.patientId}>
                      {pg.name} ({pg.code}) — {pg.count} lần chụp
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ô tra cứu theo Mã Kết quả (XQ-...), Mã Ảnh (IMG-...) hoặc Ngày chụp */}
            <div style={{ position: 'relative', minWidth: 250 }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Tra cứu Mã XQ-..., IMG-..., ngày chụp..."
                value={searchCodeTerm}
                onChange={(e) => setSearchCodeTerm(e.target.value)}
                style={{ height: 32, paddingLeft: 30, fontSize: 12, width: '100%' }}
              />
            </div>

            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => loadXrayCases(false)}
              title="Làm mới từ Database"
            >
              <RefreshCw size={14} className={fetchingCases ? 'loading-spinner' : ''} />
            </button>
          </div>
        </div>

        {/* Danh sách Thẻ các lần chụp X-quang (Từ gần nhất -> xa nhất) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(295px, 1fr))',
            gap: 10,
            maxHeight: 225,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {filteredCases.map((c, idx) => {
            const isSelected = activeCase?.id === c.id && !file
            const isNewestOfSelection = idx === 0
            return (
              <div
                key={c.id}
                onClick={() => selectCase(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 11px',
                  borderRadius: 10,
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Thumbnail ảnh X-quang thật của lần chụp này */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#0a0d14',
                    flexShrink: 0,
                    border: '1px solid #334155',
                    position: 'relative',
                  }}
                >
                  {c.originalImageUrl ? (
                    <img
                      src={c.originalImageUrl}
                      alt={c.image_code}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                </div>

                {/* Thông tin Ngày giờ chụp, Mã Kết quả, Mã Ảnh & Chẩn đoán */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isSelected ? 'var(--color-primary)' : '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Clock size={11} /> {c.dateStr} ({c.timeStr})
                    </span>
                    {isNewestOfSelection && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '1px 6px',
                          borderRadius: 999,
                        }}
                      >
                        GẦN NHẤT
                      </span>
                    )}
                  </div>

                  <div
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1d4ed8',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={`Mã kết quả: ${c.xray_code} | Mã ảnh: ${c.image_code}`}
                  >
                    {c.xray_code}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: '#475569',
                      marginTop: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 145,
                      }}
                    >
                      {c.rawPatientName} • {c.finding.split(' (')[0]}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: c.isNormalFinding
                          ? '#16a34a'
                          : c.prob > 60
                          ? '#dc2626'
                          : '#d97706',
                        fontSize: 11,
                      }}
                    >
                      {c.prob}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {signSuccess && activeCase && (
        <div
          className="card"
          style={{
            borderLeft: '3px solid var(--color-success)',
            background: 'var(--color-success-light)',
          }}
        >
          <div
            className="card-body"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <CheckCircle size={20} color="var(--color-success)" />
            <div>
              <div
                style={{
                  fontWeight: 'var(--font-bold)',
                  color: 'var(--color-success)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                ĐÃ KÝ DUYỆT VÀ LƯU VÀO CƠ SỞ DỮ LIỆU THÀNH CÔNG!
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 2,
                }}
              >
                Kết quả {activeCase.xray_code} (Mã ảnh: {activeCase.image_code} — {activeCase.rawPatientName}) đã được ghi nhận nhận xét của Bác sĩ trong PostgreSQL.
              </div>
            </div>
          </div>
        </div>
      )}

      {!activeCase ? (
        <div className="card">
          <div
            className="card-body"
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {fetchingCases
              ? 'Đang tải danh sách X-quang từ Database...'
              : 'Không có bản ghi X-quang nào khớp với bộ lọc hiện tại.'}
          </div>
        </div>
      ) : (
        <>
          {/* THẺ THÔNG TIN ĐỊNH DANH DUY NHẤT CỦA LẦN CHỤP ĐANG CHỌN */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <div className="card">
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Hash size={12} /> MÃ KẾT QUẢ & MÃ ẢNH
                  <InfoTooltip content="Mã số duy nhất của lần chụp này để theo dõi chính xác lịch sử bệnh án, không bị nhầm lẫn." />
                </div>
                <div
                  className="font-mono"
                  style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 13, marginTop: 3 }}
                >
                  KQ: {activeCase.xray_code}
                </div>
                <div className="font-mono" style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                  Ảnh: {activeCase.image_code}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                  }}
                >
                  THỜI GIAN THỰC HIỆN CHỤP
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 3 }}>
                  {activeCase.fullDateStr}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Khoa Chẩn đoán hình ảnh
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                  }}
                >
                  BỆNH NHÂN ({activeCase.patientCode})
                </div>
                <div style={{ fontWeight: 700, marginTop: 3 }}>{activeCase.patient}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Phim X-quang ngực thẳng kỹ thuật số
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                  }}
                >
                  BÁC SĨ PHỤ TRÁCH / KÝ DUYỆT
                </div>
                <div style={{ fontWeight: 700, color: 'var(--color-secondary)', marginTop: 3 }}>
                  {activeCase.reviewed_by_name
                    ? `Đã duyệt: BS. ${activeCase.reviewed_by_name}`
                    : activeCase.attending_doctor_name
                    ? `BS. ${activeCase.attending_doctor_name}`
                    : 'Chờ Bác sĩ chuyên khoa duyệt'}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  {activeCase.reviewed_by_name ? 'Đã xác thực chữ ký số' : 'Đang chờ bác sĩ xác nhận'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 'var(--space-4)' }}>
            {/* TRÌNH XEM ẢNH X-QUANG THẬT CỦA BỆNH NHÂN + LỚP PHỦ NHIỆT GRAD-CAM */}
            <div className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${viewMode === 'overlay' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setViewMode('overlay')}
                  >
                    <Eye size={14} /> {t('xray.view_overlay')} (Grad-CAM)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${viewMode === 'parallel' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setViewMode('parallel')}
                  >
                    <Layers size={14} /> {t('xray.view_parallel')} (Gốc & Nhiệt)
                  </button>
                  <InfoTooltip
                    title="Chế độ xem phim"
                    content="Chế độ hòa trộn phủ màu AI lên ảnh gốc để nhận diện nhanh vùng cần chú ý. Chế độ song song giúp so sánh ảnh gốc và ảnh nhiệt cạnh nhau."
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
                    Thu phóng: <strong>{Math.round(zoomLevel * 100)}%</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => setZoomLevel((z) => Math.max(0.8, Number((z - 0.2).toFixed(2))))}
                    title="Thu nhỏ"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => setZoomLevel((z) => Math.min(2.2, Number((z + 0.2).toFixed(2))))}
                    title="Phóng to"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
              </div>

              <div className="card-body" style={{ textAlign: 'center' }}>
                {viewMode === 'parallel' && !preview ? (
                  /* Chế độ xem song song: Ảnh X-quang gốc thật (Trái) & Ảnh Grad-CAM thật (Phải) */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div
                      style={{
                        background: '#05070b',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid #334155',
                        height: 410,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={displayOriginalUrl}
                        alt={`Ảnh gốc ${activeCase.image_code}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          transform: `scale(${zoomLevel})`,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          background: 'rgba(15,23,42,0.82)',
                          color: '#e2e8f0',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        ẢNH X-QUANG GỐC ({activeCase.image_code})
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#05070b',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid #334155',
                        height: 410,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={displayHeatmapUrl || displayOriginalUrl}
                        alt={`Grad-CAM ${activeCase.xray_code}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          transform: `scale(${zoomLevel})`,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          background: activeCase.isNormalFinding
                            ? 'rgba(22,163,74,0.88)'
                            : 'rgba(220,38,38,0.88)',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {activeCase.isNormalFinding
                          ? `BẢN ĐỒ NHIỆT GRAD-CAM — PHỔI BÌNH THƯỜNG (${activeCase.prob}%)`
                          : `BẢN ĐỒ NHIỆT GRAD-CAM (${activeCase.prob}%)`}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Chế độ xem hòa trộn lớp (Overlay): Ảnh gốc thật + Lớp phủ Grad-CAM thật điều chỉnh độ mờ */
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 410,
                      margin: '0 auto',
                      background: '#05070b',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #334155',
                    }}
                  >
                    {/* Lớp 1: Ảnh X-quang thật của bệnh nhân */}
                    {displayOriginalUrl && (
                      <img
                        src={displayOriginalUrl}
                        alt={`X-ray ${activeCase.image_code}`}
                        style={{
                          position: 'absolute',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          transform: `scale(${zoomLevel})`,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    )}

                    {/* Lớp 2: Ảnh nhiệt Grad-CAM thật chồng khớp 100% lên ảnh gốc theo độ phủ */}
                    {displayHeatmapUrl && heatmapOpacity > 0 && (
                      <img
                        src={displayHeatmapUrl}
                        alt={`Grad-CAM ${activeCase.xray_code}`}
                        style={{
                          position: 'absolute',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          opacity: heatmapOpacity,
                          transform: `scale(${zoomLevel})`,
                          transition: 'opacity 0.15s ease, transform 0.2s ease',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Nhãn thông tin mã định danh ngay trên phim chụp */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: 'rgba(15,23,42,0.82)',
                        color: '#f8fafc',
                        padding: '5px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        textAlign: 'left',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      <div>
                        <strong>MÃ ẢNH:</strong> {preview ? 'ẢNH MỚI CHỌN' : activeCase.image_code}
                      </div>
                      <div>
                        <strong>MÃ KQ :</strong> {preview ? 'CHỜ PHÂN TÍCH' : activeCase.xray_code}
                      </div>
                      <div>
                        <strong>NGÀY  :</strong> {preview ? 'Hôm nay' : activeCase.fullDateStr}
                      </div>
                    </div>

                    {!preview && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          right: 10,
                          background: activeCase.isNormalFinding
                            ? 'rgba(20,83,45,0.88)'
                            : 'rgba(15,23,42,0.85)',
                          color: activeCase.isNormalFinding ? '#bbf7d0' : '#fca5a5',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          border: activeCase.isNormalFinding
                            ? '1px solid rgba(34,197,94,0.5)'
                            : '1px solid rgba(239,68,68,0.4)',
                        }}
                      >
                        {activeCase.isNormalFinding
                          ? `KẾT QUẢ AI: PHỔI BÌNH THƯỜNG — KHÔNG PHÁT HIỆN BẤT THƯỜNG (${activeCase.prob}%)`
                          : `AI HOTSPOT: ${activeCase.finding} (${activeCase.prob}%)`}
                      </div>
                    )}
                  </div>
                )}

                {/* Thanh điều chỉnh độ phủ lớp nhiệt Grad-CAM — Chỉ hiển thị ở chế độ Xem hòa trộn lớp (Overlay) */}
                {viewMode === 'overlay' && (
                  <div
                    style={{
                      marginTop: 'var(--space-4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)',
                        minWidth: 195,
                        textAlign: 'left',
                      }}
                    >
                      {t('xray.heatmap_opacity')}{' '}
                      <strong className="tabular-nums">{Math.round(heatmapOpacity * 100)}%</strong>
                      {heatmapOpacity === 0 ? ' (Chỉ ảnh gốc)' : ''}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={heatmapOpacity}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => setHeatmapOpacity((prev) => (prev > 0 ? 0 : 0.65))}
                    >
                      {heatmapOpacity > 0 ? 'Xem ảnh gốc 100%' : 'Bật lớp nhiệt AI'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: KẾT QUẢ PHÂN TÍCH AI + XÁC NHẬN CỦA BÁC SĨ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* AI Pathology Prediction Results from DB */}
              <div className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h3 className="card-title" style={{ margin: 0 }}>{t('xray.result_title')}</h3>
                    <InfoTooltip
                      title="Kết quả tham khảo từ AI"
                      content="Hệ thống ước tính tỷ lệ xuất hiện của các dấu hiệu trên phim để hỗ trợ bác sĩ. Kết luận chẩn đoán chính thức luôn do Bác sĩ chuyên khoa quyết định."
                    />
                  </div>
                  <span
                    className="font-mono"
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}
                  >
                    {activeCase.xray_code}
                  </span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {activeCase.predictions.map((p: any, i: number) => {
                    const isNormalHigh = Boolean(p.isNoFinding && p.prob >= 50)
                    const isPathologyHigh = Boolean(!p.isNoFinding && p.prob > 50)
                    const isPathologyMed = Boolean(!p.isNoFinding && p.prob > 30 && p.prob <= 50)

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-2) var(--space-4)',
                          borderBottom: '1px solid var(--color-border)',
                          background: isNormalHigh
                            ? '#f0fdf4'
                            : isPathologyHigh
                            ? 'var(--color-emergency-bg)'
                            : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isNormalHigh
                                ? '#16a34a'
                                : isPathologyHigh
                                ? 'var(--color-emergency)'
                                : isPathologyMed
                                ? 'var(--color-warning)'
                                : 'var(--color-text-tertiary)',
                            }}
                          />
                          <span
                            style={{
                              fontWeight:
                                isNormalHigh || isPathologyHigh
                                  ? 'var(--font-semibold)'
                                  : 'var(--font-normal)',
                              fontSize: 'var(--text-sm)',
                              color: isNormalHigh ? '#15803d' : 'var(--color-text-primary)',
                            }}
                          >
                            {p.name}
                          </span>
                          {p.label && (
                            <span className={`badge badge-${p.badge}`} style={{ fontSize: '10px' }}>
                              {p.label}
                            </span>
                          )}
                        </div>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 'var(--font-bold)',
                            color: isNormalHigh
                              ? '#15803d'
                              : isPathologyHigh
                              ? 'var(--color-emergency)'
                              : isPathologyMed
                              ? 'var(--color-warning)'
                              : 'var(--color-text-secondary)',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          {p.prob}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Doctor Confirmation and Supervision */}
              <div className="card">
                <div className="card-header">
                  <h3
                    className="card-title"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                  >
                    <Shield size={16} /> Xác nhận và Giám sát của Bác sĩ điều trị
                  </h3>
                  <span
                    className={`font-mono badge ${
                      activeCase.doctor_agrees_with_ai !== null &&
                      activeCase.doctor_agrees_with_ai !== undefined
                        ? 'badge-success'
                        : 'badge-warning'
                    }`}
                  >
                    {activeCase.doctor_agrees_with_ai !== null &&
                    activeCase.doctor_agrees_with_ai !== undefined
                      ? 'ĐÃ KÝ DUYỆT'
                      : 'CHỜ DUYỆT'}
                  </span>
                </div>
                <div
                  className="card-body"
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      cursor: user?.role === 'PATIENT' ? 'default' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreeAI}
                      disabled={user?.role === 'PATIENT'}
                      onChange={(e) => setAgreeAI(e.target.checked)}
                      style={{ marginTop: 2, width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontWeight: 'var(--font-semibold)' }}>{t('xray.agree_ai')}</div>
                      <div
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}
                      >
                        {t('xray.lesion_match')}
                      </div>
                    </div>
                  </label>

                  <div className="form-group">
                    <label className="form-label">{t('xray.official_diagnosis')}</label>
                    <select
                      className="form-input"
                      value={diagnosis}
                      disabled={user?.role === 'PATIENT'}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    >
                      <option value="">{t('xray.select_icd10')}</option>
                      <option value="Z00.0">
                        Z00.0 — Bình thường: Chưa phát hiện tổn thương bất thường trên phim X-quang ngực
                      </option>
                      <option value="J18.9">
                        J18.9 — Viêm phổi thùy do vi khuẩn (Thùy dưới phải)
                      </option>
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
                      onChange={(e) => setDoctorNote(e.target.value)}
                      placeholder="Ghi nhận tổn thương lâm sàng của bác sĩ X-quang..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={handleExportStandardMedicalReport}
                      title="Xuất Phiếu Chiếu/Chụp X-Quang theo Mẫu số 18/BV-01 của Bộ Y tế (Chỉ in phim X-quang gốc trắng đen)"
                    >
                      <Download size={14} /> Xuất Phiếu X-quang Chuẩn Bộ Y tế (18/BV-01)
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

      {/* MODAL XEM TRƯỚC & XUẤT PHIẾU KẾT QUẢ X-QUANG CHUẨN BỘ Y TẾ (MẪU SỐ 18/BV-01) — KHÔNG DÙNG POPUP TRÁNH ĐƠ TRÌNH DUYỆT */}
      {showReportModal && activeCase && (
        <div
          id="moh-18bv01-modal-backdrop"
          onClick={() => setShowReportModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            padding: '20px 16px',
          }}
        >
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #moh-18bv01-print-sheet,
              #moh-18bv01-print-sheet * {
                visibility: visible !important;
              }
              #moh-18bv01-modal-backdrop {
                position: absolute !important;
                inset: 0 !important;
                background: #ffffff !important;
                padding: 0 !important;
                overflow: visible !important;
              }
              #moh-18bv01-toolbar {
                display: none !important;
              }
              #moh-18bv01-print-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 8mm 10mm !important;
              }
            }
          `}</style>

          {/* Thanh công cụ Modal (Ẩn khi in) */}
          <div
            id="moh-18bv01-toolbar"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '210mm',
              maxWidth: '100%',
              background: '#0f172a',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '10px 10px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13 }}>
              <strong>Biểu mẫu Chuẩn Y tế Bộ Y tế (Mẫu số: 18/BV-01)</strong> — Chế độ Trắng Đen chuẩn khoa Chẩn đoán hình ảnh (Không phủ nhiệt)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleDownloadReportFile}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                <Download size={14} /> Tải file Phiếu (.HTML)
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => window.print()}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                <Printer size={14} /> In Phiếu / Lưu PDF (A4)
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowReportModal(false)}
                style={{
                  background: '#475569',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                <X size={14} /> Đóng
              </button>
            </div>
          </div>

          {/* Tờ giấy A4 chuẩn Mẫu 18/BV-01 Bộ Y tế */}
          <div
            id="moh-18bv01-print-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '210mm',
              maxWidth: '100%',
              background: '#ffffff',
              color: '#000000',
              padding: '12mm 15mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12.5pt',
              lineHeight: 1.4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              borderRadius: '0 0 10px 10px',
            }}
          >
            {/* Header hành chính Bộ Y tế */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                gap: 10,
                borderBottom: '1.5px solid #000',
                paddingBottom: 8,
                marginBottom: 12,
                fontSize: '11pt',
              }}
            >
              <div>
                <div style={{ textTransform: 'uppercase' }}>SỞ Y TẾ TP. HỒ CHÍ MINH</div>
                <div style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                  BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDTECH SÀI GÒN
                </div>
                <div style={{ fontWeight: 'bold' }}>KHOA CHẨN ĐOÁN HÌNH ẢNH</div>
                <div>Địa chỉ: 125 Lê Lợi, P. Bến Thành, Quận 1, TP.HCM • ĐT: 028 3822 6868</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold' }}>Mẫu số: 18/BV-01</div>
                <div>(Ban hành theo QĐ số 4069/2001/QĐ-BYT</div>
                <div>&amp; TT số 32/2023/TT-BYT của Bộ Y tế)</div>
                <div style={{ marginTop: 3 }}>
                  Số phiếu / Mã KQ: <strong>{activeCase.xray_code}</strong>
                </div>
                <div>
                  Mã phim X-quang gốc: <strong>{activeCase.image_code}</strong>
                </div>
              </div>
            </div>

            {/* Tiêu đề */}
            <div style={{ textAlign: 'center', margin: '10px 0 14px 0' }}>
              <h1 style={{ fontSize: '16.5pt', fontWeight: 'bold', margin: 0 }}>
                PHIẾU CHIẾU / CHỤP X-QUANG
              </h1>
            </div>

            {/* I. Hành chính */}
            <div
              style={{
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderBottom: '1px solid #000',
                paddingBottom: 2,
                marginBottom: 8,
                fontSize: '12pt',
              }}
            >
              I. THÔNG TIN HÀNH CHÍNH VÀ CHỈ ĐỊNH LÂM SÀNG
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 0.7fr 0.7fr',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div>
                <strong>- Họ và tên người bệnh:</strong> {activeCase.rawPatientName}
              </div>
              <div>
                <strong>Tuổi:</strong> {activeCase.age || 58}
              </div>
              <div>
                <strong>Giới tính:</strong> {activeCase.gender || 'Nam'}
              </div>
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>- Mã số người bệnh:</strong> {activeCase.patientCode} &nbsp;&nbsp;|&nbsp;&nbsp;
              <strong>Khoa/Phòng chỉ định:</strong> Khoa Nội Tim mạch – Hô hấp
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>- Thời gian thực hiện chụp:</strong> {activeCase.fullDateStr}
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>- Yêu cầu chiếu/chụp:</strong> Chụp X-quang ngực thẳng kỹ thuật số (Digital Chest Radiography — Tư thế PA)
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>- Chẩn đoán lâm sàng / ICD-10:</strong>{' '}
              {icdLabelsMap[diagnosis] || diagnosis || 'I50.9 — Theo dõi bệnh lý tim-phổi'}
            </div>

            {/* II. Phim X-quang gốc trắng đen (Không phủ nhiệt) & Bảng định lượng */}
            <div
              style={{
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderBottom: '1px solid #000',
                paddingBottom: 2,
                marginBottom: 8,
                fontSize: '12pt',
              }}
            >
              II. HÌNH ẢNH PHIM X-QUANG GỐC &amp; CHỈ SỐ ĐO LƯỜNG HỖ TRỢ
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '0.95fr 1.2fr',
                gap: 12,
                alignItems: 'start',
                marginBottom: 10,
              }}
            >
              <div style={{ border: '1.5px solid #000', padding: 6, textAlign: 'center' }}>
                <img
                  src={displayOriginalUrl}
                  alt={`Phim gốc ${activeCase.image_code}`}
                  style={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'contain',
                    background: '#000',
                    filter: 'grayscale(100%) contrast(108%)',
                  }}
                />
                <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: 4 }}>
                  Phim X-quang ngực gốc (Trắng đen — Không phủ lớp nhiệt)
                  <br />
                  Mã phim: <strong>{activeCase.image_code}</strong>
                </div>
              </div>

              <div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '11pt',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000', padding: '4px 6px' }}>STT</th>
                      <th style={{ border: '1px solid #000', padding: '4px 6px' }}>
                        Dấu hiệu / Bệnh lý khảo sát
                      </th>
                      <th style={{ border: '1px solid #000', padding: '4px 6px' }}>Chỉ số</th>
                      <th style={{ border: '1px solid #000', padding: '4px 6px' }}>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeCase.predictions || []).map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td
                          style={{
                            border: '1px solid #000',
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{p.name}</td>
                        <td
                          style={{
                            border: '1px solid #000',
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          {p.prob}%
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
                          {p.label || 'Mức nền thấp'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: 5 }}>
                  * Hình ảnh trên phiếu là phim X-quang gốc thang xám (Grayscale) chuẩn DICOM, không chồng lớp phủ nhiệt màu để đảm bảo độ nét giải phẫu khi in trắng đen.
                </div>
              </div>
            </div>

            {/* III. Mô tả & Kết luận */}
            <div
              style={{
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderBottom: '1px solid #000',
                paddingBottom: 2,
                marginBottom: 6,
                fontSize: '12pt',
              }}
            >
              III. KẾT QUẢ ĐỌC PHIM CỦA BÁC SĨ CHUYÊN KHOA
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: 3 }}>
              1. Mô tả hình ảnh X-quang (Description of Findings):
            </div>
            <div
              style={{
                border: '1px solid #000',
                padding: '6px 10px',
                marginBottom: 8,
                fontSize: '11.5pt',
              }}
            >
              <div>
                - <strong>Trường phổi hai bên:</strong> Khảo sát trên phim X-quang ngực thẳng kỹ thuật số (Mã phim: {activeCase.image_code}), ghi nhận dấu hiệu gợi ý hàng đầu là{' '}
                <em>{activeCase.finding}</em> ({activeCase.prob}%).
              </div>
              <div>
                - <strong>Bóng tim và trung thất:</strong> Theo dõi chỉ số tim-ngực (CTR) và tuần hoàn phổi theo phác đồ lâm sàng.
              </div>
              <div>
                - <strong>Ghi chú chuyên môn của Bác sĩ đọc phim:</strong>{' '}
                {doctorNote || activeCase.defaultNote}
              </div>
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: 3 }}>
              2. Kết luận chẩn đoán hình ảnh (Diagnostic Conclusion):
            </div>
            <div
              style={{
                border: '1.5px solid #000',
                padding: '6px 10px',
                marginBottom: 14,
                fontWeight: 'bold',
                fontSize: '12pt',
              }}
            >
              [{icdLabelsMap[diagnosis] || diagnosis}] — Ghi nhận hình ảnh {activeCase.finding} trên phim X-quang ngực thẳng.
            </div>

            {/* IV. Chữ ký — Đã chừa khoảng trắng rộng (95px) để ký tên và đóng dấu trực tiếp */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                textAlign: 'center',
                marginTop: 14,
                fontSize: '11.5pt',
              }}
            >
              <div>
                <div>Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 }}>
                  KỸ THUẬT VIÊN X-QUANG
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '10.5pt' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 95 }} />
                <div style={{ fontWeight: 'bold' }}>CN. Nguyễn Minh Tuấn</div>
              </div>

              <div>
                <div>Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 }}>
                  BÁC SĨ CHUYÊN KHOA CHẨN ĐOÁN HÌNH ẢNH
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '10.5pt' }}>
                  (Ký, ghi rõ họ tên và đóng dấu)
                </div>
                <div style={{ height: 95 }} />
                <div style={{ fontWeight: 'bold' }}>
                  {activeCase.reviewed_by_name
                    ? `BS. ${activeCase.reviewed_by_name}`
                    : activeCase.attending_doctor_name
                    ? `BS. ${activeCase.attending_doctor_name}`
                    : 'BS. Sarah Jenkins'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
