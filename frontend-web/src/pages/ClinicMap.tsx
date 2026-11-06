import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { clinicAPI } from '../services/api'
import { MapPin, Clock, Star, Navigation, Calendar, RefreshCw } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 13) }, [center])
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
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
}

export default function ClinicMap() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [userPos, setUserPos] = useState<[number, number]>([10.7769, 106.7009])
  const [radius] = useState(10000)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadClinicsFromDb = async () => {
    setLoading(true)
    try {
      const res = await clinicAPI.list()
      const raw = extractList(res)
      const mapped = raw.map((c: any) => {
        const lat = Number(c.latitude || c.lat || 10.7769)
        const lng = Number(c.longitude || c.lng || 106.7009)
        const dist = c.distance_km ?? haversineKm(userPos[0], userPos[1], lat, lng)
        const specs = Array.isArray(c.specializations) ? c.specializations.join(', ') : (c.specializations || 'Đa khoa')
        return {
          id: c.id,
          name: c.name,
          type: specs,
          distance: dist,
          driveTime: `${Math.max(3, Math.round(dist * 3))} ${t('common.minutes')}`,
          rating: c.rating || 4.8,
          phone: c.phone || '',
          address: c.address || '',
          is24h: (c.name || '').toLowerCase().includes('bệnh viện'),
          hasER: (c.name || '').toLowerCase().includes('bệnh viện'),
          status: c.is_active ? t('status.accepting') : 'Tạm ngưng',
          lat,
          lng,
        }
      })
      setClinics(mapped)
      if (mapped.length > 0 && mapped[0].lat && mapped[0].lng) {
        setUserPos([mapped[0].lat, mapped[0].lng])
      }
    } catch (err) {
      console.error('Failed to load clinics from PostGIS database:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClinicsFromDb()
  }, [])

  const displayClinics = clinics.filter(c => {
    if (filter === '24h' && !c.is24h) return false
    if (filter === 'er' && !c.hasER) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      return (c.name || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q) || (c.type || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, height: 'calc(100vh - var(--header-height) - var(--space-12))', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Sidebar */}
      <div style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <h3>{t('map.title')}</h3>
              <span className="badge badge-success" style={{ marginTop: 4 }}>{t('map.satellite_badge')} ({clinics.length} cơ sở DB)</span>
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={loadClinicsFromDb} title="Làm mới từ PostGIS Database">
              <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} />
            </button>
          </div>
          <div className="header-search" style={{ marginBottom: 'var(--space-3)' }}>
            <MapPin size={16} className="header-search-icon" />
            <input
              type="text"
              placeholder={t('map.search_placeholder')}
              className="form-input"
              style={{ paddingLeft: 36, width: '100%' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {['all', '24h', 'er'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
                {f === 'all' ? `${t('map.filter_all')} (${displayClinics.length})` : f === '24h' ? t('map.filter_24h') : t('map.filter_emergency')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayClinics.map((clinic, i) => (
            <div
              key={clinic.id || i}
              onClick={() => setUserPos([clinic.lat, clinic.lng])}
              style={{
                padding: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                    <span className="badge badge-primary" style={{ marginRight: 4 }}>{i + 1}</span> {clinic.type}
                  </div>
                  <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)', marginTop: 4 }}>{clinic.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{clinic.distance} km</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{clinic.driveTime}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <Star size={12} color="var(--color-warning)" /> <strong>{clinic.rating}</strong>
                {clinic.address && <span>&bull; {clinic.address}</span>}
              </div>
              {clinic.is24h && clinic.hasER && (
                <span className="badge badge-emergency" style={{ marginTop: 'var(--space-2)' }}>
                  <span className="badge-dot" /> {t('map.emergency_24_7')}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <Clock size={12} /> SĐT: {clinic.phone || '1900 6868'}
                <span className="badge badge-success">{clinic.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setUserPos([clinic.lat, clinic.lng])}>
                  <Navigation size={12} /> {t('actions.directions')}
                </button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/booking')}>
                  <Calendar size={12} /> {t('actions.book_now')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <MapContainer center={userPos} zoom={13} style={{ width: '100%', height: '100%' }}>
        <MapUpdater center={userPos} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Circle center={userPos} radius={radius} pathOptions={{ color: '#0F52BA', fillColor: '#0F52BA', fillOpacity: 0.08, weight: 2, dashArray: '8 4' }} />
        {displayClinics.filter(c => c.lat && c.lng).map((clinic, i) => (
          <Marker key={clinic.id || i} position={[clinic.lat, clinic.lng]}>
            <Popup>
              <strong>{clinic.name}</strong><br />
              {clinic.address}<br />
              {clinic.distance} km &bull; SĐT: {clinic.phone}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
