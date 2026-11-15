import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { clinicAPI } from '../services/api'
import {
  Building2, Plus, Edit, Trash2, MapPin, Search,
  RefreshCw, CheckCircle2, AlertTriangle, Phone, Mail,
  Clock, ExternalLink, ShieldCheck, X
} from 'lucide-react'

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

export default function AdminClinics() {
  const navigate = useNavigate()

  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [cityFilter, setCityFilter] = useState<'ALL' | 'HCM' | 'HN'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal Thêm / Sửa Bệnh viện
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [modalSaving, setModalSaving] = useState(false)

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formLat, setFormLat] = useState<number | string>(10.7732)
  const [formLng, setFormLng] = useState<number | string>(106.6983)
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formHours, setFormHours] = useState('24/7')
  const [formSpecs, setFormSpecs] = useState('Đa khoa, Cấp cứu, Tim mạch')
  const [formIsOpen, setFormIsOpen] = useState(true)

  // Modal Xóa
  const [deleteClinicTarget, setDeleteClinicTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadClinics = async () => {
    setLoading(true)
    try {
      const res = await clinicAPI.list({ all: true })
      setClinics(extractList(res))
    } catch {
      setMessage({ type: 'error', text: 'Không thể tải danh sách cơ sở y tế.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClinics()
  }, [])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = clinics.length
    const openCount = clinics.filter((c) => c.is_open ?? c.is_active ?? true).length
    const closedCount = total - openCount
    const hcmCount = clinics.filter((c) => (c.address || '').toLowerCase().includes('hà nội') ? false : (c.latitude > 18 ? false : true)).length
    const hnCount = total - hcmCount
    return { total, openCount, closedCount, hcmCount, hnCount }
  }, [clinics])

  // Lọc theo từ khóa, khu vực và trạng thái mở cửa
  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
      const isHn = (c.address || '').toLowerCase().includes('hà nội') || c.latitude > 18
      if (cityFilter === 'HCM' && isHn) return false
      if (cityFilter === 'HN' && !isHn) return false

      const isOpen = c.is_open ?? c.is_active ?? true
      if (statusFilter === 'OPEN' && !isOpen) return false
      if (statusFilter === 'CLOSED' && isOpen) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [clinics, cityFilter, statusFilter, searchTerm])

  // Đổi nhanh trạng thái Mở / Đóng cửa
  const handleToggleStatus = async (clinic: any) => {
    const currentOpen = clinic.is_open ?? clinic.is_active ?? true
    const targetStatusText = currentOpen ? 'ĐÃ ĐÓNG CỬA' : 'MỞ CỬA TIẾP NHẬN'
    if (!window.confirm(`Xác nhận thay đổi: Bạn có chắc chắn muốn chuyển trạng thái của cơ sở y tế "${clinic.name}" sang "${targetStatusText}" không?`)) {
      return
    }

    try {
      const res = await clinicAPI.toggleStatus(clinic.id)
      const newStatus = res.data?.is_open
      setClinics((prev) =>
        prev.map((c) => (c.id === clinic.id ? { ...c, is_open: newStatus } : c))
      )
      setMessage({
        type: 'success',
        text: `Đã đổi trạng thái "${clinic.name}" sang: ${newStatus ? 'Mở cửa đón tiếp' : 'Đã đóng cửa'}.`,
      })
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi cập nhật trạng thái bệnh viện.' })
    }
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormName('')
    setFormAddress('')
    setFormLat(10.7732)
    setFormLng(106.6983)
    setFormPhone('1900 6868')
    setFormEmail('info@medtech.vn')
    setFormHours('24/7 (Cấp cứu 24/24)')
    setFormSpecs('Đa khoa, Nội tổng quát, Hồi sức cấp cứu')
    setFormIsOpen(true)
    setShowModal(true)
  }

  const openEditModal = (c: any) => {
    setIsEditing(true)
    setEditingId(c.id)
    setFormName(c.name || '')
    setFormAddress(c.address || '')
    setFormLat(c.latitude ?? 10.7732)
    setFormLng(c.longitude ?? 106.6983)
    setFormPhone(c.phone || '')
    setFormEmail(c.email || '')
    setFormHours(typeof c.opening_hours === 'string' ? c.opening_hours : '24/7')
    const specsStr = Array.isArray(c.specializations)
      ? c.specializations.join(', ')
      : c.specializations || ''
    setFormSpecs(specsStr)
    setFormIsOpen(c.is_open ?? c.is_active ?? true)
    setShowModal(true)
  }

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formAddress.trim()) {
      alert('Vui lòng điền đầy đủ Tên bệnh viện và Địa chỉ.')
      return
    }

    const latNum = parseFloat(String(formLat))
    const lngNum = parseFloat(String(formLng))
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Tọa độ Vĩ độ và Kinh độ phải là số hợp lệ.')
      return
    }

    const confirmText = isEditing
      ? `Cảnh báo xác nhận: Bạn có chắc chắn muốn lưu các thay đổi cho cơ sở y tế "${formName}" không?`
      : `Cảnh báo xác nhận: Bạn có chắc chắn muốn thêm mới cơ sở y tế "${formName}" vào hệ thống không?`
    if (!window.confirm(confirmText)) {
      return
    }

    setModalSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        address: formAddress.trim(),
        latitude: latNum,
        longitude: lngNum,
        phone: formPhone.trim(),
        email: formEmail.trim(),
        opening_hours: { text: formHours.trim(), is_24h: formHours.includes('24') },
        specializations: formSpecs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        is_open: formIsOpen,
        is_active: true,
      }

      if (isEditing && editingId) {
        await clinicAPI.update(editingId, payload)
        setMessage({ type: 'success', text: `Cập nhật thông tin cơ sở "${formName}" thành công!` })
      } else {
        await clinicAPI.create(payload)
        setMessage({ type: 'success', text: `Thêm mới cơ sở y tế "${formName}" thành công!` })
      }

      setShowModal(false)
      await loadClinics()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin cơ sở y tế.')
    } finally {
      setModalSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteClinicTarget) return
    if (!window.confirm(`CẢNH BÁO QUAN TRỌNG: Bạn có chắc chắn muốn xóa vĩnh viễn cơ sở y tế "${deleteClinicTarget.name}" không? Hành động này sẽ không thể khôi phục!`)) {
      return
    }
    setDeleting(true)
    try {
      await clinicAPI.delete(deleteClinicTarget.id)
      setMessage({ type: 'success', text: `Đã xóa cơ sở y tế "${deleteClinicTarget.name}" thành công!` })
      setDeleteClinicTarget(null)
      await loadClinics()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xóa cơ sở y tế này.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f52ba 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Building2 size={28} color="#60a5fa" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
                  Trung Tâm Quản Trị Cơ Sở Y Tế & Bệnh Viện
                </h2>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.3)',
                    border: '1px solid rgba(147, 197, 253, 0.5)',
                    color: '#bfdbfe',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  ADMIN GIS
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.92rem' }}>
                Thêm, sửa, xóa bệnh viện; đồng bộ tọa độ PostGIS chính xác và kiểm soát trạng thái Mở cửa / Đóng cửa trên bản đồ.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.25)',
                fontSize: 13,
                fontWeight: 600,
              }}
              onClick={() => navigate('/map')}
            >
              <ExternalLink size={15} /> Xem trên Bản đồ GIS
            </button>
            <button
              className="btn btn-primary"
              style={{
                background: '#0068ff',
                borderColor: '#0068ff',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0, 104, 255, 0.4)',
              }}
              onClick={openCreateModal}
            >
              <Plus size={16} /> Thêm Bệnh Viện Mới
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {message && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {message.type === 'success' ? <CheckCircle2 size={16} color="#059669" /> : <AlertTriangle size={16} color="#dc2626" />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Thẻ chỉ số tổng quan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tổng số cơ sở
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#0f172a' }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Cơ sở y tế & phòng khám</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>
            Đang mở cửa
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#16a34a' }}>{stats.openCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Ưu tiên hiển thị trên đầu bản đồ</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 600, textTransform: 'uppercase' }}>
            Đã đóng cửa
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#dc2626' }}>{stats.closedCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Hiện nhãn đỏ & gợi ý BV khác</div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, textTransform: 'uppercase' }}>
            Khu vực phân bố
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#0369a1' }}>
            {stats.hcmCount} HCM / {stats.hnCount} HN
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Tích hợp PostGIS định vị chuẩn</div>
        </div>
      </div>

      {/* Bảng điều khiển bộ lọc & Tìm kiếm */}
      <div className="card" style={{ borderRadius: 12 }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 36, height: 38, fontSize: 13.5 }}
                placeholder="Tìm theo tên bệnh viện, địa chỉ, hotline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {(['ALL', 'HCM', 'HN'] as const).map((c) => (
                <button
                  key={c}
                  className={`btn btn-sm ${cityFilter === c ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 12, padding: '4px 10px', height: 36 }}
                  onClick={() => setCityFilter(c)}
                >
                  {c === 'ALL' ? 'Toàn quốc' : c === 'HCM' ? 'TP.HCM' : 'Hà Nội'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {(['ALL', 'OPEN', 'CLOSED'] as const).map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 12, padding: '4px 10px', height: 36 }}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'ALL' ? 'Tất cả trạng thái' : s === 'OPEN' ? 'Đang mở cửa' : 'Đã đóng cửa'}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={loadClinics}
            title="Làm mới dữ liệu"
            style={{ height: 36 }}
          >
            <RefreshCw size={15} className={loading ? 'loading-spinner' : ''} /> Tải lại
          </button>
        </div>

        {/* Danh sách Bệnh viện dạng Table */}
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>
                <th style={{ width: 48, textAlign: 'center' }}>STT</th>
                <th>Bệnh Viện / Phòng Khám</th>
                <th>Địa Chỉ & Tọa Độ PostGIS</th>
                <th>Hotline / Email</th>
                <th>Thời Gian Mở Cửa</th>
                <th style={{ textAlign: 'center' }}>Trạng Thái Mở Cửa</th>
                <th style={{ textAlign: 'center', width: 230 }}>Thao Tác Quản Trị</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                    <RefreshCw size={20} className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                    <div>Đang tải danh sách cơ sở y tế...</div>
                  </td>
                </tr>
              ) : filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                    <Building2 size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600 }}>Không tìm thấy cơ sở y tế nào phù hợp.</div>
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic, idx) => {
                  const isOpen = clinic.is_open ?? clinic.is_active ?? true
                  return (
                    <tr key={clinic.id} style={{ fontSize: 13.5 }}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{clinic.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 600,
                            }}
                          >
                            ★ {clinic.rating || 4.9}
                          </span>
                          {Array.isArray(clinic.specializations) &&
                            clinic.specializations.slice(0, 2).map((sp: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                style={{
                                  fontSize: 11,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: '#f1f5f9',
                                  color: '#475569',
                                }}
                              >
                                {sp}
                              </span>
                            ))}
                        </div>
                      </td>

                      <td style={{ maxWidth: 280 }}>
                        <div style={{ color: '#334155', lineHeight: 1.4 }}>{clinic.address}</div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 4,
                            fontSize: 11.5,
                            color: '#0284c7',
                            fontWeight: 600,
                          }}
                        >
                          <MapPin size={12} />
                          {clinic.latitude?.toFixed?.(4) ?? clinic.latitude}, {clinic.longitude?.toFixed?.(4) ?? clinic.longitude}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                          <Phone size={13} color="#64748b" /> {clinic.phone || 'Chưa cập nhật'}
                        </div>
                        {clinic.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, marginTop: 3 }}>
                            <Mail size={13} /> {clinic.email}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                          <Clock size={13} color="#64748b" />
                          <span>
                            {typeof clinic.opening_hours === 'string'
                              ? clinic.opening_hours
                              : clinic.opening_hours?.text || '24/7 (Cấp cứu 24/24)'}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái Mở cửa / Đóng cửa có nút chuyển đổi ngay lập tức */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(clinic)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.15s ease',
                            border: isOpen ? '1px solid #86efac' : '1px solid #fca5a5',
                            background: isOpen ? '#ecfdf5' : '#fef2f2',
                            color: isOpen ? '#15803d' : '#b91c1c',
                          }}
                          title="Bấm vào để đổi trạng thái Mở cửa / Đóng cửa"
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isOpen ? '#16a34a' : '#dc2626',
                              display: 'inline-block',
                            }}
                          />
                          {isOpen ? 'Mở cửa' : 'Đã đóng cửa'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{
                              fontSize: 12,
                              padding: '4px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#0284c7',
                              borderColor: '#bae6fd',
                              background: '#f0f9ff',
                              fontWeight: 600,
                            }}
                            title="Chỉnh sửa thông tin bệnh viện"
                            onClick={() => openEditModal(clinic)}
                          >
                            <Edit size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{
                              fontSize: 12,
                              padding: '4px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#059669',
                              borderColor: '#a7f3d0',
                              background: '#f0fdf4',
                              fontWeight: 600,
                            }}
                            title="Xem vị trí trên bản đồ GIS"
                            onClick={() => navigate('/map')}
                          >
                            <MapPin size={13} /> GIS
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{
                              fontSize: 12,
                              padding: '4px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              background: '#fef2f2',
                              fontWeight: 600,
                            }}
                            title="Xóa bệnh viện khỏi hệ thống"
                            onClick={() => setDeleteClinicTarget(clinic)}
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM / CHỈNH SỬA BỆNH VIỆN */}
      {showModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              zIndex: 100000,
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#0068ff" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                  {isEditing ? 'Chỉnh Sửa Thông Tin Bệnh Viện' : 'Thêm Mới Cơ Sở Y Tế / Bệnh Viện'}
                </h3>
              </div>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Tên Bệnh Viện / Phòng Khám (*)</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="VD: Bệnh viện Đa khoa Quốc tế MedTech Sài Gòn"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa Chỉ Thực Tế (*)</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="VD: 152 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                {/* Tọa độ GIS (Vĩ độ Latitude, Kinh độ Longitude) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Vĩ Độ PostGIS (Latitude) (*)</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      className="form-control"
                      placeholder="VD: 10.7732"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kinh Độ PostGIS (Longitude) (*)</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      className="form-control"
                      placeholder="VD: 106.6983"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preset tọa độ nhanh */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Tọa độ mẫu:</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => {
                      setFormLat(10.7578)
                      setFormLng(106.6597)
                    }}
                  >
                    Chợ Rẫy (Q.5)
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => {
                      setFormLat(10.7732)
                      setFormLng(106.6983)
                    }}
                  >
                    Trung tâm Quận 1
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => {
                      setFormLat(21.0285)
                      setFormLng(105.8542)
                    }}
                  >
                    Hà Nội (Hoàn Kiếm)
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Hotline Liên Hệ</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: 1900 6868"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Tiếp Nhận</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="VD: contact@hospital.vn"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Thời Gian Mở Cửa Hoạt Động</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: 24/7 (Cấp cứu 24/24) hoặc 07:00 - 18:00 Thứ 2 - Thứ 7"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chuyên Khoa Mũi Nhọn (Cách nhau bởi dấu phẩy)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Cấp cứu, Đa khoa, Tim mạch, Nội khoa, Tiêu hóa"
                    value={formSpecs}
                    onChange={(e) => setFormSpecs(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng Thái Hoạt Động Trên Bản Đồ</label>
                  <select
                    className="form-control"
                    value={formIsOpen ? 'OPEN' : 'CLOSED'}
                    onChange={(e) => setFormIsOpen(e.target.value === 'OPEN')}
                  >
                    <option value="OPEN">🟢 Mở cửa đón tiếp bệnh nhân (Ưu tiên bản đồ)</option>
                    <option value="CLOSED">🔴 Đã đóng cửa (Hiện cảnh báo đỏ & đề xuất bệnh viện khác)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalSaving}>
                  {modalSaving ? <RefreshCw size={14} className="loading-spinner" /> : <ShieldCheck size={16} />}
                  {isEditing ? 'Lưu Cập Nhật' : 'Tạo Bệnh Viện Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BỆNH VIỆN */}
      {deleteClinicTarget && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteClinicTarget(null)
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              zIndex: 100000,
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#dc2626' }}>Xác Nhận Xóa Cơ Sở Y Tế</h3>
              </div>
              <button className="btn-close" onClick={() => setDeleteClinicTarget(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: 13.5, color: '#334155' }}>
              Bạn có chắc chắn muốn xóa vĩnh viễn cơ sở y tế <strong>"{deleteClinicTarget.name}"</strong>?
              Hành động này sẽ gỡ bỏ bệnh viện khỏi bản đồ GIS và danh sách điều hướng.
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteClinicTarget(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#dc2626', color: '#fff' }}
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? <RefreshCw size={14} className="loading-spinner" /> : <Trash2 size={15} />}
                Xóa Bệnh Viện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
