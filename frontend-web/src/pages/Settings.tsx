import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import {
  User, Shield, CreditCard, Bell, Share2,
  Globe, QrCode, CheckCircle, Download, Lock, RefreshCw
} from 'lucide-react'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [smartCA, setSmartCA] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')

  // Patient fields
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
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

  const loadProfileFromDb = async () => {
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
        const prof = data.profile || {}
        if (data.role === 'PATIENT') {
          setDob(prof.date_of_birth || '')
          setGender(prof.gender || '')
          setBloodType(prof.blood_type || '')
          setAddress(prof.address || '')
          setEmergencyContact(prof.emergency_contact || '')
          setMedicalHistory(prof.medical_history || '')
        } else if (data.role === 'DOCTOR') {
          setSpecialization(prof.specialization || '')
          setLicenseNumber(prof.license_number || '')
          setExperienceYears(prof.experience_years || 0)
          setBio(prof.bio || '')
          setClinicName(prof.clinic_name || '')
        }
      }
    } catch (err) {
      console.error('Failed to load profile from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfileFromDb()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      await authAPI.updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        date_of_birth: dob || null,
        gender,
        blood_type: bloodType,
        address,
        emergency_contact: emergencyContact,
        medical_history: medicalHistory,
        specialization,
        license_number: licenseNumber,
        experience_years: experienceYears,
        bio,
      })
      setSaveMessage('Đã cập nhật thông tin tài khoản trực tiếp vào Cơ sở dữ liệu PostgreSQL!')
      await loadProfileFromDb()
    } catch (err: any) {
      setSaveMessage(err?.response?.data?.message || 'Lỗi khi lưu hồ sơ vào Database.')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'personal', icon: <User size={16} />, label: t('settings.menu.personal') },
    { id: 'identity', icon: <CreditCard size={16} />, label: t('settings.menu.identity') },
    { id: 'security', icon: <Shield size={16} />, label: t('settings.menu.security') },
    { id: 'sharing', icon: <Share2 size={16} />, label: t('settings.menu.data_sharing') },
    { id: 'notifications', icon: <Bell size={16} />, label: t('settings.menu.notifications') },
  ]

  const mpiCode = `MED-VN-${role || 'USR'}-${10000 + (user?.id || 1)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
          {t('settings.breadcrumb')}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2>{t('settings.title')} — {lastName} {firstName} ({role})</h2>
            <span className="badge badge-success">{t('settings.compliance_badge')}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadProfileFromDb}>
            <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} /> Làm mới từ Database
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)', background: 'var(--color-success-light)' }}>
          <div className="card-body" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} /> {saveMessage}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-4)' }}>
        {/* Settings Sidebar */}
        <div className="card" style={{ alignSelf: 'flex-start' }}>
          <div className="card-header">
            <h4 className="card-title" style={{ fontSize: 'var(--text-sm)' }}>{t('settings.config_menu')}</h4>
          </div>
          <div className="card-body" style={{ padding: 'var(--space-2)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
              {t('settings.profile_status')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <div className="flex items-center justify-between">
                <span>Vai trò hệ thống</span>
                <span className="badge badge-primary">{role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Trạng thái DB</span>
                <span className="badge badge-success">ĐỒNG BỘ</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('settings.encryption_status')}</span>
                <span style={{ fontWeight: 'var(--font-semibold)' }}>{t('settings.encryption_active')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Security Card */}
          <div className="card" style={{ background: 'var(--color-primary-light)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Lock size={20} color="var(--color-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>{t('settings.security_title')}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{t('settings.security_desc')}</div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <span className="badge badge-primary">{t('settings.encryption_aes')}</span>
                  <span className="badge badge-primary">{t('settings.encryption_fips')}</span>
                  <span className="badge badge-primary">{t('settings.encryption_hipaa')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Database Profile Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Hồ sơ Tài khoản & Định danh Y tế (Lưu trực tiếp trên PostgreSQL)</h3>
              <span className="font-mono badge badge-neutral">ID #{user?.id}</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Họ và đệm (Last Name)</label>
                  <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên (First Name)</label>
                  <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email đăng nhập</label>
                  <input className="form-input" value={email} readOnly style={{ opacity: 0.75 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ</label>
                  <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              {role === 'PATIENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Ngày sinh (YYYY-MM-DD)</label>
                    <input className="form-input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giới tính</label>
                    <select className="form-input" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="M">Nam</option>
                      <option value="F">Nữ</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nhóm máu</label>
                    <input className="form-input" value={bloodType} onChange={e => setBloodType(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Địa chỉ thường trú</label>
                    <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SĐT Liên hệ khẩn cấp</label>
                    <input className="form-input" maxLength={15} value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Tiền sử bệnh lý và Dị ứng thuốc</label>
                    <textarea className="form-input" rows={2} value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} />
                  </div>
                </div>
              )}

              {role === 'DOCTOR' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Chuyên khoa điều trị</label>
                    <input className="form-input" value={specialization} onChange={e => setSpecialization(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số Chứng chỉ hành nghề</label>
                    <input className="form-input" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số năm kinh nghiệm</label>
                    <input className="form-input" type="number" value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Cơ sở công tác & Tiểu sử chuyên môn ({clinicName})</label>
                    <textarea className="form-input" rows={2} value={bio} onChange={e => setBio(e.target.value)} />
                  </div>
                </div>
              )}

              {/* MPI */}
              <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                    {t('settings.mpi_label')}
                  </label>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('settings.mpi_format')}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div style={{
                    width: 84, height: 84,
                    background: 'var(--color-neutral-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-tertiary)',
                  }}>
                    <QrCode size={42} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>
                      {mpiCode}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      {t('settings.mpi_desc')}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Download size={14} /> {t('actions.download_qr')}</button>
                </div>
              </div>

              {/* Digital Signature */}
              <div>
                <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)', display: 'block' }}>
                  {t('settings.digital_sign_title')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      border: `2px solid ${smartCA ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      background: smartCA ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    }}
                    onClick={() => setSmartCA(true)}
                  >
                    <div className="flex items-center justify-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input type="radio" checked={smartCA} readOnly />
                        <strong>{t('settings.smartca_title')}</strong>
                      </div>
                      <span className="badge badge-success">{t('status.activated')}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      border: `2px solid ${!smartCA ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      background: !smartCA ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    }}
                    onClick={() => setSmartCA(false)}
                  >
                    <div className="flex items-center justify-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input type="radio" checked={!smartCA} readOnly />
                        <strong>{t('settings.otp_title')}</strong>
                      </div>
                      <span className="badge badge-neutral">{t('status.backup')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language Setting */}
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center justify-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Globe size={20} color="var(--color-primary)" />
                    <div style={{ fontWeight: 'var(--font-semibold)' }}>{t('settings.language_label')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      className={`btn btn-sm ${i18n.language === 'vi' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => i18n.changeLanguage('vi')}
                    >
                      {t('settings.lang_vi')}
                    </button>
                    <button
                      className={`btn btn-sm ${i18n.language === 'en' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => i18n.changeLanguage('en')}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                Dữ liệu được đồng bộ trực tiếp với bảng accounts_customuser trong PostgreSQL.
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-ghost" onClick={loadProfileFromDb}>{t('actions.cancel')}</button>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  <CheckCircle size={14} /> {saving ? 'Đang lưu...' : t('actions.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
