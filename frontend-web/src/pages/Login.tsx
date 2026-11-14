import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Shield, Activity, Stethoscope, Brain, KeyRound, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function Login() {
  const { t } = useTranslation()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', password_confirm: '',
    username: '', first_name: '', last_name: '',
    role: 'PATIENT', phone: '',
  })

  const [forgotEmail, setForgotEmail] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (form.password.length < 8) {
          setError('Mật khẩu phải có độ dài ít nhất 8 ký tự.')
          setLoading(false)
          return
        }
        if (!/[A-Z]/.test(form.password)) {
          setError('Mật khẩu phải chứa ít nhất 1 chữ in hoa (A-Z).')
          setLoading(false)
          return
        }
        if (!/[^A-Za-z0-9]/.test(form.password)) {
          setError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: @, #, $, !, %, *...).')
          setLoading(false)
          return
        }
        if (form.password !== form.password_confirm) {
          setError('Mật khẩu xác nhận không khớp.')
          setLoading(false)
          return
        }
        // Luôn đảm bảo role mặc định là PATIENT khi đăng ký
        await register({ ...form, role: 'PATIENT' })
      } else if (mode === 'login') {
        await login(form.email, form.password)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.login_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    const targetEmail = (forgotEmail || form.email).trim()
    if (!targetEmail) {
      setError('Vui lòng nhập địa chỉ email của bạn.')
      return
    }

    setLoading(true)
    try {
      const res = await authAPI.forgotPassword(targetEmail)
      setSuccessMsg(res.data?.message || 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mật khẩu mới về hộp thư của bạn. Vui lòng kiểm tra email và đổi mật khẩu sau khi đăng nhập lại.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xử lý yêu cầu cấp lại mật khẩu. Vui lòng thử lại sau.')
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
        {mode === 'forgot' ? (
          /* Form Quên Mật Khẩu */
          <form className="login-form" onSubmit={handleForgotPassword}>
            <div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingLeft: 0, color: 'var(--color-primary)' }}
              >
                <ArrowLeft size={16} /> Quay lại Đăng nhập
              </button>
              <h2>Khôi phục mật khẩu</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)', fontSize: '13px' }}>
                Nhập email đăng ký tài khoản của bạn. Hệ thống sẽ tự động tạo và gửi mật khẩu mới về hộp thư qua email bảo mật.
              </p>
            </div>

            {error && (
              <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {successMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                lineHeight: 1.6,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Yêu cầu đã được tiếp nhận!</strong>
                  <div style={{ marginTop: 4 }}>{successMsg}</div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Địa chỉ Email của bạn <span style={{ color: 'red' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  type="email"
                  placeholder="example@gmail.com"
                  value={forgotEmail || form.email}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <span className="loading-spinner" /> : <><KeyRound size={18} /> Gửi mật khẩu mới qua Email</>}
            </button>

            <div className="login-toggle" style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}>
                Tôi nhớ mật khẩu rồi, đăng nhập ngay
              </button>
            </div>
          </form>
        ) : (
          /* Form Đăng Nhập hoặc Đăng Ký */
          <form className="login-form" onSubmit={handleSubmit}>
            <div>
              <h2>{mode === 'register' ? 'Đăng ký tài khoản Bệnh nhân' : t('auth.login_title')}</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                {mode === 'register' ? 'Tạo tài khoản cá nhân để đặt lịch khám và tra cứu hồ sơ bệnh án' : t('auth.login_subtitle')}
              </p>
            </div>

            {error && <div className="login-error">{error}</div>}

            {mode === 'register' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Họ và đệm <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" name="last_name" placeholder="Nguyễn Văn" value={form.last_name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-input" name="first_name" placeholder="An" value={form.first_name} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('auth.username')} <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-input" name="username" placeholder="nguyenvanan" value={form.username} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-input" name="phone" type="tel" placeholder="0912345678" value={form.phone} onChange={handleChange} required />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">{t('auth.email')} <span style={{ color: 'red' }}>*</span></label>
              <input className="form-input" name="email" type="email" placeholder="example@gmail.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>{t('auth.password')} <span style={{ color: 'red' }}>*</span></label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); setForgotEmail(form.email) }}
                    style={{ background: 'none', border: 'none', color: '#0068ff', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input className="form-input" name="password" type="password" value={form.password} onChange={handleChange} required />
              {mode === 'register' && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  * Tối thiểu 8 ký tự, gồm ít nhất 1 chữ in hoa (A-Z) và 1 ký tự đặc biệt (!@#$%...).
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu <span style={{ color: 'red' }}>*</span></label>
                <input className="form-input" name="password_confirm" type="password" value={form.password_confirm} onChange={handleChange} required />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? <span className="loading-spinner" /> : (mode === 'register' ? 'Đăng ký tài khoản Bệnh nhân' : t('actions.login'))}
            </button>

            <div className="login-toggle">
              {mode === 'register' ? t('auth.have_account') : t('auth.no_account')}{' '}
              <button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}>
                {mode === 'register' ? t('actions.login') : t('actions.register')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
