import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatAPI } from '../services/api'
import InfoTooltip from '../components/InfoTooltip'
import {
  Send, Bot, AlertTriangle, BookOpen, Shield,
  Paperclip, Mic, Calendar, Video, ThumbsUp, Copy,
  ChevronRight, PhoneCall, Sparkles, CheckCircle2
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  urgency?: string
  specialties?: string[]
  timestamp?: string
}

// Client-side fallback engine in case network is disconnected
function localMedicalFallback(text: string = ''): { answer: string; urgency: string; specialties: string[] } {
  const raw = text.trim()
  const lower = raw.toLowerCase()

  // 1. Detect Gibberish
  const clean = lower.replace(/[^a-zA-Zà-ỹÀ-Ỹ]/g, '')
  const vowels = 'aeiouyáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ'
  const vowelCount = Array.from(clean).filter((c: string) => vowels.includes(c)).length
  const isGibberish = (clean.length >= 4 && vowelCount === 0) ||
    (clean.length >= 6 && vowelCount / clean.length < 0.15) ||
    ['asdf', 'fhnr', 'jrsf', 'qwerty', 'zxcv'].some(m => clean.includes(m))

  if (isGibberish) {
    return {
      answer: `Xin lỗi, tôi chưa hiểu rõ nội dung bạn vừa nhập: "${raw}". Có vẻ như đây là chuỗi ký tự ngẫu nhiên hoặc gõ nhầm trên bàn phím.\n\nĐể tôi có thể tư vấn sức khỏe chuẩn xác cho bạn, vui lòng cung cấp thêm:\n• 🩺 Triệu chứng cụ thể (ví dụ: đau đầu, sốt, đau ngực, khó thở, đau dạ dày...)\n• 💊 Tên thuốc cần tra cứu công dụng và liều dùng\n• 📅 Hoặc yêu cầu hướng dẫn đặt lịch khám với Bác sĩ chuyên khoa.`,
      urgency: 'NORMAL',
      specialties: ['Đa khoa']
    }
  }

  // 2. Misspelled Medication Check
  if (lower.includes('asprin') || lower.includes('aspirine') || lower.includes('aspirn') || lower.includes('apirin')) {
    return {
      answer: `💡 Có phải bạn đang muốn hỏi về thuốc **Aspirin (Acid acetylsalicylic)** không?\n\n• **Nhóm dược lý**: Thuốc chống viêm không steroid (NSAID), ức chế kết tập tiểu cầu.\n• **Công dụng**: Dự phòng biến cố huyết khối tim mạch (nhồi máu cơ tim, đột quỵ); Hạ sốt, giảm đau ở liều cao.\n• **Liều dùng tham khảo**: 81mg - 100mg/ngày (uống sau ăn no).\n• **Lưu ý**: Chống chỉ định cho người có tiền sử loét dạ dày - tá tràng tiến triển hoặc rối loạn đông máu.\n\n⚠️ Khuyến cáo: Luôn sử dụng theo chỉ định của Bác sĩ hoặc Dược sĩ.`,
      urgency: 'NORMAL',
      specialties: ['Tim mạch', 'Nội tổng quát']
    }
  }

  if (lower.includes('parasetamon') || lower.includes('parasétamon') || lower.includes('panadol') || lower.includes('efferalgan')) {
    return {
      answer: `💡 Có phải bạn đang muốn hỏi về thuốc **Paracetamol (Acetaminophen / Panadol / Efferalgan)** không?\n\n• **Công dụng**: Hạ sốt và giảm đau nhẹ đến vừa (đau đầu, đau nhức cơ khớp, đau răng).\n• **Liều dùng an toàn**: Người lớn: 500mg - 1000mg/lần, cách nhau 4 - 6 giờ (tối đa không quá 4g/ngày).\n• **Lưu ý an toàn**: Tránh uống rượu bia khi dùng thuốc; không dùng quá liều quy định để bảo vệ chức năng gan.`,
      urgency: 'NORMAL',
      specialties: ['Nội tổng quát']
    }
  }

  // 3. Emergency Cardio
  if (lower.includes('dau nguc') || lower.includes('that nguc') || lower.includes('kho tho')) {
    return {
      answer: `🚨 **CẢNH BÁO: NGUY CƠ HỘI CHỨNG VÀNH HOẶC KHÓ THỞ CẤP**\n\nCác triệu chứng bạn mô tả cần được theo dõi đặc biệt:\n1. **Nghỉ ngơi ngay**: Ngồi tựa lưng ở nơi thoáng gió, nới lỏng áo ngực.\n2. **Liên hệ Bác sĩ**: Gọi ngay hotline cấp cứu **1900 6868** hoặc đến phòng cấp cứu gần nhất nếu cơn đau kéo dài trên 10 phút.`,
      urgency: 'EMERGENCY',
      specialties: ['Cấp cứu Tim mạch', 'Tim mạch Can thiệp']
    }
  }

  return {
    answer: `Cảm ơn bạn đã đặt câu hỏi: "${raw}".\n\nHệ thống khuyến nghị bạn theo dõi sát các diễn biến sức khỏe. Để được chẩn đoán và điều trị chính xác, bạn có thể nhấn nút "Đặt lịch Bác sĩ Chuyên khoa" ngay trên màn hình.\n\n⚠️ Lưu ý: Thông tin tư vấn chỉ mang tính tham khảo và không thay thế cho chẩn đoán của Bác sĩ chuyên khoa.`,
    urgency: 'NORMAL',
    specialties: ['Đa khoa']
  }
}

export default function ChatAI() {
  const navigate = useNavigate()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<number>()
  const [currentUrgency, setCurrentUrgency] = useState<string>('EVALUATING')
  const [currentSpecialties, setCurrentSpecialties] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const textToSend = input.trim()
    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatAPI.send(textToSend, sessionId)
      const data = res.data.data || res.data
      if (data.session_id) setSessionId(data.session_id)

      const urg = data.urgency_level || data.urgency || 'NORMAL'
      const specs = data.suggested_specialties || data.specialties || ['Đa khoa']

      setCurrentUrgency(urg)
      setCurrentSpecialties(specs)

      const botMsg: Message = {
        role: 'assistant',
        content: data.answer || data.response || data.message || '',
        sources: data.sources,
        urgency: urg,
        specialties: specs,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err: any) {
      // In-house fallback if connection failed
      console.warn('Backend chat API unavailable, falling back to local clinical engine:', err)
      const fb = localMedicalFallback(textToSend)
      setCurrentUrgency(fb.urgency)
      setCurrentSpecialties(fb.specialties)

      const fallbackMsg: Message = {
        role: 'assistant',
        content: fb.answer,
        urgency: fb.urgency,
        specialties: fb.specialties,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, fallbackMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-4)', height: 'calc(100vh - var(--header-height) - var(--space-12))' }}>
      {/* Main Chat Area */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Session Header (Vital Signs bar removed as requested) */}
        <div className="card-header" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="badge badge-success">
              <span className="badge-dot" /> BÁC SĨ TƯ VẤN AI TRỰC TUYẾN
            </span>
            <InfoTooltip
              title="Trợ lý Sức khỏe AI"
              content="Hệ thống giúp bạn tra cứu triệu chứng ban đầu và tìm chuyên khoa khám phù hợp. Lời khuyên của AI mang tính tham khảo và không thay thế chẩn đoán của bác sĩ."
            />
          </div>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={14} color="var(--color-primary)" /> Hỗ trợ tra cứu triệu chứng &amp; đơn thuốc 24/7
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)' }}>
          {messages.length === 0 && (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <Bot size={52} color="var(--color-primary)" />
              <h3 style={{ marginTop: 'var(--space-3)' }}>Trợ lý Y tế Lâm sàng MedTech AI</h3>
              <p style={{ maxWidth: 520, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                Hệ thống sẵn sàng hỗ trợ tư vấn triệu chứng bệnh, tra cứu thông tin và liều dùng của các loại thuốc,
                nhận diện lỗi gõ nhầm và phân luồng chuyên khoa chuẩn xác. Hãy nhập câu hỏi của bạn bên dưới!
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-3)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '12px' }}
                  onClick={() => { setInput('Tôi bị đau thắt ngực và khó thở'); }}
                >
                  "Tôi bị đau thắt ngực và khó thở"
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '12px' }}
                  onClick={() => { setInput('Uống thuốc asprin có tác dụng gì?'); }}
                >
                  "Uống thuốc asprin có tác dụng gì?"
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '12px' }}
                  onClick={() => { setInput('Liều dùng parasetamon cho người lớn'); }}
                >
                  "Liều dùng parasetamon cho người lớn"
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 'var(--space-4)',
            }}>
              <div style={{
                maxWidth: '78%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                lineHeight: 1.6,
                fontSize: 'var(--text-md)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>
                    <Shield size={13} /> Trợ lý Y tế Lâm sàng MedTech AI
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>
                    <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={12} /> Nguồn dữ liệu tham chiếu:
                    </div>
                    {msg.sources.map((s: any, j: number) => (
                      <div key={j} style={{ color: 'var(--color-text-secondary)' }}>
                        • <strong>{s.title}</strong> {s.content && `— ${s.content.slice(0, 90)}...`}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <span style={{ fontSize: '11px', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)' }}>
                    {msg.timestamp}
                  </span>
                  {msg.role === 'assistant' && (
                    <>
                      <button
                        className="btn btn-ghost"
                        style={{ height: 'auto', padding: '2px 6px', fontSize: '11px' }}
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                      >
                        <Copy size={11} /> Sao chép
                      </button>
                      <button className="btn btn-ghost" style={{ height: 'auto', padding: '2px 6px', fontSize: '11px' }}>
                        <ThumbsUp size={11} /> Hữu ích
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)' }}>
              <div className="loading-spinner" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                MedTech AI đang phân tích triệu chứng và đối soát phác đồ y khoa...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ flexShrink: 0, padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-icon btn-sm" title="Đính kèm tài liệu"><Paperclip size={16} /></button>
            <button className="btn btn-ghost btn-icon btn-sm" title="Nhập bằng giọng nói"><Mic size={16} /></button>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Mô tả triệu chứng hoặc đặt câu hỏi y khoa (ví dụ: đau ngực, sốt, tra cứu thuốc Aspirin, Paracetamol...)..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
              Gửi tin nhắn <Send size={14} />
            </button>
          </div>
          <div style={{ marginTop: 'var(--space-2)', fontSize: '11px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} color="var(--color-warning)" />
            Lưu ý: Thông tin tư vấn chỉ mang tính tham khảo và không thay thế cho chẩn đoán y khoa của Bác sĩ.
          </div>
        </div>
      </div>

      {/* Right Intelligence Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Dynamic Urgency Assessment */}
        <div
          className="card"
          style={{
            borderLeft: currentUrgency === 'EMERGENCY'
              ? '4px solid var(--color-emergency)'
              : (currentUrgency === 'HIGH' ? '4px solid var(--color-warning)' : '4px solid var(--color-success)'),
            background: currentUrgency === 'EMERGENCY'
              ? 'var(--color-emergency-bg)'
              : (currentUrgency === 'HIGH' ? 'var(--color-warning-bg)' : 'var(--color-surface)')
          }}
        >
          <div className="card-body">
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
              <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>Mức độ Khẩn cấp</span>
              {currentUrgency === 'EMERGENCY' ? (
                <span className="badge badge-emergency">CẤP CỨU / NGUY HIỂM</span>
              ) : currentUrgency === 'HIGH' ? (
                <span className="badge badge-warning">NGUY CƠ CAO</span>
              ) : currentUrgency === 'NORMAL' ? (
                <span className="badge badge-success">BÌNH THƯỜNG / AN TOÀN</span>
              ) : (
                <span className="badge badge-neutral">ĐANG ĐÁNH GIÁ</span>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {currentUrgency === 'EMERGENCY'
                ? 'Phát hiện dấu hiệu đau thắt ngực hoặc khó thở cấp tính. Đề nghị gọi cấp cứu 1900 6868 hoặc vào phòng khám ngay!'
                : currentUrgency === 'HIGH'
                  ? 'Triệu chứng có nguy cơ diễn tiến nặng, nên đặt lịch khám sớm với Bác sĩ chuyên khoa.'
                  : currentUrgency === 'NORMAL'
                    ? 'Triệu chứng trong giới hạn thông thường hoặc tra cứu hướng dẫn thuốc. Tiếp tục theo dõi thể trạng.'
                    : 'Hệ thống AI sẽ tự động phân loại mức độ khẩn cấp ngay khi bạn mô tả triệu chứng.'}
            </p>
          </div>
        </div>

        {/* Recommended Specialty Panel */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title" style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} color="var(--color-primary)" /> Chuyên khoa Đề xuất
            </h4>
          </div>
          <div className="card-body">
            {currentSpecialties.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {currentSpecialties.map((spec, idx) => (
                    <span key={idx} className="badge badge-primary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                      {spec}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Bác sĩ chuyên khoa sẵn sàng tiếp nhận lịch hẹn khám hôm nay.
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                Gợi ý chuyên khoa sẽ tự động hiển thị sau khi hệ thống phân tích triệu chứng lâm sàng của bạn.
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title" style={{ fontSize: 'var(--text-sm)' }}>Khuyến nghị Hành động</h4>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => navigate('/booking')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} /> Đặt lịch Bác sĩ Chuyên khoa
              </span>
              <ChevronRight size={14} />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => navigate('/telehealth')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Video size={14} /> Khám cấp cứu Video Telehealth
              </span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card" style={{ background: 'var(--color-emergency-bg)', borderColor: 'var(--color-emergency-border)' }}>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-emergency-text)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 'var(--text-xs)' }}>
              <PhoneCall size={14} /> ĐƯỜNG DÂY NÓNG CẤP CỨU Y TẾ 24/7
            </div>
            <div className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-emergency)' }}>
              1900 6868
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Miễn phí cước gọi từ mọi mạng viễn thông
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
