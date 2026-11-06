import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { clinicAPI } from '../services/api'
import { MapPin, Clock, Star, Navigation, Calendar } from 'lucide-react'
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
  useEffect(() => { map.setView(center, 14) }, [center])
  return null
}

export default function ClinicMap() {
  const { t } = useTranslation()
  const [userPos, setUserPos] = useState<[number, number]>([21.0285, 105.8542])
  const [radius] = useState(5000)
  const [filter, setFilter] = useState('all')
  const [clinics, setClinics] = useState<any[]>([])

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )
  }, [])

  useEffect(() => {
    clinicAPI.nearby(userPos[0], userPos[1], radius)
      .then(res => setClinics(res.data.data || res.data || []))
      .catch(() => setClinics(mockClinics))
  }, [userPos, radius])

  const mockClinics = [
    { id: 1, name: 'Bệnh viện Đa khoa Quốc tế MedTech', type: t('map.central_level'), distance: 1.2, driveTime: `4 ${t('common.minutes')}`, rating: 4.9, reviews: 420, address: 'Số 10 Tràng Thi, Hoàn Kiếm', is24h: true, hasER: true, specialty: 'Can thiệp Tim mạch', waitTime: `~3 ${t('common.minutes')}`, status: t('status.accepting'), lat: 21.025, lng: 105.850 },
    { id: 2, name: 'Viện Tim mạch và Đa khoa KT cao St. Jude', type: t('map.specialty_level'), distance: 2.8, driveTime: `9 ${t('common.minutes')}`, rating: 4.8, reviews: 286, address: 'Số 45 Quang Trung, Hai Bà Trưng', is24h: false, closingTime: '20:00', lat: 21.010, lng: 105.855 },
    { id: 3, name: 'Trung tâm Y tế Cộng đồng Quận Hoàn Kiếm', type: t('map.district_level'), distance: 4.1, driveTime: `14 ${t('common.minutes')}`, rating: 4.6, reviews: 140, address: 'Quận Hoàn Kiếm', is24h: false, closingTime: '18:00', lat: 21.035, lng: 105.840 },
  ]

  const displayClinics = clinics.length > 0 ? clinics : mockClinics

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, height: 'calc(100vh - var(--header-height) - var(--space-12))', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Sidebar */}
      <div style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <h3>{t('map.title')}</h3>
              <span className="badge badge-success" style={{ marginTop: 4 }}>{t('map.satellite_badge')}</span>
            </div>
          </div>
          <div className="header-search" style={{ marginBottom: 'var(--space-3)' }}>
            <MapPin size={16} className="header-search-icon" />
            <input type="text" placeholder={t('map.search_placeholder')} className="form-input" style={{ paddingLeft: 36, width: '100%' }} />
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
            <div key={clinic.id || i} style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}>
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
                <Star size={12} color="var(--color-warning)" /> <strong>{clinic.rating}</strong> ({clinic.reviews} {t('map.reviews')})
                {clinic.address && <span>&bull; {clinic.address}</span>}
              </div>
              {clinic.is24h && clinic.hasER && (
                <span className="badge badge-emergency" style={{ marginTop: 'var(--space-2)' }}>
                  <span className="badge-dot" /> {t('map.emergency_24_7')}
                </span>
              )}
              {clinic.waitTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                  <Clock size={12} /> {t('map.wait_time', { min: clinic.waitTime })}
                  <span className="badge badge-success">{clinic.status}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}><Navigation size={12} /> {t('actions.directions')}</button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }}><Calendar size={12} /> {t('actions.book_now')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <MapContainer center={userPos} zoom={14} style={{ width: '100%', height: '100%' }}>
        <MapUpdater center={userPos} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        <Circle center={userPos} radius={radius} pathOptions={{ color: '#0F52BA', fillColor: '#0F52BA', fillOpacity: 0.08, weight: 2, dashArray: '8 4' }} />
        <Marker position={userPos}>
          <Popup>{t('map.your_location')}</Popup>
        </Marker>
        {displayClinics.filter(c => c.lat && c.lng).map((clinic, i) => (
          <Marker key={clinic.id || i} position={[clinic.lat, clinic.lng]}>
            <Popup>
              <strong>{clinic.name}</strong><br />
              {clinic.distance} km &bull; {clinic.driveTime}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
