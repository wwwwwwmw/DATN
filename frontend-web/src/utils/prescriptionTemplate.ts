/**
 * Tiện ích xử lý đơn thuốc chuẩn y tế Việt Nam
 * (Theo thông tư 52/2017/TT-BYT & 04/2022/TT-BYT)
 */

export interface ParsedMedication {
  name: string
  generic: string
  dose: string
  usage: string
  morning: string
  noon: string
  afternoon: string
  evening: string
  days: number
  note: string
  totalQuantity: string
}

export function parseMedications(rawPrescription: string): ParsedMedication[] {
  if (!rawPrescription) return []
  const lines = rawPrescription.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map((line) => {
    const cols = line.split('|').map(c => c.trim())
    const drugRaw = cols[0] || line
    const usageRaw = cols[1] || 'Theo chỉ định của Bác sĩ'
    const daysRaw = cols[2] || '14 ngày'
    const totalRaw = cols[3] || ''

    const doseMatch = drugRaw.match(/(\d+(?:\/\d+)?\s*(?:mg|mcg|g|ml|UI))/i)
    const dose = doseMatch ? doseMatch[1] : '1 viên'
    const daysMatch = daysRaw.match(/(\d+)/)
    const days = daysMatch ? Number(daysMatch[1]) : 14

    // Extract morning, noon, afternoon, evening numbers
    const mMatch = usageRaw.match(/Sáng:\s*(\d+(?:\.\d+)?)/i)
    const nMatch = usageRaw.match(/Trưa:\s*(\d+(?:\.\d+)?)/i)
    const aMatch = usageRaw.match(/Chiều:\s*(\d+(?:\.\d+)?)/i)
    const eMatch = usageRaw.match(/Tối:\s*(\d+(?:\.\d+)?)/i)

    const morning = mMatch ? mMatch[1] : '0'
    const noon = nMatch ? nMatch[1] : '0'
    const afternoon = aMatch ? aMatch[1] : '0'
    const evening = eMatch ? eMatch[1] : '0'

    // Extract instruction note (clean, without emojis)
    const noteMatch = usageRaw.match(/\(([^)]+)\)/)
    let note = noteMatch ? noteMatch[1].trim() : ''
    if (!note) {
      const stripped = usageRaw
        .replace(/Sáng:\s*\d+[^,]*[,\s]*/gi, '')
        .replace(/Trưa:\s*\d+[^,]*[,\s]*/gi, '')
        .replace(/Chiều:\s*\d+[^,]*[,\s]*/gi, '')
        .replace(/Tối:\s*\d+[^,]*[,\s]*/gi, '')
        .replace(/[()👉]/g, '')
        .trim()
      note = stripped || 'Uống theo chỉ định của Bác sĩ'
    } else {
      note = note.replace(/[👉]/g, '').trim()
    }

    let totalQuantity = ''
    if (totalRaw && totalRaw.includes('Tổng:')) {
      totalQuantity = totalRaw.replace('Tổng:', '').trim()
    } else {
      const mNum = parseFloat(morning) || 0
      const nNum = parseFloat(noon) || 0
      const aNum = parseFloat(afternoon) || 0
      const eNum = parseFloat(evening) || 0
      const daily = mNum + nNum + aNum + eNum
      const calcTotal = daily > 0 ? Math.round(daily * days) : days
      totalQuantity = `${calcTotal} viên`
    }

    return {
      name: drugRaw,
      generic: 'Dược điển Lâm sàng MedTech',
      dose,
      usage: usageRaw,
      morning,
      noon,
      afternoon,
      evening,
      days,
      note,
      totalQuantity,
    }
  })
}

export function generatePrescriptionHtml(record: any): string {
  const medications = parseMedications(record.prescription)
  const d = record.appointment_date ? new Date(record.appointment_date) : new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear())
  const prescriptionCode = `MĐT-${record.id || 'NEW'}-${(record.appointment_date || '').replace(/-/g, '') || '20261116'}`

  const drugsHtml = medications.length > 0
    ? medications.map((m, idx) => `
      <div class="drug-item" style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13pt;">
          <span style="font-weight: bold;">${idx + 1}. ${m.name}</span>
          <span style="font-weight: bold; min-width: 170px; text-align: right;">Số lượng: ${m.totalQuantity} (${m.days} ngày)</span>
        </div>
        <div style="font-size: 11.5pt; color: #1e293b; margin-top: 4px; padding-left: 18px; line-height: 1.5;">
          <div>- Liều dùng: <strong>Sáng: ${m.morning} viên</strong> &bull; <strong>Trưa: ${m.noon} viên</strong> &bull; <strong>Chiều: ${m.afternoon} viên</strong> &bull; <strong>Tối: ${m.evening} viên</strong></div>
          <div style="font-style: italic; color: #334155; margin-top: 2px;">- Cách dùng: ${m.note || 'Uống theo chỉ định của Bác sĩ'}</div>
        </div>
      </div>
    `).join('')
    : '<div style="font-style: italic; color: #64748b; padding: 14px 0;">Đợt khám này không có thuốc kê đơn ngoại trú.</div>'

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Đơn Thuốc Chuẩn Bộ Y Tế — ${record.patient_name || 'Bệnh Nhân'} (${record.appointment_date || ''})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.45; color: #000; background: #e2e8f0; padding: 20px; }
    .toolbar-no-print { max-width: 210mm; margin: 0 auto 14px auto; background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
    .toolbar-no-print button { background: #0068ff; color: #fff; border: none; padding: 7px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; margin-left: 8px; }
    .toolbar-no-print button.secondary { background: #475569; }
    .a4-sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 14mm 16mm; box-shadow: 0 6px 24px rgba(0,0,0,0.18); border: 1px solid #cbd5e1; }
    .moh-header { display: grid; grid-template-columns: 1.35fr 1fr; gap: 10px; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 14px; font-size: 11.5pt; }
    .dept-upper { text-transform: uppercase; font-size: 11pt; }
    .hospital-name { text-transform: uppercase; font-weight: bold; font-size: 11.5pt; }
    .address-line { font-size: 10pt; color: #333; margin-top: 2px; }
    .moh-meta { text-align: right; font-size: 10.5pt; }
    .form-code { font-weight: bold; font-size: 11pt; }
    .prescription-title-block { text-align: center; margin: 12px 0 16px 0; }
    .prescription-title-block h1 { font-size: 19pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .sub-type { font-size: 11pt; font-style: italic; color: #333; margin-top: 2px; }
    .section-patient { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; background: #fafafa; font-size: 12pt; }
    .patient-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 6px 14px; }
    .patient-row-full { margin-top: 4px; }
    .val { font-weight: bold; }
    .drugs-block { margin-top: 14px; min-height: 380px; }
    .drugs-header { font-size: 13pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 10px; }
    .advice-block { border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px 14px; margin-top: 14px; background: #f8fafc; font-size: 12pt; }
    .signatures-block { display: grid; grid-template-columns: 1fr 1fr; margin-top: 24px; text-align: center; page-break-inside: avoid; }
    .sign-date { font-style: italic; font-size: 12pt; margin-bottom: 4px; }
    .sign-title { font-weight: bold; font-size: 12.5pt; text-transform: uppercase; }
    .sign-note { font-size: 10.5pt; font-style: italic; color: #64748b; }
    .sign-space { height: 75px; }
    .sign-name { font-weight: bold; font-size: 13pt; }
    .sign-cchn { font-size: 11pt; color: #334155; }
    .moh-footer-note { margin-top: 22px; padding-top: 8px; border-top: 1px solid #000; font-size: 10.5pt; font-style: italic; color: #475569; display: flex; justify-content: space-between; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar-no-print { display: none !important; }
      .a4-sheet { box-shadow: none; border: none; padding: 0; margin: 0; width: 100%; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar-no-print">
    <div><strong>Hệ Thống Y Tế MedTech AI</strong> — Đơn Thuốc Ngoại Trú (Thông tư 52/2017/TT-BYT & 04/2022/TT-BYT)</div>
    <div>
      <button class="secondary" onclick="window.close()">Đóng</button>
      <button onclick="window.print()">In Đơn Thuốc (Ctrl + P)</button>
    </div>
  </div>
  <div class="a4-sheet">
    <div class="moh-header">
      <div class="moh-org">
        <div class="dept-upper">SỞ Y TẾ TP. HỒ CHÍ MINH</div>
        <div class="hospital-name">${record.clinic_name || 'BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDTECH SÀI GÒN'}</div>
        <div class="address-line">Địa chỉ: Số 125 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh</div>
        <div class="address-line">Điện thoại hotline: 1900 6868 &bull; Cấp cứu 24/7</div>
      </div>
      <div class="moh-meta">
        <div class="form-code">Mẫu số: 01/ĐT</div>
        <div>(Ban hành kèm TT 52/2017/TT-BYT)</div>
        <div style="margin-top: 4px;">Mã ĐT điện tử: <strong>${prescriptionCode}</strong></div>
        <div>Ngày khám: <strong>${record.appointment_date || new Date().toISOString().split('T')[0]}</strong></div>
      </div>
    </div>
    <div class="prescription-title-block">
      <h1>ĐƠN THUỐC</h1>
      <div class="sub-type">(Khám chữa bệnh ngoại trú & Điều trị theo chỉ định Bác sĩ)</div>
    </div>
    <div class="section-patient">
      <div class="patient-grid">
        <div><span class="label">Họ và tên người bệnh:</span> <span class="val" style="text-transform: uppercase;">${record.patient_name || ''}</span></div>
        <div><span class="label">Giới tính:</span> <span class="val">${record.patient_gender || 'Nam'}</span></div>
      </div>
      <div class="patient-grid" style="margin-top: 4px;">
        <div><span class="label">Ngày sinh / Tuổi:</span> <span class="val">${record.patient_dob || (record.patient_age ? `${record.patient_age} tuổi` : 'Chưa cập nhật')}</span></div>
        <div><span class="label">Điện thoại liên hệ:</span> <span class="val">${record.patient_phone || 'Chưa cập nhật'}</span></div>
      </div>
      <div class="patient-row-full">
        <span class="label">Địa chỉ thường trú:</span> <span class="val">${record.patient_address || 'TP. Hồ Chí Minh'}</span>
      </div>
      <div class="patient-row-full">
        <span class="label">Chẩn đoán y khoa (ICD-10):</span> <span class="val" style="color: #b91c1c;">${record.diagnosis || 'Khám chuyên khoa lâm sàng'}</span>
      </div>
    </div>
    <div class="drugs-block">
      <div class="drugs-header">CHỈ ĐỊNH THUỐC ĐIỀU TRỊ</div>
      ${drugsHtml}
    </div>
    <div class="advice-block">
      <strong>Lời dặn của Bác sĩ điều trị:</strong>
      <div>${record.notes || 'Uống thuốc đúng liều lượng, đúng thời gian theo chỉ dẫn. Nghỉ ngơi hợp lý và kiêng chất kích thích.'}</div>
      <div style="margin-top: 4px;">- Hẹn tái khám: <strong>${record.follow_up_date || 'Theo chỉ định lâm sàng của Bác sĩ'}</strong> (hoặc tái khám ngay khi có dấu hiệu bất thường).</div>
    </div>
    <div class="signatures-block">
      <div>
        <div class="sign-title">Người nhận thuốc</div>
        <div class="sign-note">(Ký và ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${record.patient_name || ''}</div>
      </div>
      <div>
        <div class="sign-date">Ngày ${day} tháng ${month} năm ${year}</div>
        <div class="sign-title">Bác sĩ kê đơn</div>
        <div class="sign-note">(Ký, đóng dấu và ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">BS. ${record.doctor_name || 'Sarah Jenkins'}</div>
        <div class="sign-cchn">Chuyên khoa: ${record.doctor_specialization || 'Nội khoa'}</div>
      </div>
    </div>
    <div class="moh-footer-note">
      <div>* Khám lại xin mang theo đơn thuốc này.</div>
      <div>* Đơn thuốc có giá trị mua/lĩnh trong vòng 05 ngày kể từ ngày kê đơn.</div>
    </div>
  </div>
</body>
</html>`
}
