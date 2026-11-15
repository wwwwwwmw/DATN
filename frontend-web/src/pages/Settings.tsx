import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import {
  Shield, Mail, CheckCircle, Download,
  Lock, KeyRound, Edit, Trash2, Plus, Search,
  Camera, X, AlertCircle, FileSpreadsheet, Upload,
  Users, Stethoscope, UserCheck, ShieldAlert,
  RefreshCw, Check
} from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // ==========================================
  // STATE CHO BÁC SĨ (DOCTOR) & BỆNH NHÂN (PATIENT)
  // ==========================================
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Profile data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [avatar, setAvatar] = useState('')

  // Patient fields
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('M')
  const [bloodType, setBloodType] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')

  // Doctor fields
  const [specialization, setSpecialization] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [experienceYears, setExperienceYears] = useState<number>(0)
  const [bio, setBio] = useState('')
  const [clinicName, setClinicName] = useState('')

  // OTP Verification state
  const [isOtpVerified, setIsOtpVerified] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null)
  const [otpCountdown, setOtpCountdown] = useState(0)

  // Modal avatar state & Camera controls
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [newAvatarUrl, setNewAvatarUrl] = useState('')
  const [avatarTab, setAvatarTab] = useState<'camera' | 'upload'>('camera')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null)

  // ==========================================
  // STATE CHO QUẢN TRỊ VIÊN (ADMIN)
  // ==========================================
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminSearch, setAdminSearch] = useState('')
  const [adminRoleFilter, setAdminRoleFilter] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // Modal Chỉnh sửa User (Admin)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null)
  const [editRole, setEditRole] = useState('PATIENT')
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNewPassword, setEditNewPassword] = useState('')
  const [editSpecialization, setEditSpecialization] = useState('')
  const [editLicense, setEditLicense] = useState('')
  const [editExp, setEditExp] = useState(0)
  const [editAddress, setEditAddress] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Modal Import Excel
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal Tạo tài khoản mới thủ công (Admin)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    last_name: '', first_name: '', email: '', phone: '',
    role: 'DOCTOR', password: 'Doctor@123', specialization: 'Nội Tim mạch',
    experience_years: 5, license_number: '', address: 'TP. Hồ Chí Minh'
  })
  const [createSaving, setCreateSaving] = useState(false)

  // Modal Đổi Mật Khẩu Cá Nhân (Dùng cho cả Admin, Bác sĩ và Bệnh nhân)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwdOld, setPwdOld] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!isAdmin && !isOtpVerified) {
      setPwdError('Bảo mật Y tế: Bạn cần xác thực mã OTP qua Email trước khi đổi mật khẩu.')
      return
    }

    if (!pwdOld) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại.')
      return
    }
    if (pwdNew.length < 8) {
      setPwdError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    if (!/[A-Z]/.test(pwdNew)) {
      setPwdError('Mật khẩu mới phải chứa ít nhất 1 chữ in hoa (A-Z).')
      return
    }
    if (!/[^A-Za-z0-9]/.test(pwdNew)) {
      setPwdError('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt (!@#$%...).')
      return
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('Mật khẩu xác nhận không khớp.')
      return
    }

    setPwdLoading(true)
    try {
      await authAPI.changePassword({
        old_password: pwdOld,
        new_password: pwdNew,
        new_password_confirm: pwdConfirm,
      })
      setPwdSuccess('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.')
      setPwdOld('')
      setPwdNew('')
      setPwdConfirm('')
      setTimeout(() => {
        setShowPasswordModal(false)
        setPwdSuccess('')
      }, 1800)
    } catch (err: any) {
      const errDetail = err.response?.data?.errors
      let msg = err.response?.data?.message
      if (errDetail?.new_password) {
        msg = errDetail.new_password[0]
      } else if (errDetail?.old_password) {
        msg = errDetail.old_password[0]
      }
      setPwdError(msg || 'Mật khẩu cũ không chính xác hoặc dữ liệu không hợp lệ.')
    } finally {
      setPwdLoading(false)
    }
  }

  // ==========================================
  // LOAD DATA FUNCTIONS
  // ==========================================
  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await authAPI.getProfile()
      const data = res.data?.data || res.data
      if (data) {
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setRole(data.role || user?.role || '')
        setAvatar(data.avatar || '')

        const pProf = data.patient_profile || {}
        setDob(pProf.date_of_birth || '')
        setGender(pProf.gender || 'M')
        setBloodType(pProf.blood_type || '')
        setAddress(pProf.address || '')
        setEmergencyContact(pProf.emergency_contact || '')
        setMedicalHistory(pProf.medical_history || '')

        const dProf = data.doctor_profile || {}
        setSpecialization(dProf.specialization || '')
        setLicenseNumber(dProf.license_number || '')
        setExperienceYears(dProf.experience_years || 0)
        setBio(dProf.bio || '')
        setClinicName(dProf.clinic_name || '')
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminUsers = async () => {
    if (!isAdmin) return
    setAdminLoading(true)
    try {
      const res = await authAPI.adminGetUsers({
        role: adminRoleFilter || undefined,
        search: adminSearch || undefined,
      })
      setAdminUsers(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load admin users:', err)
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdminUsers()
    } else {
      loadProfile()
    }
  }, [isAdmin, adminRoleFilter])

  // Countdown timer cho OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCountdown])

  // ==========================================
  // CAMERA & AVATAR HANDLERS
  // ==========================================
  const startCamera = async () => {
    setCameraError(null)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở camera trực tiếp. Vui lòng chọn tải ảnh từ máy tính.')
      return
    }
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      })
      setCameraStream(stream)
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => console.log('Video play error:', e))
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraError('Không thể mở Camera. Vui lòng cho phép quyền truy cập máy ảnh hoặc chuyển sang tải ảnh từ máy tính.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setIsCameraActive(false)
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth || 480
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height)
      const base64Data = canvas.toDataURL('image/jpeg', 0.88)
      setNewAvatarUrl(base64Data)
      stopCamera()
    }
  }

  const handleCloseAvatarModal = () => {
    stopCamera()
    setShowAvatarModal(false)
  }

  // Kết nối stream vào thẻ video khi cameraStream thay đổi
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
      videoRef.current.play().catch(e => console.log('Video play error:', e))
    }
  }, [cameraStream])

  // Dọn dẹp stream khi component unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // ==========================================
  // OTP HANDLERS
  // ==========================================
  const handleSendOtp = async () => {
    setSendingOtp(true)
    setErrorMessage(null)
    setOtpSentMessage(null)
    try {
      const res = await authAPI.sendOTP()
      setOtpSentMessage(res.data?.message || `Mã OTP đã được gửi đến email ${email} (hiệu lực 120 giây). Vui lòng kiểm tra hộp thư.`)
      setOtpCountdown(120)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại kết nối email.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP gồm 6 chữ số.')
      return
    }
    if (otpCountdown === 0 && otpSentMessage) {
      setErrorMessage('Mã OTP đã hết hạn. Yêu cầu thực hiện lại.')
      return
    }
    setVerifyingOtp(true)
    setErrorMessage(null)
    try {
      const res = await authAPI.verifyOTP(otpCode.trim())
      setIsOtpVerified(true)
      setOtpSentMessage(res.data?.message || 'Xác thực OTP thành công! Bạn có thể chỉnh sửa hồ sơ.')
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Mã OTP đã hết hạn. Yêu cầu thực hiện lại.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // ==========================================
  // LƯU HỒ SƠ (DOCTOR & PATIENT)
  // ==========================================
  const handleSaveProfile = async () => {
    setErrorMessage(null)
    setSaveMessage(null)

    if (!window.confirm('Cảnh báo xác nhận: Bạn có chắc chắn muốn cập nhật và lưu thay đổi cho hồ sơ cá nhân này không?')) {
      return
    }

    // 1. Kiểm tra OTP
    if (!isOtpVerified) {
      setErrorMessage('Bảo mật: Bạn phải nhập và xác thực mã OTP qua Email trước mới được lưu thay đổi hồ sơ.')
      return
    }

    // 2. Kiểm tra các trường bắt buộc
    const missing: string[] = []
    if (!lastName.trim()) missing.push('Họ và đệm')
    if (!firstName.trim()) missing.push('Tên')
    if (!phone.trim()) missing.push('Số điện thoại liên hệ')
    if (!email.trim()) missing.push('Email đăng nhập')
    if (role === 'PATIENT' && !address.trim()) missing.push('Địa chỉ thường trú')

    if (missing.length > 0) {
      setErrorMessage(`Vui lòng điền đầy đủ các mục bắt buộc: ${missing.join(', ')}.`)
      return
    }

    setSaving(true)
    try {
      await authAPI.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatar.trim(),
        otp_code: otpCode.trim(),
        patient_profile: {
          date_of_birth: dob || null,
          gender,
          blood_type: bloodType,
          address: address.trim(),
          emergency_contact: emergencyContact,
          medical_history: medicalHistory,
        },
        doctor_profile: {
          specialization,
          license_number: licenseNumber,
          experience_years: experienceYears,
          bio,
        }
      })
      setSaveMessage('Cập nhật hồ sơ cá nhân thành công! Dữ liệu đã được lưu an toàn vào cơ sở dữ liệu.')
      setIsOtpVerified(false)
      setOtpCode('')
      setOtpSentMessage(null)
      await loadProfile()
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Không thể lưu hồ sơ. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // ADMIN ACTION HANDLERS
  // ==========================================
  const openEditUserModal = (u: any) => {
    setSelectedUserForEdit(u)
    setEditRole(u.role)
    setEditFirstName(u.first_name || '')
    setEditLastName(u.last_name || '')
    setEditEmail(u.email || '')
    setEditPhone(u.phone || '')
    setEditNewPassword('')

    const d = u.doctor_profile || {}
    setEditSpecialization(d.specialization || '')
    setEditLicense(d.license_number || '')
    setEditExp(d.experience_years || 0)

    const p = u.patient_profile || {}
    setEditAddress(p.address || '')
  }

  const handleAdminSaveUser = async () => {
    if (!selectedUserForEdit) return
    if (!window.confirm(`Cảnh báo xác nhận: Bạn có chắc chắn muốn lưu các thay đổi cho tài khoản "${selectedUserForEdit.full_name} (${selectedUserForEdit.email})"?`)) {
      return
    }
    setEditSaving(true)
    try {
      const payload: any = {
        role: editRole,
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        phone: editPhone,
        specialization: editSpecialization,
        license_number: editLicense,
        experience_years: editExp,
        address: editAddress,
      }
      if (editNewPassword.trim()) {
        if (editNewPassword.length < 8 || !/[A-Z]/.test(editNewPassword) || !/[^A-Za-z0-9]/.test(editNewPassword)) {
          alert('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ in hoa và 1 ký tự đặc biệt.')
          setEditSaving(false)
          return
        }
        payload.new_password = editNewPassword.trim()
      }
      await authAPI.adminUpdateUser(selectedUserForEdit.id, payload)
      setSelectedUserForEdit(null)
      await loadAdminUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật tài khoản.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleAdminDeleteUser = async (u: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.full_name} (${u.email})"? Hành động này không thể hoàn tác.`)) {
      return
    }
    try {
      await authAPI.adminDeleteUser(u.id)
      await loadAdminUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa tài khoản.')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await authAPI.adminExportTemplate()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'mau_nhap_tai_khoan_medtech.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      const link = document.createElement('a')
      link.href = '/mau_nhap_tai_khoan_medtech.xlsx'
      link.setAttribute('download', 'mau_nhap_tai_khoan_medtech.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }


  const handleImportExcel = async () => {
    if (!importFile) {
      alert('Vui lòng chọn file Excel .xlsx')
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await authAPI.adminImportExcel(fd)
      setImportResult(res.data)
      await loadAdminUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi nhập file Excel.')
    } finally {
      setImporting(false)
    }
  }

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createForm.password) {
      if (createForm.password.length < 8 || !/[A-Z]/.test(createForm.password) || !/[^A-Za-z0-9]/.test(createForm.password)) {
        alert('Mật khẩu tạo mới phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ in hoa và 1 ký tự đặc biệt.')
        return
      }
    }
    setCreateSaving(true)
    try {
      await authAPI.adminCreateUser(createForm)
      setShowCreateModal(false)
      setCreateForm({
        last_name: '', first_name: '', email: '', phone: '',
        role: 'DOCTOR', password: 'Doctor@123', specialization: 'Nội Tim mạch',
        experience_years: 5, license_number: '', address: 'TP. Hồ Chí Minh'
      })
      await loadAdminUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo tài khoản mới.')
    } finally {
      setCreateSaving(false)
    }
  }

  // Tên viết tắt mặc định nếu không có avatar
  const getInitials = (first: string, last: string) => {
    const f = (first || '').trim().charAt(0).toUpperCase()
    const l = (last || '').trim().charAt(0).toUpperCase()
    return `${l}${f}` || 'MT'
  }

  // Modal Đổi Mật Khẩu Dùng Chung (Admin / Doctor / Patient)
  const renderPasswordModal = () => {
    if (!showPasswordModal) return null

    // Với Bác sĩ và Bệnh nhân: Yêu cầu xác thực OTP trước
    if (!isAdmin && !isOtpVerified) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, maxWidth: 440, width: '100%', padding: 24, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Lock size={26} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#1e293b', fontWeight: 700 }}>Yêu Cầu Xác Thực OTP</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
              Để bảo mật tài khoản y tế, bạn cần gửi và xác thực mã OTP qua Email ở giao diện Cài đặt trước mới được sử dụng tính năng đổi mật khẩu.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowPasswordModal(false)}
              style={{ background: '#0068ff', borderColor: '#0068ff', padding: '8px 22px' }}
            >
              Đã hiểu & Quay lại xác thực OTP
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, maxWidth: 460, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={18} style={{ color: '#0068ff' }} />
              <strong style={{ fontSize: 16 }}>Đổi Mật Khẩu Cá Nhân</strong>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPasswordModal(false)}><X size={16} /></button>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pwdSuccess && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> {pwdSuccess}
                </div>
              )}
              {pwdError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} /> {pwdError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Mật khẩu hiện tại <span style={{ color: 'red' }}>*</span></label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Nhập mật khẩu bạn đang dùng..."
                  value={pwdOld}
                  onChange={e => setPwdOld(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Mật khẩu mới <span style={{ color: 'red' }}>*</span></label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Tối thiểu 8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt..."
                  value={pwdNew}
                  onChange={e => setPwdNew(e.target.value)}
                  required
                />
                <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 4, display: 'block' }}>
                  Quy chuẩn: ≥ 8 ký tự, gồm ít nhất 1 chữ hoa (A-Z) và 1 ký tự đặc biệt (!@#$%...).
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Xác nhận mật khẩu mới <span style={{ color: 'red' }}>*</span></label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={pwdConfirm}
                  onChange={e => setPwdConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={pwdLoading} style={{ background: '#0068ff', borderColor: '#0068ff' }}>
                {pwdLoading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // =========================================================================
  // GIAO DIỆN QUẢN TRỊ ADMIN (ROLE: ADMIN)
  // =========================================================================
  if (isAdmin) {
    const totalDocs = adminUsers.filter(u => u.role === 'DOCTOR').length
    const totalPatients = adminUsers.filter(u => u.role === 'PATIENT').length
    const totalAdmins = adminUsers.filter(u => u.role === 'ADMIN').length

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Admin Header */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0068ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={26} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: 'white', fontSize: '20px' }}>Trung Tâm Quản Trị Hệ Thống & Tài Khoản</h2>
                <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '13px' }}>
                  Toàn quyền quản lý phân quyền (Role), mật khẩu, nhập hàng loạt Bác sĩ bằng file Excel
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setShowPasswordModal(true); setPwdError(''); setPwdSuccess('') }}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <KeyRound size={14} /> Đổi Mật Khẩu
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadTemplate}
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Tải Mẫu Excel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setShowImportModal(true); setImportResult(null); setImportFile(null) }}
                style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FileSpreadsheet size={15} /> Thêm Bác sĩ bằng Excel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={15} /> Thêm Thủ Công
              </button>
            </div>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
          <div className="card">
            <div className="card-body" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0068ff' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Tổng tài khoản</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{adminUsers.length}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <Stethoscope size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Bác sĩ chuyên khoa</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalDocs}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <UserCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Bệnh nhân</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalPatients}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Quản trị viên (ADMIN)</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalAdmins}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm & lọc */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 38 }}
                placeholder="Tìm theo tên bác sĩ, bệnh nhân, email, SĐT..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadAdminUsers()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className="form-input"
                style={{ width: 180 }}
                value={adminRoleFilter}
                onChange={e => setAdminRoleFilter(e.target.value)}
              >
                <option value="">Tất cả vai trò</option>
                <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
                <option value="PATIENT">Bệnh nhân (PATIENT)</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
              </select>
              <button className="btn btn-secondary" onClick={loadAdminUsers}>
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* Bảng danh sách người dùng */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Danh sách tài khoản ({adminUsers.length} tài khoản)</h3>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {adminLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                Đang tải dữ liệu...
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Người dùng / Họ tên</th>
                    <th>Email đăng nhập</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Chuyên môn / Địa chỉ</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u, idx) => {
                    const initials = getInitials(u.first_name, u.last_name)
                    return (
                      <tr key={u.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.full_name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0068ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
                                {initials}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="font-mono">{u.email}</span></td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-error' : u.role === 'DOCTOR' ? 'badge-primary' : 'badge-neutral'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          {u.role === 'DOCTOR' ? (
                            <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>
                              🩺 {u.doctor_profile?.specialization || 'Đa khoa'} &bull; {u.doctor_profile?.clinic_name || 'MedTech'}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              📍 {u.patient_profile?.address || 'TP. Hồ Chí Minh'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditUserModal(u)}
                              title="Chỉnh sửa thông tin / Đổi Role / Đổi mật khẩu"
                              style={{ color: '#0068ff' }}
                            >
                              <Edit size={14} /> Sửa
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleAdminDeleteUser(u)}
                              title="Xóa tài khoản"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MODAL CHỈNH SỬA TÀI KHOẢN (ADMIN) */}
        {selectedUserForEdit && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 12, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 16 }}>Chỉnh Sửa Tài Khoản #{selectedUserForEdit.id}</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUserForEdit(null)}><X size={16} /></button>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Vai trò (Role) <span style={{ color: 'red' }}>*</span></label>
                    <select className="form-input" value={editRole} onChange={e => setEditRole(e.target.value)}>
                      <option value="PATIENT">Bệnh nhân (PATIENT)</option>
                      <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
                      <option value="ADMIN">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Đặt mật khẩu mới (Nếu cần)</label>
                    <input className="form-input" placeholder="Tối thiểu 8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt..." value={editNewPassword} onChange={e => setEditNewPassword(e.target.value)} />
                    <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 2, display: 'block' }}>Yêu cầu: ≥ 8 ký tự, ≥ 1 chữ hoa (A-Z), ≥ 1 ký tự đặc biệt (!@#$%...)</small>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Họ và đệm</label>
                    <input className="form-input" value={editLastName} onChange={e => setEditLastName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên</label>
                    <input className="form-input" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Email đăng nhập</label>
                    <input className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                </div>

                {editRole === 'DOCTOR' && (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0068ff' }}>Thông tin Bác sĩ:</div>
                    <div className="form-group">
                      <label className="form-label">Chuyên khoa</label>
                      <input className="form-input" value={editSpecialization} onChange={e => setEditSpecialization(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="form-group">
                        <label className="form-label">Số CCHN</label>
                        <input className="form-input" value={editLicense} onChange={e => setEditLicense(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Năm bắt đầu hành nghề</label>
                        <input className="form-input" type="number" placeholder="Ví dụ: 2015" value={editExp} onChange={e => setEditExp(Number(e.target.value))} />
                      </div>
                    </div>

                  </div>
                )}

                {editRole === 'PATIENT' && (
                  <div className="form-group">
                    <label className="form-label">Địa chỉ thường trú</label>
                    <input className="form-input" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setSelectedUserForEdit(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleAdminSaveUser} disabled={editSaving}>
                  {editSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL IMPORT EXCEL (ADMIN) */}
        {showImportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 12, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 16 }}>Nhập Danh Sách Bác Sĩ / Tài Khoản Bằng Excel</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}><X size={16} /></button>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, fontSize: 13, color: '#1e40af' }}>
                  💡 <strong>Hướng dẫn:</strong> Tải file mẫu bên dưới, điền thông tin các Bác sĩ (Họ tên, Email, SĐT, Chuyên khoa, Bệnh viện) rồi tải lên. Hệ thống sẽ tự động tạo tài khoản và sinh lịch trống khám thực tế cho Bác sĩ.
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-sm" onClick={handleDownloadTemplate} style={{ background: '#1d4ed8', color: 'white', border: 'none' }}>
                      <Download size={13} /> Tải file mẫu (.xlsx)
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: importFile ? '#f0fdf4' : '#f8fafc',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0])
                      }
                    }}
                  />
                  <Upload size={32} style={{ color: '#0068ff', margin: '0 auto 8px' }} />
                  {importFile ? (
                    <div>
                      <strong style={{ color: '#16a34a' }}>{importFile.name}</strong>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        ({(importFile.size / 1024).toFixed(1)} KB) — Bấm để chọn file khác
                      </div>
                    </div>
                  ) : (
                    <div>
                      <strong>Nhấp để chọn file Excel (.xlsx)</strong>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Hoặc kéo thả file Excel vào đây</div>
                    </div>
                  )}
                </div>

                {importResult && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 8, fontSize: 13, color: '#15803d' }}>
                    <CheckCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                    {importResult.message} (Đã thêm {importResult.imported_count} tài khoản)
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Đóng</button>
                <button className="btn btn-primary" onClick={handleImportExcel} disabled={importing || !importFile}>
                  {importing ? 'Đang nhập dữ liệu...' : 'Bắt Đầu Nhập Excel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL THÊM TÀI KHOẢN MỚI THỦ CÔNG (ADMIN) */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 12, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 16 }}>Thêm Tài Khoản Người Dùng Mới</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={handleAdminCreateUser} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Vai trò <span style={{ color: 'red' }}>*</span></label>
                    <select className="form-input" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                      <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
                      <option value="PATIENT">Bệnh nhân (PATIENT)</option>
                      <option value="ADMIN">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required />
                    <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 2, display: 'block' }}>≥ 8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt</small>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Họ và đệm <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Email đăng nhập <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} required />
                  </div>
                </div>

                {createForm.role === 'DOCTOR' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label">Chuyên khoa khám</label>
                      <input className="form-input" value={createForm.specialization} onChange={e => setCreateForm({ ...createForm, specialization: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Năm bắt đầu hành nghề</label>
                      <input className="form-input" type="number" placeholder="Ví dụ: 2015" value={createForm.experience_years} onChange={e => setCreateForm({ ...createForm, experience_years: Number(e.target.value) })} />
                    </div>
                  </div>
                )}


                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={createSaving}>
                    {createSaving ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Đổi Mật Khẩu (Admin) */}
        {renderPasswordModal()}
      </div>
    )
  }

  // =========================================================================
  // GIAO DIỆN HỒ SƠ CÁ NHÂN (ROLE: DOCTOR HOẶC PATIENT)
  // Đã bỏ Sidebar bên trái, bỏ mã định danh y tế, bỏ nút làm mới từ Database
  // =========================================================================
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span className="loading-spinner" />
        <div>Đang tải thông tin hồ sơ người dùng...</div>
      </div>
    )
  }

  const initials = getInitials(firstName, lastName)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      {/* Alert Messages */}
      {saveMessage && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={18} /> {saveMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* Profile Header & Avatar Card */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative' }}>
              {avatar ? (
                <img
                  src={avatar}
                  alt={firstName}
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0068ff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #0068ff 0%, #0052cc 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setNewAvatarUrl(avatar)
                  setAvatarTab('camera')
                  setShowAvatarModal(true)
                  startCamera()
                }}
                title="Thay đổi ảnh đại diện (Chụp từ Camera hoặc Tải ảnh)"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#0068ff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Camera size={13} />
              </button>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 19 }}>{lastName} {firstName}</h2>
                <span className="badge badge-primary">{role === 'DOCTOR' ? 'BÁC SĨ' : 'BỆNH NHÂN'}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {email} &bull; {phone || 'Chưa cập nhật SĐT'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {isOtpVerified ? (
              <span className="badge badge-success" style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={14} /> Đã xác thực OTP
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Lock size={13} /> Cần mã OTP
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!isOtpVerified}
              onClick={() => {
                if (!isOtpVerified) {
                  setErrorMessage('Bảo mật Y tế: Bạn cần xác thực mã OTP qua Email trước khi đổi mật khẩu.')
                  return
                }
                setShowPasswordModal(true)
                setPwdError('')
                setPwdSuccess('')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderColor: isOtpVerified ? '#0068ff' : '#cbd5e1',
                fontWeight: 600,
                opacity: isOtpVerified ? 1 : 0.6,
                cursor: isOtpVerified ? 'pointer' : 'not-allowed',
                color: isOtpVerified ? '#0068ff' : '#64748b'
              }}
              title={isOtpVerified ? 'Đổi mật khẩu tài khoản' : 'Yêu cầu xác thực OTP trước khi đổi mật khẩu'}
            >
              <KeyRound size={14} color={isOtpVerified ? '#0068ff' : '#94a3b8'} /> Đổi Mật Khẩu
            </button>
          </div>
        </div>
      </div>

      {/* Khối Xác thực bảo mật qua Email OTP */}
      {isOtpVerified ? (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#15803d',
          fontSize: 13,
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} /> Đã xác thực OTP thành công
          </div>
          <span style={{ fontSize: 12, fontWeight: 400, color: '#16a34a' }}>
            Hồ sơ y tế & tính năng đổi mật khẩu đã sẵn sàng chỉnh sửa
          </span>
        </div>
      ) : (
        <div className="card" style={{ borderLeft: '4px solid #0068ff', background: '#f8fafc' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#0068ff' }}>
                  <Mail size={16} /> Xác Thực OTP Qua Email
                </strong>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Mã OTP sẽ được gửi về email <strong>{email}</strong> (hiệu lực 120s).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpCountdown > 0}
                  style={{ background: '#0068ff', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <KeyRound size={14} />
                  {sendingOtp ? 'Đang gửi...' : (otpCountdown > 0 ? `Gửi lại sau (${otpCountdown}s)` : 'Gửi mã OTP')}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="form-input"
                    style={{ width: 110, padding: '6px 10px', fontSize: 13, textAlign: 'center', letterSpacing: 2, fontWeight: 'bold' }}
                    placeholder="Mã 6 số"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                  />
                  {otpCountdown > 0 && (
                    <span style={{ fontSize: 12, color: otpCountdown <= 30 ? '#dc2626' : '#0068ff', fontWeight: 600, minWidth: 38 }}>
                      ⏱️ {otpCountdown}s
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || !otpCode.trim()}
                  >
                    {verifyingOtp ? 'Kiểm tra...' : 'Xác nhận OTP'}
                  </button>
                </div>
              </div>
            </div>
            {otpSentMessage && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#0068ff', fontWeight: 500 }}>
                ℹ️ {otpSentMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Khối Thông Tin Hồ Sơ & Đổi Mật Khẩu: Ẩn đi khi chưa xác thực OTP, chỉ hiện sau khi nhập đúng OTP */}
      {!isOtpVerified ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', color: '#0068ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: '#1e293b' }}>
            Hồ Sơ Cá Nhân & Tính Năng Đổi Mật Khẩu Đang Được Bảo Mật
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Để bảo vệ an toàn thông tin y tế, toàn bộ dữ liệu hồ sơ cá nhân và tính năng đổi mật khẩu đã được tạm ẩn.
            Vui lòng nhấn <strong>"Gửi mã OTP qua Email"</strong> và nhập mã xác thực 6 số vào ô bên trên để hiển thị thông tin, chỉnh sửa hồ sơ và đổi mật khẩu.
          </p>
        </div>
      ) : (
        <>
          {/* Form Cập nhật thông tin chi tiết */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Hồ Sơ Cá Nhân & Thông Tin Liên Hệ</h3>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Các mục có dấu (<span style={{ color: 'red' }}>*</span>) là bắt buộc</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Họ và đệm <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Tên <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Ví dụ: An"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Email đăng nhập <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@medtech.ai"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Số điện thoại liên hệ <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0912345678"
                  />
                </div>
              </div>

              {/* Dành riêng cho Bệnh nhân (PATIENT) */}
              {role === 'PATIENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--color-border-light)', paddingTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Ngày sinh</label>
                      <input
                        className="form-input"
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Giới tính</label>
                      <select
                        className="form-input"
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="M">Nam</option>
                        <option value="F">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nhóm máu</label>
                      <input
                        className="form-input"
                        value={bloodType}
                        onChange={e => setBloodType(e.target.value)}
                        placeholder="A, B, AB, O (Rh+)"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Địa chỉ thường trú <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SĐT Liên hệ khẩn cấp</label>
                      <input
                        className="form-input"
                        value={emergencyContact}
                        onChange={e => setEmergencyContact(e.target.value)}
                        placeholder="SĐT người thân"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiền sử bệnh lý & Dị ứng thuốc</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={medicalHistory}
                      onChange={e => setMedicalHistory(e.target.value)}
                      placeholder="Ví dụ: Dị ứng Penicillin, có tiền sử tăng huyết áp..."
                    />
                  </div>
                </div>
              )}

              {/* Dành riêng cho Bác sĩ (DOCTOR) */}
              {role === 'DOCTOR' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--color-border-light)', paddingTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Chuyên khoa khám chữa bệnh</label>
                      <input
                        className="form-input"
                        value={specialization}
                        onChange={e => setSpecialization(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số Chứng chỉ hành nghề (CCHN)</label>
                      <input
                        className="form-input"
                        value={licenseNumber}
                        onChange={e => setLicenseNumber(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Năm bắt đầu hành nghề</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="Ví dụ: 2015"
                        value={experienceYears}
                        onChange={e => setExperienceYears(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tiểu sử chuyên môn & Cơ sở công tác ({clinicName})</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Mô tả quá trình đào tạo và kinh nghiệm lâm sàng..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Nút lưu hồ sơ */}
            <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                ✅ Đã xác thực OTP: Bạn có thể cập nhật thông tin và bấm Lưu.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ background: '#0068ff', borderColor: '#0068ff', padding: '8px 24px', fontWeight: 'bold' }}
                >
                  <CheckCircle size={15} /> {saving ? 'Đang lưu vào Database...' : 'Lưu Hồ Sơ'}
                </button>
              </div>
            </div>
          </div>

          {/* KHỐI BẢO MẬT & ĐỔI MẬT KHẨU TÀI KHOẢN (Chỉ hiển thị sau khi xác thực OTP) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} style={{ color: '#0068ff' }} />
                <strong style={{ fontSize: 15 }}>Bảo Mật & Đổi Mật Khẩu Cá Nhân</strong>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setShowPasswordModal(true); setPwdError(''); setPwdSuccess('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#0068ff', color: '#0068ff', fontWeight: 600 }}
              >
                <KeyRound size={14} /> Thay đổi mật khẩu
              </button>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div>Để đảm bảo an toàn cho tài khoản và hồ sơ y tế, bạn nên đổi mật khẩu định kỳ hoặc ngay sau khi sử dụng tính năng cấp lại mật khẩu.</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                  Yêu cầu: Tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa (A-Z) và 1 ký tự đặc biệt (!@#$%...).
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => { setShowPasswordModal(true); setPwdError(''); setPwdSuccess('') }}
                style={{ background: '#0068ff', borderColor: '#0068ff', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <KeyRound size={14} /> Đổi mật khẩu ngay
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL CẬP NHẬT ẢNH AVATAR (2 LỰA CHỌN: 1 LÀ MỞ CAM CHỤP ẢNH, 2 LÀ TẢI ẢNH LÊN) */}
      {showAvatarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, maxWidth: 460, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 16 }}>Cập Nhật Ảnh Đại Diện</strong>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseAvatarModal}><X size={16} /></button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 2 Lựa chọn theo yêu cầu */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarTab('camera')
                    startCamera()
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: avatarTab === 'camera' ? '#ffffff' : 'transparent',
                    color: avatarTab === 'camera' ? '#0068ff' : '#64748b',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: avatarTab === 'camera' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <Camera size={15} /> 1. Chụp từ Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarTab('upload')
                    stopCamera()
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: avatarTab === 'upload' ? '#ffffff' : 'transparent',
                    color: avatarTab === 'upload' ? '#0068ff' : '#64748b',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: avatarTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <Upload size={15} /> 2. Tải ảnh từ thiết bị
                </button>
              </div>

              {/* Canvas ẩn dùng để snapshot từ video stream */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* LỰA CHỌN 1: MỞ CAMERA LÊN CHỤP ẢNH */}
              {avatarTab === 'camera' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isCameraActive ? (
                    <div>
                      <div style={{ position: 'relative', width: '100%', height: 260, borderRadius: 10, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(255,255,255,0.45)', borderRadius: '50%', margin: '15px auto', width: 230, height: 230, pointerEvents: 'none' }} />
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleCapturePhoto}
                          style={{ width: '100%', background: '#0068ff', borderColor: '#0068ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontWeight: 600 }}
                        >
                          <Camera size={16} /> Bấm Chụp Ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {newAvatarUrl && newAvatarUrl.startsWith('data:image') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <img
                            src={newAvatarUrl}
                            alt="Captured"
                            style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: '3px solid #16a34a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={14} /> Đã chụp ảnh thành công!
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={startCamera}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <RefreshCw size={13} /> Chụp lại bằng Camera
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '30px 16px', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                          <Camera size={36} color="#0068ff" style={{ margin: '0 auto 10px' }} />
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chụp ảnh trực tiếp từ webcam</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Hệ thống sẽ chụp và tự động chuyển ảnh thành chuẩn Base64 lưu vào CSDL</div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={startCamera}
                            style={{ background: '#0068ff', borderColor: '#0068ff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Camera size={14} /> Mở Camera Ngay
                          </button>
                        </div>
                      )}

                      {cameraError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={15} /> {cameraError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* LỰA CHỌN 2: TẢI ẢNH LÊN TỪ MÁY TÍNH */}
              {avatarTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('Kích thước ảnh tối đa là 5MB.')
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = (uploadEvt) => {
                          const b64 = uploadEvt.target?.result as string
                          setNewAvatarUrl(b64)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />

                  {newAvatarUrl ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <img
                        src={newAvatarUrl}
                        alt="Preview"
                        style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: '3px solid #0068ff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => avatarFileInputRef.current?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Upload size={13} /> Chọn ảnh khác từ thiết bị
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => avatarFileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #0068ff',
                        borderRadius: 10,
                        padding: '36px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: '#f8fafc',
                      }}
                    >
                      <Upload size={34} color="#0068ff" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Nhấp để chọn ảnh từ máy tính</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Hỗ trợ JPG, PNG, WEBP (Tối đa 5MB) &bull; Lưu thẳng vào Database</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={handleCloseAvatarModal}>Hủy</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (newAvatarUrl) {
                    setAvatar(newAvatarUrl.trim())
                  }
                  handleCloseAvatarModal()
                }}
                disabled={!newAvatarUrl}
                style={{ background: '#0068ff', borderColor: '#0068ff' }}
              >
                Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi Mật Khẩu (Doctor / Patient) */}
      {renderPasswordModal()}
    </div>
  )
}
