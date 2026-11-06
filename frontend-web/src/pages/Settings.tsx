import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User, Shield, CreditCard, Bell, Share2,
  Globe, QrCode, Eye, EyeOff,
  CheckCircle, Download, Lock
} from 'lucide-react'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('identity')
  const [showCCCD, setShowCCCD] = useState(false)
  const [smartCA, setSmartCA] = useState(true)

  const tabs = [
    { id: 'personal', icon: <User size={16} />, label: t('settings.menu.personal') },
    { id: 'security', icon: <Shield size={16} />, label: t('settings.menu.security') },
    { id: 'identity', icon: <CreditCard size={16} />, label: t('settings.menu.identity') },
    { id: 'sharing', icon: <Share2 size={16} />, label: t('settings.menu.data_sharing') },
    { id: 'notifications', icon: <Bell size={16} />, label: t('settings.menu.notifications') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
          {t('settings.breadcrumb')}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2>{t('settings.title')}</h2>
            <span className="badge badge-success">{t('settings.compliance_badge')}</span>
          </div>
          <span className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('settings.audit_id')} KMA-MED-9941</span>
        </div>
      </div>

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

          {/* Legal Status */}
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
              {t('settings.profile_status')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <div className="flex items-center justify-between">
                <span>{t('settings.vneid_sync')}</span>
                <span className="badge badge-success">{t('settings.vneid_match')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('settings.bhyt_status')}</span>
                <span className="badge badge-success">{t('settings.bhyt_ready')}</span>
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

          {/* Identity Content */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('settings.identity_title')}</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* CCCD */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                    {t('settings.cccd_label')}
                  </label>
                  <span className="badge badge-success">{t('settings.cccd_vneid')}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}
                    value={showCCCD ? '001 088 012 345' : '001 0** *** ***'}
                    readOnly
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCCCD(!showCCCD)}>
                    {showCCCD ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showCCCD ? t('settings.cccd_hide') : t('settings.cccd_show')}
                  </button>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                  {t('settings.cccd_verify_note')} 05/01/2024.
                </div>
              </div>

              {/* BHYT */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                    {t('settings.bhyt_label')}
                  </label>
                  <span className="badge badge-success">{t('status.has_value')}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input className="form-input" style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }} value="GD 4 01 2984 ****" readOnly />
                  <button className="btn btn-ghost btn-sm"><Shield size={14} /> {t('settings.bhyt_check')}</button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  <div><span style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.bhyt_expiry')}</span> <strong>31/12/2026</strong></div>
                  <div><span style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.bhyt_coverage')}</span> <strong style={{ color: 'var(--color-primary)' }}>80% {t('settings.bhyt_coverage_detail')}</strong></div>
                  <div><span style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.bhyt_facility')}</span> <strong>{t('settings.medtech_hospital')}</strong></div>
                </div>
              </div>

              {/* MPI */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                    {t('settings.mpi_label')}
                  </label>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('settings.mpi_format')}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div style={{
                    width: 100, height: 100,
                    background: 'var(--color-neutral-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                  }}>
                    <QrCode size={48} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>
                      MED-VN-2024-884219
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      {t('settings.mpi_desc')}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                      <span className="badge badge-primary">{t('status.auto_identify')}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('settings.mpi_note')}</span>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm"><Download size={14} /> {t('actions.download_qr')}</button>
                </div>
              </div>

              {/* Digital Signature */}
              <div>
                <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)', display: 'block' }}>
                  {t('settings.digital_sign_title')}
                </label>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                  {t('settings.digital_sign_desc')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      padding: 'var(--space-4)',
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
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                      {t('settings.smartca_desc')}
                    </p>
                    <div className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                      {t('settings.smartca_provider')}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 'var(--space-4)',
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
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                      {t('settings.otp_desc')}
                    </p>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                      {t('settings.otp_note')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Language Setting */}
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center justify-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Globe size={20} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontWeight: 'var(--font-semibold)' }}>{t('settings.language_label')}</div>
                    </div>
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

              {/* Emergency Contact */}
              <div style={{ padding: 'var(--space-4)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-warning-bg)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-warning-text)' }}>
                    {t('settings.emergency_contact')} <span style={{ color: 'var(--color-emergency)' }}>*</span>
                  </div>
                  <button className="btn btn-ghost btn-sm">{t('settings.edit_info')}</button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
                  <div><span style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.fullname')}</span> <strong>Nguyễn Văn Hùng</strong></div>
                  <div><span style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.relationship')}</span> <strong>{t('settings.relationship_val')}</strong></div>
                  <div><span style={{ color: 'var(--color-text-tertiary)' }}>{t('settings.phone')}</span> <strong className="font-mono">**** *** 9828</strong></div>
                  <span className="badge badge-success"><CheckCircle size={10} /> {t('settings.authorized')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                {t('settings.last_updated')}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-ghost">{t('actions.cancel')}</button>
                <button className="btn btn-primary"><CheckCircle size={14} /> {t('actions.save')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
