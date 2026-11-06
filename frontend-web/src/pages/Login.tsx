import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Activity, Stethoscope, Brain } from 'lucide-react'

export default function Login() {
  const { t } = useTranslation()
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', password_confirm: '',
    username: '', first_name: '', last_name: '',
    role: 'PATIENT', phone: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        if (form.password !== form.password_confirm) {
          setError(t('auth.login_error'))
          setLoading(false)
          return
        }
        await register(form)
      } else {
        await login(form.email, form.password)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.login_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <h1>{t('app_name')}</h1>
        <p>{t('auth.brand_headline')}</p>

        <div className="login-features">
          <div className="login-feature">
            <Brain size={20} />
            <span>{t('auth.feature_ai_xray')}</span>
          </div>
          <div className="login-feature">
            <Activity size={20} />
            <span>{t('auth.feature_booking')}</span>
          </div>
          <div className="login-feature">
            <Stethoscope size={20} />
            <span>{t('auth.feature_rag')}</span>
          </div>
          <div className="login-feature">
            <Shield size={20} />
            <span>{t('auth.hipaa')}</span>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <h2>{isRegister ? t('auth.register_title') : t('auth.login_title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              {t('auth.login_subtitle')}
            </p>
          </div>

          {error && <div className="login-error">{error}</div>}

          {isRegister && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">{t('auth.first_name')}</label>
                  <input className="form-input" name="first_name" value={form.first_name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('auth.last_name')}</label>
                  <input className="form-input" name="last_name" value={form.last_name} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.username')}</label>
                <input className="form-input" name="username" value={form.username} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.phone')}</label>
                <input className="form-input" name="phone" type="tel" value={form.phone} onChange={handleChange} />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input className="form-input" name="password" type="password" value={form.password} onChange={handleChange} required />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">{t('auth.confirm_password')}</label>
              <input className="form-input" name="password_confirm" type="password" value={form.password_confirm} onChange={handleChange} required />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <span className="loading-spinner" /> : (isRegister ? t('actions.register') : t('actions.login'))}
          </button>

          <div className="login-toggle">
            {isRegister ? t('auth.have_account') : t('auth.no_account')}{' '}
            <button type="button" onClick={() => { setIsRegister(!isRegister); setError('') }}>
              {isRegister ? t('actions.login') : t('actions.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
