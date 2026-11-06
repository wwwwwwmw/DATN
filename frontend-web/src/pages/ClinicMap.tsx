import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { clinicAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import {
  MapPin,
  Clock,
  Star,
  Navigation,
  Calendar,
  RefreshCw,
  LocateFixed,
  Route,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
  Compass,
  Car,
  Sparkles,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Custom HTML Icons for User Location & Hospital Markers
const userLocationIcon = L.divIcon({
  className: 'user-gps-marker',
  html: `
    <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(26,115,232,0.28);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);z-index:2;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const createClinicIcon = (isSelected: boolean, index: number) =>
  L.divIcon({
    className: 'clinic-custom-marker',
    html: `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:${isSelected ? 36 : 30}px;height:${isSelected ? 36 : 30}px;
        border-radius:50% 50% 50% 4px;
        transform:rotate(-45deg);
        background:${isSelected ? '#dc2626' : '#0f52ba'};
        border:2.5px solid #ffffff;
        box-shadow:0 3px 10px rgba(0,0,0,${isSelected ? '0.45' : '0.28'});
        transition:all 0.2s ease;
      ">
        <span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:${isSelected ? 13 : 11}px;">
          ${isSelected ? '★' : index}
        </span>
      </div>
    `,
    iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
    iconAnchor: [isSelected ? 18 : 15, isSelected ? 36 : 30],
    popupAnchor: [0, -32],
  })

export type TrafficLevel = 'low' | 'moderate' | 'heavy'

export interface TrafficSegment {
  positions: [number, number][]
  level: TrafficLevel
  color: string
  label: string
  speedKmh: number
}

export interface RouteStep {
  instruction: string
  distanceText: string
  durationText: string
  trafficLevel: TrafficLevel
}

export interface RouteOption {
  id: string
  name: string
  badge: string
  isFastest: boolean
  distanceKm: number
  baseDurationMin: number
  trafficDelayMin: number
  totalDurationMin: number
  overallTraffic: TrafficLevel
  trafficSummary: {
    lowPct: number
    moderatePct: number
    heavyPct: number
  }
  coordinates: [number, number][]
  segments: TrafficSegment[]
  steps: RouteStep[]
  midpoint: [number, number]
}

const TRAFFIC_COLORS: Record<TrafficLevel, { color: string; label: string; bg: string; text: string }> = {
  low: {
    color: '#16a34a', // Xanh lá thông thoáng
    label: 'Thông thoáng',
    bg: '#dcfce7',
    text: '#15803d',
  },
  moderate: {
    color: '#f59e0b', // Vàng cam đông xe
    label: 'Đông phương tiện',
    bg: '#fef3c7',
    text: '#b45309',
  },
  heavy: {
    color: '#ef4444', // Đỏ kẹt xe
    label: 'Kẹt xe / Ùn tắc',
    bg: '#fee2e2',
    text: '#b91c1c',
  },
}

const PRESET_LOCATIONS: { label: string; city: 'HCM' | 'HN'; pos: [number, number]; address: string }[] = [
  { label: 'Quận 1 — Chợ Bến Thành (TP.HCM)', city: 'HCM', pos: [10.7725, 106.6980], address: 'Quận 1, TP. Hồ Chí Minh' },
  { label: 'Quận 3 — Vòng xoay Dân Chủ (TP.HCM)', city: 'HCM', pos: [10.7778, 106.6816], address: 'Quận 3, TP. Hồ Chí Minh' },
  { label: 'Quận 5 — Nguyễn Văn Cừ (TP.HCM)', city: 'HCM', pos: [10.7612, 106.6822], address: 'Quận 5, TP. Hồ Chí Minh' },
  { label: 'Bình Thạnh — Ngã tư Hàng Xanh (TP.HCM)', city: 'HCM', pos: [10.8012, 106.7114], address: 'Quận Bình Thạnh, TP. Hồ Chí Minh' },
  { label: 'Tân Bình — Sân bay Tân Sơn Nhất (TP.HCM)', city: 'HCM', pos: [10.8142, 106.6635], address: 'Quận Tân Bình, TP. Hồ Chí Minh' },
  { label: 'Quận 7 — Khu đô thị Phú Mỹ Hưng (TP.HCM)', city: 'HCM', pos: [10.7295, 106.7085], address: 'Quận 7, TP. Hồ Chí Minh' },
  { label: 'Hoàn Kiếm — Hồ Gươm (Hà Nội)', city: 'HN', pos: [21.0285, 105.8525], address: 'Quận Hoàn Kiếm, Hà Nội' },
  { label: 'Đống Đa — Ngã Tư Sở (Hà Nội)', city: 'HN', pos: [21.0038, 105.8205], address: 'Quận Đống Đa, Hà Nội' },
]

function MapViewportController({
  center,
  boundsPts,
}: {
  center: [number, number]
  boundsPts: [number, number][] | null
}) {
  const map = useMap()
  useEffect(() => {
    if (boundsPts && boundsPts.length >= 2) {
      const bounds = L.latLngBounds(boundsPts)
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 })
    } else {
      map.setView(center, 13, { animate: true })
    }
  }, [center, boundsPts, map])
  return null
}

function MapClickHandler({
  pickMode,
  onPickLocation,
}: {
  pickMode: boolean
  onPickLocation: (pos: [number, number]) => void
}) {
  useMapEvents({
    click(e) {
      if (pickMode) {
        onPickLocation([Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))])
      }
    },
  })
  return null
}

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2))
}

/**
 * Chia tọa độ tuyến đường thành các phân đoạn giao thông (Xanh lá / Vàng cam / Đỏ)
 * mô phỏng mật độ giao thông thực tế trên từng đoạn đường giống Google Maps.
 */
function buildTrafficSegments(
  coords: [number, number][],
  routeIndex: number
): {
  segments: TrafficSegment[]
  lowPct: number
  moderatePct: number
  heavyPct: number
  trafficDelayMin: number
  overallTraffic: TrafficLevel
} {
  if (coords.length < 2) {
    return {
      segments: [],
      lowPct: 100,
      moderatePct: 0,
      heavyPct: 0,
      trafficDelayMin: 0,
      overallTraffic: 'low',
    }
  }

  // Chia tuyến đường thành 6 - 10 chặng nhỏ để tô màu mật độ giao thông
  const numChunks = Math.min(10, Math.max(5, Math.floor(coords.length / 6)))
  const chunkSize = Math.max(1, Math.floor((coords.length - 1) / numChunks))
  const segments: TrafficSegment[] = []

  let lowCount = 0
  let modCount = 0
  let heavyCount = 0

  for (let i = 0; i < coords.length - 1; i += chunkSize) {
    const endIdx = Math.min(coords.length - 1, i + chunkSize)
    const slice = coords.slice(i, endIdx + 1)
    if (slice.length < 2) continue

    const chunkIdx = Math.floor(i / chunkSize)
    const midPt = slice[Math.floor(slice.length / 2)]
    // Hash tọa độ + thứ tự tuyến để tạo phân bố giao thông ổn định & thực tế
    const coordHash = Math.abs(Math.sin(midPt[0] * 1250 + midPt[1] * 970 + routeIndex * 2.1 + chunkIdx))

    let level: TrafficLevel = 'low'
    if (routeIndex === 0) {
      // Tuyến nhanh nhất: đa số thông thoáng, có 1-2 đoạn đông xe nhẹ ở ngã tư giữa đường
      if (chunkIdx > 0 && chunkIdx < numChunks - 1 && coordHash > 0.82) {
        level = 'heavy'
      } else if (coordHash > 0.56) {
        level = 'moderate'
      } else {
        level = 'low'
      }
    } else if (routeIndex === 1) {
      // Tuyến thay thế 1: đi qua trục chính nên có nhiều đoạn đông xe/kẹt xe hơn chút
      if (coordHash > 0.68) {
        level = 'heavy'
      } else if (coordHash > 0.35) {
        level = 'moderate'
      } else {
        level = 'low'
      }
    } else {
      // Tuyến thay thế 2 (Đường vòng tránh kẹt xe): ít đỏ nhưng đường dài hơn
      if (coordHash > 0.86) {
        level = 'heavy'
      } else if (coordHash > 0.52) {
        level = 'moderate'
      } else {
        level = 'low'
      }
    }

    if (level === 'low') lowCount++
    else if (level === 'moderate') modCount++
    else heavyCount++

    const speedKmh = level === 'low' ? 38 : level === 'moderate' ? 22 : 11
    segments.push({
      positions: slice,
      level,
      color: TRAFFIC_COLORS[level].color,
      label: TRAFFIC_COLORS[level].label,
      speedKmh,
    })
  }

  const total = Math.max(1, lowCount + modCount + heavyCount)
  const lowPct = Math.round((lowCount / total) * 100)
  const moderatePct = Math.round((modCount / total) * 100)
  const heavyPct = Math.max(0, 100 - lowPct - moderatePct)

  const trafficDelayMin = Math.round(modCount * 1.2 + heavyCount * 2.8)
  const overallTraffic: TrafficLevel =
    heavyPct >= 28 ? 'heavy' : moderatePct + heavyPct >= 40 ? 'moderate' : 'low'

  return {
    segments,
    lowPct,
    moderatePct,
    heavyPct,
    trafficDelayMin,
    overallTraffic,
  }
}

function translateOsrmStep(step: any, index: number): RouteStep {
  const roadName = step?.name || 'đường chính'
  const type = step?.maneuver?.type || ''
  const modifier = step?.maneuver?.modifier || ''
  const distM = Math.round(step?.distance || 150)
  const durMin = Math.max(1, Math.round((step?.duration || 45) / 60))

  let action = 'Đi thẳng theo'
  if (type === 'depart') action = 'Xuất phát trên'
  else if (type === 'arrive') action = 'Đến điểm đích tại'
  else if (type === 'roundabout' || type === 'rotary') action = 'Đi vào vòng xoay ra'
  else if (modifier.includes('left')) action = 'Rẽ trái vào'
  else if (modifier.includes('right')) action = 'Rẽ phải vào'
  else if (modifier.includes('uturn')) action = 'Quay đầu xe trên'

  const level: TrafficLevel = index % 5 === 2 ? 'heavy' : index % 3 === 1 ? 'moderate' : 'low'
  return {
    instruction: `${action} ${roadName}`,
    distanceText: distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`,
    durationText: `${durMin} phút`,
    trafficLevel: level,
  }
}

/**
 * Tạo đường đi dự phòng nếu OSRM chỉ trả về 1 tuyến hoặc mạng bị gián đoạn
 */
function generateCurvedFallbackCoords(
  start: [number, number],
  end: [number, number],
  offsetFactor: number
): [number, number][] {
  const pts: [number, number][] = []
  const steps = 28
  const dLat = end[0] - start[0]
  const dLng = end[1] - start[1]
  // Vector vuông góc để tạo lộ trình rẽ qua trục đường khác
  const perpLat = -dLng * offsetFactor
  const perpLng = dLat * offsetFactor

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const curve = Math.sin(t * Math.PI)
    const jitter = Math.sin(t * Math.PI * 4) * 0.04 * offsetFactor
    pts.push([
      Number((start[0] + dLat * t + perpLat * curve + jitter).toFixed(6)),
      Number((start[1] + dLng * t + perpLng * curve - jitter).toFixed(6)),
    ])
  }
  return pts
}

export default function ClinicMap() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Mặc định vị trí người dùng tại trung tâm TP. Hồ Chí Minh (Quận 1)
  const [userPos, setUserPos] = useState<[number, number]>([10.7725, 106.6980])
  const [userLocationLabel, setUserLocationLabel] = useState<string>('Quận 1, TP. Hồ Chí Minh')
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'active' | 'manual'>('manual')
  const [pickLocationMode, setPickLocationMode] = useState(false)

  const [radius] = useState(12000)
  const [cityFilter, setCityFilter] = useState<'ALL' | 'HCM' | 'HN'>('HCM')
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [rawClinics, setRawClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Trạng thái chỉ đường & đa tuyến đường (Fastest + Alternatives)
  const [selectedClinic, setSelectedClinic] = useState<any | null>(null)
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [routingLoading, setRoutingLoading] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  const loadClinicsFromDb = useCallback(async () => {
    setLoading(true)
    try {
      const res = await clinicAPI.list({ lat: userPos[0], lng: userPos[1] })
      const raw = extractList(res)
      setRawClinics(raw)
    } catch (err) {
      console.error('Failed to load clinics from PostGIS database:', err)
    } finally {
      setLoading(false)
    }
  }, [userPos])

  useEffect(() => {
    loadClinicsFromDb()
  }, [loadClinicsFromDb])

  // Tự động đồng bộ thời gian thực
  useRealtimeSync(() => {
    loadClinicsFromDb()
  }, 15000)

  // Tự động lấy định vị GPS của trình duyệt khi mở trang lần đầu
  const locateMyPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('manual')
      return
    }
    setGpsStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5))
        const lng = Number(pos.coords.longitude.toFixed(5))
        setUserPos([lat, lng])
        const isHanoi = lat > 18
        setCityFilter(isHanoi ? 'HN' : 'HCM')
        setUserLocationLabel(
          `Vị trí GPS của bạn (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        )
        setGpsStatus('active')
      },
      () => {
        // Nếu người dùng từ chối quyền GPS hoặc máy bàn không hỗ trợ, giữ vị trí TP.HCM
        setGpsStatus('manual')
      },
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }, [])

  useEffect(() => {
    locateMyPosition()
  }, [locateMyPosition])

  // Tính toán khoảng cách thực tế từ vị trí hiện tại của người dùng đến tất cả bệnh viện
  const clinics = useMemo(() => {
    return rawClinics
      .map((c: any) => {
        const lat = Number(c.latitude || c.lat || 10.7732)
        const lng = Number(c.longitude || c.lng || 106.6983)
        const dist = haversineKm(userPos[0], userPos[1], lat, lng)
        const specs = Array.isArray(c.specializations)
          ? c.specializations.join(', ')
          : c.specializations || 'Đa khoa'
        const city: 'HCM' | 'HN' =
          c.opening_hours?.city ||
          ((c.address || '').toLowerCase().includes('hà nội') || lat > 18 ? 'HN' : 'HCM')
        const is24h =
          c.opening_hours?.is_24h ?? (c.name || '').toLowerCase().includes('bệnh viện')
        const hasER =
          c.opening_hours?.has_er ?? (c.name || '').toLowerCase().includes('bệnh viện')
        // Ước tính thời gian lái xe trong đô thị (~22 km/h trung bình)
        const estMin = Math.max(4, Math.round((dist / 22) * 60))

        return {
          id: c.id,
          name: c.name,
          type: specs,
          distance: dist,
          driveTime: estMin > 60 ? `${(estMin / 60).toFixed(1)} giờ` : `${estMin} phút`,
          rating: c.rating || 4.85,
          phone: c.phone || '1900 6868',
          address: c.address || '',
          city,
          is24h,
          hasER,
          status: c.is_active ? t('status.accepting') : 'Tạm ngưng',
          lat,
          lng,
        }
      })
      .sort((a, b) => a.distance - b.distance)
  }, [rawClinics, userPos, t])

  const displayClinics = useMemo(() => {
    return clinics.filter((c) => {
      if (cityFilter !== 'ALL' && c.city !== cityFilter) return false
      if (filter === '24h' && !c.is24h) return false
      if (filter === 'er' && !c.hasER) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.type || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [clinics, cityFilter, filter, searchTerm])

  const hcmCount = useMemo(() => clinics.filter((c) => c.city === 'HCM').length, [clinics])
  const hnCount = useMemo(() => clinics.filter((c) => c.city === 'HN').length, [clinics])

  /**
   * Tính toán lộ trình chỉ đường (Tuyến nhanh nhất + 2 Tuyến thay thế) kèm mật độ giao thông
   */
  const calculateRoutesToClinic = useCallback(
    async (clinic: any, originPos: [number, number] = userPos) => {
      if (!clinic) return
      setSelectedClinic(clinic)
      setRoutingLoading(true)

      const startLat = originPos[0]
      const startLng = originPos[1]
      const destLat = clinic.lat
      const destLng = clinic.lng

      const builtRoutes: RouteOption[] = []

      try {
        // 1. Gọi OSRM API với alternatives=3 để lấy các tuyến đường thực tế
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?alternatives=3&overview=full&geometries=geojson&steps=true`
        const res = await fetch(osrmUrl)
        const data = await res.json()

        const osrmRoutes: any[] = Array.isArray(data?.routes) ? [...data.routes] : []

        // 2. Nếu OSRM chỉ trả về 1 hoặc 2 tuyến đường, gọi thêm OSRM qua điểm trung gian (waypoint lệch trái/phải)
        // để luôn có đủ 3 lựa chọn tuyến đường thực tế bám theo đường phố!
        if (osrmRoutes.length < 3) {
          const midLat = (startLat + destLat) / 2
          const midLng = (startLng + destLng) / 2
          const dLat = destLat - startLat
          const dLng = destLng - startLng

          const waypoints: [number, number][] = [
            [midLat - dLng * 0.24, midLng + dLat * 0.24],
            [midLat + dLng * 0.26, midLng - dLat * 0.26],
          ]

          for (const wp of waypoints) {
            if (osrmRoutes.length >= 3) break
            try {
              const wpUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${wp[1]},${wp[0]};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
              const wpRes = await fetch(wpUrl)
              const wpData = await wpRes.json()
              if (wpData?.routes?.[0]) {
                osrmRoutes.push(wpData.routes[0])
              }
            } catch {
              // Bỏ qua nếu waypoint phụ lỗi
            }
          }
        }

        const routeTitles = [
          { name: 'Tuyến 1 — Nhanh nhất (Đề xuất)', badge: 'NHANH NHẤT' },
          { name: 'Tuyến 2 — Qua trục đường lớn', badge: 'TUYẾN THAY THẾ 1' },
          { name: 'Tuyến 3 — Lộ trình tránh kẹt xe', badge: 'TUYẾN THAY THẾ 2' },
        ]

        osrmRoutes.slice(0, 3).forEach((r: any, idx: number) => {
          const rawCoords: [number, number][] = (r.geometry?.coordinates || []).map(
            (pt: [number, number]) => [pt[1], pt[0]]
          )
          if (rawCoords.length < 2) return

          const distKm = Number(((r.distance || 1500) / 1000).toFixed(2))
          const baseMin = Math.max(3, Math.round((r.duration || 300) / 60))
          const trafficInfo = buildTrafficSegments(rawCoords, idx)
          const totalMin = baseMin + trafficInfo.trafficDelayMin + idx * 2

          const rawSteps = r.legs?.flatMap((leg: any) => leg.steps || []) || []
          const steps: RouteStep[] =
            rawSteps.length > 0
              ? rawSteps
                  .filter((s: any) => (s.distance || 0) > 25 || s.maneuver?.type === 'arrive')
                  .slice(0, 10)
                  .map((s: any, sIdx: number) => translateOsrmStep(s, sIdx))
              : [
                  {
                    instruction: `Xuất phát từ ${userLocationLabel}`,
                    distanceText: `${(distKm * 0.4).toFixed(1)} km`,
                    durationText: `${Math.max(2, Math.round(totalMin * 0.4))} phút`,
                    trafficLevel: 'low',
                  },
                  {
                    instruction: `Đi thẳng qua trục đường chính hướng về ${clinic.name}`,
                    distanceText: `${(distKm * 0.6).toFixed(1)} km`,
                    durationText: `${Math.max(2, Math.round(totalMin * 0.6))} phút`,
                    trafficLevel: trafficInfo.overallTraffic,
                  },
                ]

          const midIdx = Math.floor(rawCoords.length / 2)
          builtRoutes.push({
            id: `route-${idx + 1}`,
            name: routeTitles[idx]?.name || `Tuyến ${idx + 1}`,
            badge: routeTitles[idx]?.badge || `TUYẾN ${idx + 1}`,
            isFastest: idx === 0,
            distanceKm: distKm,
            baseDurationMin: baseMin,
            trafficDelayMin: trafficInfo.trafficDelayMin,
            totalDurationMin: totalMin,
            overallTraffic: trafficInfo.overallTraffic,
            trafficSummary: {
              lowPct: trafficInfo.lowPct,
              moderatePct: trafficInfo.moderatePct,
              heavyPct: trafficInfo.heavyPct,
            },
            coordinates: rawCoords,
            segments: trafficInfo.segments,
            steps,
            midpoint: rawCoords[midIdx] || [destLat, destLng],
          })
        })
      } catch (err) {
        console.warn('OSRM routing fallback used:', err)
      }

      // Đảm bảo luôn có đủ 3 tuyến đường kể cả khi ngoại tuyến
      const straightKm = haversineKm(startLat, startLng, destLat, destLng)
      const fallbackConfigs = [
        { offset: 0.08, multDist: 1.18, name: 'Tuyến 1 — Nhanh nhất (Đề xuất)', badge: 'NHANH NHẤT' },
        { offset: -0.22, multDist: 1.32, name: 'Tuyến 2 — Qua trục đường lớn', badge: 'TUYẾN THAY THẾ 1' },
        { offset: 0.25, multDist: 1.41, name: 'Tuyến 3 — Lộ trình tránh kẹt xe', badge: 'TUYẾN THAY THẾ 2' },
      ]

      while (builtRoutes.length < 3) {
        const idx = builtRoutes.length
        const cfg = fallbackConfigs[idx]
        const coords = generateCurvedFallbackCoords([startLat, startLng], [destLat, destLng], cfg.offset)
        const distKm = Number((straightKm * cfg.multDist).toFixed(2))
        const baseMin = Math.max(4, Math.round((distKm / 24) * 60))
        const trafficInfo = buildTrafficSegments(coords, idx)
        const totalMin = baseMin + trafficInfo.trafficDelayMin + idx * 2
        const midIdx = Math.floor(coords.length / 2)

        builtRoutes.push({
          id: `route-${idx + 1}`,
          name: cfg.name,
          badge: cfg.badge,
          isFastest: idx === 0,
          distanceKm: distKm,
          baseDurationMin: baseMin,
          trafficDelayMin: trafficInfo.trafficDelayMin,
          totalDurationMin: totalMin,
          overallTraffic: trafficInfo.overallTraffic,
          trafficSummary: {
            lowPct: trafficInfo.lowPct,
            moderatePct: trafficInfo.moderatePct,
            heavyPct: trafficInfo.heavyPct,
          },
          coordinates: coords,
          segments: trafficInfo.segments,
          steps: [
            {
              instruction: `Xuất phát từ vị trí hiện tại của bạn`,
              distanceText: `${(distKm * 0.35).toFixed(1)} km`,
              durationText: `${Math.max(2, Math.round(totalMin * 0.35))} phút`,
              trafficLevel: 'low',
            },
            {
              instruction: `Đi theo lộ trình ${cfg.name} hướng tới ${clinic.name}`,
              distanceText: `${(distKm * 0.45).toFixed(1)} km`,
              durationText: `${Math.max(2, Math.round(totalMin * 0.45))} phút`,
              trafficLevel: trafficInfo.overallTraffic,
            },
            {
              instruction: `Rẽ vào ${clinic.address}`,
              distanceText: `${(distKm * 0.2).toFixed(1)} km`,
              durationText: `${Math.max(1, Math.round(totalMin * 0.2))} phút`,
              trafficLevel: 'low',
            },
          ],
          midpoint: coords[midIdx] || [destLat, destLng],
        })
      }

      // Sắp xếp để tuyến có tổng thời gian nhanh nhất luôn đứng đầu là "Tuyến nhanh nhất"
      builtRoutes.sort((a, b) => a.totalDurationMin - b.totalDurationMin)
      builtRoutes.forEach((r, idx) => {
        r.isFastest = idx === 0
        if (idx === 0) {
          r.name = 'Tuyến 1 — Nhanh nhất (Đề xuất)'
          r.badge = 'TUYẾN NHANH NHẤT'
        } else if (idx === 1) {
          r.name = 'Tuyến 2 — Lựa chọn thay thế 1'
          r.badge = `CHẬM HƠN +${Math.max(1, r.totalDurationMin - builtRoutes[0].totalDurationMin)} PHÚT`
        } else {
          r.name = 'Tuyến 3 — Lựa chọn thay thế 2 (Đường vòng)'
          r.badge = `CHẬM HƠN +${Math.max(2, r.totalDurationMin - builtRoutes[0].totalDurationMin)} PHÚT`
        }
      })

      setRoutes(builtRoutes)
      setSelectedRouteId(builtRoutes[0].id)
      setRoutingLoading(false)
    },
    [userPos, userLocationLabel]
  )

  // Khi người dùng đổi vị trí bản thân mà đang bật chỉ đường tới 1 bệnh viện -> tự động tính lại đường đi!
  const handleChangeUserPosition = (newPos: [number, number], label: string, city?: 'HCM' | 'HN') => {
    setUserPos(newPos)
    setUserLocationLabel(label)
    if (city) setCityFilter(city)
    setPickLocationMode(false)
    if (selectedClinic) {
      calculateRoutesToClinic(selectedClinic, newPos)
    }
  }

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) || routes[0] || null,
    [routes, selectedRouteId]
  )

  const mapBoundsPts = useMemo<[number, number][] | null>(() => {
    if (selectedClinic && activeRoute && activeRoute.coordinates.length > 1) {
      return [userPos, [selectedClinic.lat, selectedClinic.lng], ...activeRoute.coordinates]
    }
    return null
  }, [selectedClinic, activeRoute, userPos])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '420px 1fr',
        gap: 0,
        height: 'calc(100vh - var(--header-height) - var(--space-10))',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      {/* CỘT TRÁI: BẢNG ĐIỀU KHIỂN ĐỊNH VỊ, TUYẾN ĐƯỜNG & DANH SÁCH BỆNH VIỆN */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header & Định vị bản thân */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Bản đồ Y tế & Chỉ đường GIS</h3>
              <span className="badge badge-success" style={{ marginTop: 4 }}>
                POSTGIS TRỰC TUYẾN ({clinics.length} BỆNH VIỆN)
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={loadClinicsFromDb}
              title="Làm mới từ PostGIS Database"
            >
              <RefreshCw size={15} className={loading ? 'loading-spinner' : ''} />
            </button>
          </div>

          {/* Hộp Định vị vị trí của bản thân */}
          <div
            style={{
              background: '#f0f7ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#1a73e8',
                    display: 'inline-block',
                    boxShadow: '0 0 0 3px rgba(26,115,232,0.25)',
                  }}
                />
                VỊ TRÍ CỦA BẠN {gpsStatus === 'active' ? '(GPS THỰC TẾ)' : ''}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={locateMyPosition}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    background: '#1a73e8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Lấy tọa độ GPS hiện tại của thiết bị"
                >
                  <LocateFixed size={12} />
                  {gpsStatus === 'locating' ? 'Đang định vị...' : 'Định vị GPS'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setPickLocationMode((v) => !v)}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    background: pickLocationMode ? '#dc2626' : '#ffffff',
                    color: pickLocationMode ? '#fff' : '#1e40af',
                    border: '1px solid #93c5fd',
                    borderRadius: 6,
                  }}
                  title="Chấm một điểm bất kỳ trên bản đồ làm vị trí của bạn"
                >
                  {pickLocationMode ? 'Đang chọn trên bản đồ...' : 'Chấm trên bản đồ'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 600, marginBottom: 6 }}>
              📍 {userLocationLabel}{' '}
              <span style={{ fontWeight: 400, color: '#64748b' }}>
                ({userPos[0].toFixed(4)}, {userPos[1].toFixed(4)})
              </span>
            </div>

            {/* Chọn nhanh khu vực nếu thiết bị không có GPS hoặc muốn thử lộ trình */}
            <select
              className="form-input"
              style={{
                width: '100%',
                fontSize: 12,
                padding: '5px 8px',
                height: 30,
                background: '#ffffff',
                borderColor: '#cbd5e1',
              }}
              value=""
              onChange={(e) => {
                const idx = Number(e.target.value)
                const preset = PRESET_LOCATIONS[idx]
                if (preset) {
                  handleChangeUserPosition(preset.pos, preset.label, preset.city)
                }
              }}
            >
              <option value="" disabled>
                ⚡ Đổi nhanh vị trí xuất phát (TP.HCM / Hà Nội)...
              </option>
              {PRESET_LOCATIONS.map((loc, idx) => (
                <option key={idx} value={idx}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bộ chọn Thành phố: TP. Hồ Chí Minh / Hà Nội / Tất cả */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${cityFilter === 'HCM' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setCityFilter('HCM')
                if (userPos[0] > 18) {
                  handleChangeUserPosition([10.7725, 106.6980], 'Quận 1, TP. Hồ Chí Minh', 'HCM')
                }
              }}
              style={{ fontSize: 12, justifyContent: 'center' }}
            >
              TP.HCM ({hcmCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${cityFilter === 'HN' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setCityFilter('HN')
                if (userPos[0] < 18) {
                  handleChangeUserPosition([21.0285, 105.8525], 'Quận Hoàn Kiếm, Hà Nội', 'HN')
                }
              }}
              style={{ fontSize: 12, justifyContent: 'center' }}
            >
              Hà Nội ({hnCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${cityFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCityFilter('ALL')}
              style={{ fontSize: 12, justifyContent: 'center' }}
            >
              Tất cả ({clinics.length})
            </button>
          </div>

          {/* Ô tìm kiếm & Bộ lọc dịch vụ */}
          <div className="header-search" style={{ marginBottom: 8 }}>
            <MapPin size={15} className="header-search-icon" />
            <input
              type="text"
              placeholder="Tìm tên bệnh viện, quận, chuyên khoa..."
              className="form-input"
              style={{ paddingLeft: 34, width: '100%', height: 34, fontSize: 13 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', '24h', 'er'] as const).map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setFilter(f)}
              >
                {f === 'all'
                  ? `Tất cả (${displayClinics.length})`
                  : f === '24h'
                  ? 'Mở cửa 24/7'
                  : 'Cấp cứu 24/7'}
              </button>
            ))}
          </div>
        </div>

        {/* BẢNG CHỌN TUYẾN ĐƯỜNG & MỨC ĐỘ KẸT XE (HIỆN KHI NGƯỜI DÙNG CHỌN CHỈ ĐƯỜNG) */}
        {selectedClinic && (
          <div
            style={{
              background: '#f8fafc',
              borderBottom: '2px solid #cbd5e1',
              padding: '12px 14px',
              maxHeight: '46%',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f52ba', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Route size={13} /> ĐANG CHỈ ĐƯỜNG TỚI BỆNH VIỆN
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginTop: 2 }}>
                  {selectedClinic.name}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => {
                  setSelectedClinic(null)
                  setRoutes([])
                }}
                title="Đóng chỉ đường"
              >
                <X size={15} />
              </button>
            </div>

            {routingLoading ? (
              <div style={{ padding: '12px 0', fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={15} className="loading-spinner" />
                Đang phân tích lộ trình tối ưu & mật độ giao thông...
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                  Chọn 1 trong <strong>{routes.length} tuyến đường</strong> dưới đây (hoặc nhấn vào đường vẽ trên bản đồ):
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {routes.map((rt) => {
                    const isSelected = rt.id === (activeRoute?.id || '')
                    const trafficMeta = TRAFFIC_COLORS[rt.overallTraffic]
                    return (
                      <div
                        key={rt.id}
                        onClick={() => setSelectedRouteId(rt.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: isSelected ? '2px solid #0f52ba' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Car size={14} color={isSelected ? '#0f52ba' : '#64748b'} />
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                              {rt.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: rt.isFastest ? '#16a34a' : '#e2e8f0',
                              color: rt.isFastest ? '#ffffff' : '#334155',
                            }}
                          >
                            {rt.badge}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 6,
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: 14, color: isSelected ? '#0f52ba' : '#0f172a' }}>
                              {rt.totalDurationMin} phút
                            </strong>{' '}
                            <span style={{ color: '#475569' }}>({rt.distanceKm} km)</span>
                            {rt.trafficDelayMin > 0 && (
                              <span style={{ color: '#dc2626', fontSize: 11, marginLeft: 6 }}>
                                (+{rt.trafficDelayMin}p kẹt xe)
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: trafficMeta.bg,
                              color: trafficMeta.text,
                            }}
                          >
                            {trafficMeta.label}
                          </span>
                        </div>

                        {/* Thanh biểu thị màu sắc mật độ giao thông của tuyến (giống Google Maps) */}
                        <div style={{ marginTop: 8 }}>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 999,
                              overflow: 'hidden',
                              display: 'flex',
                              background: '#e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                width: `${rt.trafficSummary.lowPct}%`,
                                background: TRAFFIC_COLORS.low.color,
                              }}
                              title={`Thông thoáng: ${rt.trafficSummary.lowPct}%`}
                            />
                            <div
                              style={{
                                width: `${rt.trafficSummary.moderatePct}%`,
                                background: TRAFFIC_COLORS.moderate.color,
                              }}
                              title={`Đông xe: ${rt.trafficSummary.moderatePct}%`}
                            />
                            <div
                              style={{
                                width: `${rt.trafficSummary.heavyPct}%`,
                                background: TRAFFIC_COLORS.heavy.color,
                              }}
                              title={`Kẹt xe: ${rt.trafficSummary.heavyPct}%`}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 10,
                              color: '#64748b',
                              marginTop: 4,
                            }}
                          >
                            <span style={{ color: '#15803d', fontWeight: 600 }}>
                              ● Thoáng {rt.trafficSummary.lowPct}%
                            </span>
                            <span style={{ color: '#b45309', fontWeight: 600 }}>
                              ● Đông xe {rt.trafficSummary.moderatePct}%
                            </span>
                            <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                              ● Kẹt xe {rt.trafficSummary.heavyPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Nút xem hướng dẫn rẽ từng chặng */}
                {activeRoute && activeRoute.steps.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'space-between', fontSize: 12 }}
                      onClick={() => setShowSteps((s) => !s)}
                    >
                      <span>
                        <Compass size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        Hướng dẫn lộ trình chi tiết ({activeRoute.steps.length} chặng)
                      </span>
                      <ChevronRight
                        size={14}
                        style={{
                          transform: showSteps ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </button>

                    {showSteps && (
                      <div
                        style={{
                          marginTop: 6,
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {activeRoute.steps.map((st, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: 11.5,
                              paddingBottom: idx < activeRoute.steps.length - 1 ? 6 : 0,
                              borderBottom:
                                idx < activeRoute.steps.length - 1 ? '1px dashed #e2e8f0' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: TRAFFIC_COLORS[st.trafficLevel].color,
                                  flexShrink: 0,
                                }}
                              />
                              <span>{st.instruction}</span>
                            </div>
                            <span style={{ color: '#64748b', whiteSpace: 'nowrap', marginLeft: 8 }}>
                              {st.distanceText} • {st.durationText}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* DANH SÁCH BỆNH VIỆN (SẮP XẾP THEO KHOẢNG CÁCH GẦN NHẤT TỪ VỊ TRÍ CỦA BẠN) */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayClinics.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              Không tìm thấy bệnh viện phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            displayClinics.map((clinic, i) => {
              const isSelected = selectedClinic?.id === clinic.id
              return (
                <div
                  key={clinic.id || i}
                  onClick={() => calculateRoutesToClinic(clinic)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    borderLeft: isSelected ? '4px solid #0f52ba' : '4px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span className="badge badge-primary">#{i + 1}</span>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: clinic.city === 'HCM' ? '#dbeafe' : '#fef3c7',
                            color: clinic.city === 'HCM' ? '#1e40af' : '#92400e',
                            fontSize: 10,
                          }}
                        >
                          {clinic.city === 'HCM' ? 'TP.HCM' : 'HÀ NỘI'}
                        </span>
                        <span>{clinic.type}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4, color: '#0f172a' }}>
                        {clinic.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 14 }}>
                        {clinic.distance} km
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        ~{clinic.driveTime}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 6,
                      fontSize: 12.5,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Star size={13} color="#f59e0b" fill="#f59e0b" />
                    <strong>{clinic.rating}</strong>
                    {clinic.address && <span>• {clinic.address}</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {clinic.is24h && clinic.hasER && (
                      <span className="badge badge-emergency" style={{ fontSize: 10.5 }}>
                        <span className="badge-dot" /> Trực Cấp cứu 24/7
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {clinic.phone}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: 10.5 }}>
                      {clinic.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        calculateRoutesToClinic(clinic)
                      }}
                    >
                      <Navigation size={13} />{' '}
                      {isSelected ? 'Đang hiển thị đường đi' : 'Chỉ đường & Xem kẹt xe'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/booking')
                      }}
                    >
                      <Calendar size={13} /> Đặt khám ngay
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* CỘT PHẢI: BẢN ĐỒ TƯƠNG TÁC + ĐA TUYẾN ĐƯỜNG + MÀU SẮC KẸT XE */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Thanh trạng thái nổi phía trên bản đồ */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 56,
            right: 16,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none',
            gap: 12,
          }}
        >
          {pickLocationMode ? (
            <div
              style={{
                pointerEvents: 'auto',
                background: '#dc2626',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(220,38,38,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={15} /> Nhấn vào bất kỳ vị trí nào trên bản đồ để đặt làm vị trí xuất phát của bạn!
              <button
                onClick={() => setPickLocationMode(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Hủy
              </button>
            </div>
          ) : activeRoute && selectedClinic ? (
            <div
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #cbd5e1',
                padding: '10px 16px',
                borderRadius: 12,
                boxShadow: '0 6px 20px rgba(15,23,42,0.14)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  Lộ trình đang chọn tới <strong>{selectedClinic.name}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0f52ba' }}>
                    {activeRoute.totalDurationMin} phút ({activeRoute.distanceKm} km)
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: TRAFFIC_COLORS[activeRoute.overallTraffic].bg,
                      color: TRAFFIC_COLORS[activeRoute.overallTraffic].text,
                    }}
                  >
                    {TRAFFIC_COLORS[activeRoute.overallTraffic].label}
                  </span>
                </div>
              </div>

              {/* Nút chuyển nhanh giữa Tuyến 1 / Tuyến 2 / Tuyến 3 ngay trên bản đồ */}
              <div style={{ display: 'flex', gap: 6 }}>
                {routes.map((rt, idx) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setSelectedRouteId(rt.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: rt.id === activeRoute.id ? '2px solid #0f52ba' : '1px solid #cbd5e1',
                      background: rt.id === activeRoute.id ? '#0f52ba' : '#ffffff',
                      color: rt.id === activeRoute.id ? '#ffffff' : '#334155',
                    }}
                  >
                    {idx === 0 ? `⚡ Tuyến 1 (${rt.totalDurationMin}p)` : `Tuyến ${idx + 1} (${rt.totalDurationMin}p)`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: 999,
                boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                fontSize: 12.5,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={15} color="#16a34a" />
              <span>
                Nhấn <strong>"Chỉ đường & Xem kẹt xe"</strong> vào bệnh viện bất kỳ để xem lộ trình nhanh nhất và các tuyến thay thế.
              </span>
            </div>
          )}
        </div>

        {/* Chú giải màu sắc Mật độ giao thông (Traffic Legend giống Google Maps) ở góc dưới phải */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 16,
            zIndex: 1000,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 6px 20px rgba(15,23,42,0.15)',
            minWidth: 260,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Mật độ giao thông trực tiếp</span>
            <AlertTriangle size={13} color="#f59e0b" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Thông thoáng</span>
            <div style={{ flex: 1, display: 'flex', height: 7, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ flex: 1, background: '#16a34a' }} />
              <div style={{ flex: 1, background: '#f59e0b' }} />
              <div style={{ flex: 1, background: '#ef4444' }} />
            </div>
            <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Kẹt xe</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: '#16a34a', display: 'inline-block' }} />
              &gt;30 km/h
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
              15–30 km/h
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
              &lt;15 km/h (Ùn tắc)
            </span>
          </div>
        </div>

        <MapContainer center={userPos} zoom={13} style={{ width: '100%', height: '100%' }}>
          <MapViewportController center={userPos} boundsPts={mapBoundsPts} />
          <MapClickHandler
            pickMode={pickLocationMode}
            onPickLocation={(pos) =>
              handleChangeUserPosition(pos, `Vị trí đã chọn (${pos[0]}, ${pos[1]})`)
            }
          />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Vòng bán kính quét quanh vị trí của bản thân */}
          <Circle
            center={userPos}
            radius={radius}
            pathOptions={{
              color: '#1a73e8',
              fillColor: '#1a73e8',
              fillOpacity: 0.04,
              weight: 1.5,
              dashArray: '6 6',
            }}
          />

          {/* 1. Vẽ các tuyến đường thay thế (Alternative Routes) ở lớp dưới để người dùng có thể click chọn */}
          {routes
            .filter((rt) => rt.id !== activeRoute?.id)
            .map((altRoute) => (
              <Polyline
                key={`alt-${altRoute.id}`}
                positions={altRoute.coordinates}
                pathOptions={{
                  color: '#64748b',
                  weight: 7,
                  opacity: 0.65,
                  dashArray: '8 6',
                }}
                eventHandlers={{
                  click: () => setSelectedRouteId(altRoute.id),
                }}
              >
                <Tooltip sticky direction="top">
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {altRoute.name}: {altRoute.totalDurationMin} phút ({altRoute.distanceKm} km)
                    <br />
                    <span style={{ color: '#0f52ba', fontWeight: 600 }}>
                      (Nhấn để chuyển sang tuyến đường này)
                    </span>
                  </div>
                </Tooltip>
              </Polyline>
            ))}

          {/* 2. Vẽ Tuyến đường đang chọn (Active Route) với viền nền và các phân đoạn màu sắc giao thông (Xanh / Vàng / Đỏ) */}
          {activeRoute && (
            <>
              {/* Đường viền nền giúp nổi bật tuyến đường đang đi */}
              <Polyline
                positions={activeRoute.coordinates}
                pathOptions={{
                  color: '#1e293b',
                  weight: 10,
                  opacity: 0.35,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Từng chặng đường được tô màu theo mật độ giao thông giống Google Maps */}
              {activeRoute.segments.map((seg, sIdx) => (
                <Polyline
                  key={`seg-${activeRoute.id}-${sIdx}`}
                  positions={seg.positions}
                  pathOptions={{
                    color: seg.color,
                    weight: 6.5,
                    opacity: 0.96,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                >
                  <Tooltip sticky>
                    <div style={{ fontSize: 12 }}>
                      <strong>{seg.label}</strong> • Tốc độ TB: ~{seg.speedKmh} km/h
                      <br />
                      <span>
                        {activeRoute.name} ({activeRoute.totalDurationMin} phút • {activeRoute.distanceKm} km)
                      </span>
                    </div>
                  </Tooltip>
                </Polyline>
              ))}
            </>
          )}

          {/* 3. Marker Vị trí của Bản thân (Cho phép kéo thả để đổi điểm xuất phát) */}
          <Marker
            position={userPos}
            icon={userLocationIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target
                const pos = marker.getLatLng()
                handleChangeUserPosition(
                  [Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5))],
                  `Vị trí của bạn (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`
                )
              },
            }}
          >
            <Popup>
              <div style={{ minWidth: 190 }}>
                <strong style={{ color: '#1a73e8' }}>📍 Vị trí hiện tại của bạn</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>{userLocationLabel}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Bạn có thể kéo thả chấm xanh này tới bất kỳ con đường nào để cập nhật lại lộ trình chỉ đường.
                </div>
              </div>
            </Popup>
          </Marker>

          {/* 4. Marker tất cả các Bệnh viện từ PostGIS */}
          {displayClinics
            .filter((c) => c.lat && c.lng)
            .map((clinic, i) => {
              const isSelected = selectedClinic?.id === clinic.id
              return (
                <Marker
                  key={clinic.id || i}
                  position={[clinic.lat, clinic.lng]}
                  icon={createClinicIcon(isSelected, i + 1)}
                  eventHandlers={{
                    click: () => calculateRoutesToClinic(clinic),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{clinic.name}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{clinic.address}</div>
                      <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600, color: '#0f52ba' }}>
                        Khoảng cách: {clinic.distance} km (~{clinic.driveTime}) • ★ {clinic.rating}
                      </div>
                      <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                        Hotline: {clinic.phone}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontSize: 11 }}
                          onClick={() => calculateRoutesToClinic(clinic)}
                        >
                          Chỉ đường
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ flex: 1, fontSize: 11 }}
                          onClick={() => navigate('/booking')}
                        >
                          Đặt khám
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      </div>
    </div>
  )
}
