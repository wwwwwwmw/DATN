import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI, medicalRecordAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import { useCallRingtone } from '../hooks/useCallRingtone'
import InfoTooltip from '../components/InfoTooltip'
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneCall, PhoneIncoming,
  MessageSquare, Shield, AlertTriangle, AlertOctagon, ShieldAlert, FileText,
  CheckCircle, CheckCircle2, Lock, Send, Search, PanelRightClose, PanelRightOpen,
  PanelLeftClose, PanelLeftOpen,
  Volume2, UserCheck, Minimize2, Maximize2,
  RefreshCw, Pill, Calendar, Plus, Trash2, Printer, Edit3, X, Eye
} from 'lucide-react'
import { generatePrescriptionHtml } from '../utils/prescriptionTemplate'

interface PrescriptionItem {
  id: string
  drugName: string
  morning: string
  noon: string
  afternoon: string
  evening: string
  days: number
  note: string
}

function serializePrescription(items: PrescriptionItem[]): string {
  return items
    .filter(item => item.drugName.trim())
    .map(item => {
      const m = item.morning?.trim() || '0'
      const n = item.noon?.trim() || '0'
      const a = item.afternoon?.trim() || '0'
      const e = item.evening?.trim() || '0'

      const schedule = `Sáng: ${m} viên, Trưa: ${n} viên, Chiều: ${a} viên, Tối: ${e} viên`
      const usage = item.note ? `${schedule} (${item.note})` : schedule

      const mNum = parseFloat(m) || 0
      const nNum = parseFloat(n) || 0
      const aNum = parseFloat(a) || 0
      const eNum = parseFloat(e) || 0
      const daily = mNum + nNum + aNum + eNum
      const total = daily > 0 ? Math.round(daily * (item.days || 1)) : (item.days || 1)

      return `${item.drugName.trim()} | ${usage} | ${item.days || 14} ngày | Tổng: ${total} viên`
    })
    .join('\n')
}

interface DoseWarning {
  rowId: string
  drugName: string
  session: string
  amount: number
  message: string
}

function checkDoseWarnings(rows: PrescriptionItem[]): DoseWarning[] {
  const warnings: DoseWarning[] = []

  rows.forEach((row, idx) => {
    const name = row.drugName.trim() || `Thuốc #${idx + 1}`
    const m = parseFloat(row.morning) || 0
    const n = parseFloat(row.noon) || 0
    const a = parseFloat(row.afternoon) || 0
    const e = parseFloat(row.evening) || 0

    if (m >= 4) {
      warnings.push({
        rowId: row.id,
        drugName: name,
        session: 'Sáng',
        amount: m,
        message: `${name}: Uống ${m} viên buổi Sáng (Liều rất lớn, thông thường chỉ 1-2 viên/lần)`,
      })
    }
    if (n >= 4) {
      warnings.push({
        rowId: row.id,
        drugName: name,
        session: 'Trưa',
        amount: n,
        message: `${name}: Uống ${n} viên buổi Trưa (Liều rất lớn, thông thường chỉ 1-2 viên/lần)`,
      })
    }
    if (a >= 4) {
      warnings.push({
        rowId: row.id,
        drugName: name,
        session: 'Chiều',
        amount: a,
        message: `${name}: Uống ${a} viên buổi Chiều (Liều rất lớn, thông thường chỉ 1-2 viên/lần)`,
      })
    }
    if (e >= 4) {
      warnings.push({
        rowId: row.id,
        drugName: name,
        session: 'Tối',
        amount: e,
        message: `${name}: Uống ${e} viên buổi Tối (Liều rất lớn, thông thường chỉ 1-2 viên/lần)`,
      })
    }

    const daily = m + n + a + e
    if (daily >= 10 && !warnings.some(w => w.rowId === row.id)) {
      warnings.push({
        rowId: row.id,
        drugName: name,
        session: 'Cả ngày',
        amount: daily,
        message: `${name}: Tổng liều ${daily} viên/ngày vượt mức an toàn thông thường!`,
      })
    }
  })

  return warnings
}

interface ClinicalRiskWarning {
  id: string
  drugName: string
  category: 'ALLERGY' | 'HYPERTENSION' | 'DIABETES' | 'STOMACH' | 'ASTHMA' | 'KIDNEY' | 'LIVER' | 'GENERAL'
  level: 'DANGER' | 'WARNING'
  title: string
  matchedCondition: string
  message: string
  recommendation: string
}

function checkClinicalRiskWarnings(
  rows: PrescriptionItem[],
  patientHistory: string = ''
): ClinicalRiskWarning[] {
  const warnings: ClinicalRiskWarning[] = []
  const hist = (patientHistory || '').toLowerCase().trim()
  if (!hist) return warnings

  // Condition checks in history
  const hasPenicillinAllergy = hist.includes('penicillin') || hist.includes('beta-lactam') || hist.includes('amoxicillin')
  const hasAspirinAllergy = hist.includes('aspirin') || hist.includes('nsaid')
  const hasGenericAllergy = hist.includes('dị ứng') || hist.includes('mẫn cảm')

  const hasHypertension = hist.includes('huyết áp') || hist.includes('hypertension') || hist.includes('tăng huyết áp') || hist.includes('cao huyết áp') || hist.includes('tha')
  const hasDiabetes = hist.includes('tiểu đường') || hist.includes('đái tháo đường') || hist.includes('đường huyết') || hist.includes('diabetes') || hist.includes('đtđ')
  const hasStomachUlcer = hist.includes('dạ dày') || hist.includes('loét') || hist.includes('bao tử') || hist.includes('xuất huyết tiêu hóa') || hist.includes('trào ngược') || hist.includes('gerd')
  const hasAsthma = hist.includes('hen') || hist.includes('suyễn') || hist.includes('copd') || hist.includes('co thắt phế quản') || hist.includes('asthma')
  const hasKidneyDisease = hist.includes('suy thận') || hist.includes('thận mạn') || hist.includes('chức năng thận') || hist.includes('bệnh thận') || hist.includes('creatinine')
  const hasLiverDisease = hist.includes('suy gan') || hist.includes('viêm gan') || hist.includes('men gan') || hist.includes('xơ gan') || hist.includes('bệnh gan')

  rows.forEach((row, idx) => {
    const rawName = row.drugName.trim()
    if (!rawName) return
    const nameLower = rawName.toLowerCase()

    // 1. DỊ ỨNG PENICILLIN / AMOXICILLIN
    if (hasPenicillinAllergy || (hasGenericAllergy && hist.includes('kháng sinh'))) {
      if (nameLower.includes('augmentin') || nameLower.includes('amoxicillin') || nameLower.includes('penicillin') || nameLower.includes('ampicillin')) {
        warnings.push({
          id: `allergy-pen-${row.id || idx}`,
          drugName: rawName,
          category: 'ALLERGY',
          level: 'DANGER',
          title: 'CHỐNG CHỈ ĐỊNH: DỊ ỨNG KHÁNG SINH PENICILLIN',
          matchedCondition: 'Tiền sử dị ứng Penicillin / Kháng sinh Beta-lactam',
          message: `Bệnh nhân có tiền sử dị ứng Penicillin. Tuyệt đối KHÔNG sử dụng ${rawName} do nguy cơ sốc phản vệ (Anaphylaxis), phù mạch thanh quản đe dọa tính mạng!`,
          recommendation: 'Chuyển sang nhóm kháng sinh an toàn: Macrolide (Azithromycin, Clarithromycin) hoặc Quinolone (Levofloxacin) theo kháng sinh đồ.'
        })
      } else if (nameLower.includes('cefuroxim') || nameLower.includes('zinnat') || nameLower.includes('cefalexin') || nameLower.includes('ceftriaxone')) {
        warnings.push({
          id: `allergy-ceph-${row.id || idx}`,
          drugName: rawName,
          category: 'ALLERGY',
          level: 'WARNING',
          title: 'CẢNH BÁO DỊ ỨNG CHÉO: CEPHALOSPORIN & PENICILLIN',
          matchedCondition: 'Tiền sử dị ứng Penicillin',
          message: `${rawName} thuộc nhóm Cephalosporin có tỷ lệ dị ứng chéo 5 - 10% ở người dị ứng Penicillin.`,
          recommendation: 'Thận trọng tối đa, khai thác kỹ mức độ dị ứng trước đây hoặc chuẩn bị sẵn hộp chống sốc phản vệ nếu bắt buộc dùng.'
        })
      }
    }

    // 2. DỊ ỨNG ASPIRIN / NSAID
    if (hasAspirinAllergy || (hasGenericAllergy && (hist.includes('giảm đau') || hist.includes('aspirin')))) {
      if (nameLower.includes('aspirin') || nameLower.includes('celecoxib') || nameLower.includes('meloxicam') || nameLower.includes('mobic') || nameLower.includes('celebrex') || nameLower.includes('ibuprofen')) {
        warnings.push({
          id: `allergy-nsaid-${row.id || idx}`,
          drugName: rawName,
          category: 'ALLERGY',
          level: 'DANGER',
          title: 'CHỐNG CHỈ ĐỊNH: DỊ ỨNG ASPIRIN & NSAID',
          matchedCondition: 'Tiền sử dị ứng Aspirin / NSAID',
          message: `Bệnh nhân có tiền sử dị ứng nhóm NSAID/Aspirin. Sử dụng ${rawName} có thể gây cơn hen cấp tính dữ dội, phù mạch hoặc sốc phản vệ.`,
          recommendation: 'Thay thế bằng Paracetamol liều thông thường để giảm đau / hạ sốt an toàn.'
        })
      }
    }

    // 3. TĂNG HUYẾT ÁP vs NSAID
    if (hasHypertension) {
      if (nameLower.includes('celecoxib') || nameLower.includes('celebrex') || nameLower.includes('meloxicam') || nameLower.includes('mobic') || nameLower.includes('ibuprofen') || nameLower.includes('diclofenac')) {
        warnings.push({
          id: `htn-nsaid-${row.id || idx}`,
          drugName: rawName,
          category: 'HYPERTENSION',
          level: 'WARNING',
          title: 'CẢNH BÁO: TĂNG HUYẾT ÁP & TÁC DỤNG PHỤ NSAID',
          matchedCondition: 'Tiền sử Tăng huyết áp',
          message: `Thuốc kháng viêm ${rawName} ức chế tổng hợp Prostaglandin tại thận, gây giữ muối nước làm huyết áp tăng vọt và làm giảm hiệu quả thuốc hạ áp (Amlodipin, Losartan).`,
          recommendation: 'Cân nhắc thay bằng Paracetamol, hoặc dùng liều thấp nhất trong thời gian ngắn nhất và đo huyết áp hằng ngày.'
        })
      }
    }

    // 4. ĐÁI THÁO ĐƯỜNG vs CHẸN BETA (BISOPROLOL)
    if (hasDiabetes) {
      if (nameLower.includes('concor') || nameLower.includes('bisoprolol') || nameLower.includes('betaloc') || nameLower.includes('propranolol')) {
        warnings.push({
          id: `dm-beta-${row.id || idx}`,
          drugName: rawName,
          category: 'DIABETES',
          level: 'WARNING',
          title: 'CẢNH BÁO: CHẸN BETA CHE LẤP DẤU HIỆU HẠ ĐƯỜNG HUYẾT',
          matchedCondition: 'Tiền sử Đái tháo đường (Tiểu đường)',
          message: `${rawName} (chẹn beta) có thể che lấp các dấu hiệu hạ đường huyết cấp tính (nhịp tim nhanh, run rẩy), dễ khiến bệnh nhân rơi vào hôn mê do hạ đường huyết mà không nhận biết.`,
          recommendation: 'Dặn dò bệnh nhân đo đường huyết mao mạch thường xuyên, nhận biết dấu hiệu vã mồ hôi và chuẩn bị sẵn viên đường nhanh.'
        })
      }
    }

    // 5. LOÉT DẠ DÀY / XUẤT HUYẾT TIÊU HÓA vs ASPIRIN & NSAID
    if (hasStomachUlcer) {
      if (nameLower.includes('aspirin')) {
        warnings.push({
          id: `stomach-asp-${row.id || idx}`,
          drugName: rawName,
          category: 'STOMACH',
          level: 'DANGER',
          title: 'NGUY CƠ XUẤT HUYẾT TIÊU HÓA: LOÉT DẠ DÀY & ASPIRIN',
          matchedCondition: 'Tiền sử Viêm loét dạ dày tá tràng',
          message: `Bệnh nhân có tiền sử bệnh lý dạ dày. ${rawName} làm giảm lớp chất nhầy bảo vệ niêm mạc, nguy cơ rất cao gây loét thủng tái phát hoặc xuất huyết dạ dày ồ ạt!`,
          recommendation: 'Bắt buộc kê phối hợp thuốc ức chế bơm proton (PPI: Nexium, Pantoprazol, Omeprazol) và hướng dẫn uống ngay sau bữa ăn no.'
        })
      } else if (nameLower.includes('celecoxib') || nameLower.includes('meloxicam') || nameLower.includes('celebrex') || nameLower.includes('mobic') || nameLower.includes('ibuprofen')) {
        warnings.push({
          id: `stomach-nsaid-${row.id || idx}`,
          drugName: rawName,
          category: 'STOMACH',
          level: 'WARNING',
          title: 'CẢNH BÁO KÍCH ỨNG DẠ DÀY: NSAID',
          matchedCondition: 'Tiền sử Bệnh lý dạ dày tá tràng',
          message: `${rawName} có thể kích ứng niêm mạc dạ dày và làm nặng thêm tình trạng viêm loét.`,
          recommendation: 'Uống sau ăn no, phối hợp thuốc kháng tiết PPI nếu đợt điều trị kéo dài.'
        })
      }
    }

    // 6. HEN SUYỄN / COPD vs CHẸN BETA & ASPIRIN
    if (hasAsthma) {
      if (nameLower.includes('concor') || nameLower.includes('bisoprolol') || nameLower.includes('betaloc') || nameLower.includes('propranolol')) {
        warnings.push({
          id: `asthma-beta-${row.id || idx}`,
          drugName: rawName,
          category: 'ASTHMA',
          level: 'DANGER',
          title: 'CHỐNG CHỈ ĐỊNH: CHẸN BETA GÂY CO THẮT PHẾ QUẢN',
          matchedCondition: 'Tiền sử Hen suyễn / Co thắt phế quản',
          message: `${rawName} có thể đối kháng thụ thể Beta-2 ở phế quản, gây co thắt phế quản dữ dội và khởi phát cơn hen suyễn ác tính đe dọa tính mạng!`,
          recommendation: 'Chống chỉ định. Thay thế bằng nhóm chẹn kênh canxi (Amlodipin) hoặc thuốc khác không ảnh hưởng phế quản.'
        })
      } else if (nameLower.includes('aspirin') || nameLower.includes('celecoxib') || nameLower.includes('meloxicam')) {
        warnings.push({
          id: `asthma-nsaid-${row.id || idx}`,
          drugName: rawName,
          category: 'ASTHMA',
          level: 'WARNING',
          title: 'CẢNH BÁO HEN NHẠY CẢM NSAID (TAM CHỨNG SAMTER)',
          matchedCondition: 'Tiền sử Hen phế quản',
          message: `${rawName} có thể kích hoạt cơn co thắt đường thở kịch phát ở người có cơ địa nhạy cảm NSAID.`,
          recommendation: 'Theo dõi sát cơn khó thở sau liều đầu tiên.'
        })
      }
    }

    // 7. SUY THẬN vs METFORMIN & NSAID
    if (hasKidneyDisease) {
      if (nameLower.includes('metformin')) {
        warnings.push({
          id: `kidney-met-${row.id || idx}`,
          drugName: rawName,
          category: 'KIDNEY',
          level: 'DANGER',
          title: 'NGUY CƠ TOAN LACTIC TỬ VONG (METFORMIN & SUY THẬN)',
          matchedCondition: 'Tiền sử Suy thận / Bệnh thận mạn',
          message: `${rawName} tích lũy ở bệnh nhân suy thận có thể gây Nhiễm toan Acid Lactic nặng với tỷ lệ tử vong cao!`,
          recommendation: 'Đo eGFR. Chống chỉ định nếu eGFR < 30 mL/phút; giảm liều nếu eGFR 30-44 mL/phút.'
        })
      } else if (nameLower.includes('celecoxib') || nameLower.includes('meloxicam')) {
        warnings.push({
          id: `kidney-nsaid-${row.id || idx}`,
          drugName: rawName,
          category: 'KIDNEY',
          level: 'DANGER',
          title: 'NGUY CƠ SUY THẬN CẤP: NSAID',
          matchedCondition: 'Tiền sử Bệnh thận',
          message: `${rawName} làm giảm lưu lượng lọc cầu thận, nguy cơ gây suy thận cấp trên nền bệnh thận mạn tính.`,
          recommendation: 'Tránh dùng kéo dài, kiểm tra creatinine máu định kỳ.'
        })
      }
    }

    // 8. BỆNH GAN vs PARACETAMOL
    if (hasLiverDisease) {
      if (nameLower.includes('paracetamol') || nameLower.includes('panadol')) {
        const m = parseFloat(row.morning) || 0
        const n = parseFloat(row.noon) || 0
        const a = parseFloat(row.afternoon) || 0
        const e = parseFloat(row.evening) || 0
        const dailyPills = m + n + a + e
        if (dailyPills >= 4) {
          warnings.push({
            id: `liver-para-${row.id || idx}`,
            drugName: rawName,
            category: 'LIVER',
            level: 'WARNING',
            title: 'CẢNH BÁO ĐỘC TÍNH GAN: PARACETAMOL LIỀU CAO',
            matchedCondition: 'Tiền sử Bệnh lý gan / Men gan cao',
            message: `Bệnh nhân có tiền sử bệnh gan. Liều Paracetamol hiện tại (${dailyPills} viên/ngày) làm tăng nguy cơ tổn thương hoại tử tế bào gan.`,
            recommendation: 'Giảm liều tối đa không quá 2g/ngày (≤ 4 viên 500mg) và giãn cách 6-8 giờ giữa các lần uống.'
          })
        }
      }
    }
  })

  return warnings
}

function deserializePrescription(raw: string, isLocked = false): PrescriptionItem[] {
  if (!raw) {
    return isLocked ? [] : [
      { id: `init-row-${Date.now()}`, drugName: '', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống sau ăn no' }
    ]
  }
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const items: PrescriptionItem[] = []

  lines.forEach((line, idx) => {
    const cols = line.split('|').map(c => c.trim())
    const drugName = cols[0] || ''
    if (!drugName) return

    const usage = cols[1] || ''
    const daysRaw = cols[2] || ''
    const daysMatch = daysRaw.match(/(\d+)/)
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 14

    const mMatch = usage.match(/Sáng:\s*(\d+(?:\.\d+)?)/i)
    const nMatch = usage.match(/Trưa:\s*(\d+(?:\.\d+)?)/i)
    const aMatch = usage.match(/Chiều:\s*(\d+(?:\.\d+)?)/i)
    const eMatch = usage.match(/Tối:\s*(\d+(?:\.\d+)?)/i)

    const noteMatch = usage.match(/\(([^)]+)\)/)
    const note = noteMatch ? noteMatch[1] : (usage && !mMatch && !nMatch && !aMatch && !eMatch ? usage : 'Uống sau ăn no')

    items.push({
      id: `rx-${Date.now()}-${idx}`,
      drugName,
      morning: mMatch ? mMatch[1] : (usage ? '0' : '1'),
      noon: nMatch ? nMatch[1] : '0',
      afternoon: aMatch ? aMatch[1] : '0',
      evening: eMatch ? eMatch[1] : (usage ? '0' : '1'),
      days,
      note,
    })
  })

  return items.length > 0 ? items : (
    isLocked ? [] : [
      { id: `init-row-${Date.now()}`, drugName: '', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống sau ăn no' }
    ]
  )
}

const COMMON_ICD10_LIST = [
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'I20.0', name: 'Cơn đau thắt ngực không ổn định' },
  { code: 'I20.9', name: 'Đau thắt ngực không xác định' },
  { code: 'I25.1', name: 'Bệnh tim thiếu máu cục bộ do xơ vữa' },
  { code: 'I50.9', name: 'Suy tim không xác định' },
  { code: 'E11.9', name: 'Đái tháo đường type 2 không có biến chứng' },
  { code: 'E78.0', name: 'Tăng cholesterol máu nguyên phát' },
  { code: 'E78.5', name: 'Tăng lipid máu không xác định' },
  { code: 'K21.0', name: 'Bệnh trào ngược dạ dày - thực quản có viêm thực quản' },
  { code: 'K21.9', name: 'Bệnh trào ngược dạ dày - thực quản không có viêm thực quản' },
  { code: 'K29.7', name: 'Viêm dạ dày không xác định' },
  { code: 'K30', name: 'Chứng khó tiêu chức năng (Dyspepsia)' },
  { code: 'J00', name: 'Viêm mũi họng cấp tính (Cảm thường)' },
  { code: 'J02.9', name: 'Viêm họng cấp không xác định' },
  { code: 'J06.9', name: 'Nhiễm khuẩn đường hô hấp trên cấp tính' },
  { code: 'J20.9', name: 'Viêm phế quản cấp không xác định' },
  { code: 'J45.9', name: 'Hen phế quản không xác định' },
  { code: 'J18.9', name: 'Viêm phổi không xác định' },
  { code: 'G43.9', name: 'Đau nửa đầu Migraine không xác định' },
  { code: 'G44.2', name: 'Đau đầu căng thẳng (Tension headache)' },
  { code: 'H81.0', name: 'Bệnh Ménière (Rối loạn tiền đình)' },
  { code: 'H81.1', name: 'Chóng mặt kịch phát lành tính do tư thế (BPPV)' },
  { code: 'M17.9', name: 'Thoái hóa khớp gối không xác định' },
  { code: 'M54.5', name: 'Đau cột sống thắt lưng (Lumbago)' },
  { code: 'M53.1', name: 'Hội chứng cổ vai cánh tay' },
  { code: 'N39.0', name: 'Nhiễm trùng đường tiết niệu không xác định vị trí' },
  { code: 'L20.9', name: 'Viêm da cơ địa dị ứng' },
  { code: 'F41.9', name: 'Rối loạn lo âu không xác định' },
  { code: 'F51.0', name: 'Mất ngủ không thực thể' }
]

const COMMON_DRUGS_LIST = [
  { name: 'Amlodipin 5mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Amlodipin 10mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Losartan 50mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Telmisartan 40mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Concor 2.5mg (Bisoprolol)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Concor 5mg (Bisoprolol)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Atorvastatin 10mg', morning: '0', noon: '0', afternoon: '0', evening: '1', days: 30, note: 'Uống sau ăn tối hoặc trước khi đi ngủ' },
  { name: 'Atorvastatin 20mg', morning: '0', noon: '0', afternoon: '0', evening: '1', days: 30, note: 'Uống sau ăn tối hoặc trước khi đi ngủ' },
  { name: 'Rosuvastatin 10mg', morning: '0', noon: '0', afternoon: '0', evening: '1', days: 30, note: 'Uống sau ăn tối' },
  { name: 'Aspirin 81mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn no' },
  { name: 'Clopidogrel 75mg (Plavix)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Metformin 500mg', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 30, note: 'Uống trong hoặc ngay sau bữa ăn' },
  { name: 'Metformin XR 750mg', morning: '0', noon: '0', afternoon: '0', evening: '1', days: 30, note: 'Uống sau ăn tối' },
  { name: 'Diamicron MR 60mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống trước ăn sáng 15 phút' },
  { name: 'Januvia 50mg (Sitagliptin)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 30, note: 'Uống sau ăn sáng' },
  { name: 'Nexium 40mg (Esomeprazole)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 14, note: 'Uống trước ăn sáng 30-60 phút' },
  { name: 'Pantoprazol 40mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 14, note: 'Uống trước ăn sáng 30-60 phút' },
  { name: 'Omeprazol 20mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 14, note: 'Uống trước ăn sáng 30 phút' },
  { name: 'Phosphalugel (Gói chữ P)', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống khi có cơn đau hoặc sau ăn 2 giờ' },
  { name: 'Domperidon 10mg', morning: '1', noon: '1', afternoon: '0', evening: '1', days: 7, note: 'Uống trước bữa ăn 15-30 phút' },
  { name: 'Augmentin 1000mg', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 7, note: 'Uống vào đầu bữa ăn' },
  { name: 'Cefuroxim 500mg (Zinnat)', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 7, note: 'Uống sau khi ăn no' },
  { name: 'Azithromycin 500mg', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 3, note: 'Uống trước ăn 1 giờ hoặc sau ăn 2 giờ' },
  { name: 'Paracetamol 500mg (Panadol)', morning: '1', noon: '1', afternoon: '0', evening: '1', days: 5, note: 'Uống sau ăn, cách nhau 4-6 giờ khi sốt/đau' },
  { name: 'Celecoxib 200mg (Celebrex)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 10, note: 'Uống sau khi ăn no' },
  { name: 'Meloxicam 7.5mg (Mobic)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 10, note: 'Uống sau khi ăn no' },
  { name: 'Eperison 50mg (Myonal)', morning: '1', noon: '1', afternoon: '0', evening: '1', days: 10, note: 'Uống sau các bữa ăn' },
  { name: 'Betaserc 16mg (Betahistine)', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống trong hoặc sau bữa ăn' },
  { name: 'Tanakan 40mg (Ginkgo Biloba)', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 30, note: 'Uống trong bữa ăn' },
  { name: 'Stugeron 25mg (Cinnarizine)', morning: '0', noon: '0', afternoon: '0', evening: '1', days: 10, note: 'Uống sau ăn tối' },
  { name: 'Telfast 180mg (Fexofenadine)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 10, note: 'Uống trước bữa ăn' },
  { name: 'Clarityne 10mg (Loratadine)', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 10, note: 'Uống sau ăn' },
  { name: 'Acetylcystein 200mg', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 7, note: 'Hòa tan vào nước uống sau bữa ăn' },
  { name: 'Vitamin 3B (B1, B6, B12)', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 20, note: 'Uống sau bữa ăn' },
  { name: 'Canxi Corbiere 10ml', morning: '1', noon: '0', afternoon: '0', evening: '0', days: 20, note: 'Uống sau ăn sáng 1 giờ' }
]

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

function isAppointmentLocked(app: any): boolean {
  if (!app) return false
  const status = String(app.status || '').toUpperCase()
  if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW') {
    return true
  }
  if (app.medical_record && (app.medical_record.id || app.medical_record.diagnosis)) {
    return true
  }

  // Check if past appointment date/time
  const appDateStr = app.date || app.appointment_date
  if (appDateStr) {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (appDateStr < todayStr) {
      return true
    }
    if (appDateStr === todayStr) {
      const timeStr = app.end_time || app.start_time
      if (timeStr) {
        const parts = String(timeStr).split(':')
        if (parts.length >= 2) {
          const hour = parseInt(parts[0], 10)
          const min = parseInt(parts[1], 10)
          // Kéo dài thời gian: gia hạn thêm 30 phút sau khi kết thúc lịch hẹn trước khi khóa phòng khám
          // Nếu cả 2 bên đang trong phòng thoại/video, cộng thêm 15 phút đệm để tránh ngắt quãng cuộc gọi
          const inCallExtra = (app.telehealth_status?.patient_in_room && app.telehealth_status?.doctor_in_room) ? 15 : 0
          const grace = (app.end_time ? 30 : 60) + inCallExtra
          const endTotalMin = hour * 60 + min + grace
          const currentTotalMin = today.getHours() * 60 + today.getMinutes()
          if (currentTotalMin > endTotalMin) {
            return true
          }
        }
      }
    }
  }
  return false
}

export default function Telehealth() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null)
  const [roomState, setRoomState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLeftDrawer, setShowLeftDrawer] = useState(true)
  const [showRightDrawer, setShowRightDrawer] = useState(true)

  // Call & Modal state (Zalo style: Chat is default; Call overlay opens only when calling!)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [callTime, setCallTime] = useState(0)
  const [isInCall, setIsInCall] = useState(false)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isCallMinimized, setIsCallMinimized] = useState(false)
  const [showInCallChat, setShowInCallChat] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inCallChatBottomRef = useRef<HTMLDivElement>(null)

  // Encounter Note state
  const [savingRecord, setSavingRecord] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [prescription, setPrescription] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [prescriptionRows, setPrescriptionRows] = useState<PrescriptionItem[]>([
    { id: 'init-1', drugName: '', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống sau ăn no' }
  ])
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false)
  const [showIcdDropdown, setShowIcdDropdown] = useState(false)
  const [activeDrugDropdownRowId, setActiveDrugDropdownRowId] = useState<string | null>(null)
  const [showDoseConfirmModal, setShowDoseConfirmModal] = useState(false)

  // WebRTC & Media refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerConnRef = useRef<RTCPeerConnection | null>(null)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)
  const [localStreamReady, setLocalStreamReady] = useState(false)
  const [iceState, setIceState] = useState<string>('new')
  const [peerConnectionState, setPeerConnectionState] = useState<string>('new')
  const processedOfferRef = useRef<string | null>(null)
  const processedAnswerRef = useRef<string | null>(null)
  const processedIceSetRef = useRef<Set<string>>(new Set())
  const pendingIceCandidatesRef = useRef<any[]>([])
  const iceBatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Camera devices & OBS detection
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')

  const isPatientUser = user?.role === 'PATIENT' || (roomState?.patient_id ? user?.id === roomState.patient_id : false)
  const activeAppt = appointments.find(a => a.id === selectedApptId) || appointments[0] || null
  const isActiveLocked = isAppointmentLocked(activeAppt)

  const loadAppointments = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await appointmentAPI.list()
      const list = extractList(res)
      setAppointments(list)
      if (list.length > 0 && !selectedApptId) {
        const waitingAppt = list.find(a =>
          isPatientUser ? a.telehealth_status?.doctor_in_room : a.telehealth_status?.patient_in_room
        )
        const preferred = waitingAppt || list.find(a => (a.reason || '').toLowerCase().includes('telehealth')) || list[0]
        selectAppointment(preferred)
      }
    } catch (err) {
      console.error('Failed to load telehealth contacts:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const selectAppointment = (app: any) => {
    setSelectedApptId(app.id)
    setSaveMessage(null)
    const isLocked = isAppointmentLocked(app)
    if (app.medical_record) {
      setDiagnosis(app.medical_record.diagnosis || '')
      setSymptoms(app.medical_record.symptoms || app.reason || '')
      const rx = app.medical_record.prescription || ''
      setPrescription(rx)
      setPrescriptionRows(deserializePrescription(rx, isLocked))
      setClinicalNotes(app.medical_record.notes || app.notes || '')
      setFollowUpDate(app.medical_record.follow_up_date || '')
    } else {
      setDiagnosis('')
      setSymptoms(app.reason || '')
      setPrescription('')
      setPrescriptionRows(
        isLocked
          ? []
          : [{ id: `init-row-${Date.now()}`, drugName: '', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống sau ăn no' }]
      )
      setClinicalNotes(app.notes || '')
      setFollowUpDate('')
    }
  }

  const handleAddDrugRow = () => {
    if (isActiveLocked) return
    const newRow: PrescriptionItem = {
      id: `drug-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      drugName: '',
      morning: '1',
      noon: '0',
      afternoon: '0',
      evening: '1',
      days: 14,
      note: 'Uống sau ăn no',
    }
    const updated = [...prescriptionRows, newRow]
    setPrescriptionRows(updated)
    setPrescription(serializePrescription(updated))
  }

  const handleRemoveDrugRow = (id: string) => {
    if (isActiveLocked) return
    const updated = prescriptionRows.filter(r => r.id !== id)
    const finalRows = updated.length > 0 ? updated : (
      isActiveLocked ? [] : [
        { id: `drug-${Date.now()}`, drugName: '', morning: '1', noon: '0', afternoon: '0', evening: '1', days: 14, note: 'Uống sau ăn no' }
      ]
    )
    setPrescriptionRows(finalRows)
    setPrescription(serializePrescription(finalRows))
  }

  const handleUpdateDrugRow = (id: string, field: keyof PrescriptionItem, value: any) => {
    if (isActiveLocked) return
    const updated = prescriptionRows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value }
      }
      return r
    })
    setPrescriptionRows(updated)
    setPrescription(serializePrescription(updated))
  }

  const handleSelectDrugFor = (id: string, drugTemplate: typeof COMMON_DRUGS_LIST[0]) => {
    if (isActiveLocked) return
    const updated = prescriptionRows.map(r => {
      if (r.id === id) {
        return {
          ...r,
          drugName: drugTemplate.name,
          morning: drugTemplate.morning,
          noon: drugTemplate.noon,
          afternoon: drugTemplate.afternoon,
          evening: drugTemplate.evening,
          days: drugTemplate.days,
          note: drugTemplate.note,
        }
      }
      return r
    })
    setPrescriptionRows(updated)
    setPrescription(serializePrescription(updated))
    setActiveDrugDropdownRowId(null)
  }

  const setFollowUpDays = (days: number) => {
    if (isActiveLocked) return
    const d = new Date()
    d.setDate(d.getDate() + days)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    setFollowUpDate(`${yyyy}-${mm}-${dd}`)
  }

  const fetchRoomState = async (apptId: number) => {
    try {
      const res = await appointmentAPI.getTelehealthRoom(apptId)
      const data = res.data?.data || res.data
      if (data) {
        setRoomState(data)
        const myInRoom = isPatientUser ? data.patient_in_room : data.doctor_in_room
        setIsInCall(Boolean(myInRoom))
        if (myInRoom) {
          await handleWebRTCSync(apptId, data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch room state:', err)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  useEffect(() => {
    if (selectedApptId) {
      fetchRoomState(selectedApptId)
    }
  }, [selectedApptId])

  // Low-latency real-time sync (1.5s) for instant Zalo-like chat & call state
  useRealtimeSync(() => {
    loadAppointments(true)
    if (selectedApptId) {
      fetchRoomState(selectedApptId)
    }
  }, 1500)

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    inCallChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomState?.messages?.length, selectedApptId, isCallModalOpen])

  // Call timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (isInCall) {
      interval = setInterval(() => {
        if (roomState?.started_at) {
          const elapsed = Math.max(0, Math.floor((Date.now() - new Date(roomState.started_at).getTime()) / 1000))
          setCallTime(elapsed)
        } else {
          setCallTime(prev => prev + 1)
        }
      }, 1000)
    } else {
      setCallTime(0)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isInCall, roomState?.started_at])

  const loadAvailableDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return []
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter(d => d.kind === 'videoinput')
      setAvailableCameras(videoInputs)
      return videoInputs
    } catch (err) {
      console.warn('Enumerate devices error:', err)
      return []
    }
  }

  // Auto-detect connected cameras (including OBS Virtual Cam)
  useEffect(() => {
    loadAvailableDevices()
    const handleDeviceChange = () => { loadAvailableDevices() }
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  // Keep local video element synced to localStream
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      localVideoRef.current.play().catch(() => { })
    }
  }, [localStreamReady, isVideoOn, isInCall, isCallModalOpen, isCallMinimized])

  // Keep remote video element synced to remoteStream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current && remoteStreamRef.current.getTracks().length > 0) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      }
      remoteVideoRef.current.play().catch(e => console.debug('Remote video play:', e))
    }
  }, [hasRemoteStream, roomState, isCallModalOpen, isCallMinimized])

  const syncLocalTracksToPC = (pc: RTCPeerConnection, stream: MediaStream) => {
    const transceivers = pc.getTransceivers()
    stream.getTracks().forEach(track => {
      const transceiver = transceivers.find(t =>
        (t.sender.track && t.sender.track.kind === track.kind) ||
        (t.receiver.track && t.receiver.track.kind === track.kind)
      )
      if (transceiver && transceiver.sender) {
        if (transceiver.sender.track !== track) {
          transceiver.sender.replaceTrack(track).catch(err => console.warn('replaceTrack error:', err))
        }
        if (transceiver.direction === 'recvonly') {
          transceiver.direction = 'sendrecv'
        }
      } else {
        const senders = pc.getSenders()
        const sender = senders.find(s => s.track && s.track.kind === track.kind)
        if (sender) {
          sender.replaceTrack(track).catch(err => console.warn('replaceTrack error:', err))
        } else {
          try {
            pc.addTrack(track, stream)
          } catch (err) {
            console.warn('addTrack error:', err)
          }
        }
      }
    })
  }

  const startLocalMedia = async (withVideo = true, preferredCameraId?: string) => {
    setCameraError(null)

    // Check currently available cameras
    let currentCams = availableCameras
    if (currentCams.length === 0) {
      currentCams = await loadAvailableDevices()
    }

    // Auto-detect camera: Prioritize physical hardware cameras, fallback to OBS Virtual Camera
    let targetCamId = preferredCameraId || selectedCameraId
    if (!targetCamId && currentCams.length > 0) {
      const physicalCam = currentCams.find(c => {
        const lbl = (c.label || '').toLowerCase()
        return !lbl.includes('obs') && !lbl.includes('virtual')
      })
      if (physicalCam) {
        targetCamId = physicalCam.deviceId
        setSelectedCameraId(physicalCam.deviceId)
      } else {
        // Fallback for machines without physical webcam (e.g. MiniPC using OBS Virtual Camera)
        targetCamId = currentCams[0].deviceId
        setSelectedCameraId(targetCamId)
      }
    }

    let vTrack: MediaStreamTrack | null = null
    let aTrack: MediaStreamTrack | null = null

    // 1. Try to get Video independently (supports OBS Virtual Cam & standard webcams)
    if (withVideo) {
      try {
        const vConstraints: MediaStreamConstraints = {
          video: targetCamId
            ? { deviceId: { exact: targetCamId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }
        const vStream = await navigator.mediaDevices.getUserMedia(vConstraints)
        vTrack = vStream.getVideoTracks()[0] || null
        if (vTrack) {
          loadAvailableDevices()
        }
      } catch (vErr) {
        console.warn('Failed video with ideal constraints, trying basic video: true', vErr)
        try {
          const vStreamBasic = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          vTrack = vStreamBasic.getVideoTracks()[0] || null
          if (vTrack) loadAvailableDevices()
        } catch (vErr2) {
          console.warn('All video acquisition failed:', vErr2)
          setCameraError('Không thể mở Camera / OBS Virtual Camera. Hãy chắc chắn bạn đã nhấn "Start Virtual Camera" trong phần mềm OBS Studio.')
        }
      }
    }

    // 2. Try to get Audio independently (MiniPC may not have a physical microphone)
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      aTrack = aStream.getAudioTracks()[0] || null
      setIsMicOn(true)
    } catch (aErr) {
      console.info('No audio input device detected or microphone permission denied (MiniPC):', aErr)
      setIsMicOn(false)
    }

    // 3. Combine whatever tracks succeeded
    const tracks: MediaStreamTrack[] = []
    if (vTrack) tracks.push(vTrack)
    if (aTrack) tracks.push(aTrack)

    if (tracks.length > 0) {
      const combined = new MediaStream(tracks)
      localStreamRef.current = combined
      setLocalStreamReady(true)

      if (vTrack) {
        setIsVideoOn(true)
        setCameraError(null)
      } else if (withVideo) {
        setIsVideoOn(false)
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = combined
        localVideoRef.current.play().catch(() => { })
      }

      if (peerConnRef.current) {
        syncLocalTracksToPC(peerConnRef.current, combined)
      }
      return combined
    } else {
      localStreamRef.current = null
      setLocalStreamReady(false)
      setIsVideoOn(false)
      setIsMicOn(false)
      setCameraError('Không tìm thấy thiết bị Camera / Mic. Nếu dùng OBS, vui lòng bật "Start Virtual Camera" rồi bấm Thử lại.')
      return null
    }
  }


  const flushIceCandidates = (apptId: number) => {
    if (pendingIceCandidatesRef.current.length === 0) return
    const batch = [...pendingIceCandidatesRef.current]
    pendingIceCandidatesRef.current = []
    appointmentAPI.updateTelehealthRoom(apptId, {
      action: 'webrtc_signal',
      signal_type: 'ice_batch',
      signal_data: batch,
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    }).catch(err => console.warn('Flush ICE batch error:', err))
  }

  const stopLocalMedia = () => {
    if (iceBatchTimeoutRef.current) {
      clearTimeout(iceBatchTimeoutRef.current)
      iceBatchTimeoutRef.current = null
    }
    pendingIceCandidatesRef.current = []
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop())
      remoteStreamRef.current = null
    }
    if (peerConnRef.current) {
      peerConnRef.current.close()
      peerConnRef.current = null
    }
    setHasRemoteStream(false)
    setLocalStreamReady(false)
    setIceState('new')
    setPeerConnectionState('new')
    processedOfferRef.current = null
    processedAnswerRef.current = null
    processedIceSetRef.current.clear()
  }

  const ensurePeerConnection = (apptId: number) => {
    if (peerConnRef.current && peerConnRef.current.signalingState !== 'closed') {
      return peerConnRef.current
    }
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'turns:global.relay.metered.ca:443?transport=tcp',
            'turn:global.relay.metered.ca:443?transport=tcp',
            'turn:global.relay.metered.ca:80?transport=tcp',
          ],
          username: '7f27ef410e8ff9439e474323',
          credential: 'MS5zleUbEp9n0qKQ',
        },
        {
          urls: [
            'turn:global.relay.metered.ca:80',
            'turn:global.relay.metered.ca:443',
          ],
          username: '7f27ef410e8ff9439e474323',
          credential: 'MS5zleUbEp9n0qKQ',
        },
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    })

    if (localStreamRef.current) {
      syncLocalTracksToPC(pc, localStreamRef.current)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        pendingIceCandidatesRef.current.push(event.candidate.toJSON())
        if (iceBatchTimeoutRef.current) clearTimeout(iceBatchTimeoutRef.current)
        iceBatchTimeoutRef.current = setTimeout(() => {
          flushIceCandidates(apptId)
        }, 150)
      } else {
        flushIceCandidates(apptId)
      }
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, event.track.id)
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream()
      }
      const existing = remoteStreamRef.current.getTracks().filter(t => t.kind === event.track.kind)
      existing.forEach(t => remoteStreamRef.current?.removeTrack(t))
      remoteStreamRef.current.addTrack(event.track)

      setHasRemoteStream(true)
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
        }
        remoteVideoRef.current.play().catch(e => console.debug('Remote video play err:', e))
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State:', pc.iceConnectionState)
      setIceState(pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setHasRemoteStream(true)
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE Connection Failed, attempting restart...')
        pc.restartIce()
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Peer Connection State:', pc.connectionState)
      setPeerConnectionState(pc.connectionState)
      if (pc.connectionState === 'connected') {
        setHasRemoteStream(true)
      }
    }

    peerConnRef.current = pc
    return pc
  }

  const handleRetryWebRTC = async () => {
    if (!selectedApptId) return
    console.log('[WebRTC] Manual reconnection requested...')
    if (peerConnRef.current) {
      peerConnRef.current.close()
      peerConnRef.current = null
    }
    setHasRemoteStream(false)
    processedOfferRef.current = null
    processedAnswerRef.current = null
    processedIceSetRef.current.clear()

    // Reset signaling room state in backend so both peers start fresh
    await appointmentAPI.updateTelehealthRoom(selectedApptId, {
      action: 'webrtc_signal',
      signal_type: 'offer',
      signal_data: null,
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    }).catch(() => { })

    const pc = ensurePeerConnection(selectedApptId)
    if (localStreamRef.current) {
      syncLocalTracksToPC(pc, localStreamRef.current)
    }
    if (roomState) {
      await handleWebRTCSync(selectedApptId, roomState)
    }
  }

  const handleWebRTCSync = async (apptId: number, data: any) => {
    if (!data.doctor_in_room || !data.patient_in_room) return
    const pc = ensurePeerConnection(apptId)

    // Sync any newly added tracks to peer connection
    if (localStreamRef.current) {
      syncLocalTracksToPC(pc, localStreamRef.current)
    }

    try {
      if (!isPatientUser) {
        // DOCTOR: Creates Offer if this local PeerConnection hasn't created one yet
        if (!processedOfferRef.current && pc.signalingState === 'stable') {
          console.log('[WebRTC] Doctor generating fresh offer...')
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          await pc.setLocalDescription(offer)
          processedOfferRef.current = JSON.stringify(offer)
          await appointmentAPI.updateTelehealthRoom(apptId, {
            action: 'webrtc_signal',
            signal_type: 'offer',
            signal_data: { type: offer.type, sdp: offer.sdp },
            participant_role: 'DOCTOR',
          })
          setTimeout(() => flushIceCandidates(apptId), 250)
        } else if (data.webrtc_answer) {
          const ansStr = JSON.stringify(data.webrtc_answer)
          if (processedAnswerRef.current !== ansStr && pc.signalingState === 'have-local-offer') {
            processedAnswerRef.current = ansStr
            await pc.setRemoteDescription(new RTCSessionDescription(data.webrtc_answer))
            console.log('[WebRTC] Doctor successfully setRemoteDescription with Answer')
          }
        }
        const remoteCands = data.patient_ice_candidates || []
        if (pc.remoteDescription && Array.isArray(remoteCands)) {
          for (const cand of remoteCands) {
            if (!cand || !cand.candidate || !cand.candidate.trim()) continue
            const key = cand.candidate || JSON.stringify(cand)
            if (!processedIceSetRef.current.has(key)) {
              processedIceSetRef.current.add(key)
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => { })
            }
          }
        }
      } else {
        // PATIENT: Receives Offer, Creates Answer
        if (data.webrtc_offer) {
          const offStr = JSON.stringify(data.webrtc_offer)
          if (processedOfferRef.current !== offStr) {
            processedOfferRef.current = offStr
            if (pc.signalingState !== 'stable') {
              console.log('[WebRTC] Patient resetting PeerConnection to receive new Offer')
            }
            await pc.setRemoteDescription(new RTCSessionDescription(data.webrtc_offer))
            console.log('[WebRTC] Patient successfully setRemoteDescription with Offer')
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            processedAnswerRef.current = JSON.stringify(answer)
            await appointmentAPI.updateTelehealthRoom(apptId, {
              action: 'webrtc_signal',
              signal_type: 'answer',
              signal_data: { type: answer.type, sdp: answer.sdp },
              participant_role: 'PATIENT',
            })
            setTimeout(() => flushIceCandidates(apptId), 250)
          }
        }
        const remoteCands = data.doctor_ice_candidates || []
        if (pc.remoteDescription && Array.isArray(remoteCands)) {
          for (const cand of remoteCands) {
            if (!cand || !cand.candidate || !cand.candidate.trim()) continue
            const key = cand.candidate || JSON.stringify(cand)
            if (!processedIceSetRef.current.has(key)) {
              processedIceSetRef.current.add(key)
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => { })
            }
          }
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Negotiation step warning:', err)
    }
  }

  // Start or Accept Call -> Opens the Zalo Call Modal!
  const handleStartCall = async (targetApptId?: number, videoMode = true) => {
    const apptId = targetApptId || selectedApptId
    if (!apptId) return
    const targetAppt = appointments.find(a => a.id === apptId) || activeAppt
    if (isAppointmentLocked(targetAppt)) {
      alert('Phiên khám này đã kết thúc hoặc hoàn tất. Kênh gọi thoại/video đã được khóa để bảo đảm quyền riêng tư.')
      return
    }
    if (targetApptId && targetApptId !== selectedApptId) {
      const found = appointments.find(a => a.id === targetApptId)
      if (found) selectAppointment(found)
    }
    setIsVideoOn(videoMode)
    setIsCallModalOpen(true)
    setIsCallMinimized(false)
    const stream = await startLocalMedia(videoMode)
    setIsInCall(true)

    const pc = ensurePeerConnection(apptId)
    if (stream) {
      syncLocalTracksToPC(pc, stream)
    }

    const actualHasVideo = Boolean(stream && stream.getVideoTracks().length > 0)
    const res = await appointmentAPI.updateTelehealthRoom(apptId, {
      action: 'join',
      mic: isMicOn,
      video: actualHasVideo,
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    })
    const data = res.data?.data || res.data
    setRoomState(data)
    loadAppointments(true)
  }

  // End Call -> Closes the Zalo Call Modal and returns to Chat View
  const handleLeaveCall = async () => {
    stopLocalMedia()
    setIsInCall(false)
    setIsCallModalOpen(false)
    setIsCallMinimized(false)
    setCallTime(0)
    if (!selectedApptId) return
    const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
      action: 'leave',
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    })
    setRoomState(res.data?.data || res.data)
    loadAppointments(true)
  }

  const handleToggleMic = async () => {
    const nextMic = !isMicOn
    setIsMicOn(nextMic)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = nextMic })
    }
    if (selectedApptId && isInCall) {
      const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
        action: 'toggle_media',
        mic: nextMic,
        video: isVideoOn,
      })
      setRoomState(res.data?.data || res.data)
    }
  }

  const handleToggleVideo = async () => {
    const nextVid = !isVideoOn
    setIsVideoOn(nextVid)
    if (localStreamRef.current) {
      const vTracks = localStreamRef.current.getVideoTracks()
      if (vTracks.length > 0) {
        vTracks.forEach(t => { t.enabled = nextVid })
      } else if (nextVid) {
        await startLocalMedia(true, selectedCameraId)
      }
    } else if (nextVid) {
      await startLocalMedia(true, selectedCameraId)
    }
    if (selectedApptId && isInCall) {
      const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
        action: 'toggle_media',
        mic: isMicOn,
        video: nextVid,
      })
      setRoomState(res.data?.data || res.data)
    }
  }

  const handleSendMessage = async (customText?: string) => {
    if (activeAppt && isAppointmentLocked(activeAppt)) {
      alert('Phiên khám đã kết thúc hoặc hoàn tất. Kênh nhắn tin trực tiếp đã đóng.')
      return
    }
    const text = (customText ?? chatInput).trim()
    if (!text || !selectedApptId) return
    setSendingChat(true)
    try {
      const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
        action: 'send_message',
        content: text,
      })
      setRoomState(res.data?.data || res.data)
      if (!customText) setChatInput('')
      loadAppointments(true)
    } finally {
      setSendingChat(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const filteredContacts = appointments.filter(app => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const contactName = isPatientUser ? (app.doctor_name || '') : (app.patient_name || '')
    return (
      contactName.toLowerCase().includes(q) ||
      String(app.id).includes(q) ||
      (app.reason || '').toLowerCase().includes(q) ||
      (app.doctor_specialization || '').toLowerCase().includes(q)
    )
  })

  const patientCombinedHistory = [
    activeAppt?.patient_history,
    activeAppt?.notes,
    activeAppt?.reason
  ].filter(Boolean).join(' • ')

  const activeDoseWarnings = checkDoseWarnings(prescriptionRows)
  const activeClinicalWarnings = checkClinicalRiskWarnings(prescriptionRows, patientCombinedHistory)

  // Appointments where the other party is currently waiting in the call room (ignore finished/locked)
  const waitingAppointments = appointments.filter(a => {
    if (isAppointmentLocked(a)) return false
    const ts = a.telehealth_status
    if (!ts) return false
    return isPatientUser
      ? (ts.doctor_in_room && !ts.patient_in_room)
      : (ts.patient_in_room && !ts.doctor_in_room)
  })

  const bothConnected = Boolean(roomState?.doctor_in_room && roomState?.patient_in_room)
  const otherPartyInRoom = isPatientUser ? Boolean(roomState?.doctor_in_room) : Boolean(roomState?.patient_in_room)

  // 🔔 Call ringtone: outgoing ring when waiting, incoming chime when other party arrives
  useCallRingtone({ isInCall, bothConnected, otherPartyInRoom, isCallModalOpen })
  const otherPartyMicOn = isPatientUser ? (roomState?.doctor_mic ?? true) : (roomState?.patient_mic ?? true)
  const otherPartyVideoOn = isPatientUser ? (roomState?.doctor_video ?? true) : (roomState?.patient_video ?? true)
  const isP2PConnected = iceState === 'connected' || iceState === 'completed' || peerConnectionState === 'connected'
  const isRemoteVideoActive = hasRemoteStream && isP2PConnected && (
    otherPartyVideoOn || (remoteStreamRef.current ? remoteStreamRef.current.getVideoTracks().some(t => t.readyState === 'live' && t.enabled) : false)
  )
  const otherPartyName = activeAppt
    ? (isPatientUser ? `BS. ${activeAppt.doctor_name}` : `BN. ${activeAppt.patient_name}`)
    : ''
  const myDisplayName = activeAppt
    ? (isPatientUser ? `BN. ${activeAppt.patient_name}` : `BS. ${activeAppt.doctor_name}`)
    : ''

  const handleSignAndSaveRecord = async (bypassWarning: boolean = false) => {
    if (!activeAppt) return
    if (isActiveLocked) {
      alert('Ca khám này đã hoàn tất hoặc hồ sơ bệnh án đã được ký số, không thể chỉnh sửa thêm!')
      return
    }
    const doseWarnings = checkDoseWarnings(prescriptionRows)
    const clinicalWarnings = checkClinicalRiskWarnings(prescriptionRows, patientCombinedHistory)
    if (!bypassWarning && (doseWarnings.length > 0 || clinicalWarnings.length > 0)) {
      setShowDoseConfirmModal(true)
      return
    }
    setSavingRecord(true)
    setSaveMessage(null)
    try {
      const finalRx = prescriptionRows.some(r => r.drugName.trim())
        ? serializePrescription(prescriptionRows)
        : prescription

      await medicalRecordAPI.create({
        patient: activeAppt.patient,
        doctor: activeAppt.doctor,
        appointment: activeAppt.id,
        diagnosis: diagnosis || 'I10 - Khám chuyên khoa Telehealth',
        symptoms: symptoms || activeAppt.reason,
        prescription: finalRx || 'Theo dõi định kỳ',
        notes: clinicalNotes || 'Đã hoàn tất phiên hội chẩn Telehealth WebRTC.',
        follow_up_date: followUpDate || null,
      })
      setPrescription(finalRx)
      setSaveMessage('Đã ký số và lưu hồ sơ bệnh án trực tiếp vào Cơ sở dữ liệu PostgreSQL!')
      await loadAppointments(true)
      setIsPrescriptionModalOpen(false)
      setShowDoseConfirmModal(false)
    } catch (err: any) {
      setSaveMessage(err?.response?.data?.message || 'Lỗi khi lưu hồ sơ bệnh án.')
    } finally {
      setSavingRecord(false)
    }
  }

  const handlePrintCurrentPrescription = () => {
    if (!activeAppt) return
    const finalRx = prescriptionRows.some(r => r.drugName.trim())
      ? serializePrescription(prescriptionRows)
      : prescription

    const tempRecord = {
      id: activeAppt.medical_record?.id || activeAppt.id,
      patient_name: activeAppt.patient_name,
      patient_code: activeAppt.patient_code,
      patient_gender: activeAppt.patient_gender,
      patient_age: activeAppt.patient_age,
      patient_dob: activeAppt.patient_dob,
      patient_phone: activeAppt.patient_phone,
      patient_address: activeAppt.patient_address,
      diagnosis: diagnosis || 'Khám chuyên khoa Telehealth',
      prescription: finalRx,
      notes: clinicalNotes || 'Uống thuốc đúng liều lượng, đúng thời gian theo chỉ dẫn.',
      follow_up_date: followUpDate || '',
      appointment_date: activeAppt.appointment_date || new Date().toISOString().split('T')[0],
      clinic_name: activeAppt.clinic_name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDTECH SÀI GÒN',
      doctor_name: activeAppt.doctor_name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Sarah Jenkins'),
      doctor_specialization: activeAppt.doctor_specialization || 'Nội khoa',
    }
    const html = generatePrescriptionHtml(tempRecord)
    const printWindow = window.open('', '_blank', 'width=950,height=850')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const quickChatTemplates = isPatientUser
    ? [
      '👋 Chào Bác sĩ, tôi đã sẵn sàng trao đổi ạ.',
      '⚠️ Mic của tôi đang bị hỏng, tôi xin phép nhắn tin.',
      '📹 Bác sĩ có thể bấm Gọi Video giúp tôi được không ạ?',
    ]
    : [
      '👋 Chào bạn, Bác sĩ đã sẵn sàng tư vấn ca khám của bạn.',
      '⚠️ Nếu mic của bạn bị hỏng, bạn cứ nhắn tin triệu chứng vào đây nhé.',
      '💊 Bác sĩ đã cập nhật chẩn đoán và đơn thuốc trong bệnh án.',
    ]

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return (name || 'U').slice(0, 2).toUpperCase()
  }

  const filteredIcdList = diagnosis.trim()
    ? COMMON_ICD10_LIST.filter(item => {
      const q = diagnosis.toLowerCase()
      return item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    })
    : COMMON_ICD10_LIST

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: 'calc(100vh - var(--header-height) - 40px)' }}>
      {/* INCOMING CALL FLOATING BANNER (Zalo Ringing Bar) when someone is calling */}
      {waitingAppointments.map(wa => (
        <div
          key={`incoming-${wa.id}`}
          style={{
            background: 'linear-gradient(90deg, #0068ff 0%, #0d9488 100%)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0, 104, 255, 0.25)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PhoneIncoming size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)' }}>
                {isPatientUser
                  ? `📲 Cuộc gọi đến từ BS. ${wa.doctor_name} (${wa.doctor_specialization})`
                  : `📲 Cuộc gọi đến từ Bệnh nhân ${wa.patient_name} (${wa.patient_code})`}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>
                Ca khám #BA-{1000 + wa.id} • {wa.reason} • Đang chờ bạn trong phòng cuộc gọi...
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
              onClick={() => {
                selectAppointment(wa)
                handleSendMessage('Tôi đang bận chút, xin phép nhắn tin trước ạ.')
              }}
            >
              <MessageSquare size={14} /> Nhắn tin
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#22c55e', color: 'white', border: 'none', fontWeight: 'bold', padding: '6px 14px' }}
              onClick={() => handleStartCall(wa.id, true)}
            >
              <Video size={15} /> Nghe máy / Mở Video
            </button>
          </div>
        </div>
      ))}

      {/* MAIN ZALO 3-COLUMN MESSENGER CONTAINER */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `${showLeftDrawer ? '280px' : '0px'} minmax(360px, 1fr) ${showRightDrawer ? '320px' : '0px'}`,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 0,
        width: '100%',
        maxWidth: '100%',
        transition: 'grid-template-columns 0.2s ease',
      }}>
        {/* ================= COLUMN 1: ZALO CONTACT LIST SIDEBAR ================= */}
        {showLeftDrawer && (
          <div style={{
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-surface)',
            minHeight: 0,
          }}>
            {/* Sidebar Header + Search */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ fontSize: 'var(--text-base)', color: '#0068ff' }}>
                    {isPatientUser ? 'Bác sĩ của tôi' : user?.role === 'DOCTOR' ? 'Bệnh nhân phụ trách' : 'Danh bạ Telehealth'}
                  </strong>
                  <InfoTooltip
                    title="Danh bạ khám từ xa"
                    content="Danh sách bác sĩ hoặc bệnh nhân có lịch hẹn với bạn. Bấm vào một người để nhắn tin hoặc bấm Gọi để khám trực tiếp."
                  />
                </div>
                <span className="badge badge-primary" style={{ fontSize: '11px' }}>{filteredContacts.length} liên hệ</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={isPatientUser ? 'Tìm bác sĩ chuyên khoa...' : 'Tìm tên bệnh nhân, mã ca...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 32, fontSize: 'var(--text-sm)', height: 34, borderRadius: 'var(--radius-full)', background: 'var(--color-neutral-bg)' }}
                />
              </div>
            </div>

            {/* Contact Items List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredContacts.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  {loading ? 'Đang tải danh bạ...' : 'Không tìm thấy người liên hệ phù hợp.'}
                </div>
              ) : (
                filteredContacts.map(app => {
                  const isSelected = app.id === activeAppt?.id
                  const isLocked = isAppointmentLocked(app)
                  const ts = app.telehealth_status || {}
                  const isBoth = ts.doctor_in_room && ts.patient_in_room
                  const isOtherWaiting = !isLocked && (isPatientUser ? (ts.doctor_in_room && !ts.patient_in_room) : (ts.patient_in_room && !ts.doctor_in_room))
                  const contactName = isPatientUser ? `BS. ${app.doctor_name}` : app.patient_name
                  const subTitle = isPatientUser
                    ? `${app.doctor_specialization}`
                    : `${app.patient_code} • ${app.patient_gender || 'Nam'}, ${app.patient_age || 45}t`

                  return (
                    <div
                      key={app.id}
                      onClick={() => selectAppointment(app)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border)',
                        background: isSelected ? '#e5efff' : isOtherWaiting ? '#fff1f2' : 'transparent',
                        borderLeft: isSelected ? '4px solid #0068ff' : '4px solid transparent',
                        transition: 'background 0.15s ease',
                        opacity: isLocked && !isSelected ? 0.85 : 1,
                      }}
                    >
                      {/* Avatar with Status Dot */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: '50%',
                          background: isSelected ? '#0068ff' : '#dbeafe',
                          color: isSelected ? 'white' : '#1e40af',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '15px',
                        }}>
                          {getInitials(isPatientUser ? app.doctor_name : app.patient_name)}
                        </div>
                        <span style={{
                          position: 'absolute', bottom: 1, right: 1,
                          width: isLocked ? 14 : 12, height: isLocked ? 14 : 12, borderRadius: '50%',
                          background: isLocked ? '#94a3b8' : isOtherWaiting ? '#ef4444' : isBoth ? '#22c55e' : '#10b981',
                          border: '2px solid white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isLocked && <Lock size={8} color="white" />}
                        </span>
                      </div>

                      {/* Name + Last Message Preview */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{
                            fontWeight: isSelected || isOtherWaiting ? 'var(--font-bold)' : 'var(--font-semibold)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {contactName}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                            {ts.last_message_time || String(app.start_time || '').slice(0, 5)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#0068ff', fontWeight: 500, marginBottom: 2 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {subTitle} • #BA-{1000 + app.id}
                          </span>
                          {isLocked && (
                            <span style={{
                              fontSize: '9.5px',
                              padding: '0 5px',
                              borderRadius: '3px',
                              background: (app.status === 'COMPLETED' || app.medical_record) ? '#ecfdf5' : '#f1f5f9',
                              color: (app.status === 'COMPLETED' || app.medical_record) ? '#059669' : '#64748b',
                              fontWeight: 600,
                              border: `1px solid ${(app.status === 'COMPLETED' || app.medical_record) ? '#a7f3d0' : '#cbd5e1'}`,
                              flexShrink: 0,
                            }}>
                              {(app.status === 'COMPLETED' || app.medical_record) ? 'Đã xong' : 'Đã đóng'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          {isOtherWaiting ? (
                            <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <PhoneIncoming size={12} /> Đang gọi cho bạn...
                            </span>
                          ) : isBoth ? (
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                              🟢 Đang trong cuộc gọi
                            </span>
                          ) : isLocked ? (
                            <span style={{
                              fontSize: '12px',
                              color: 'var(--color-text-tertiary)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <Lock size={11} color="#94a3b8" />
                              {ts.last_message ? `💬 ${ts.last_message}` : (app.status === 'COMPLETED' || app.medical_record ? 'Hồ sơ bệnh án đã lưu' : app.reason)}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '12px',
                              color: ts.last_message ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {ts.last_message ? `💬 ${ts.last_message}` : app.reason}
                            </span>
                          )}

                          {ts.message_count > 0 && (
                            <span style={{
                              background: '#0068ff', color: 'white',
                              borderRadius: '10px', padding: '1px 6px',
                              fontSize: '10px', fontWeight: 'bold', flexShrink: 0
                            }}>
                              {ts.message_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ================= COLUMN 2: ZALO MAIN CHAT WINDOW (Shows Messages First!) ================= */}
        {!activeAppt ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
            Chọn một người liên hệ bên trái để bắt đầu nhắn tin hoặc gọi điện.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#eef3f8' }}>
            {/* Zalo Top Chat Header with Call Buttons */}
            <div style={{
              height: 68,
              padding: '0 20px',
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowLeftDrawer(!showLeftDrawer)}
                  title={showLeftDrawer ? 'Ẩn danh bạ' : 'Hiện danh bạ'}
                  style={{ color: '#0068ff' }}
                >
                  {showLeftDrawer ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#0068ff', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '15px',
                  }}>
                    {getInitials(isPatientUser ? activeAppt.doctor_name : activeAppt.patient_name)}
                  </div>
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 11, height: 11, borderRadius: '50%',
                    background: isActiveLocked ? '#94a3b8' : '#22c55e',
                    border: '2px solid white',
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {otherPartyName}
                    </strong>
                    <span className="badge badge-neutral font-mono" style={{ fontSize: '11px', flexShrink: 0 }}>
                      #BA-{1000 + activeAppt.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isActiveLocked ? (
                      <span style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle2 size={13} color="#059669" /> Phiên khám đã hoàn tất • {activeAppt.doctor_specialization} • {activeAppt.clinic_name}
                      </span>
                    ) : bothConnected ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Đang kết nối trong cuộc gọi ({formatTime(callTime)})</span>
                    ) : otherPartyInRoom ? (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>📲 {otherPartyName} đang chờ bạn trong cuộc gọi!</span>
                    ) : (
                      <span>🟢 Đang trực tuyến • {activeAppt.doctor_specialization} • {activeAppt.clinic_name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Zalo Call Action Buttons (or Locked Notice Badge) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {isActiveLocked ? (
                  <>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-full)',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      <Lock size={13} color="#64748b" />
                      <span>Phiên khám đã kết thúc (Lưu trữ)</span>
                    </div>
                    <InfoTooltip
                      title="Phiên khám đã kết thúc"
                      content="Ca khám này đã hoàn tất hoặc đã quá 30 phút sau khi kết thúc lịch hẹn. Cuộc gọi thoại và video đã được khóa để bảo vệ tính riêng tư ngoài giờ khám của cả hai bên. Lịch sử tin nhắn và đơn thuốc vẫn được bảo lưu để bạn tra cứu bất kỳ lúc nào."
                    />
                  </>
                ) : isInCall ? (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#16a34a', color: 'white', border: 'none', fontWeight: 600, padding: '8px 14px' }}
                    onClick={() => {
                      setIsCallModalOpen(true)
                      setIsCallMinimized(false)
                    }}
                  >
                    <Maximize2 size={15} /> Mở lại màn hình Cuộc gọi ({formatTime(callTime)})
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartCall(activeAppt.id, false)}
                      title="Bắt đầu cuộc gọi thoại"
                      style={{ padding: '7px 12px', fontWeight: 600 }}
                    >
                      <PhoneCall size={15} color="#0068ff" /> Gọi thoại
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStartCall(activeAppt.id, true)}
                      title="Bắt đầu cuộc gọi Video WebRTC"
                      style={{ background: '#0068ff', borderColor: '#0068ff', padding: '7px 14px', fontWeight: 600 }}
                    >
                      <Video size={15} /> {otherPartyInRoom ? 'Chấp nhận Gọi Video' : 'Gọi Video'}
                    </button>
                    <InfoTooltip
                      title="Khám bệnh trực tuyến"
                      content="Bạn có thể nhắn tin trao đổi trước. Khi cả hai đã sẵn sàng, hãy bấm nút Gọi Video để bắt đầu cuộc khám. Cuộc gọi được bảo mật y tế tuyệt đối."
                    />
                  </>
                )}

                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                  title={showRightDrawer ? 'Ẩn thông tin bệnh án' : 'Mở thông tin bệnh án'}
                >
                  {showRightDrawer ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              </div>
            </div>

            {/* Pinned Appointment Context Banner inside Chat */}
            <div style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              flexShrink: 0,
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                <FileText size={14} color="#0068ff" style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <strong>Nội dung khám:</strong> {activeAppt.reason}
                </span>
                {isActiveLocked && (
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    color: '#059669',
                    fontWeight: 600,
                    border: '1px solid #a7f3d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    <CheckCircle2 size={11} color="#059669" /> Đã hoàn thành
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ whiteSpace: 'nowrap' }}>Ngày hẹn: <strong>{activeAppt.date}</strong> ({String(activeAppt.start_time || '').slice(0, 5)})</span>
                {isActiveLocked && (
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 600,
                    border: '1px solid #cbd5e1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    <Lock size={10} color="#64748b" /> Đã đóng phiên
                  </span>
                )}
              </div>
            </div>

            {/* Zalo Chat Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* System security notice bubble */}
              <div style={{
                alignSelf: 'center',
                background: 'rgba(255,255,255,0.75)',
                padding: '5px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
                border: '1px solid var(--color-border)',
              }}>
                🔒 Tin nhắn và cuộc gọi giữa <strong>BS. {activeAppt.doctor_name}</strong> và <strong>BN. {activeAppt.patient_name}</strong> được đồng bộ thời gian thực.
              </div>

              {(!roomState?.messages || roomState.messages.length === 0) ? (
                isActiveLocked ? (
                  <div style={{
                    margin: 'auto',
                    textAlign: 'center',
                    background: 'white',
                    padding: '28px 32px',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    maxWidth: 440,
                    border: '1px solid #e2e8f0',
                  }}>
                    <div style={{
                      width: 54, height: 54, borderRadius: '50%',
                      background: '#ecfdf5', color: '#059669',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}>
                      <CheckCircle2 size={28} />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--text-base)', marginBottom: 6, color: '#0f172a' }}>
                      Phiên khám từ xa đã hoàn tất thành công
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                      Hồ sơ ca khám giữa <strong>{isPatientUser ? `BS. ${activeAppt.doctor_name}` : activeAppt.patient_name}</strong> và bạn đã được lưu trữ an toàn. Toàn bộ chẩn đoán, đơn thuốc và lịch hẹn tái khám được ghi nhận ở bảng bên phải.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowRightDrawer(true)}
                        style={{ fontWeight: 600, fontSize: '12px', padding: '6px 14px' }}
                      >
                        <FileText size={14} color="#0068ff" /> Xem sổ khám & đơn thuốc
                      </button>
                      {isPatientUser && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate('/booking')}
                          style={{ background: '#0068ff', borderColor: '#0068ff', fontWeight: 600, fontSize: '12px', padding: '6px 14px' }}
                        >
                          <Calendar size={14} /> Đặt lịch khám mới
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    margin: 'auto',
                    textAlign: 'center',
                    background: 'white',
                    padding: '24px 32px',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    maxWidth: 420,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: '#e5efff', color: '#0068ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px', fontWeight: 'bold', fontSize: '18px',
                    }}>
                      {getInitials(isPatientUser ? activeAppt.doctor_name : activeAppt.patient_name)}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--text-base)', marginBottom: 4 }}>
                      Bắt đầu trò chuyện với {otherPartyName}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                      Bạn có thể gửi tin nhắn trao đổi trước hoặc nhấn nút <strong>Gọi Video</strong> ở góc phải trên để bắt đầu cuộc gọi trực tuyến.
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: '#0068ff', borderColor: '#0068ff' }}
                      onClick={() => handleStartCall(activeAppt.id, true)}
                    >
                      <Video size={14} /> Gọi Video với {otherPartyName}
                    </button>
                  </div>
                )
              ) : (
                roomState.messages.map((msg: any) => {
                  const isMine = msg.sender_id === user?.id
                  const senderLabel = msg.sender_role === 'DOCTOR' ? `BS. ${msg.sender_name}` : `BN. ${msg.sender_name}`
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: isMine ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px',
                      }}
                    >
                      {!isMine && (
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: '#0068ff', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 'bold', flexShrink: 0,
                        }}>
                          {getInitials(msg.sender_name)}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isMine ? '#dbeafe' : '#ffffff',
                        color: '#0f172a',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        border: isMine ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      }}>
                        {!isMine && (
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0068ff', marginBottom: 3 }}>
                            {senderLabel}
                          </div>
                        )}
                        <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                          {msg.created_at}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Zalo Bottom Quick Replies + Input Composer (OR Locked Archive Bar) */}
            {isActiveLocked ? (
              <div style={{
                background: '#f8fafc',
                borderTop: '1px solid var(--color-border)',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: '#e2e8f0', color: '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Lock size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      Phiên tư vấn trực tuyến đã hoàn tất & đóng kênh trao đổi trực tiếp
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: 1 }}>
                      Nhằm đảm bảo quyền riêng tư ngoài giờ khám, chức năng gửi tin nhắn và gọi thoại/video đã được khóa. Toàn bộ lịch sử trao đổi và Đơn thuốc vẫn được lưu trữ vĩnh viễn để bạn tra cứu bất kỳ lúc nào.
                    </div>
                  </div>
                </div>

                {isPatientUser && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/booking')}
                    style={{
                      background: '#0068ff',
                      borderColor: '#0068ff',
                      fontWeight: 600,
                      padding: '8px 16px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Calendar size={14} /> Đặt lịch khám mới
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: 2 }}>
                  {quickChatTemplates.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                        background: 'var(--color-neutral-bg)',
                      }}
                      onClick={() => handleSendMessage(tpl)}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <input
                    className="form-input"
                    style={{ flex: 1, borderRadius: 'var(--radius-full)', paddingLeft: 16 }}
                    placeholder={`Nhập tin nhắn tới ${otherPartyName}...`}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    style={{ borderRadius: 'var(--radius-full)', background: '#0068ff', borderColor: '#0068ff', padding: '8px 18px' }}
                  >
                    <Send size={15} /> Gửi
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= COLUMN 3: COLLAPSIBLE CLINICAL RECORD SIDEBAR ================= */}
        {showRightDrawer && activeAppt && (
          <div style={{
            borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            minHeight: 0,
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={15} color="#0068ff" /> Hồ sơ bệnh án và đơn thuốc
              </strong>
              <span className="font-mono badge badge-neutral" style={{ fontSize: '11px' }}>{activeAppt.patient_code}</span>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Patient Info */}
              <div style={{ padding: '12px', background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>BN. {activeAppt.patient_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {activeAppt.patient_gender || 'Nam'} • {activeAppt.patient_age || 45} tuổi
                  {activeAppt.patient_blood_type ? ` • Nhóm máu ${activeAppt.patient_blood_type}` : ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {activeAppt.patient_address || 'TP. Hồ Chí Minh'}
                </div>
              </div>

              {activeAppt.patient_history && (
                <div style={{ padding: '10px 12px', background: 'var(--color-emergency-bg)', border: '1px solid var(--color-emergency-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-emergency)', fontSize: '12px' }}>
                    <AlertTriangle size={13} /> Tiền sử & Dị ứng (Database)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-emergency-text)', marginTop: 4 }}>
                    {activeAppt.patient_history}
                  </div>
                </div>
              )}

              {/* Doctor's Encounter Note Form */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                    {t('telehealth.encounter_note')}
                  </strong>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>{activeAppt.status}</span>
                </div>

                {saveMessage && (
                  <div style={{ padding: '8px 10px', background: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={13} /> {saveMessage}
                  </div>
                )}

                {/* Big Button to open Prescription & Medical Record Popup */}
                {!isPatientUser ? (
                  <button
                    type="button"
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: isActiveLocked
                        ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                        : 'linear-gradient(135deg, #0068ff 0%, #0052cc 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: isActiveLocked
                        ? '0 4px 12px rgba(2, 132, 199, 0.28)'
                        : '0 4px 12px rgba(0, 104, 255, 0.28)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isActiveLocked ? <Eye size={15} /> : <Edit3 size={15} />}
                    {isActiveLocked ? 'Xem chi tiết Đơn thuốc & Bệnh án' : 'Kê đơn thuốc & Bệnh án (Popup)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#eff6ff',
                      color: '#0068ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Eye size={14} /> Mở xem toàn bộ Đơn thuốc & Bệnh án
                  </button>
                )}

                {/* Chẩn đoán */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>{t('telehealth.icd10_label')}</label>
                    <span
                      style={{ fontSize: '11px', color: '#0068ff', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => setIsPrescriptionModalOpen(true)}
                    >
                      {isActiveLocked ? 'Xem chi tiết →' : 'Mở popup →'}
                    </span>
                  </div>
                  {isPatientUser || isActiveLocked ? (
                    <div style={{
                      padding: '8px 12px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>{diagnosis || 'Chưa có chẩn đoán từ Bác sĩ'}</span>
                      {isActiveLocked && (
                        <span style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 'normal' }}>
                          <Lock size={11} /> Đã khóa
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        className="form-input"
                        style={{ fontSize: '12px', width: '100%' }}
                        placeholder={t('telehealth.icd10_placeholder')}
                        value={diagnosis}
                        onChange={e => {
                          setDiagnosis(e.target.value)
                          setShowIcdDropdown(true)
                        }}
                        onFocus={() => setShowIcdDropdown(true)}
                      />
                      {showIcdDropdown && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                          maxHeight: '220px',
                          overflowY: 'auto',
                          marginTop: '4px'
                        }}>
                          {filteredIcdList.slice(0, 12).map(item => (
                            <div
                              key={item.code}
                              onClick={() => {
                                setDiagnosis(`${item.code} — ${item.name}`)
                                setShowIcdDropdown(false)
                              }}
                              style={{
                                padding: '8px 10px',
                                fontSize: '12px',
                                borderBottom: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-neutral-bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', padding: '1px 6px', borderRadius: 4, fontSize: '11px', fontFamily: 'monospace' }}>
                                {item.code}
                              </span>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}
                              </span>
                            </div>
                          ))}
                          <div
                            onClick={() => setShowIcdDropdown(false)}
                            style={{ padding: '6px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'var(--color-neutral-bg)' }}
                          >
                            Đóng danh sách ✕
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Triệu chứng */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>{t('telehealth.symptoms_label')}</label>
                  {isPatientUser || isActiveLocked ? (
                    <div style={{ padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {symptoms || 'Không ghi nhận'}
                    </div>
                  ) : (
                    <textarea
                      className="form-input"
                      style={{ fontSize: '12px' }}
                      rows={2}
                      placeholder={t('telehealth.symptoms_placeholder')}
                      value={symptoms}
                      onChange={e => setSymptoms(e.target.value)}
                    />
                  )}
                </div>

                {/* Đơn thuốc điều trị */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>Đơn thuốc điều trị</label>
                    <button
                      type="button"
                      onClick={() => setIsPrescriptionModalOpen(true)}
                      style={{ background: 'none', border: 'none', color: '#0068ff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      {isActiveLocked ? <Eye size={12} /> : <Pill size={12} />} {isActiveLocked ? 'Xem chi tiết →' : 'Kê chi tiết →'}
                    </button>
                  </div>
                  {prescriptionRows.some(r => r.drugName.trim()) ? (
                    <div style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {prescriptionRows.filter(r => r.drugName.trim()).map((r, i) => (
                        <div key={r.id || i} style={{ fontSize: '11.5px', borderBottom: '1px dashed var(--color-border)', paddingBottom: '4px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{i + 1}. {r.drugName}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                            Liều: Sáng {r.morning || 0} - Trưa {r.noon || 0} - Chiều {r.afternoon || 0} - Tối {r.evening || 0} ({r.days} ngày)
                          </div>
                          {r.note && <div style={{ color: '#0068ff', fontSize: '10.5px', fontStyle: 'italic' }}>Cách dùng: {r.note}</div>}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsPrescriptionModalOpen(true)}
                        style={{
                          border: isActiveLocked ? '1px solid #cbd5e1' : '1px dashed #0068ff',
                          background: isActiveLocked ? '#f8fafc' : '#eff6ff',
                          color: isActiveLocked ? '#334155' : '#0068ff',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          marginTop: 4,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        {isActiveLocked ? <Eye size={12} /> : <Edit3 size={12} />}
                        {isActiveLocked ? 'Xem chi tiết trong Popup (Đã khóa)' : '+ Sửa đơn thuốc trong Popup'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                      {isActiveLocked ? 'Chưa ghi nhận đơn thuốc trong ca này' : (isPatientUser ? 'Chưa có đơn thuốc' : 'Chưa kê đơn thuốc. Bấm "Kê chi tiết" hoặc mở Popup để kê đơn.')}
                    </div>
                  )}
                </div>

                {/* Clinical Risk Warning Banner in Sidebar */}
                {activeClinicalWarnings.length > 0 && !isPatientUser && (
                  <div style={{
                    padding: '9px 12px',
                    background: '#fff1f2',
                    border: '1.5px solid #ef4444',
                    borderRadius: 'var(--radius-sm)',
                    color: '#991b1b',
                    fontSize: '11px',
                    lineHeight: 1.45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#b91c1c' }}>
                      <ShieldAlert size={15} color="#dc2626" />
                      <span>Cảnh báo: Có {activeClinicalWarnings.length} thuốc xung đột tiền sử bệnh!</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#7f1d1d' }}>
                      {activeClinicalWarnings.map((w, idx) => (
                        <div key={idx} style={{ marginTop: 2 }}>
                          • <strong>{w.drugName}</strong>: {w.title} ({w.matchedCondition})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* High Dose Alert Banner in Sidebar */}
                {activeDoseWarnings.length > 0 && !isPatientUser && (
                  <div style={{
                    padding: '8px 10px',
                    background: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    borderRadius: 'var(--radius-sm)',
                    color: '#991b1b',
                    fontSize: '11px',
                    lineHeight: 1.4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                      <AlertTriangle size={14} color="#dc2626" />
                      <span>Cảnh báo: Có {activeDoseWarnings.length} thuốc liều rất cao!</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#b91c1c' }}>
                      Phát hiện số viên uống 1 lần rất lớn. Vui lòng kiểm tra đề phòng nhấn nhầm phím số.
                    </div>
                  </div>
                )}

                {/* Hẹn ngày tái khám */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} color="#0068ff" /> Hẹn ngày tái khám
                  </label>
                  {isPatientUser || isActiveLocked ? (
                    <div style={{ padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, color: '#0068ff' }}>
                      {followUpDate ? `Tái khám ngày: ${followUpDate}` : 'Theo chỉ định lâm sàng của Bác sĩ'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ fontSize: '12px' }}
                        value={followUpDate}
                        onChange={e => setFollowUpDate(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => setFollowUpDays(7)} className="btn btn-outline btn-xs" style={{ fontSize: '10px', padding: '2px 6px' }}>+7 ngày</button>
                        <button type="button" onClick={() => setFollowUpDays(14)} className="btn btn-outline btn-xs" style={{ fontSize: '10px', padding: '2px 6px' }}>+14 ngày</button>
                        <button type="button" onClick={() => setFollowUpDays(30)} className="btn btn-outline btn-xs" style={{ fontSize: '10px', padding: '2px 6px' }}>+30 ngày</button>
                        {followUpDate && (
                          <button type="button" onClick={() => setFollowUpDate('')} className="btn btn-outline btn-xs" style={{ fontSize: '10px', padding: '2px 6px', color: '#ef4444' }}>Xóa</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isPatientUser ? (
                  isActiveLocked ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      <div style={{
                        padding: '8px 10px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        color: '#475569',
                        fontSize: '11.5px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontWeight: 600,
                        border: '1px solid #cbd5e1'
                      }}>
                        <Lock size={13} color="#64748b" /> Ca khám đã kết thúc — Hồ sơ & Đơn thuốc đã khóa
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={handlePrintCurrentPrescription}
                      >
                        <Printer size={14} /> In đơn thuốc ca khám này
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginTop: 6 }}
                      onClick={() => handleSignAndSaveRecord(false)}
                      disabled={savingRecord}
                    >
                      <Shield size={14} /> {savingRecord ? 'Đang lưu...' : t('actions.sign_save')}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={handlePrintCurrentPrescription}
                  >
                    <Printer size={14} /> In đơn thuốc ca khám này
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL KÊ ĐƠN THUỐC & LẬP BỆNH ÁN ĐIỆN TỬ ================= */}
      {isPrescriptionModalOpen && activeAppt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(5px)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1150px',
            maxHeight: '94vh',
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--color-border)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: isActiveLocked ? '#0284c7' : '#0068ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  {isActiveLocked ? <Eye size={22} /> : <Pill size={22} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                      {isActiveLocked ? 'Hồ sơ Bệnh án & Đơn thuốc điện tử' : 'Hồ sơ Bệnh án & Kê đơn thuốc điện tử'}
                    </h2>
                    {isActiveLocked && (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Lock size={12} color="#64748b" /> Chế độ chỉ xem (Đã khóa)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>Bệnh nhân: <strong style={{ color: '#0068ff' }}>{activeAppt.patient_name}</strong> ({activeAppt.patient_gender || 'Nam'}, {activeAppt.patient_age || 45} tuổi)</span>
                    <span>• Mã BN: <code>{activeAppt.patient_code || '#BN-10041'}</code></span>
                    <span>• Mã ca hẹn: <code>#BA-{activeAppt.id}</code></span>
                    <span>• Bác sĩ phụ trách: <strong>BS. {activeAppt.doctor_name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Sarah Jenkins')}</strong></span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--color-text-secondary)' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Lock Notice Banner */}
            {isActiveLocked && (
              <div style={{
                margin: '14px 24px 0',
                padding: '10px 16px',
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: '#0369a1',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={16} color="#0284c7" />
                  <span>Ca khám đã hoàn tất & hồ sơ bệnh án đã được ký số lưu trữ. Mọi thông tin thuốc và diễn biến lâm sàng được khóa bảo mật (chỉ đọc).</span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintCurrentPrescription}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    flexShrink: 0
                  }}
                >
                  <Printer size={13} /> In đơn thuốc
                </button>
              </div>
            )}

            {/* Patient Medical History & Allergy Alert Strip */}
            {patientCombinedHistory && (
              <div style={{
                margin: '14px 24px 0',
                padding: '10px 16px',
                background: '#fef2f2',
                border: '1.5px solid #fca5a5',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '12.5px',
                color: '#991b1b',
              }}>
                <ShieldAlert size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, lineHeight: 1.45 }}>
                  <strong>Tiền sử bệnh lý & Dị ứng đã lưu trong hồ sơ:</strong> {patientCombinedHistory}
                </div>
                <span style={{
                  fontSize: '11px',
                  background: '#fee2e2',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  color: '#b91c1c',
                  border: '1px solid #f87171',
                  flexShrink: 0,
                }}>
                  Cảnh báo tương tác tự động AI
                </span>
              </div>
            )}

            {/* Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Lâm sàng & Chẩn đoán */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Triệu chứng & Diễn biến lâm sàng
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      background: isActiveLocked ? '#f8fafc' : undefined,
                      cursor: isActiveLocked ? 'default' : undefined,
                      color: isActiveLocked ? '#334155' : undefined,
                    }}
                    placeholder="Ghi nhận triệu chứng lâm sàng, diễn biến trong cuộc gọi..."
                    value={symptoms}
                    onChange={e => !isActiveLocked && setSymptoms(e.target.value)}
                    readOnly={isActiveLocked}
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Chẩn đoán y khoa (Mã ICD-10)
                  </label>
                  <input
                    className="form-input"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      background: isActiveLocked ? '#f8fafc' : undefined,
                      cursor: isActiveLocked ? 'default' : undefined,
                      color: isActiveLocked ? '#334155' : undefined,
                      fontWeight: isActiveLocked ? 600 : undefined,
                    }}
                    placeholder="Gõ mã ICD-10 hoặc tên bệnh (VD: I10, I20, trào ngược, tiểu đường...)"
                    value={diagnosis}
                    onChange={e => {
                      if (isActiveLocked) return
                      setDiagnosis(e.target.value)
                      setShowIcdDropdown(true)
                    }}
                    onFocus={() => !isActiveLocked && setShowIcdDropdown(true)}
                    readOnly={isActiveLocked}
                  />

                  {/* ICD-10 Dropdown */}
                  {showIcdDropdown && !isActiveLocked && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 200,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      marginTop: 4,
                    }}>
                      <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid var(--color-border)', fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>DANH MỤC ICD-10 GỢI Ý ({filteredIcdList.length} kết quả)</span>
                        <span style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => setShowIcdDropdown(false)}>Đóng ✕</span>
                      </div>
                      {filteredIcdList.map(item => (
                        <div
                          key={item.code}
                          onClick={() => {
                            setDiagnosis(`${item.code} — ${item.name}`)
                            setShowIcdDropdown(false)
                          }}
                          style={{
                            padding: '10px 14px',
                            fontSize: '13px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 700, padding: '2px 8px', borderRadius: 4, fontSize: '12px', fontFamily: 'monospace' }}>
                            {item.code}
                          </span>
                          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick ICD chips */}
                  {!isActiveLocked && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 8 }}>
                      {[
                        { code: 'I10', label: 'Tăng huyết áp' },
                        { code: 'I20.0', label: 'Đau thắt ngực' },
                        { code: 'E11', label: 'Tiểu đường type 2' },
                        { code: 'K21', label: 'Trào ngược dạ dày' },
                        { code: 'J20.9', label: 'Viêm phế quản' },
                        { code: 'H81.0', label: 'Rối loạn tiền đình' },
                      ].map(chip => (
                        <button
                          type="button"
                          key={chip.code}
                          onClick={() => {
                            const match = COMMON_ICD10_LIST.find(i => i.code.startsWith(chip.code))
                            if (match) setDiagnosis(`${match.code} — ${match.name}`)
                          }}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '16px',
                            padding: '3px 10px',
                            fontSize: '11px',
                            color: '#334155',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          +{chip.code} {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Cảnh báo Y khoa Xung đột Tiền sử bệnh */}
              {activeClinicalWarnings.length > 0 && (
                <div style={{
                  padding: '14px 18px',
                  background: '#fff1f2',
                  border: '2px solid #ef4444',
                  borderRadius: '10px',
                  color: '#991b1b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '14px' }}>
                    <ShieldAlert size={20} color="#dc2626" />
                    <span>CẢNH BÁO NGUY HIỂM: PHÁT HIỆN THUỐC XUNG ĐỘT VỚI TIỀN SỬ BỆNH ({activeClinicalWarnings.length} CẢNH BÁO)</span>
                  </div>
                  <div style={{ fontSize: '12.5px', lineHeight: 1.6, paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeClinicalWarnings.map((w, idx) => (
                      <div key={idx} style={{
                        background: w.level === 'DANGER' ? '#fee2e2' : '#fef3c7',
                        border: `1px solid ${w.level === 'DANGER' ? '#f87171' : '#fcd34d'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                      }}>
                        <div style={{ fontWeight: 700, color: w.level === 'DANGER' ? '#991b1b' : '#92400e', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            background: w.level === 'DANGER' ? '#dc2626' : '#d97706',
                            color: 'white',
                            fontSize: '10px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            letterSpacing: '0.5px'
                          }}>
                            {w.level === 'DANGER' ? 'CHỐNG CHỈ ĐỊNH / NGUY HIỂM' : 'CẦN THẬN TRỌNG'}
                          </span>
                          <span style={{ fontSize: '13px' }}>{w.drugName}: {w.title}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>({w.matchedCondition})</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1f2937', marginTop: 4 }}>
                          • <strong>Cơ chế nguy cơ:</strong> {w.message}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: 3, fontWeight: 600 }}>
                          💡 <strong>Khuyến nghị Bác sĩ:</strong> {w.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Bảng Kê đơn thuốc chia cột chuyên nghiệp */}
              {activeDoseWarnings.length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fff1f2',
                  border: '2px solid #ef4444',
                  borderRadius: '10px',
                  color: '#991b1b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13.5px' }}>
                    <AlertTriangle size={19} color="#dc2626" />
                    <span>CẢNH BÁO AN TOÀN LIỀU DÙNG: PHÁT HIỆN SỐ THUỐC UỐNG 1 LẦN RẤT LỚN ({activeDoseWarnings.length} CẢNH BÁO)</span>
                  </div>
                  <div style={{ fontSize: '12.5px', lineHeight: 1.6, paddingLeft: '27px' }}>
                    {activeDoseWarnings.map((w, idx) => (
                      <div key={idx} style={{ marginTop: 2 }}>
                        • <strong>{w.message}</strong>
                      </div>
                    ))}
                    <div style={{ marginTop: 6, fontWeight: 600, color: '#b91c1c' }}>
                      ⚠️ Đề phòng Bác sĩ nhấn nhầm thêm số 0 hoặc nhầm giữa số viên 1 lần với tổng số cả đợt. Vui lòng kiểm tra lại trước khi ký duyệt!
                    </div>
                  </div>
                </div>
              )}

              <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--color-neutral-bg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--color-text-primary)' }}>ĐƠN THUỐC ĐIỀU TRỊ NGOẠI TRÚ</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>(Theo thông tư 52/2017/TT-BYT & 04/2022/TT-BYT)</span>
                  </div>
                  {!isActiveLocked && (
                    <button
                      type="button"
                      onClick={handleAddDrugRow}
                      style={{
                        background: '#0068ff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Plus size={14} /> Thêm thuốc
                    </button>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--color-border)', color: '#475569', fontSize: '12px' }}>
                        <th style={{ padding: '10px 8px', width: '38px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '10px 10px', minWidth: '240px' }}>Tên thuốc & Hàm lượng</th>
                        <th style={{ padding: '10px 6px', width: '65px', textAlign: 'center' }}>Sáng</th>
                        <th style={{ padding: '10px 6px', width: '65px', textAlign: 'center' }}>Trưa</th>
                        <th style={{ padding: '10px 6px', width: '65px', textAlign: 'center' }}>Chiều</th>
                        <th style={{ padding: '10px 6px', width: '65px', textAlign: 'center' }}>Tối</th>
                        <th style={{ padding: '10px 8px', width: '80px', textAlign: 'center' }}>Số ngày</th>
                        <th style={{ padding: '10px 10px', minWidth: '200px' }}>Ghi chú cách dùng (trước/sau ăn...)</th>
                        <th style={{ padding: '10px 8px', width: '90px', textAlign: 'center' }}>Tổng số</th>
                        {!isActiveLocked && (
                          <th style={{ padding: '10px 6px', width: '45px', textAlign: 'center' }}>Xóa</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptionRows.filter(r => r.drugName.trim()).length === 0 && (
                        <tr>
                          <td colSpan={isActiveLocked ? 9 : 10} style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <Pill size={24} color="#94a3b8" />
                              <span>{isActiveLocked ? 'Không có đơn thuốc điều trị nào được kê trong ca khám này.' : 'Chưa có thuốc trong đơn. Bấm "+ Thêm thuốc" để kê đơn.'}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {prescriptionRows.map((row, index) => {
                        const m = parseFloat(row.morning) || 0
                        const n = parseFloat(row.noon) || 0
                        const a = parseFloat(row.afternoon) || 0
                        const eVal = parseFloat(row.evening) || 0
                        const daily = m + n + a + eVal
                        const total = daily > 0 ? Math.round(daily * (row.days || 1)) : (row.days || 1)
                        const isDrugOpen = activeDrugDropdownRowId === row.id

                        const filteredDrugs = row.drugName.trim()
                          ? COMMON_DRUGS_LIST.filter(d => d.name.toLowerCase().includes(row.drugName.toLowerCase()))
                          : COMMON_DRUGS_LIST.slice(0, 10)

                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' }}>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                              {index + 1}
                            </td>

                            {/* Tên thuốc có autocomplete */}
                            <td style={{ padding: '8px 10px', position: 'relative' }}>
                              <input
                                className="form-input"
                                style={{
                                  width: '100%',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  background: isActiveLocked ? '#f8fafc' : undefined,
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                placeholder="Gõ tên thuốc (VD: Amlodipin, Metformin, Panadol...)"
                                value={row.drugName}
                                onChange={e => {
                                  if (isActiveLocked) return
                                  handleUpdateDrugRow(row.id, 'drugName', e.target.value)
                                  setActiveDrugDropdownRowId(row.id)
                                }}
                                onFocus={() => !isActiveLocked && setActiveDrugDropdownRowId(row.id)}
                                readOnly={isActiveLocked}
                              />
                              {isDrugOpen && !isActiveLocked && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 10,
                                  right: 10,
                                  zIndex: 250,
                                  background: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '8px',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                  maxHeight: '220px',
                                  overflowY: 'auto',
                                  marginTop: 2,
                                }}>
                                  <div style={{ padding: '6px 10px', background: '#f8fafc', fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>DƯỢC ĐIỂN GỢI Ý ({filteredDrugs.length})</span>
                                    <span style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => setActiveDrugDropdownRowId(null)}>Đóng ✕</span>
                                  </div>
                                  {filteredDrugs.map(d => (
                                    <div
                                      key={d.name}
                                      onClick={() => handleSelectDrugFor(row.id, d)}
                                      style={{
                                        padding: '8px 10px',
                                        fontSize: '12px',
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{d.name}</span>
                                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                        Sáng: {d.morning} | Trưa: {d.noon} | Chiều: {d.afternoon} | Tối: {d.evening} • {d.note} ({d.days} ngày)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Clinical Warning indicator chip on row */}
                              {activeClinicalWarnings.filter(w => w.drugName.toLowerCase() === row.drugName.trim().toLowerCase()).map((w, wIdx) => (
                                <div
                                  key={wIdx}
                                  style={{
                                    marginTop: 4,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: w.level === 'DANGER' ? '#fef2f2' : '#fffbeb',
                                    color: w.level === 'DANGER' ? '#b91c1c' : '#b45309',
                                    border: `1px solid ${w.level === 'DANGER' ? '#fca5a5' : '#fcd34d'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                  title={w.message}
                                >
                                  <AlertTriangle size={12} color={w.level === 'DANGER' ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {w.title} ({w.matchedCondition})
                                  </span>
                                </div>
                              ))}
                            </td>

                            {/* Sáng */}
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  fontSize: '12.5px',
                                  padding: '6px 2px',
                                  border: !isActiveLocked && m >= 4 ? '2px solid #ef4444' : undefined,
                                  background: isActiveLocked ? '#f8fafc' : (m >= 4 ? '#fef2f2' : undefined),
                                  color: !isActiveLocked && m >= 4 ? '#b91c1c' : undefined,
                                  fontWeight: m >= 4 ? 700 : 'normal',
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                placeholder="0"
                                value={row.morning}
                                onChange={e => !isActiveLocked && handleUpdateDrugRow(row.id, 'morning', e.target.value)}
                                title={m >= 4 ? `⚠️ Cảnh báo: ${m} viên buổi Sáng là liều rất cao!` : ''}
                                readOnly={isActiveLocked}
                              />
                            </td>

                            {/* Trưa */}
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  fontSize: '12.5px',
                                  padding: '6px 2px',
                                  border: !isActiveLocked && n >= 4 ? '2px solid #ef4444' : undefined,
                                  background: isActiveLocked ? '#f8fafc' : (n >= 4 ? '#fef2f2' : undefined),
                                  color: !isActiveLocked && n >= 4 ? '#b91c1c' : undefined,
                                  fontWeight: n >= 4 ? 700 : 'normal',
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                placeholder="0"
                                value={row.noon}
                                onChange={e => !isActiveLocked && handleUpdateDrugRow(row.id, 'noon', e.target.value)}
                                title={n >= 4 ? `⚠️ Cảnh báo: ${n} viên buổi Trưa là liều rất cao!` : ''}
                                readOnly={isActiveLocked}
                              />
                            </td>

                            {/* Chiều */}
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  fontSize: '12.5px',
                                  padding: '6px 2px',
                                  border: !isActiveLocked && a >= 4 ? '2px solid #ef4444' : undefined,
                                  background: isActiveLocked ? '#f8fafc' : (a >= 4 ? '#fef2f2' : undefined),
                                  color: !isActiveLocked && a >= 4 ? '#b91c1c' : undefined,
                                  fontWeight: a >= 4 ? 700 : 'normal',
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                placeholder="0"
                                value={row.afternoon}
                                onChange={e => !isActiveLocked && handleUpdateDrugRow(row.id, 'afternoon', e.target.value)}
                                title={a >= 4 ? `⚠️ Cảnh báo: ${a} viên buổi Chiều là liều rất cao!` : ''}
                                readOnly={isActiveLocked}
                              />
                            </td>

                            {/* Tối */}
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  fontSize: '12.5px',
                                  padding: '6px 2px',
                                  border: !isActiveLocked && eVal >= 4 ? '2px solid #ef4444' : undefined,
                                  background: isActiveLocked ? '#f8fafc' : (eVal >= 4 ? '#fef2f2' : undefined),
                                  color: !isActiveLocked && eVal >= 4 ? '#b91c1c' : undefined,
                                  fontWeight: eVal >= 4 ? 700 : 'normal',
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                placeholder="0"
                                value={row.evening}
                                onChange={e => !isActiveLocked && handleUpdateDrugRow(row.id, 'evening', e.target.value)}
                                title={eVal >= 4 ? `⚠️ Cảnh báo: ${eVal} viên buổi Tối là liều rất cao!` : ''}
                                readOnly={isActiveLocked}
                              />
                            </td>

                            {/* Số ngày */}
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <input
                                type="number"
                                className="form-input"
                                min={1}
                                max={90}
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  fontSize: '12.5px',
                                  padding: '6px 4px',
                                  background: isActiveLocked ? '#f8fafc' : undefined,
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                value={row.days}
                                onChange={e => !isActiveLocked && handleUpdateDrugRow(row.id, 'days', parseInt(e.target.value) || 1)}
                                readOnly={isActiveLocked}
                              />
                            </td>

                            {/* Ghi chú cách dùng */}
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                className="form-input"
                                style={{
                                  width: '100%',
                                  fontSize: '12px',
                                  background: isActiveLocked ? '#f8fafc' : undefined,
                                  cursor: isActiveLocked ? 'default' : undefined,
                                }}
                                placeholder="Uống sau ăn no, trước ăn 30p..."
                                value={row.note}
                                onChange={e => !isActiveLocked && handleUpdateDrugRow(row.id, 'note', e.target.value)}
                                readOnly={isActiveLocked}
                              />
                            </td>

                            {/* Tổng số lượng */}
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <span style={{ background: '#f1f5f9', color: '#1e293b', fontWeight: 700, padding: '3px 8px', borderRadius: 4, fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {total} viên
                              </span>
                            </td>

                            {/* Xóa dòng */}
                            {!isActiveLocked && (
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDrugRow(row.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                  title="Xóa dòng thuốc này"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: '10px 16px', background: '#fafafa', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Tổng số thuốc trong đơn: <strong>{prescriptionRows.filter(r => r.drugName.trim()).length}</strong> loại
                  </span>
                  {!isActiveLocked && (
                    <button
                      type="button"
                      onClick={handleAddDrugRow}
                      style={{ background: 'transparent', border: '1px dashed #0068ff', color: '#0068ff', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Thêm dòng thuốc khác
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Hẹn ngày tái khám & Lời dặn Bác sĩ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Calendar size={14} color="#0068ff" /> Hẹn ngày tái khám
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      background: isActiveLocked ? '#f8fafc' : undefined,
                      cursor: isActiveLocked ? 'default' : undefined,
                    }}
                    value={followUpDate}
                    onChange={e => !isActiveLocked && setFollowUpDate(e.target.value)}
                    readOnly={isActiveLocked}
                  />
                  {!isActiveLocked && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button type="button" onClick={() => setFollowUpDays(7)} className="btn btn-outline btn-xs">+7 ngày</button>
                      <button type="button" onClick={() => setFollowUpDays(14)} className="btn btn-outline btn-xs">+14 ngày</button>
                      <button type="button" onClick={() => setFollowUpDays(30)} className="btn btn-outline btn-xs">+30 ngày</button>
                      {followUpDate && (
                        <button type="button" onClick={() => setFollowUpDate('')} className="btn btn-outline btn-xs" style={{ color: '#ef4444' }}>Xóa</button>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
                    * Ngày tái khám sẽ in trực tiếp trên đơn thuốc chuẩn Bộ Y Tế.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Lời dặn chung của Bác sĩ điều trị
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      background: isActiveLocked ? '#f8fafc' : undefined,
                      cursor: isActiveLocked ? 'default' : undefined,
                      color: isActiveLocked ? '#334155' : undefined,
                    }}
                    placeholder="Dặn dò chế độ dinh dưỡng, nghỉ ngơi, uống thuốc đúng giờ, kiêng chất kích thích..."
                    value={clinicalNotes}
                    onChange={e => !isActiveLocked && setClinicalNotes(e.target.value)}
                    readOnly={isActiveLocked}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--color-border)',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                {isActiveLocked ? (
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <Lock size={14} color="#64748b" /> Ca khám đã kết thúc — Hồ sơ & Đơn thuốc được khóa cố định
                  </span>
                ) : (
                  saveMessage && (
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={14} /> {saveMessage}
                    </span>
                  )
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  onClick={() => setIsPrescriptionModalOpen(false)}
                >
                  Đóng
                </button>
                {isActiveLocked ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    onClick={handlePrintCurrentPrescription}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, background: '#0068ff' }}
                  >
                    <Printer size={16} /> In đơn thuốc chuẩn Bộ Y Tế
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-md"
                    onClick={() => handleSignAndSaveRecord(false)}
                    disabled={savingRecord}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  >
                    <Shield size={16} /> {savingRecord ? 'Đang ký số & Lưu...' : 'Ký số & Lưu vào Hồ sơ bệnh án'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN AN TOÀN ĐƠN THUỐC (TIỀN SỬ BỆNH & LIỀU LƯỢNG) ================= */}
      {showDoseConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '640px',
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '2px solid #ef4444',
            boxShadow: '0 25px 50px rgba(239, 68, 68, 0.3)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'fadeIn 0.2s ease',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldAlert size={28} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#991b1b' }}>
                  CẢNH BÁO AN TOÀN ĐƠN THUỐC ĐIỀU TRỊ
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>
                  Phát hiện nguy cơ tương tác với tiền sử bệnh nhân hoặc liều dùng vượt ngưỡng
                </div>
              </div>
            </div>

            {/* Clinical Risk Warnings Section */}
            {activeClinicalWarnings.length > 0 && (
              <div style={{ background: '#fff1f2', border: '1.5px solid #fecaca', borderRadius: '8px', padding: '14px', fontSize: '12.5px', color: '#7f1d1d', lineHeight: 1.55 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertOctagon size={16} color="#dc2626" />
                  <span>Cảnh báo xung đột tiền sử bệnh ({activeClinicalWarnings.length} thuốc):</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeClinicalWarnings.map((w, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ fontWeight: 700, color: w.level === 'DANGER' ? '#b91c1c' : '#b45309', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          background: w.level === 'DANGER' ? '#dc2626' : '#d97706',
                          color: '#fff',
                          fontSize: '9.5px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 800,
                        }}>
                          {w.level === 'DANGER' ? 'CHỐNG CHỈ ĐỊNH' : 'THẬN TRỌNG'}
                        </span>
                        <span>{w.drugName}: {w.title}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#334155', marginTop: 3 }}>
                        • <strong>Cơ chế:</strong> {w.message}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: 2, fontWeight: 600 }}>
                        💡 <strong>Khuyến nghị:</strong> {w.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High Dose Warnings Section */}
            {activeDoseWarnings.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', fontSize: '12.5px', color: '#7f1d1d', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} color="#dc2626" />
                  <span>Liều uống 1 lần rất lớn ({activeDoseWarnings.length} thuốc):</span>
                </div>
                {activeDoseWarnings.map((w, idx) => (
                  <div key={idx} style={{ paddingLeft: '8px', marginBottom: 4 }}>
                    • <strong>{w.message}</strong>
                  </div>
                ))}
                <div style={{ marginTop: 6, fontStyle: 'italic', color: '#991b1b', borderTop: '1px dashed #fca5a5', paddingTop: 6, fontSize: '11.5px' }}>
                  ⚠️ Đề phòng trường hợp gõ thêm số 0 hoặc nhầm lẫn giữa số viên 1 lần với tổng số cả đợt.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: '#0068ff',
                  borderColor: '#0068ff',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '9px 18px',
                }}
                onClick={() => setShowDoseConfirmModal(false)}
              >
                ✏️ Kiểm tra & Sửa lại đơn thuốc
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  fontSize: '12px',
                  padding: '9px 14px',
                }}
                onClick={() => {
                  setShowDoseConfirmModal(false)
                  handleSignAndSaveRecord(true)
                }}
              >
                Tôi đã cân nhắc lâm sàng & tiếp tục lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ZALO VIDEO CALL OVERLAY MODAL (Opens ONLY when Calling!) ================= */}
      {isCallModalOpen && activeAppt && !isCallMinimized && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: showInCallChat ? 1120 : 820,
            height: '82vh',
            background: '#0f172a',
            borderRadius: '18px',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: showInCallChat ? '1fr 340px' : '1fr',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            {/* Video Stage */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
              {/* Top Call Bar */}
              <div style={{
                position: 'absolute', top: 16, left: 18, right: 18,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {bothConnected ? (
                    <span className="badge badge-success" style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <span className="badge-dot" /> ĐÃ KẾT NỐI 2 CHIỀU • {formatTime(callTime)}
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <span className="badge-dot" /> ĐANG ĐỔ CHUÔNG CHỜ {otherPartyName.toUpperCase()} BẮT MÁY...
                    </span>
                  )}

                  {bothConnected && (
                    <span
                      className={`badge ${isP2PConnected ? 'badge-success' : 'badge-warning'}`}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      title={`ICE: ${iceState} | Peer: ${peerConnectionState}`}
                    >
                      {isP2PConnected
                        ? '⚡ P2P Trực Tiếp Hoạt Động'
                        : iceState === 'failed' || peerConnectionState === 'failed'
                          ? '⚠️ Lỗi kênh P2P'
                          : '🔄 Đang trao đổi gói P2P...'}
                    </span>
                  )}

                  {(iceState === 'failed' || peerConnectionState === 'failed') && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={handleRetryWebRTC}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
                      title="Bấm để tái tạo kênh kết nối WebRTC giữa 2 máy"
                    >
                      <RefreshCw size={12} style={{ marginRight: 4 }} /> Kết nối lại P2P
                    </button>
                  )}

                  {bothConnected && !otherPartyMicOn && (
                    <span className="badge badge-emergency" style={{ fontSize: '11px', padding: '4px 10px' }}>
                      <MicOff size={12} style={{ marginRight: 4 }} /> {otherPartyName} đang tắt/hỏng Mic — Hãy dùng khung Chat bên phải
                    </span>
                  )}
                  {cameraError && (
                    <span className="badge badge-emergency" style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5' }}>
                      ⚠️ {cameraError}
                    </span>
                  )}
                </div>

                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
                  onClick={() => setIsCallMinimized(true)}
                  title="Thu nhỏ cửa sổ gọi về màn hình Chat"
                >
                  <Minimize2 size={14} /> Thu nhỏ về Chat
                </button>
              </div>

              {/* Remote Participant Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: bothConnected && isRemoteVideoActive ? 'block' : 'none',
                }}
              />

              {/* Waiting or Audio-only Fallback */}
              {(!bothConnected || !isRemoteVideoActive) && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {bothConnected ? (
                    <div style={{ textAlign: 'center', color: 'white', padding: 24 }}>
                      <div style={{
                        width: 110, height: 110, borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '3px solid #22c55e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                      }}>
                        <UserCheck size={52} color="#22c55e" />
                      </div>
                      <h2 style={{ color: 'white', marginBottom: 6 }}>{otherPartyName}</h2>
                      <p style={{ fontSize: 'var(--text-sm)', color: '#86efac', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Volume2 size={16} /> Đang kết nối trực tiếp trong cuộc gọi ({formatTime(callTime)})
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'white', padding: 24 }}>
                      <div style={{
                        width: 104, height: 104, borderRadius: '50%',
                        background: '#0068ff', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', fontSize: '32px', fontWeight: 'bold',
                        boxShadow: '0 0 0 12px rgba(0, 104, 255, 0.25)',
                      }}>
                        {getInitials(isPatientUser ? activeAppt?.doctor_name : activeAppt?.patient_name)}
                      </div>
                      <h2 style={{ color: 'white', marginBottom: 6 }}>Đang gọi cho {otherPartyName}...</h2>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', maxWidth: 420, margin: '0 auto' }}>
                        Hệ thống đã gửi thông báo cuộc gọi đến <strong>{otherPartyName}</strong>. Bạn cũng có thể nhắn tin ở khung bên phải trong lúc chờ.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Local Self PiP */}
              <div style={{
                position: 'absolute', bottom: 88, right: 20,
                width: 190, height: 125,
                background: '#1e293b',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    display: localStreamRef.current && isVideoOn ? 'block' : 'none',
                  }}
                />
                {(!localStreamRef.current || !isVideoOn) && (
                  <div style={{ textAlign: 'center', color: 'white', fontSize: '12px', padding: 8 }}>
                    <div style={{ fontWeight: 'bold' }}>Bạn ({myDisplayName})</div>
                    <div style={{ fontSize: '11px', opacity: 0.75, marginTop: 4 }}>
                      {isMicOn ? '🎙️ Mic đang bật' : '🔇 Mic đang tắt'}
                    </div>
                  </div>
                )}
              </div>

              {/* Zalo Bottom Call Control Buttons */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '16px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <button
                  className={`btn ${isMicOn ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={handleToggleMic}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 18px' }}
                >
                  {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  <span>{isMicOn ? 'Tắt Mic' : 'Bật Mic'}</span>
                </button>

                <button
                  className={`btn ${isVideoOn ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={handleToggleVideo}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 18px' }}
                >
                  {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                  <span>{isVideoOn ? 'Tắt Camera' : 'Bật Camera'}</span>
                </button>

                {cameraError && (
                  <button
                    className="btn btn-warning"
                    onClick={() => startLocalMedia(true, selectedCameraId)}
                    style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 16px', fontSize: '12px' }}
                    title="Bấm để thử kết nối lại Camera / OBS sau khi đã bật 'Start Virtual Camera'"
                  >
                    <RefreshCw size={14} style={{ marginRight: 6 }} /> Thử lại Camera / OBS
                  </button>
                )}

                <button
                  className={`btn ${showInCallChat ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowInCallChat(!showInCallChat)}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 18px' }}
                >
                  <MessageSquare size={18} />
                  <span>Chat trong cuộc gọi ({(roomState?.messages || []).length})</span>
                </button>

                <button
                  className="btn btn-danger"
                  onClick={handleLeaveCall}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 24px', fontWeight: 'bold' }}
                >
                  <Phone size={18} /> Kết thúc cuộc gọi
                </button>
              </div>
            </div>

            {/* In-Call Side Chat Drawer (for broken mic while video calling) */}
            {showInCallChat && (
              <div style={{
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid var(--color-border)',
                minHeight: 0,
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>💬 Chat trong cuộc gọi</strong>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>Hỗ trợ khi tắt/hỏng Mic</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#eef3f8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(roomState?.messages || []).map((msg: any) => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div
                        key={`incall-${msg.id}`}
                        style={{
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: isMine ? '#0068ff' : 'white',
                          color: isMine ? 'white' : '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold', marginBottom: 2 }}>
                          {msg.sender_name} • {msg.created_at}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    )
                  })}
                  <div ref={inCallChatBottomRef} />
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  style={{ padding: '10px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '6px' }}
                >
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: '12px' }}
                    placeholder="Nhắn tin trong cuộc gọi..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={sendingChat || !chatInput.trim()}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
