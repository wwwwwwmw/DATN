import { useState, useEffect, useMemo, useRef } from 'react'
import { authAPI, clinicAPI, doctorScheduleAPI } from '../services/api'
import {
  CalendarClock, Plus, Download, Upload,
  Trash2, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, Calendar, Stethoscope, Save, X, FileSpreadsheet,
  Sparkles, ArrowLeft, Search, Building2,
  ChevronRight, Phone, Mail, Award, Edit, UserPlus
} from 'lucide-react'

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
      const dayName = days[d.getDay()]
      return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

export default function AdminDoctorSchedules() {
  // Dữ liệu chính
  const [doctors, setDoctors] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Bác sĩ được chọn để xem chi tiết & ca trực (Master-Detail)
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null)

  // Ca trực của bác sĩ được chọn
  const [doctorSlots, setDoctorSlots] = useState<any[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Bộ lọc danh sách Bác sĩ ở trang ngoài
  const [doctorSearch, setDoctorSearch] = useState('')
  const [doctorClinicFilter, setDoctorClinicFilter] = useState('')
  const [doctorSpecFilter, setDoctorSpecFilter] = useState('')

  // Bộ lọc Ca trực của Bác sĩ được chọn
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()))
  const [futureOnly, setFutureOnly] = useState<boolean>(false)

  // Chỉnh sửa Bệnh viện công tác của Bác sĩ
  const [assignedClinicId, setAssignedClinicId] = useState<string>('')
  const [savingClinic, setSavingClinic] = useState(false)

  // Modal Thêm ca trực thủ công (Lẻ)
  const [showSingleModal, setShowSingleModal] = useState(false)
  const [singleClinicId, setSingleClinicId] = useState<string>('')
  const [singleDate, setSingleDate] = useState<string>('2026-11-20')
  const [singleStart, setSingleStart] = useState<string>('08:30')
  const [singleEnd, setSingleEnd] = useState<string>('10:00')
  const [singleMaxPatients, setSingleMaxPatients] = useState<number>(3)
  const [singleSaving, setSingleSaving] = useState(false)

  // Modal Sinh ca theo tháng (Bulk Month)
  const [showBulkMonthModal, setShowBulkMonthModal] = useState(false)
  const [bulkClinicId, setBulkClinicId] = useState<string>('')
  const [bulkMonth, setBulkMonth] = useState<number>(11)
  const [bulkYear, setBulkYear] = useState<number>(2026)
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([0, 1, 2, 3, 4]) // Thứ 2 -> Thứ 6
  const [bulkMaxPatients, setBulkMaxPatients] = useState<number>(3)
  const [bulkShifts, setBulkShifts] = useState<Array<{ start_time: string; end_time: string }>>([
    { start_time: '08:00', end_time: '09:30' },
    { start_time: '09:30', end_time: '11:00' },
    { start_time: '13:30', end_time: '15:00' },
    { start_time: '15:00', end_time: '16:30' },
  ])
  const [bulkSaving, setBulkSaving] = useState(false)

  // Modal Nhập ca bằng Excel
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelImporting, setExcelImporting] = useState(false)
  const [excelResult, setExcelResult] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal Xóa ca trực
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<any | null>(null)
  const [deletingSlot, setDeletingSlot] = useState(false)

  // Modal Thêm Bác sĩ Mới
  const [showCreateDoctorModal, setShowCreateDoctorModal] = useState(false)
  const [newDocLastName, setNewDocLastName] = useState('')
  const [newDocFirstName, setNewDocFirstName] = useState('')
  const [newDocEmail, setNewDocEmail] = useState('')
  const [newDocPhone, setNewDocPhone] = useState('')
  const [newDocPassword, setNewDocPassword] = useState('Doctor@123')
  const [newDocSpecialization, setNewDocSpecialization] = useState('Đa khoa & Nội Tổng quát')
  const [newDocClinicId, setNewDocClinicId] = useState<string>('')
  const [newDocExpYears, setNewDocExpYears] = useState<number>(5)
  const [newDocLicense, setNewDocLicense] = useState('')
  const [newDocFee, setNewDocFee] = useState<number>(300000)
  const [newDocBio, setNewDocBio] = useState('')
  const [creatingDoctor, setCreatingDoctor] = useState(false)

  // Modal Sửa Bác sĩ
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false)
  const [editingDoctorTarget, setEditingDoctorTarget] = useState<any | null>(null)
  const [editDocLastName, setEditDocLastName] = useState('')
  const [editDocFirstName, setEditDocFirstName] = useState('')
  const [editDocEmail, setEditDocEmail] = useState('')
  const [editDocPhone, setEditDocPhone] = useState('')
  const [editDocPassword, setEditDocPassword] = useState('')
  const [editDocSpecialization, setEditDocSpecialization] = useState('')
  const [editDocClinicId, setEditDocClinicId] = useState<string>('')
  const [editDocExpYears, setEditDocExpYears] = useState<number>(5)
  const [editDocLicense, setEditDocLicense] = useState('')
  const [editDocFee, setEditDocFee] = useState<number>(300000)
  const [editDocBio, setEditDocBio] = useState('')
  const [updatingDoctor, setUpdatingDoctor] = useState(false)

  // Modal Xóa Bác sĩ
  const [deleteDoctorTarget, setDeleteDoctorTarget] = useState<any | null>(null)
  const [deletingDoctor, setDeletingDoctor] = useState(false)

  // Modal Sửa Ca trực (TimeSlot)
  const [showEditSlotModal, setShowEditSlotModal] = useState(false)
  const [editingSlotTarget, setEditingSlotTarget] = useState<any | null>(null)
  const [editSlotClinicId, setEditSlotClinicId] = useState<string>('')
  const [editSlotDate, setEditSlotDate] = useState<string>('')
  const [editSlotStart, setEditSlotStart] = useState<string>('')
  const [editSlotEnd, setEditSlotEnd] = useState<string>('')
  const [editSlotMaxPatients, setEditSlotMaxPatients] = useState<number>(3)
  const [editSlotAvailable, setEditSlotAvailable] = useState<boolean>(true)
  const [updatingSlot, setUpdatingSlot] = useState(false)

  // 1. Tải danh sách Bác sĩ và Bệnh viện
  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [docRes, clinicRes] = await Promise.all([
        authAPI.getDoctors().catch(() => null),
        clinicAPI.list({ all: true }).catch(() => null),
      ])
      const docList = extractList(docRes)
      const clinicList = extractList(clinicRes)
      setDoctors(docList)
      setClinics(clinicList)
    } finally {
      setLoading(false)
    }
  }

  // 2. Tải danh sách Ca trực của Bác sĩ được chọn
  const loadDoctorSlots = async (docId: number) => {
    setSlotsLoading(true)
    try {
      const params: any = { doctor_id: docId }
      if (filterMonth) params.month = filterMonth
      if (filterYear) params.year = filterYear
      if (futureOnly) params.future_only = true

      const res = await doctorScheduleAPI.listTimeSlots(params)
      setDoctorSlots(extractList(res))
    } catch {
      setMessage({ type: 'error', text: 'Không thể tải danh sách ca làm việc của bác sĩ.' })
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Khi chọn một bác sĩ -> cập nhật form và nạp lịch khám
  const handleSelectDoctor = (doc: any) => {
    setSelectedDoctor(doc)
    setAssignedClinicId(doc.clinic ? String(doc.clinic) : '')
    setSingleClinicId(doc.clinic ? String(doc.clinic) : (clinics[0]?.id ? String(clinics[0].id) : ''))
    setBulkClinicId(doc.clinic ? String(doc.clinic) : (clinics[0]?.id ? String(clinics[0].id) : ''))
    loadDoctorSlots(doc.id)
  }

  // Reload ca trực khi thay đổi tháng/năm
  useEffect(() => {
    if (selectedDoctor) {
      loadDoctorSlots(selectedDoctor.id)
    }
  }, [filterMonth, filterYear, futureOnly, selectedDoctor])

  // Lọc danh sách bác sĩ
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const fullName = `${doc.user?.last_name || ''} ${doc.user?.first_name || ''}`.toLowerCase()
      const email = (doc.user?.email || '').toLowerCase()
      const spec = (doc.specialization || '').toLowerCase()
      const clinicName = (doc.clinic_name || '').toLowerCase()

      if (doctorClinicFilter && String(doc.clinic) !== doctorClinicFilter) return false
      if (doctorSpecFilter && !spec.includes(doctorSpecFilter.toLowerCase())) return false

      if (doctorSearch.trim()) {
        const q = doctorSearch.toLowerCase()
        return fullName.includes(q) || email.includes(q) || spec.includes(q) || clinicName.includes(q)
      }
      return true
    })
  }, [doctors, doctorSearch, doctorClinicFilter, doctorSpecFilter])

  // Danh sách các chuyên khoa để lọc
  const uniqueSpecializations = useMemo(() => {
    const set = new Set<string>()
    doctors.forEach((d) => {
      if (d.specialization) set.add(d.specialization)
    })
    return Array.from(set)
  }, [doctors])

  // Thống kê ca trực của bác sĩ được chọn
  const doctorSlotStats = useMemo(() => {
    const total = doctorSlots.length
    const available = doctorSlots.filter((s) => s.is_available && s.remaining_slots > 0).length
    const full = total - available
    return { total, available, full }
  }, [doctorSlots])

  // Lưu phân công Bệnh viện cho Bác sĩ
  const handleSaveAssignedClinic = async () => {
    if (!selectedDoctor) return
    setSavingClinic(true)
    try {
      const cid = assignedClinicId ? Number(assignedClinicId) : null
      await doctorScheduleAPI.updateDoctor(selectedDoctor.id, { clinic_id: cid })

      const matched = clinics.find((c) => c.id === cid)
      const updatedDoc = {
        ...selectedDoctor,
        clinic: cid,
        clinic_name: matched?.name || '',
        clinic_address: matched?.address || '',
      }

      setSelectedDoctor(updatedDoc)
      setDoctors((prev) => prev.map((d) => (d.id === selectedDoctor.id ? updatedDoc : d)))
      setMessage({ type: 'success', text: `Đã cập nhật bệnh viện công tác cho BS. ${selectedDoctor.user?.last_name} ${selectedDoctor.user?.first_name} thành công!` })
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi lưu phân công bệnh viện.' })
    } finally {
      setSavingClinic(false)
    }
  }

  // Xử lý tạo ca trực lẻ
  const handleCreateSingleSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor || !singleDate || !singleStart || !singleEnd) {
      alert('Vui lòng điền đầy đủ Ngày khám và Khung giờ.')
      return
    }

    setSingleSaving(true)
    try {
      await doctorScheduleAPI.createTimeSlot({
        doctor_id: selectedDoctor.id,
        clinic_id: singleClinicId ? Number(singleClinicId) : undefined,
        date: singleDate,
        start_time: singleStart,
        end_time: singleEnd,
        max_patients: Number(singleMaxPatients),
      })

      setMessage({ type: 'success', text: `Đã thêm ca trực ngày ${singleDate} (${singleStart} - ${singleEnd}) cho BS. ${selectedDoctor.user?.last_name} ${selectedDoctor.user?.first_name}!` })
      setShowSingleModal(false)
      await loadDoctorSlots(selectedDoctor.id)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể tạo ca trực.')
    } finally {
      setSingleSaving(false)
    }
  }

  // Xử lý sinh ca trực theo tháng
  const handleBulkGenerateMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor) return
    if (bulkWeekdays.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ngày trong tuần.')
      return
    }

    setBulkSaving(true)
    try {
      const res = await doctorScheduleAPI.bulkGenerateMonth({
        doctor_id: selectedDoctor.id,
        clinic_id: bulkClinicId ? Number(bulkClinicId) : undefined,
        month: Number(bulkMonth),
        year: Number(bulkYear),
        weekdays: bulkWeekdays,
        shifts: bulkShifts.map((s) => ({ ...s, max_patients: Number(bulkMaxPatients) })),
      })

      const data = res.data
      setMessage({
        type: 'success',
        text: data.message || `Đã sinh thành công ${data.created_count} ca trực trong tháng ${bulkMonth}/${bulkYear}!`,
      })
      setShowBulkMonthModal(false)
      setFilterMonth(String(bulkMonth))
      setFilterYear(String(bulkYear))
      await loadDoctorSlots(selectedDoctor.id)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Có lỗi khi sinh ca trực theo tháng.')
    } finally {
      setBulkSaving(false)
    }
  }

  // Xử lý tải lên file Excel
  const handleImportExcel = async () => {
    if (!excelFile) {
      alert('Vui lòng chọn file Excel (.xlsx).')
      return
    }

    setExcelImporting(true)
    setExcelResult(null)
    try {
      const formData = new FormData()
      formData.append('file', excelFile)
      const res = await doctorScheduleAPI.importExcel(formData)
      setExcelResult(res.data)
      setMessage({
        type: 'success',
        text: `Nhập thành công ${res.data?.imported_count || 0} ca trực mới từ file Excel!`,
      })
      if (selectedDoctor) {
        await loadDoctorSlots(selectedDoctor.id)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xử lý file Excel.')
    } finally {
      setExcelImporting(false)
    }
  }

  // Xử lý Xóa ca trực
  const handleConfirmDeleteSlot = async () => {
    if (!deleteSlotTarget) return
    setDeletingSlot(true)
    try {
      await doctorScheduleAPI.deleteTimeSlot(deleteSlotTarget.id)
      setMessage({ type: 'success', text: `Đã xóa ca trực thành công!` })
      setDeleteSlotTarget(null)
      if (selectedDoctor) {
        await loadDoctorSlots(selectedDoctor.id)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xóa ca trực này.')
    } finally {
      setDeletingSlot(false)
    }
  }

  const toggleWeekday = (d: number) => {
    setBulkWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
  }

  // Mở modal thêm bác sĩ
  const openCreateDoctorModal = () => {
    setNewDocLastName('')
    setNewDocFirstName('')
    setNewDocEmail('')
    setNewDocPhone('0901234567')
    setNewDocPassword('Doctor@123')
    setNewDocSpecialization('Đa khoa & Nội Tổng quát')
    setNewDocClinicId(clinics[0]?.id ? String(clinics[0].id) : '')
    setNewDocExpYears(5)
    setNewDocLicense(`CCHN-BV-${Math.floor(1000 + Math.random() * 9000)}`)
    setNewDocFee(300000)
    setNewDocBio('')
    setShowCreateDoctorModal(true)
  }

  // Xử lý tạo Bác sĩ mới
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocEmail.trim() || !newDocFirstName.trim() || !newDocLastName.trim()) {
      alert('Vui lòng điền đầy đủ Họ, Tên và Email bác sĩ.')
      return
    }

    setCreatingDoctor(true)
    try {
      const res = await doctorScheduleAPI.createDoctor({
        email: newDocEmail.trim().toLowerCase(),
        first_name: newDocFirstName.trim(),
        last_name: newDocLastName.trim(),
        phone: newDocPhone.trim(),
        password: newDocPassword || 'Doctor@123',
        specialization: newDocSpecialization.trim() || 'Đa khoa & Nội Tổng quát',
        clinic_id: newDocClinicId ? Number(newDocClinicId) : undefined,
        experience_years: Number(newDocExpYears) || 5,
        license_number: newDocLicense.trim(),
        consultation_fee: Number(newDocFee) || 300000,
        bio: newDocBio.trim(),
      })

      setMessage({
        type: 'success',
        text: res.data?.message || `Thêm mới bác sĩ BS. ${newDocLastName} ${newDocFirstName} thành công!`,
      })
      setShowCreateDoctorModal(false)
      await loadInitialData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Có lỗi khi tạo tài khoản bác sĩ.')
    } finally {
      setCreatingDoctor(false)
    }
  }

  // Mở modal sửa thông tin bác sĩ
  const openEditDoctorModal = (doc: any) => {
    setEditingDoctorTarget(doc)
    setEditDocLastName(doc.user?.last_name || '')
    setEditDocFirstName(doc.user?.first_name || '')
    setEditDocEmail(doc.user?.email || '')
    setEditDocPhone(doc.user?.phone || '')
    setEditDocPassword('')
    setEditDocSpecialization(doc.specialization || 'Đa khoa & Nội Tổng quát')
    setEditDocClinicId(doc.clinic ? String(doc.clinic) : '')
    setEditDocExpYears(doc.experience_years ?? 5)
    setEditDocLicense(doc.license_number || '')
    setEditDocFee(doc.consultation_fee ?? 300000)
    setEditDocBio(doc.bio || '')
    setShowEditDoctorModal(true)
  }

  // Xử lý cập nhật thông tin bác sĩ
  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDoctorTarget) return
    if (!editDocFirstName.trim() || !editDocLastName.trim()) {
      alert('Vui lòng điền đầy đủ Họ và Tên bác sĩ.')
      return
    }

    setUpdatingDoctor(true)
    try {
      const payload: any = {
        first_name: editDocFirstName.trim(),
        last_name: editDocLastName.trim(),
        phone: editDocPhone.trim(),
        specialization: editDocSpecialization.trim(),
        clinic_id: editDocClinicId ? Number(editDocClinicId) : null,
        experience_years: Number(editDocExpYears) || 5,
        license_number: editDocLicense.trim(),
        consultation_fee: Number(editDocFee) || 300000,
        bio: editDocBio.trim(),
      }
      if (editDocEmail.trim() && editDocEmail.trim().toLowerCase() !== editingDoctorTarget.user?.email) {
        payload.email = editDocEmail.trim().toLowerCase()
      }
      if (editDocPassword.trim()) {
        payload.password = editDocPassword.trim()
      }

      const res = await doctorScheduleAPI.updateDoctor(editingDoctorTarget.id, payload)
      const updatedData = res.data?.data

      setMessage({
        type: 'success',
        text: res.data?.message || `Cập nhật thông tin BS. ${editDocLastName} ${editDocFirstName} thành công!`,
      })

      // Đồng bộ state
      setDoctors((prev) =>
        prev.map((d) => (d.id === editingDoctorTarget.id ? { ...d, ...updatedData } : d))
      )
      if (selectedDoctor && selectedDoctor.id === editingDoctorTarget.id) {
        setSelectedDoctor((prev: any) => ({ ...prev, ...updatedData }))
      }

      setShowEditDoctorModal(false)
      await loadInitialData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Có lỗi khi cập nhật thông tin bác sĩ.')
    } finally {
      setUpdatingDoctor(false)
    }
  }

  // Xử lý xác nhận Xóa Bác sĩ
  const handleConfirmDeleteDoctor = async () => {
    if (!deleteDoctorTarget) return
    setDeletingDoctor(true)
    try {
      const res = await doctorScheduleAPI.deleteDoctor(deleteDoctorTarget.id)
      setMessage({
        type: 'success',
        text: res.data?.message || `Đã xóa bác sĩ thành công khỏi hệ thống!`,
      })
      if (selectedDoctor?.id === deleteDoctorTarget.id) {
        setSelectedDoctor(null)
      }
      setDeleteDoctorTarget(null)
      await loadInitialData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xóa bác sĩ này.')
    } finally {
      setDeletingDoctor(false)
    }
  }

  // Mở modal sửa ca trực
  const openEditSlotModal = (slot: any) => {
    setEditingSlotTarget(slot)
    setEditSlotDate(slot.date || '')
    setEditSlotStart(slot.start_time ? slot.start_time.slice(0, 5) : '08:00')
    setEditSlotEnd(slot.end_time ? slot.end_time.slice(0, 5) : '09:30')
    setEditSlotClinicId(slot.clinic ? String(slot.clinic) : (selectedDoctor?.clinic ? String(selectedDoctor.clinic) : ''))
    setEditSlotMaxPatients(slot.max_patients || 3)
    setEditSlotAvailable(slot.is_available ?? true)
    setShowEditSlotModal(true)
  }

  // Xử lý cập nhật ca trực
  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSlotTarget) return

    setUpdatingSlot(true)
    try {
      const payload: any = {
        date: editSlotDate,
        start_time: editSlotStart,
        end_time: editSlotEnd,
        clinic_id: editSlotClinicId ? Number(editSlotClinicId) : undefined,
        max_patients: Number(editSlotMaxPatients),
        is_available: editSlotAvailable,
      }

      const res = await doctorScheduleAPI.updateTimeSlot(editingSlotTarget.id, payload)
      setMessage({
        type: 'success',
        text: res.data?.message || `Cập nhật ca trực thành công!`,
      })
      setShowEditSlotModal(false)
      if (selectedDoctor) {
        await loadDoctorSlots(selectedDoctor.id)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Có lỗi khi cập nhật ca trực.')
    } finally {
      setUpdatingSlot(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Thông báo thông tin */}
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

      {/* ========================================================================= */}
      {/* MÀN HÌNH 1: DANH SÁCH BÁC SĨ (HIỆN TRƯỚC HẾT) */}
      {/* ========================================================================= */}
      {!selectedDoctor ? (
        <>
          {/* Header Banner */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4338ca 100%)',
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
                  <Stethoscope size={28} color="#a5b4fc" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
                      Quản Trị Bác Sĩ & Lịch Khám Toàn Viện
                    </h2>
                    <span
                      style={{
                        background: 'rgba(99, 102, 241, 0.35)',
                        border: '1px solid rgba(199, 210, 254, 0.5)',
                        color: '#e0e7ff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {doctors.length} BÁC SĨ
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', fontSize: '0.92rem' }}>
                    Nhấn vào từng bác sĩ để xem hồ sơ chuyên môn, phân công bệnh viện và thiết lập chi tiết lịch ca trực của bác sĩ đó.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    background: '#0068ff',
                    borderColor: '#0068ff',
                    fontSize: 12.5,
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(0, 104, 255, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={openCreateDoctorModal}
                >
                  <Plus size={15} /> + Thêm Bác Sĩ Mới
                </button>

                <a
                  href={doctorScheduleAPI.exportTemplateUrl}
                  download="Mau_Ca_Truc_Bac_Si.xlsx"
                  className="btn btn-outline"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.25)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Download size={15} /> Tải Mẫu Excel
                </a>

                <button
                  className="btn btn-outline"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.25)',
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setExcelResult(null)
                    setExcelFile(null)
                    setShowExcelModal(true)
                  }}
                >
                  <Upload size={15} /> Nhập Hàng Loạt Bằng Excel
                </button>
              </div>
            </div>
          </div>

          {/* Thanh tìm kiếm & Bộ lọc Bác sĩ */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                  <Search
                    size={15}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
                    placeholder="Tìm theo tên bác sĩ, email..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                </div>

                {/* Lọc theo Chuyên khoa */}
                <select
                  className="form-control"
                  style={{ width: 'auto', minWidth: 180, height: 38, fontSize: 13 }}
                  value={doctorSpecFilter}
                  onChange={(e) => setDoctorSpecFilter(e.target.value)}
                >
                  <option value="">Tất cả chuyên khoa</option>
                  {uniqueSpecializations.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>

                {/* Lọc theo Bệnh viện */}
                <select
                  className="form-control"
                  style={{ width: 'auto', minWidth: 220, height: 38, fontSize: 13 }}
                  value={doctorClinicFilter}
                  onChange={(e) => setDoctorClinicFilter(e.target.value)}
                >
                  <option value="">Tất cả bệnh viện công tác</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={loadInitialData}
                title="Làm mới danh sách"
                style={{ height: 38 }}
              >
                <RefreshCw size={15} className={loading ? 'loading-spinner' : ''} /> Tải lại
              </button>
            </div>

            {/* Danh sách Bác sĩ dưới dạng Bảng Card Trực Quan & Dễ Nhìn */}
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>
                    <th style={{ width: 48, textAlign: 'center' }}>STT</th>
                    <th>Bác Sĩ</th>
                    <th>Chuyên Khoa</th>
                    <th>Bệnh Viện Công Tác</th>
                    <th>Kinh Nghiệm / CCHN</th>
                    <th>Ca Khám Trực Tuyến</th>
                    <th style={{ textAlign: 'center', width: 280 }}>Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                        <RefreshCw size={20} className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                        <div>Đang tải danh sách bác sĩ...</div>
                      </td>
                    </tr>
                  ) : filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                        <Stethoscope size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 600 }}>Không tìm thấy bác sĩ nào phù hợp.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc, idx) => {
                      const fullName = `BS. ${doc.user?.last_name || ''} ${doc.user?.first_name || ''}`.trim()
                      const slotsCount = doc.available_slots ? doc.available_slots.length : 0
                      return (
                        <tr
                          key={doc.id}
                          style={{ fontSize: 13.5, cursor: 'pointer' }}
                          onClick={() => handleSelectDoctor(doc)}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0068ff, #4f46e5)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}
                              >
                                {doc.user?.first_name ? doc.user.first_name[0].toUpperCase() : 'B'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{fullName}</div>
                                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Mail size={11} /> {doc.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 600,
                                fontSize: 12,
                                display: 'inline-block',
                              }}
                            >
                              {doc.specialization || 'Đa khoa'}
                            </span>
                          </td>

                          <td style={{ maxWidth: 260 }}>
                            {doc.clinic_name ? (
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                                  {doc.clinic_name}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                  {doc.clinic_address}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={13} /> Chưa gán bệnh viện
                              </span>
                            )}
                          </td>

                          <td>
                            <div style={{ color: '#334155', fontWeight: 600 }}>
                              {doc.experience_years
                                ? (doc.experience_years > 100 ? `${2026 - doc.experience_years} năm kinh nghiệm` : `${doc.experience_years} năm kinh nghiệm`)
                                : '5 năm kinh nghiệm'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                              CCHN: {doc.license_number || 'Chưa cập nhật'}
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: slotsCount > 0 ? '#ecfdf5' : '#f1f5f9',
                                  color: slotsCount > 0 ? '#15803d' : '#64748b',
                                  fontWeight: 700,
                                  fontSize: 11.5,
                                }}
                              >
                                {slotsCount} ca sắp tới
                              </span>
                            </div>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{
                                  fontSize: 12,
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectDoctor(doc)
                                }}
                                title="Xem hồ sơ chi tiết và bảng ca trực"
                              >
                                <CalendarClock size={13} /> Ca trực <ChevronRight size={13} />
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
                                  color: '#0284c7',
                                  borderColor: '#bae6fd',
                                  background: '#f0f9ff',
                                  fontWeight: 600,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditDoctorModal(doc)
                                }}
                                title="Chỉnh sửa toàn bộ thông tin bác sĩ"
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
                                  color: '#dc2626',
                                  borderColor: '#fecaca',
                                  background: '#fef2f2',
                                  fontWeight: 600,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteDoctorTarget(doc)
                                }}
                                title="Xóa bác sĩ khỏi hệ thống"
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
        </>
      ) : (
        /* ========================================================================= */
        /* MÀN HÌNH 2: CHI TIẾT BÁC SĨ & BẢNG CA LÀM VIỆC (KHI BẤM VÀO BÁC SĨ) */
        /* ========================================================================= */
        <>
          {/* Thanh điều hướng Quay lại */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              className="btn btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0f52ba' }}
              onClick={() => setSelectedDoctor(null)}
            >
              <ArrowLeft size={16} /> Quay lại danh sách tất cả bác sĩ
            </button>

            <div style={{ fontSize: 12.5, color: '#64748b' }}>
              Quản lý ca trực riêng cho <strong>BS. {selectedDoctor.user?.last_name} {selectedDoctor.user?.first_name}</strong>
            </div>
          </div>

          {/* Hồ sơ thông tin Bác sĩ & Hộp Phân công Bệnh viện */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              borderRadius: 14,
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
              {/* Cột trái: Thông tin Bác sĩ */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0068ff, #4338ca)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(0, 104, 255, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  {selectedDoctor.user?.first_name ? selectedDoctor.user.first_name[0].toUpperCase() : 'B'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      BS. {selectedDoctor.user?.last_name} {selectedDoctor.user?.first_name}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 700,
                        fontSize: 11.5,
                      }}
                    >
                      {selectedDoctor.specialization || 'Đa khoa'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12.5, color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Mail size={13} color="#64748b" /> {selectedDoctor.user?.email}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Phone size={13} color="#64748b" /> {selectedDoctor.user?.phone || 'Chưa cập nhật SĐT'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Award size={13} color="#64748b" /> CCHN: {selectedDoctor.license_number || 'CCHN-BV-HCM'}
                    </span>
                  </div>

                  {selectedDoctor.clinic_address && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={13} /> Địa chỉ cơ sở: {selectedDoctor.clinic_address}
                    </div>
                  )}

                  {/* Nút Sửa / Xóa Hồ Sơ Bác Sĩ */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{
                        color: '#0284c7',
                        borderColor: '#bae6fd',
                        background: '#f0f9ff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                      }}
                      onClick={() => openEditDoctorModal(selectedDoctor)}
                    >
                      <Edit size={14} /> Chỉnh Sửa Toàn Bộ Hồ Sơ Bác Sĩ
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{
                        color: '#dc2626',
                        borderColor: '#fecaca',
                        background: '#fef2f2',
                        fontWeight: 700,
                        fontSize: 12.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                      }}
                      onClick={() => setDeleteDoctorTarget(selectedDoctor)}
                    >
                      <Trash2 size={14} /> Xóa Bác Sĩ Khỏi Hệ Thống
                    </button>
                  </div>
                </div>
              </div>

              {/* Cột phải: Chọn và Lưu Bệnh viện công tác */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 16px',
                  minWidth: 320,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                  Bệnh Viện / Cơ Sở Bác Sĩ Công Tác
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="form-control"
                    style={{ fontSize: 13, height: 36 }}
                    value={assignedClinicId}
                    onChange={(e) => setAssignedClinicId(e.target.value)}
                  >
                    <option value="">-- Chưa gán bệnh viện --</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flexShrink: 0, fontSize: 12, padding: '0 12px' }}
                    disabled={savingClinic}
                    onClick={handleSaveAssignedClinic}
                  >
                    {savingClinic ? <RefreshCw size={13} className="loading-spinner" /> : <Save size={13} />} Lưu
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Tọa độ GIS bệnh viện này sẽ dùng để đề xuất khoảng cách khi bệnh nhân đặt lịch khám.
                </div>
              </div>
            </div>
          </div>

          {/* Hộp Công cụ Thao tác Ca trực cho Bác sĩ này */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Bộ lọc tháng/năm của bác sĩ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                <Calendar size={15} color="#0f52ba" /> Lịch khám tháng:
              </div>

              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 120, height: 36, fontSize: 13 }}
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>

              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 100, height: 36, fontSize: 13 }}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#334155', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={futureOnly}
                  onChange={(e) => setFutureOnly(e.target.checked)}
                />
                Chỉ hiện các ca sắp tới
              </label>

              {/* Thống kê ca trong tháng */}
              <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
                <span className="badge badge-primary">{doctorSlotStats.total} CA TRONG THÁNG</span>
                <span className="badge badge-success">{doctorSlotStats.available} CÒN TRỐNG</span>
                {doctorSlotStats.full > 0 && <span className="badge badge-danger">{doctorSlotStats.full} ĐÃ KÍN</span>}
              </div>
            </div>

            {/* Các nút hành động tạo ca */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                style={{
                  background: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
                onClick={() => {
                  setExcelResult(null)
                  setExcelFile(null)
                  setShowExcelModal(true)
                }}
              >
                <Upload size={14} /> Nhập File Excel
              </button>

              <button
                className="btn btn-outline"
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  borderColor: '#4f46e5',
                  fontSize: 12.5,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                }}
                onClick={() => {
                  setBulkMonth(Number(filterMonth) || 11)
                  setBulkYear(Number(filterYear) || 2026)
                  setShowBulkMonthModal(true)
                }}
              >
                <Calendar size={14} /> 📅 Nhập Ca Theo Tháng
              </button>

              <button
                className="btn btn-primary"
                style={{
                  background: '#0068ff',
                  borderColor: '#0068ff',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
                onClick={() => setShowSingleModal(true)}
              >
                <Plus size={14} /> + Thêm Ca Lẻ
              </button>
            </div>
          </div>

          {/* Bảng Danh Sách Ca Làm Việc Của Bác Sĩ Này */}
          <div className="card" style={{ borderRadius: 12 }}>
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                Bảng Ca Trực Khám Bệnh — Tháng {filterMonth}/{filterYear}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => loadDoctorSlots(selectedDoctor.id)}
                title="Làm mới ca trực"
              >
                <RefreshCw size={14} className={slotsLoading ? 'loading-spinner' : ''} /> Tải lại bảng ca
              </button>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>
                    <th style={{ width: 48, textAlign: 'center' }}>STT</th>
                    <th>Ngày Khám</th>
                    <th>Khung Giờ Khám</th>
                    <th>Bệnh Viện Tiếp Nhận</th>
                    <th style={{ textAlign: 'center' }}>Số Lượng BN Đã Đặt</th>
                    <th style={{ textAlign: 'center' }}>Trạng Thái Ca</th>
                    <th style={{ textAlign: 'center', width: 170 }}>Thao Tác Ca Trực</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                        <RefreshCw size={20} className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                        <div>Đang tải ca trực của bác sĩ...</div>
                      </td>
                    </tr>
                  ) : doctorSlots.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                        <CalendarClock size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          BS. {selectedDoctor.user?.last_name} {selectedDoctor.user?.first_name} chưa có ca trực nào trong tháng {filterMonth}/{filterYear}.
                        </div>
                        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                          Bấm nút <strong>"📅 Nhập Ca Theo Tháng"</strong> để sinh tự động lịch khám cho cả tháng hoặc bấm <strong>"+ Thêm Ca Lẻ"</strong>.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    doctorSlots.map((slot, idx) => {
                      const isFull = slot.current_patients >= slot.max_patients
                      return (
                        <tr key={slot.id} style={{ fontSize: 13.5 }}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatVietnameseDate(slot.date)}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{slot.date}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#4338ca' }}>
                              <Clock size={14} />
                              {slot.start_time} - {slot.end_time}
                            </div>
                          </td>
                          <td style={{ maxWidth: 280 }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>
                              {slot.clinic_name || selectedDoctor.clinic_name || 'Bệnh viện MedTech'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {slot.clinic_address || selectedDoctor.clinic_address}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 6,
                                background: isFull ? '#fee2e2' : '#ecfdf5',
                                color: isFull ? '#b91c1c' : '#15803d',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              {slot.current_patients} / {slot.max_patients} Bệnh nhân
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={!isFull ? 'badge badge-success' : 'badge badge-danger'} style={{ fontSize: 11 }}>
                              {!isFull ? 'Còn trống chỗ' : 'Đã kín lịch'}
                            </span>
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
                                title="Chỉnh sửa ngày giờ hoặc phòng khám ca trực này"
                                onClick={() => openEditSlotModal(slot)}
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
                                  color: '#dc2626',
                                  borderColor: '#fecaca',
                                  background: '#fef2f2',
                                  fontWeight: 600,
                                }}
                                title="Xóa ca trực này"
                                onClick={() => setDeleteSlotTarget(slot)}
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
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM CA TRỰC THỦ CÔNG (LẺ) CHO BÁC SĨ */}
      {/* ========================================================================= */}
      {showSingleModal && selectedDoctor && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#0068ff" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Thêm Ca Trực Khám Bệnh Mới</h3>
              </div>
              <button className="btn-close" onClick={() => setShowSingleModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSingleSlot}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
                  Bác sĩ khám: <strong>BS. {selectedDoctor.user?.last_name} {selectedDoctor.user?.first_name}</strong> ({selectedDoctor.specialization})
                </div>

                <div className="form-group">
                  <label className="form-label">Cơ Sở Y Tế / Bệnh Viện Trực (*)</label>
                  <select
                    className="form-control"
                    value={singleClinicId}
                    onChange={(e) => setSingleClinicId(e.target.value)}
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày Khám (*)</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Giờ Bắt Đầu (*)</label>
                    <input
                      type="time"
                      required
                      className="form-control"
                      value={singleStart}
                      onChange={(e) => setSingleStart(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giờ Kết Thúc (*)</label>
                    <input
                      type="time"
                      required
                      className="form-control"
                      value={singleEnd}
                      onChange={(e) => setSingleEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Số Lượng Bệnh Nhân Tối Đa Trong Ca</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    className="form-control"
                    value={singleMaxPatients}
                    onChange={(e) => setSingleMaxPatients(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowSingleModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={singleSaving}>
                  {singleSaving ? <RefreshCw size={14} className="loading-spinner" /> : <Save size={15} />}
                  Lưu Ca Trực
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SINH CA TRỰC THEO THÁNG (BULK MONTH GENERATION) */}
      {/* ========================================================================= */}
      {showBulkMonthModal && selectedDoctor && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Tự Động Sinh Ca Trực Cả Tháng</h3>
              </div>
              <button className="btn-close" onClick={() => setShowBulkMonthModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleBulkGenerateMonth}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ padding: '8px 12px', background: '#eef2ff', borderRadius: 8, fontSize: 13, color: '#3730a3' }}>
                  Phân ca tháng cho: <strong>BS. {selectedDoctor.user?.last_name} {selectedDoctor.user?.first_name}</strong> ({selectedDoctor.specialization})
                </div>

                <div className="form-group">
                  <label className="form-label">Bệnh Viện / Cơ Sở Khám (*)</label>
                  <select
                    className="form-control"
                    value={bulkClinicId}
                    onChange={(e) => setBulkClinicId(e.target.value)}
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Tháng (*)</label>
                    <select
                      className="form-control"
                      value={bulkMonth}
                      onChange={(e) => setBulkMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Năm (*)</label>
                    <select
                      className="form-control"
                      value={bulkYear}
                      onChange={(e) => setBulkYear(Number(e.target.value))}
                    >
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                {/* Chọn các thứ trong tuần */}
                <div className="form-group">
                  <label className="form-label">Các Thứ Trực Trong Tuần (*)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { val: 0, label: 'Thứ 2' },
                      { val: 1, label: 'Thứ 3' },
                      { val: 2, label: 'Thứ 4' },
                      { val: 3, label: 'Thứ 5' },
                      { val: 4, label: 'Thứ 6' },
                      { val: 5, label: 'Thứ 7' },
                      { val: 6, label: 'Chủ Nhật' },
                    ].map((item) => {
                      const active = bulkWeekdays.includes(item.val)
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => toggleWeekday(item.val)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: active ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            background: active ? '#4f46e5' : '#ffffff',
                            color: active ? '#ffffff' : '#334155',
                          }}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Các khung giờ trong ngày */}
                <div className="form-group">
                  <label className="form-label">Các Khung Giờ Trong Mỗi Ngày Trực</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {bulkShifts.map((shift, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 64, color: '#475569' }}>
                          Ca {sIdx + 1}:
                        </span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ height: 34, fontSize: 13 }}
                          value={shift.start_time}
                          onChange={(e) => {
                            const val = e.target.value
                            setBulkShifts((prev) =>
                              prev.map((s, i) => (i === sIdx ? { ...s, start_time: val } : s))
                            )
                          }}
                        />
                        <span>-</span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ height: 34, fontSize: 13 }}
                          value={shift.end_time}
                          onChange={(e) => {
                            const val = e.target.value
                            setBulkShifts((prev) =>
                              prev.map((s, i) => (i === sIdx ? { ...s, end_time: val } : s))
                            )
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setBulkShifts((prev) => prev.filter((_, i) => i !== sIdx))}
                          title="Xóa khung giờ này"
                        >
                          <X size={15} color="#dc2626" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, alignSelf: 'flex-start', marginTop: 4, color: '#4f46e5' }}
                      onClick={() =>
                        setBulkShifts((prev) => [...prev, { start_time: '18:00', end_time: '19:30' }])
                      }
                    >
                      + Thêm Khung Giờ Mới
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Số Lượng Bệnh Nhân Tối Đa Mỗi Ca</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    className="form-control"
                    value={bulkMaxPatients}
                    onChange={(e) => setBulkMaxPatients(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowBulkMonthModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
                  disabled={bulkSaving}
                >
                  {bulkSaving ? <RefreshCw size={14} className="loading-spinner" /> : <Sparkles size={15} />}
                  Tự Động Sinh Ca Trực Cả Tháng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NHẬP CA TRỰC BẰNG FILE EXCEL */}
      {/* ========================================================================= */}
      {showExcelModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Nhập Ca Trực Hàng Loạt Bằng Excel</h3>
              </div>
              <button className="btn-close" onClick={() => setShowExcelModal(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <FileSpreadsheet size={36} color="#059669" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>Chọn File Excel (.xlsx)</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Tải file mẫu về để điền thông tin đúng cột chuẩn theo hệ thống.
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setExcelFile(e.target.files[0])
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {excelFile ? `Đã chọn: ${excelFile.name}` : 'Duyệt Tìm File Trong Máy'}
                </button>
              </div>

              {/* Kết quả sau khi nạp file */}
              {excelResult && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#166534' }}>
                    ✓ {excelResult.message || `Đã nhập thành công ${excelResult.imported_count} ca trực mới!`}
                  </div>
                  {Array.isArray(excelResult.errors) && excelResult.errors.length > 0 && (
                    <div style={{ marginTop: 6, color: '#dc2626', fontSize: 12 }}>
                      <strong>Cảnh báo dòng lỗi:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {excelResult.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <a
                href={doctorScheduleAPI.exportTemplateUrl}
                download="Mau_Ca_Truc_Bac_Si.xlsx"
                className="btn btn-ghost btn-sm"
                style={{ color: '#0068ff', textDecoration: 'none' }}
              >
                <Download size={14} /> Tải file mẫu .xlsx
              </a>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowExcelModal(false)}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!excelFile || excelImporting}
                  onClick={handleImportExcel}
                >
                  {excelImporting ? <RefreshCw size={14} className="loading-spinner" /> : <Upload size={14} />}
                  Tiến Hành Nhập Ca Trực
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA CA TRỰC */}
      {/* ========================================================================= */}
      {deleteSlotTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#dc2626' }}>Xác Nhận Xóa Ca Trực</h3>
              </div>
              <button className="btn-close" onClick={() => setDeleteSlotTarget(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: 13.5, color: '#334155' }}>
              Bạn có chắc chắn muốn xóa ca trực ngày <strong>{deleteSlotTarget.date}</strong> ({deleteSlotTarget.start_time} - {deleteSlotTarget.end_time})?
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteSlotTarget(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#dc2626', color: '#fff' }}
                disabled={deletingSlot}
                onClick={handleConfirmDeleteSlot}
              >
                {deletingSlot ? <RefreshCw size={14} className="loading-spinner" /> : <Trash2 size={15} />}
                Xóa Ca Trực
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: THÊM BÁC SĨ MỚI (CREATE DOCTOR) */}
      {/* ========================================================================= */}
      {showCreateDoctorModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#0068ff" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Thêm Mới Bác Sĩ Vào Hệ Thống</h3>
              </div>
              <button className="btn-close" onClick={() => setShowCreateDoctorModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDoctor}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Họ và Tên Đệm (*)</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="VD: Nguyễn Văn"
                      value={newDocLastName}
                      onChange={(e) => setNewDocLastName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên Bác Sĩ (*)</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="VD: Bình"
                      value={newDocFirstName}
                      onChange={(e) => setNewDocFirstName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Email Đăng Nhập (*)</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      placeholder="VD: bs.binh@medtech.vn"
                      value={newDocEmail}
                      onChange={(e) => setNewDocEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: 0901234567"
                      value={newDocPhone}
                      onChange={(e) => setNewDocPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Mật Khẩu Khởi Tạo</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="Doctor@123"
                      value={newDocPassword}
                      onChange={(e) => setNewDocPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Năm Kinh Nghiệm</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className="form-control"
                      value={newDocExpYears}
                      onChange={(e) => setNewDocExpYears(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Chuyên Khoa Bác Sĩ (*)</label>
                    <select
                      className="form-control"
                      value={newDocSpecialization}
                      onChange={(e) => setNewDocSpecialization(e.target.value)}
                    >
                      <option value="Đa khoa & Nội Tổng quát">Đa khoa & Nội Tổng quát</option>
                      <option value="Nhi khoa">Nhi khoa</option>
                      <option value="Tim mạch & Can thiệp mạch">Tim mạch & Can thiệp mạch</option>
                      <option value="Tiêu hóa - Gan mật">Tiêu hóa - Gan mật</option>
                      <option value="Mắt (Nhãn khoa)">Mắt (Nhãn khoa)</option>
                      <option value="Tai Mũi Họng">Tai Mũi Họng</option>
                      <option value="Răng Hàm Mặt">Răng Hàm Mặt</option>
                      <option value="Da liễu & Thẩm mỹ">Da liễu & Thẩm mỹ</option>
                      <option value="Sản - Phụ khoa">Sản - Phụ khoa</option>
                      <option value="Cơ Xương Khớp & Chấn thương chỉnh hình">Cơ Xương Khớp & Chấn thương chỉnh hình</option>
                      <option value="Thần kinh & Đột quỵ">Thần kinh & Đột quỵ</option>
                      <option value="Hồi sức cấp cứu & Chống độc">Hồi sức cấp cứu & Chống độc</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bệnh Viện / Cơ Sở Công Tác (*)</label>
                    <select
                      className="form-control"
                      value={newDocClinicId}
                      onChange={(e) => setNewDocClinicId(e.target.value)}
                    >
                      <option value="">-- Chọn Bệnh Viện --</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Chứng Chỉ Hành Nghề (CCHN)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: CCHN-01234-HCM"
                      value={newDocLicense}
                      onChange={(e) => setNewDocLicense(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phí Khám Ban Đầu (VNĐ)</label>
                    <input
                      type="number"
                      step="10000"
                      className="form-control"
                      value={newDocFee}
                      onChange={(e) => setNewDocFee(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tiểu Sử / Giới Thiệu Chuyên Môn</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Bác sĩ có hơn 10 năm kinh nghiệm trong chẩn đoán và điều trị..."
                    value={newDocBio}
                    onChange={(e) => setNewDocBio(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateDoctorModal(false)}>
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0068ff', borderColor: '#0068ff' }}
                  disabled={creatingDoctor}
                >
                  {creatingDoctor ? <RefreshCw size={14} className="loading-spinner" /> : <Save size={15} />}
                  Tạo Tài Khoản Bác Sĩ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CHỈNH SỬA HỒ SƠ BÁC SĨ (UPDATE DOCTOR) */}
      {/* ========================================================================= */}
      {showEditDoctorModal && editingDoctorTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                  Chỉnh Sửa Hồ Sơ BS. {editDocLastName} {editDocFirstName}
                </h3>
              </div>
              <button className="btn-close" onClick={() => setShowEditDoctorModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Họ và Tên Đệm (*)</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editDocLastName}
                      onChange={(e) => setEditDocLastName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên Bác Sĩ (*)</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editDocFirstName}
                      onChange={(e) => setEditDocFirstName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Email Đăng Nhập (*)</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      value={editDocEmail}
                      onChange={(e) => setEditDocEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Điện Thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editDocPhone}
                      onChange={(e) => setEditDocPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Mật Khẩu Mới (để trống nếu không đổi)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập nếu muốn đổi mật khẩu"
                      value={editDocPassword}
                      onChange={(e) => setEditDocPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Năm Kinh Nghiệm</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className="form-control"
                      value={editDocExpYears}
                      onChange={(e) => setEditDocExpYears(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Chuyên Khoa Bác Sĩ (*)</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editDocSpecialization}
                      onChange={(e) => setEditDocSpecialization(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bệnh Viện / Cơ Sở Công Tác</label>
                    <select
                      className="form-control"
                      value={editDocClinicId}
                      onChange={(e) => setEditDocClinicId(e.target.value)}
                    >
                      <option value="">-- Chưa Gán Bệnh Viện --</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Chứng Chỉ Hành Nghề (CCHN)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editDocLicense}
                      onChange={(e) => setEditDocLicense(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phí Khám (VNĐ)</label>
                    <input
                      type="number"
                      step="10000"
                      className="form-control"
                      value={editDocFee}
                      onChange={(e) => setEditDocFee(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tiểu Sử / Giới Thiệu Chuyên Môn</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={editDocBio}
                    onChange={(e) => setEditDocBio(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditDoctorModal(false)}>
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7' }}
                  disabled={updatingDoctor}
                >
                  {updatingDoctor ? <RefreshCw size={14} className="loading-spinner" /> : <Save size={15} />}
                  Lưu Thay Đổi Bác Sĩ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: XÁC NHẬN XÓA BÁC SĨ (DELETE DOCTOR) */}
      {/* ========================================================================= */}
      {deleteDoctorTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#dc2626' }}>Xác Nhận Xóa Bác Sĩ</h3>
              </div>
              <button className="btn-close" onClick={() => setDeleteDoctorTarget(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: 13.5, color: '#334155' }}>
              Bạn có chắc chắn muốn xóa bác sĩ <strong>BS. {deleteDoctorTarget.user?.last_name} {deleteDoctorTarget.user?.first_name}</strong> ({deleteDoctorTarget.user?.email}) khỏi hệ thống?
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
                Hành động này sẽ xóa tài khoản đăng nhập và tất cả các ca trực trống của bác sĩ.
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteDoctorTarget(null)}>
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#dc2626', color: '#fff' }}
                disabled={deletingDoctor}
                onClick={handleConfirmDeleteDoctor}
              >
                {deletingDoctor ? <RefreshCw size={14} className="loading-spinner" /> : <Trash2 size={15} />}
                Xóa Bác Sĩ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CHỈNH SỬA CA TRỰC (UPDATE TIMESLOT) */}
      {/* ========================================================================= */}
      {showEditSlotModal && editingSlotTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Chỉnh Sửa Ca Trực Bác Sĩ</h3>
              </div>
              <button className="btn-close" onClick={() => setShowEditSlotModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateSlot}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Ngày Khám (YYYY-MM-DD) (*)</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={editSlotDate}
                    onChange={(e) => setEditSlotDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Giờ Bắt Đầu (*)</label>
                    <input
                      type="time"
                      required
                      className="form-control"
                      value={editSlotStart}
                      onChange={(e) => setEditSlotStart(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giờ Kết Thúc (*)</label>
                    <input
                      type="time"
                      required
                      className="form-control"
                      value={editSlotEnd}
                      onChange={(e) => setEditSlotEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bệnh Viện Tiếp Nhận Ca Khám</label>
                  <select
                    className="form-control"
                    value={editSlotClinicId}
                    onChange={(e) => setEditSlotClinicId(e.target.value)}
                  >
                    <option value="">-- Mặc định theo Bệnh viện của Bác sĩ --</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Số Lượng BN Tối Đa</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      required
                      className="form-control"
                      value={editSlotMaxPatients}
                      onChange={(e) => setEditSlotMaxPatients(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trạng Thái Ca Trực</label>
                    <select
                      className="form-control"
                      value={editSlotAvailable ? '1' : '0'}
                      onChange={(e) => setEditSlotAvailable(e.target.value === '1')}
                    >
                      <option value="1">Đang mở (Nhận bệnh nhân)</option>
                      <option value="0">Đã khóa (Không nhận đặt mới)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditSlotModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7' }}
                  disabled={updatingSlot}
                >
                  {updatingSlot ? <RefreshCw size={14} className="loading-spinner" /> : <Save size={15} />}
                  Lưu Thay Đổi Ca Trực
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
