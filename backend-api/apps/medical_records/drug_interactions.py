"""
Drug-Drug Interaction Checker — MedTech AI.

Cung cấp cơ sở dữ liệu tương tác thuốc phổ biến nhất trong lâm sàng Việt Nam.
Trả về danh sách cảnh báo khi phát hiện cặp thuốc tương tác nguy hiểm.
"""

# Bảng tra tương tác thuốc: (drug_a_keywords, drug_b_keywords) → warning info
# Dựa trên Dược thư Quốc gia Việt Nam & UpToDate / Lexicomp
INTERACTION_DATABASE = [
    {
        'drug_a': ['aspirin', 'acid acetylsalicylic', 'aspirin protect'],
        'drug_b': ['warfarin', 'coumadin', 'acenocoumarol', 'sintrom'],
        'severity': 'HIGH',
        'description': 'Tăng nguy cơ xuất huyết tiêu hóa và xuất huyết nội nghiêm trọng.',
        'recommendation': 'Theo dõi INR chặt chẽ. Cân nhắc thay thế bằng Clopidogrel nếu cần thiết.',
    },
    {
        'drug_a': ['aspirin', 'acid acetylsalicylic'],
        'drug_b': ['clopidogrel', 'plavix'],
        'severity': 'MODERATE',
        'description': 'Tăng nguy cơ chảy máu khi phối hợp kháng kết tập tiểu cầu kép.',
        'recommendation': 'Chỉ phối hợp khi có chỉ định rõ ràng (stent mạch vành). Theo dõi dấu hiệu chảy máu.',
    },
    {
        'drug_a': ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'celecoxib'],
        'drug_b': ['methotrexate', 'mtx'],
        'severity': 'HIGH',
        'description': 'NSAIDs làm giảm thanh thải Methotrexate qua thận, tăng độc tính tủy xương.',
        'recommendation': 'Tránh phối hợp hoặc giảm liều Methotrexate. Kiểm tra công thức máu thường xuyên.',
    },
    {
        'drug_a': ['enalapril', 'lisinopril', 'ramipril', 'perindopril', 'captopril'],
        'drug_b': ['spironolactone', 'aldactone', 'eplerenone', 'kali', 'potassium'],
        'severity': 'HIGH',
        'description': 'Tăng nguy cơ tăng Kali máu nguy hiểm (hyperkalemia), có thể gây loạn nhịp tim.',
        'recommendation': 'Kiểm tra Kali máu định kỳ mỗi 1-2 tuần. Theo dõi ECG khi kết hợp.',
    },
    {
        'drug_a': ['simvastatin', 'atorvastatin', 'rosuvastatin', 'lovastatin', 'lipitor'],
        'drug_b': ['clarithromycin', 'erythromycin', 'itraconazole', 'ketoconazole'],
        'severity': 'HIGH',
        'description': 'Ức chế CYP3A4 làm tăng nồng độ Statin, tăng nguy cơ tiêu cơ vân (rhabdomyolysis).',
        'recommendation': 'Tạm ngưng Statin trong thời gian dùng kháng sinh/kháng nấm nhóm này.',
    },
    {
        'drug_a': ['metformin', 'glucophage'],
        'drug_b': ['thuốc cản quang iod', 'contrast', 'iodinated contrast'],
        'severity': 'HIGH',
        'description': 'Nguy cơ nhiễm toan lactic khi dùng thuốc cản quang iod.',
        'recommendation': 'Ngưng Metformin 48h trước và sau khi chụp CT có cản quang. Kiểm tra creatinine.',
    },
    {
        'drug_a': ['ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'norfloxacin'],
        'drug_b': ['antacid', 'canxi', 'calcium', 'sắt', 'iron', 'kẽm', 'zinc', 'nhôm', 'aluminum'],
        'severity': 'MODERATE',
        'description': 'Ion kim loại (Ca²⁺, Fe²⁺, Al³⁺) tạo chelat làm giảm hấp thu Fluoroquinolone.',
        'recommendation': 'Uống kháng sinh cách thuốc bổ sung khoáng chất ít nhất 2 giờ.',
    },
    {
        'drug_a': ['omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'nexium'],
        'drug_b': ['clopidogrel', 'plavix'],
        'severity': 'MODERATE',
        'description': 'Omeprazole ức chế CYP2C19, giảm chuyển hóa Clopidogrel thành dạng hoạt động.',
        'recommendation': 'Ưu tiên dùng Pantoprazole hoặc Rabeprazole thay thế (ít ảnh hưởng CYP2C19).',
    },
    {
        'drug_a': ['amiodarone', 'cordarone'],
        'drug_b': ['digoxin', 'lanoxin'],
        'severity': 'HIGH',
        'description': 'Amiodarone làm tăng nồng độ Digoxin 70-100%, nguy cơ ngộ độc Digoxin.',
        'recommendation': 'Giảm liều Digoxin 50% khi phối hợp. Theo dõi nồng độ Digoxin huyết thanh.',
    },
    {
        'drug_a': ['paracetamol', 'acetaminophen', 'panadol', 'efferalgan', 'hapacol', 'tylenol'],
        'drug_b': ['rượu', 'alcohol', 'ethanol'],
        'severity': 'HIGH',
        'description': 'Tăng nguy cơ hoại tử gan cấp tính nghiêm trọng khi phối hợp.',
        'recommendation': 'Tuyệt đối không uống rượu bia khi đang dùng Paracetamol.',
    },
    {
        'drug_a': ['bisoprolol', 'metoprolol', 'atenolol', 'propranolol', 'concor'],
        'drug_b': ['verapamil', 'diltiazem'],
        'severity': 'HIGH',
        'description': 'Phối hợp chẹn beta + chẹn kênh calci non-DHP gây nhịp chậm nghiêm trọng và block nhĩ thất.',
        'recommendation': 'Tránh phối hợp. Nếu cần, theo dõi ECG liên tục và nhịp tim.',
    },
]


def normalize_drug_name(name: str) -> str:
    """Chuẩn hóa tên thuốc: lowercase, bỏ dấu đơn giản, bỏ liều lượng."""
    import re
    name = name.lower().strip()
    # Remove dosage info like "500mg", "10mg/ml", etc.
    name = re.sub(r'\d+\s*(?:mg|mcg|g|ml|ui|iu)(?:/[a-z]+)?', '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def check_drug_interactions(prescription_text: str) -> list:
    """
    Kiểm tra tương tác thuốc từ chuỗi đơn thuốc (multi-line, pipe-separated).
    
    Returns:
        List of interaction warnings, each dict has:
        - drug_a, drug_b: tên thuốc tìm thấy
        - severity: HIGH / MODERATE
        - description: mô tả tương tác
        - recommendation: khuyến cáo
    """
    if not prescription_text:
        return []
    
    # Parse drug names from prescription text
    lines = prescription_text.strip().split('\n')
    drug_names = []
    for line in lines:
        parts = line.split('|')
        raw_name = parts[0].strip() if parts else line.strip()
        if raw_name:
            drug_names.append(normalize_drug_name(raw_name))
    
    if len(drug_names) < 2:
        return []
    
    warnings = []
    checked_pairs = set()
    
    for i, drug_i in enumerate(drug_names):
        for j, drug_j in enumerate(drug_names):
            if i >= j:
                continue
            
            pair_key = (min(i, j), max(i, j))
            if pair_key in checked_pairs:
                continue
            checked_pairs.add(pair_key)
            
            for interaction in INTERACTION_DATABASE:
                a_match = any(kw in drug_i for kw in interaction['drug_a'])
                b_match = any(kw in drug_j for kw in interaction['drug_b'])
                
                # Check both directions
                if not (a_match and b_match):
                    a_match = any(kw in drug_j for kw in interaction['drug_a'])
                    b_match = any(kw in drug_i for kw in interaction['drug_b'])
                
                if a_match and b_match:
                    raw_a = lines[i].split('|')[0].strip() if i < len(lines) else drug_i
                    raw_b = lines[j].split('|')[0].strip() if j < len(lines) else drug_j
                    warnings.append({
                        'drug_a': raw_a,
                        'drug_b': raw_b,
                        'severity': interaction['severity'],
                        'description': interaction['description'],
                        'recommendation': interaction['recommendation'],
                    })
    
    return warnings

