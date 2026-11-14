import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, appointmentAPI, chatAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import InfoTooltip from '../components/InfoTooltip'
import {
  MapPin, Clock,
  Zap, Shield, CheckCircle, Calendar, RefreshCw,
  X, User, Sparkles, Navigation, UserCheck
} from 'lucide-react'

// Avatar chân dung y khoa chuyên nghiệp theo tên Bác sĩ
const DOCTOR_AVATARS: Record<string, string> = {
  'Vance Marcus': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  'Tran Quoc Toan': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
  'Lindqvist Marc': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  'Jenkins Sarah': 'https://images.unsplash.com/photo-1594824813637-4b77f98e0965?w=150&auto=format&fit=crop&q=80',
  'Văn B Trần': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
  'Thị Hoa Phạm': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  'Văn Dũng Lê': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=150&auto=format&fit=crop&q=80',
  'Thị Cẩm Nguyễn': 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150&auto=format&fit=crop&q=80',
  'Nam Nguyễn Hoàng': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  'Ngọc Trần Bảo': 'https://images.unsplash.com/photo-1594824813637-4b77f98e0965?w=150&auto=format&fit=crop&q=80',
  'Khải Phạm Quang': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  'Tuyết Lê Thị Minh': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
}

// Tọa độ phòng khám bệnh viện
const CLINIC_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Bệnh viện Chợ Rẫy': { lat: 10.7578, lng: 106.6597 },
  'Bệnh viện Đại học Y Dược TP.HCM (Cơ sở 1)': { lat: 10.7553, lng: 106.6645 },
  'Bệnh viện Đa khoa Quốc tế MedTech Sài Gòn': { lat: 10.7732, lng: 106.6983 },
}

// Tính khoảng cách Haversine (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

export default function SmartBooking() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [symptoms, setSymptoms] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [radius, setRadius] = useState(15) // Bán kính km mặc định

  // Tọa độ bệnh nhân (mặc định trung tâm Quận 1, TP.HCM: 10.7769, 106.7009)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 10.7769, lng: 106.7009 })

  // AI symptom analyzer state
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [aiSuggestedSpecialty, setAiSuggestedSpecialty] = useState<string | null>(null)
  const aiDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [doctors, setDoctors] = useState<any[]>([])
  const [myAppointments, setMyAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [bookingDocForModal, setBookingDocForModal] = useState<any | null>(null)
  const [bookerNameInput, setBookerNameInput] = useState('')
  const [patientNameInput, setPatientNameInput] = useState('')
  const [symptomInput, setSymptomInput] = useState('')
  const [slotInModal, setSlotInModal] = useState<any | null>(null)

  // Lấy vị trí thực tế của người dùng qua trình duyệt nếu được cấp quyền
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          // Giữ vị trí TP.HCM mặc định
        },
        { timeout: 5000 }
      )
    }
  }, [])

  // Tích hợp Chatbot AI đọc triệu chứng và tự động lọc khoa khám phù hợp
  useEffect(() => {
    const text = symptoms.trim()
    if (!text || text.length < 2) {
      setAiSuggestedSpecialty(null)
      return
    }

    // 1. Phản hồi nhanh tức thì dựa trên từ điển triệu chứng y khoa mở rộng
    const lower = text.toLowerCase()
    let immediateMatch: string | null = null

    if (
      lower.includes('nhuc dau') || lower.includes('nhức đầu') ||
      lower.includes('dau dau') || lower.includes('đau đầu') ||
      lower.includes('nua dau') || lower.includes('nửa đầu') ||
      lower.includes('choang vang') || lower.includes('choáng váng') ||
      lower.includes('hoa mat') || lower.includes('hoa mắt') ||
      lower.includes('chong mat') || lower.includes('chóng mặt') ||
      lower.includes('mat ngu') || lower.includes('mất ngủ') ||
      lower.includes('tien dinh') || lower.includes('tiền đình') ||
      lower.includes('than kinh') || lower.includes('thần kinh')
    ) {
      immediateMatch = 'Nội Thần kinh'
    } else if (
      lower.includes('an khong ngon') || lower.includes('ăn không ngon') ||
      lower.includes('chan an') || lower.includes('chán ăn') ||
      lower.includes('da day') || lower.includes('dạ dày') ||
      lower.includes('bao tu') || lower.includes('bao tử') ||
      lower.includes('tieu hoa') || lower.includes('tiêu hóa') ||
      lower.includes('bung') || lower.includes('bụng') ||
      lower.includes('buon non') || lower.includes('buồn nôn') ||
      lower.includes('day bung') || lower.includes('đầy bụng') ||
      lower.includes('tieu chay') || lower.includes('tiêu chảy') ||
      lower.includes('trao nguoc') || lower.includes('trào ngược')
    ) {
      immediateMatch = 'Tiêu hóa - Gan mật'
    } else if (
      lower.includes('nguc') || lower.includes('ngực') ||
      lower.includes('tim') || lower.includes('huyet ap') ||
      lower.includes('huyết áp') || lower.includes('hoi hop') || lower.includes('hồi hộp') ||
      lower.includes('dap nhanh') || lower.includes('đập nhanh')
    ) {
      immediateMatch = 'Nội Tim mạch'
    } else if (
      lower.includes('khop') || lower.includes('khớp') ||
      lower.includes('lung') || lower.includes('lưng') ||
      lower.includes('xuong') || lower.includes('xương') ||
      lower.includes('vai gay') || lower.includes('vai gáy') ||
      lower.includes('moi goi') || lower.includes('mỏi gối') ||
      lower.includes('cot song') || lower.includes('cột sống')
    ) {
      immediateMatch = 'Cơ xương khớp'
    } else if (
      lower.includes('ho') || lower.includes('viem hong') || lower.includes('viêm họng') ||
      lower.includes('dau hong') || lower.includes('đau họng') ||
      lower.includes('nghet mui') || lower.includes('nghẹt mũi') ||
      lower.includes('so mui') || lower.includes('sổ mũi') ||
      lower.includes('viem xoang') || lower.includes('viêm xoang') ||
      lower.includes('amidan') || lower.includes('kho tho') || lower.includes('khó thở')
    ) {
      immediateMatch = 'Tai Mũi Họng & Hô hấp'
    } else if (
      lower.includes('ngua') || lower.includes('ngứa') ||
      lower.includes('di ung') || lower.includes('dị ứng') ||
      lower.includes('me day') || lower.includes('mề đay') ||
      lower.includes('phat ban') || lower.includes('phát ban') ||
      lower.includes('mun') || lower.includes('mụn') ||
      lower.includes('viem da') || lower.includes('viêm da')
    ) {
      immediateMatch = 'Da liễu'
    } else if (
      lower.includes('mat') || lower.includes('mắt') ||
      lower.includes('dau mat') || lower.includes('đau mắt') ||
      lower.includes('do mat') || lower.includes('đỏ mắt') ||
      lower.includes('mo mat') || lower.includes('mờ mắt') ||
      lower.includes('can thi') || lower.includes('cận thị')
    ) {
      immediateMatch = 'Mắt'
    } else if (
      lower.includes('tre em') || lower.includes('trẻ em') ||
      lower.includes('be') || lower.includes('bé') ||
      lower.includes('so sinh') || lower.includes('sơ sinh') ||
      lower.includes('bieng an') || lower.includes('biếng ăn')
    ) {
      immediateMatch = 'Nhi khoa'
    } else if (
      lower.includes('kham tong quat') || lower.includes('khám tổng quát') ||
      lower.includes('met moi') || lower.includes('mệt mỏi') ||
      lower.includes('sot') || lower.includes('sốt') ||
      lower.includes('suy nhuoc') || lower.includes('suy nhược') ||
      lower.includes('cam cum') || lower.includes('cảm cúm')
    ) {
      immediateMatch = 'Đa khoa & Nội Tổng quát'
    }

    if (immediateMatch) {
      setAiSuggestedSpecialty(immediateMatch)
      setSpecialty(immediateMatch)
    }

    // 2. Debounce gọi API Chatbot LLM phân tích ngữ nghĩa sâu hơn
    if (aiDebounceTimerRef.current) {
      clearTimeout(aiDebounceTimerRef.current)
    }

    aiDebounceTimerRef.current = setTimeout(async () => {
      setIsAiAnalyzing(true)
      try {
        const res = await chatAPI.send(text)
        const data = res.data?.data || res.data
        const specs = data?.suggested_specialties || []
        if (specs.length > 0) {
          const topSpec = specs[0]
          setAiSuggestedSpecialty(topSpec)
          setSpecialty(topSpec)
        }
      } catch {
        // Giữ kết quả từ khóa nhanh nếu có
      } finally {
        setIsAiAnalyzing(false)
      }
    }, 500)

    return () => {
      if (aiDebounceTimerRef.current) clearTimeout(aiDebounceTimerRef.current)
    }
  }, [symptoms])

  const loadBookingData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [docRes, appRes] = await Promise.all([
        authAPI.getDoctors().catch(() => null),
        appointmentAPI.list().catch(() => null),
      ])
      const docList = extractList(docRes)
      setDoctors(docList)
      setMyAppointments(extractList(appRes))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadBookingData(false)
  }, [])

  useRealtimeSync(() => {
    loadBookingData(true)
  }, 4000)

  // Tính khoảng cách của từng bác sĩ đối với người dùng
  const doctorsWithDistance = doctors.map(doc => {
    const clinicName = doc.clinic_name || ''
    const clinicCoord = CLINIC_COORDINATES[clinicName] || { lat: 10.7732, lng: 106.6983 }
    const dist = calculateDistance(userLocation.lat, userLocation.lng, clinicCoord.lat, clinicCoord.lng)
    return {
      ...doc,
      distanceKm: dist,
    }
  })

  // Lọc theo Chuyên khoa thông minh và Khoảng cách tối đa (radius km)
  const filteredDoctors = doctorsWithDistance.filter(doc => {
    // 1. Lọc theo chuyên khoa (Fuzzy Match hỗ trợ mọi biến thể)
    if (specialty) {
      const docSpec = (doc.specialization || '').toLowerCase()
      const searchSpec = specialty.toLowerCase()

      const isMatch =
        docSpec.includes(searchSpec) ||
        searchSpec.includes(docSpec) ||
        ((searchSpec.includes('đa khoa') || searchSpec.includes('tổng quát')) &&
         (docSpec.includes('đa khoa') || docSpec.includes('tổng quát'))) ||
        (searchSpec.includes('thần kinh') && docSpec.includes('thần kinh')) ||
        (searchSpec.includes('tiêu hóa') && docSpec.includes('tiêu hóa')) ||
        (searchSpec.includes('tim') && docSpec.includes('tim')) ||
        ((searchSpec.includes('khớp') || searchSpec.includes('xương')) &&
         (docSpec.includes('khớp') || docSpec.includes('xương'))) ||
        ((searchSpec.includes('hô hấp') || searchSpec.includes('tai mũi họng')) &&
         (docSpec.includes('hô hấp') || docSpec.includes('tai mũi họng'))) ||
        (searchSpec.includes('da') && docSpec.includes('da')) ||
        (searchSpec.includes('mắt') && docSpec.includes('mắt')) ||
        (searchSpec.includes('nhi') && docSpec.includes('nhi')) ||
        (searchSpec.includes('hình ảnh') && docSpec.includes('hình ảnh'))

      if (!isMatch) {
        return false
      }
    }

    // 2. Lọc theo khoảng cách tối đa
    if (doc.distanceKm > radius) {
      return false
    }

    return true
  }).sort((a, b) => a.distanceKm - b.distanceKm) // Bác sĩ gần nhất xếp lên trước

  const openBookingModal = (doc: any) => {
    setBookingDocForModal(doc)
    const defaultName = `${user?.last_name || ''} ${user?.first_name || ''}`.trim() || user?.username || 'Bệnh nhân'
    setBookerNameInput(defaultName)
    setPatientNameInput(defaultName)
    setSymptomInput(symptoms || '')
    const slots = doc.available_slots || []
    setSlotInModal(slots[0] || null)
    setIsBookingModalOpen(true)
  }

  const handleConfirmModalBooking = async () => {
    if (!slotInModal) return
    setBookingLoading(true)
    setBookingMessage(null)
    try {
      await appointmentAPI.create({
        time_slot_id: slotInModal.id,
        reason: symptomInput.trim() || `Khám chuyên khoa ${bookingDocForModal?.specialization || 'Nội khoa'}`,
        notes: `Người đặt lịch: ${bookerNameInput.trim()} • Bệnh nhân: ${patientNameInput.trim()} (Tài khoản: ${user?.email})`,
      })
      setBookingMessage(`Đặt lịch khám thành công với BS. ${bookingDocForModal?.user?.last_name || ''} ${bookingDocForModal?.user?.first_name || ''}! Bệnh nhân: ${patientNameInput.trim()} • Khung giờ: ${slotInModal.start_time} - ${slotInModal.end_time} ngày ${slotInModal.date}.`)
      setIsBookingModalOpen(false)
      await loadBookingData()
    } catch (err: any) {
      setBookingMessage(err?.response?.data?.message || 'Không thể đặt lịch cho khung giờ này.')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header Giới thiệu */}
      <div className="card" style={{ background: 'var(--color-primary-light)' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ margin: 0 }}>{t('booking.title')}</h3>
                <InfoTooltip
                  title="Đặt lịch khám thông minh"
                  content="Hệ thống tự động tìm và gợi ý bác sĩ chuyên khoa ở gần bạn nhất, có lịch trống sớm nhất và phù hợp với triệu chứng của bạn để bạn không phải chờ đợi lâu."
                />
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {t('booking.subtitle')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="badge badge-primary">{t('booking.algorithm_badge')}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => loadBookingData(false)}>
              <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} /> Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Bộ lọc Thông minh: Triệu chứng AI & Khoảng cách */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Ô nhập triệu chứng tích hợp AI Chatbot */}
          <div className="form-group" style={{ flex: 2, minWidth: 280 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('booking.symptom_label')}
                <InfoTooltip content="Nhập triệu chứng của bạn (ví dụ: ăn không ngon, tức ngực, đau đầu, nhức đầu...). Trợ lý AI y khoa sẽ tự động nhận diện và lọc bác sĩ chuyên khoa phù hợp nhất." />
              </span>
              {isAiAnalyzing && (
                <span style={{ fontSize: '11px', color: '#0068ff', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <Sparkles size={12} className="loading-spinner" /> AI đang đọc triệu chứng...
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                placeholder="Nhập triệu chứng (ví dụ: nhức đầu, ăn không ngon, tức ngực, đau lưng, nghẹt mũi...)"
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
              />
              {aiSuggestedSpecialty && (
                <div style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <Sparkles size={12} color="#2563eb" /> AI gợi ý: Khoa {aiSuggestedSpecialty}
                </div>
              )}
            </div>
          </div>

          {/* Chọn chuyên khoa (Đầy đủ 10 chuyên khoa lâm sàng) */}
          <div className="form-group" style={{ flex: 1.2, minWidth: 220 }}>
            <label className="form-label">{t('booking.specialty_label')}</label>
            <select
              className="form-input"
              value={specialty}
              onChange={e => {
                setSpecialty(e.target.value)
                setAiSuggestedSpecialty(null)
              }}
            >
              <option value="">Tất cả chuyên khoa ({doctors.length} bác sĩ)</option>
              <option value="Nội Thần kinh">Nội Thần kinh (Đau đầu, nhức đầu, chóng mặt)</option>
              <option value="Nội Tim mạch">Nội Tim mạch (Huyết áp, tức ngực, loạn nhịp)</option>
              <option value="Tiêu hóa - Gan mật">Tiêu hóa - Gan mật (Ăn không ngon, dạ dày)</option>
              <option value="Cơ xương khớp">Cơ xương khớp (Đau khớp, mỏi gáy, cột sống)</option>
              <option value="Tai Mũi Họng & Hô hấp">Tai Mũi Họng & Hô hấp (Ho, viêm họng, xoang)</option>
              <option value="Đa khoa & Nội Tổng quát">Đa khoa & Nội Tổng quát (Khám tổng quát, mệt mỏi)</option>
              <option value="Da liễu">Da liễu (Ngứa, dị ứng, mề đay, mụn)</option>
              <option value="Mắt">Mắt (Mắt mờ, tật khúc xạ, viêm kết mạc)</option>
              <option value="Nhi khoa">Nhi khoa (Khám sức khỏe trẻ em, sơ sinh)</option>
              <option value="Chẩn đoán hình ảnh">Chẩn đoán hình ảnh (X-quang, CT, MRI)</option>
            </select>
          </div>

          {/* Thanh trượt Khoảng cách tối đa */}
          <div className="form-group" style={{ width: 230, flexShrink: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Navigation size={13} color="var(--color-primary)" />
              {t('booking.max_distance')}
              <InfoTooltip content="Kéo để mở rộng hoặc thu hẹp khoảng cách tìm kiếm bác sĩ quanh khu vực bạn ở." />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="range"
                min={1}
                max={30}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                style={{ flex: 1, minWidth: 90 }}
              />
              <span className="tabular-nums" style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)', whiteSpace: 'nowrap', minWidth: 55 }}>
                ≤ {radius} km
              </span>
            </div>
          </div>
        </div>

        <div className="card-footer" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Tiêu chí sắp xếp: <strong>Gần bạn nhất</strong> &bull; <strong>Lịch khám sớm</strong> &bull; <strong>Bác sĩ giàu kinh nghiệm</strong>
            <InfoTooltip
              title="Cách xếp hạng bác sĩ"
              content="Hệ thống tự động so sánh quãng đường đi lại, thời gian chờ và chuyên môn của bác sĩ để bạn có lịch khám thuận tiện nhất."
            />
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            📍 Vị trí của bạn: TP. Hồ Chí Minh
          </span>
        </div>
      </div>

      {bookingMessage && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)', background: 'var(--color-success-light)' }}>
          <div className="card-body" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>
            <CheckCircle size={18} /> {bookingMessage}
          </div>
        </div>
      )}

      {/* Danh sách Bác sĩ (Bố cục chiếm trọn chiều rộng - Đã bỏ lưới khung giờ bên phải) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>
            {t('booking.sa_results_title')} ({filteredDoctors.length} Bác sĩ phù hợp trong bán kính ≤ {radius} km)
          </h3>
          {specialty && (
            <span className="badge badge-primary">
              Khoa: {specialty}
            </span>
          )}
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
              <Navigation size={36} style={{ color: 'var(--color-text-tertiary)', marginBottom: 12 }} />
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Không tìm thấy bác sĩ trong bán kính {radius} km</div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                Hãy thử kéo tăng khoảng cách tối đa lên (ví dụ: 10 km - 30 km) hoặc chọn chuyên khoa khác.
              </p>
            </div>
          </div>
        ) : (
          filteredDoctors.map((doc, i) => {
            const fullName = `BS. ${doc.user?.last_name || ''} ${doc.user?.first_name || ''}`.trim()
            const rawName = `${doc.user?.last_name || ''} ${doc.user?.first_name || ''}`.trim()
            const initials = `${doc.user?.first_name?.[0] || 'B'}${doc.user?.last_name?.[0] || 'S'}`
            const avatarUrl = doc.user?.avatar || DOCTOR_AVATARS[rawName] || DOCTOR_AVATARS[fullName.replace('BS. ', '')]
            const nextSlotObj = (doc.available_slots || [])[0]
            const nextSlotStr = nextSlotObj ? `${nextSlotObj.start_time} (ngày ${nextSlotObj.date})` : 'Liên hệ'

            return (
              <div
                key={doc.id}
                className="card"
                onClick={() => openBookingModal(doc)}
                style={{
                  borderLeft: i === 0 ? '3px solid var(--color-primary)' : 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                }}
              >
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          style={{
                            width: 58,
                            height: 58,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--color-primary)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          }}
                        />
                      ) : (
                        <div className="header-avatar" style={{ width: 58, height: 58, fontSize: 18 }}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)' }}>{fullName}</span>
                          <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                            📍 Cách bạn: {doc.distanceKm} km
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 600, marginTop: 2 }}>
                          {doc.specialization}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {doc.clinic_name || 'Bệnh viện Đa khoa MedTech'} &bull; Hành nghề từ năm {doc.experience_years >= 1950 ? doc.experience_years : (2026 - (doc.experience_years || 10))}
                        </div>

                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontWeight: 600 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          openBookingModal(doc)
                        }}
                      >
                        <Calendar size={15} /> Đặt lịch
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-light)', paddingTop: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} color="var(--color-text-tertiary)" /> {doc.clinic_address || 'TP. Hồ Chí Minh'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="var(--color-text-tertiary)" /> Ca trống gần nhất: <strong>{nextSlotStr}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={13} color="var(--color-text-tertiary)" /> CCHN: {doc.license_number}
                    </span>
                    <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
                      {(doc.available_slots || []).length} khung giờ trống tháng 11/2026
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Role-Scoped Appointments List from Database */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Calendar size={16} /> Danh sách lịch hẹn trong Cơ sở dữ liệu ({user?.role === 'PATIENT' ? 'Của cá nhân bạn' : user?.role === 'DOCTOR' ? 'Của bệnh nhân bác sĩ phụ trách' : 'Toàn viện - ADMIN'}) — {myAppointments.length} lịch hẹn
          </h3>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã hẹn</th>
                <th>Bệnh nhân</th>
                <th>Bác sĩ phụ trách</th>
                <th>Cơ sở y tế</th>
                <th>Thời gian</th>
                <th>Lý do khám</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {myAppointments.map(app => (
                <tr key={app.id}>
                  <td className="font-mono">#BA-{1000 + app.id}</td>
                  <td><strong>{app.patient_name}</strong> ({app.patient_code})</td>
                  <td>BS. {app.doctor_name} ({app.doctor_specialization})</td>
                  <td>{app.clinic_name}</td>
                  <td className="tabular-nums">{app.date} • {String(app.start_time || '').slice(0, 5)}</td>
                  <td>{app.reason}</td>
                  <td>
                    <span className={`badge ${app.status === 'COMPLETED' ? 'badge-success' : app.status === 'CONFIRMED' ? 'badge-primary' : 'badge-warning'}`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM ĐẶT LỊCH KHÁM THỜI GIAN THỰC */}
      {isBookingModalOpen && bookingDocForModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 620,
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div>
                <strong style={{ fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                  Phiếu Đăng Ký Đặt Lịch Khám
                </strong>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  BS. {bookingDocForModal.user?.last_name} {bookingDocForModal.user?.first_name} • {bookingDocForModal.specialization}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setIsBookingModalOpen(false)}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Thông tin Bác sĩ tóm tắt */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                background: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
              }}>
                <img
                  src={
                    bookingDocForModal.user?.avatar ||
                    DOCTOR_AVATARS[`${bookingDocForModal.user?.last_name || ''} ${bookingDocForModal.user?.first_name || ''}`.trim()] ||
                    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                  }
                  alt="Doctor Avatar"
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--text-base)' }}>
                    BS. {bookingDocForModal.user?.last_name} {bookingDocForModal.user?.first_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {bookingDocForModal.clinic_name || 'Bệnh viện Đa khoa Quốc tế MedTech'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    📍 {bookingDocForModal.clinic_address || 'TP. Hồ Chí Minh'}
                  </div>
                </div>
                <span className="badge badge-primary">
                  📍 Cách bạn: {bookingDocForModal.distanceKm} km
                </span>
              </div>

              {/* Tách 2 mục: Người đặt lịch và Bệnh nhân */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* 1. Người đặt lịch */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                    Người đặt lịch <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 32, fontSize: '13px' }}
                      value={bookerNameInput}
                      onChange={e => setBookerNameInput(e.target.value)}
                      placeholder="Họ tên người đặt lịch..."
                    />
                  </div>
                </div>

                {/* 2. Bệnh nhân khám */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Bệnh nhân khám <span style={{ color: 'red' }}>*</span></span>
                    <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'normal' }}>(Đặt cho người nhà)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserCheck size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 32, fontSize: '13px' }}
                      value={patientNameInput}
                      onChange={e => setPatientNameInput(e.target.value)}
                      placeholder="Họ tên bệnh nhân khám..."
                    />
                  </div>
                </div>
              </div>

              {/* Form Input: Triệu chứng / Lý do (Có thể bỏ trống) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Triệu chứng hoặc lý do khám</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 'normal' }}>(Có thể để trống)</span>
                </label>
                <textarea
                  className="form-input"
                  style={{ fontSize: '13px' }}
                  rows={2}
                  value={symptomInput}
                  onChange={e => setSymptomInput(e.target.value)}
                  placeholder="Ví dụ: Đau tức ngực, hồi hộp, sốt nhẹ hoặc tái khám định kỳ..."
                />
              </div>

              {/* Khung giờ khám (Được cải tiến giao diện to rõ, chia ngày giờ rõ ràng) */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    Chọn khung giờ khám (Cập nhật thời gian thực tế) <span style={{ color: 'red' }}>*</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {(bookingDocForModal.available_slots || []).length} suất khám khả dụng
                  </span>
                </label>

                {(bookingDocForModal.available_slots || []).length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px', background: '#f8fafc', borderRadius: 8 }}>
                    Bác sĩ hiện chưa có khung giờ khám khả dụng. Vui lòng chọn bác sĩ khác.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    maxHeight: 220,
                    overflowY: 'auto',
                    padding: 4,
                  }}>
                    {(bookingDocForModal.available_slots || []).map((slot: any) => {
                      const isSelected = slotInModal?.id === slot.id
                      return (
                        <button
                          key={`modal-slot-${slot.id}`}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: isSelected ? 'var(--color-primary)' : '#f8fafc',
                            color: isSelected ? 'white' : 'var(--color-text-primary)',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 8px',
                            minHeight: 58,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 6px rgba(0, 104, 255, 0.25)' : 'none',
                          }}
                          onClick={() => setSlotInModal(slot)}
                        >
                          <strong style={{ fontSize: '13px', color: isSelected ? 'white' : '#0f172a', letterSpacing: '0.2px' }}>
                            {slot.start_time} - {slot.end_time}
                          </strong>
                          <span style={{
                            fontSize: '11px',
                            marginTop: 4,
                            color: isSelected ? '#dbeafe' : '#64748b',
                            fontWeight: 500,
                          }}>
                            📅 {slot.date}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {slotInModal && (
                <div style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <CheckCircle size={15} />
                  <span>
                    Đã chọn: <strong>{slotInModal.start_time} - {slotInModal.end_time}</strong> ngày <strong>{slotInModal.date}</strong> (Còn {slotInModal.remaining_slots || 3} suất khám)
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: '#f8fafc',
            }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsBookingModalOpen(false)}
                disabled={bookingLoading}
              >
                Hủy bỏ
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)', padding: '0 20px', fontWeight: 'bold' }}
                onClick={handleConfirmModalBooking}
                disabled={bookingLoading || !slotInModal || !patientNameInput.trim()}
              >
                <CheckCircle size={15} />
                {bookingLoading ? 'Đang xác nhận...' : 'Xác Nhận Đặt Lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
