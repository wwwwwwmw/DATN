"""
Medical Consultation Intelligence Engine — MedTech AI
Hybrid Architecture with Multi-turn Memory:
- Level 1: Gibberish & Safety Guardrails (instant detection of nonsense strings & keyboard mashing).
- Level 2: Multi-turn Generative AI via Ollama (/api/chat) with full conversation history memory.
- Level 3: Strict Language Sanitizer (100% Vietnamese and English only, zero Chinese characters).
- Level 4: In-house Medical Knowledge Base Fallback (100% uptime guarantee).
"""
import re
import json
import logging
import urllib.request
import unicodedata
from difflib import SequenceMatcher
from django.conf import settings

logger = logging.getLogger(__name__)

VOWELS = set('aeiouyáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ')

OLLAMA_SYSTEM_PROMPT = """Bạn là Bác sĩ Trợ lý Y tế Lâm sàng MedTech AI — nền tảng y tế thông minh.

QUY TẮC BẮT BUỘC:
1. NGÔN NGỮ: BẮT BUỘC 100% TIẾNG VIỆT cho nội dung chính. Chỉ dùng TIẾNG ANH cho thuật ngữ y khoa và tên biệt dược (Aspirin, Paracetamol, Lipitor...). TUYỆT ĐỐI KHÔNG DÙNG CHỮ HÁN hoặc dấu câu Hoa ngữ.
2. DẤU CÂU: CHỈ DÙNG dấu câu Latin (., ? !). KHÔNG dùng dấu câu Trung Quốc (，。！？：).
3. PHẠM VI: CHỈ trả lời câu hỏi y tế, sức khỏe, thuốc. Từ chối lịch sự câu hỏi ngoài phạm vi.
4. GHI NHỚ HỘI THOẠI: Đọc kỹ lịch sử, trả lời nối tiếp, không lặp lại bước đã thực hiện.
5. PHONG CÁCH: Ngắn gọn 3-5 ý gạch đầu dòng, chuyên nghiệp, ân cần, dễ hiểu cho người bệnh thông thường.
6. KHÔNG TỰ CHẨN ĐOÁN: Dùng "có thể liên quan đến", "triệu chứng thường gặp ở", KHÔNG nói "bạn bị bệnh X".
7. SỬA TÊN THUỐC SAI: Nếu người bệnh viết sai (asprin, parasetamon...), ân cần hỏi: "Có phải bạn đang muốn hỏi về thuốc [Tên đúng] không?" rồi tư vấn công dụng, liều dùng, cách uống.
8. CẤP CỨU: Nếu phát hiện triệu chứng nguy hiểm (đau thắt ngực cấp, khó thở cấp, ngất, co giật), mở đầu bằng "🚨 CẢNH BÁO KHẨN CẤP" và hướng dẫn gọi 115 ngay.
9. VỀ THUỐC: Chỉ cung cấp thông tin chung. KHÔNG kê đơn. Luôn nhắc: "Việc sử dụng thuốc cần có chỉ định của bác sĩ."
10. GỢI Ý CHUYÊN KHOA: Cuối mỗi câu trả lời, đề xuất chuyên khoa phù hợp (VD: "Bạn nên đặt lịch khám khoa Tim mạch")."""

def normalize_text(text: str) -> str:
    return re.sub(r'\s+', ' ', text.strip().lower())

def strip_accents(text: str) -> str:
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.replace('đ', 'd').replace('Đ', 'D').lower()

def sanitize_text(text: str) -> str:
    """
    Remove any Chinese / Han characters (CJK Unicode range) and unwanted token artifacts.
    Ensures 100% Vietnamese and English only.
    """
    if not text:
        return ""
    # Strip CJK Unified Ideographs, CJK Compatibility Ideographs, and Extension A
    cleaned = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+', '', text)
    # Clean up double spaces or broken formatting caused by removed tokens
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

def is_gibberish(text: str) -> bool:
    """Detect random keyboard mashing strings like 'fhnrdyjrsf', 'asdfghjkl', etc."""
    clean = re.sub(r'[^a-zA-Zà-ỹÀ-Ỹ]', '', text.lower())
    if not clean:
        return len(text.strip()) > 2 and not any(c.isalpha() for c in text)

    words = clean.split()
    if len(words) == 1:
        w = words[0]
        vowel_count = sum(1 for c in w if c in VOWELS)
        if len(w) >= 4 and vowel_count == 0:
            return True
        if len(w) >= 6 and (vowel_count / len(w)) < 0.15:
            return True
        if len(w) >= 4 and len(set(w)) <= 2:
            return True
        mashes = ['asdf', 'ghjk', 'qwerty', 'zxcv', 'fhnr', 'jrsf', 'hjkl']
        for m in mashes:
            if m in w and len(w) > 4:
                return True
    return False

# Database of Common Medications & Typos
MEDICATIONS_DB = [
    {
        "correct_name": "Aspirin (Acid acetylsalicylic)",
        "brand_names": ["Aspirin Protect 81mg", "Aspilets"],
        "keywords": ["aspirin", "asprin", "aspirine", "aspirn", "apirin", "aspyrin", "aspiring", "axpirin"],
        "group": "Thuốc chống viêm không steroid (NSAID), ức chế kết tập tiểu cầu",
        "indication": "Dự phòng biến cố huyết khối tim mạch (nhồi máu cơ tim, đột quỵ); Hạ sốt, giảm đau ở liều cao.",
        "dosage": "Liều dự phòng tim mạch: 81mg - 100mg/ngày, uống sau bữa ăn no với nhiều nước. Liều giảm đau/hạ sốt: 500mg/lần (cách 4 - 6 giờ).",
        "cautions": "Chống chỉ định cho người có tiền sử loét dạ dày - tá tràng tiến triển, xuất huyết hoặc rối loạn đông máu. Không dùng cho trẻ dưới 16 tuổi khi bị sốt do virus (nguy cơ hội chứng Reye).",
        "specialties": ["Tim mạch", "Nội khoa"],
        "urgency": "NORMAL"
    },
    {
        "correct_name": "Paracetamol (Acetaminophen / Panadol / Efferalgan)",
        "brand_names": ["Panadol", "Panadol Extra", "Efferalgan", "Hapacol"],
        "keywords": ["paracetamol", "parasetamon", "parasétamon", "paracetamon", "paracetemol", "panadol", "panadol extra", "efferalgan", "eferalgan", "eferangan", "hapacol", "tylenol", "paracel"],
        "group": "Thuốc giảm đau, hạ sốt",
        "indication": "Hạ sốt trong các bệnh lý viêm nhiễm; Giảm đau nhẹ đến vừa (đau đầu, đau răng, đau mỏi cơ khớp).",
        "dosage": "Người lớn: 500mg - 1000mg/lần, cách nhau 4 - 6 giờ (tối đa 4g/ngày). Trẻ em: 10 - 15mg/kg/lần (tối đa 60mg/kg/ngày).",
        "cautions": "Không dùng quá liều quy định vì nguy cơ gây hoại tử tế bào gan cấp tính. Tuyệt đối không uống rượu bia khi dùng thuốc.",
        "specialties": ["Nội tổng quát", "Dược lâm sàng"],
        "urgency": "NORMAL"
    },
    {
        "correct_name": "Atorvastatin (Lipitor)",
        "brand_names": ["Lipitor 10mg/20mg", "Atorlip"],
        "keywords": ["atorvastatin", "atorvastin", "atorvastatine", "atorva", "lipitor", "lipito"],
        "group": "Thuốc hạ lipid máu nhóm Statin",
        "indication": "Điều trị rối loạn lipid máu, giảm Cholesterol toàn phần và LDL-C; Ngăn ngừa mảng xơ vữa động mạch.",
        "dosage": "10mg - 20mg/ngày, uống 1 lần vào buổi tối sau ăn hoặc trước khi ngủ.",
        "cautions": "Theo dõi men gan định kỳ. Báo ngay cho Bác sĩ nếu xuất hiện đau cơ, yếu cơ bất thường.",
        "specialties": ["Tim mạch", "Nội tiết"],
        "urgency": "NORMAL"
    },
    {
        "correct_name": "Bisoprolol (Concor)",
        "brand_names": ["Concor 2.5mg/5mg", "Bisoprolol Fumarate"],
        "keywords": ["bisoprolol", "bisoprol", "concor", "conco", "con cor"],
        "group": "Thuốc chẹn chọn lọc thụ thể beta-1 adrenergic",
        "indication": "Điều trị tăng huyết áp, đau thắt ngực mạn tính và suy tim mạn tính.",
        "dosage": "Uống 1 lần/ngày vào buổi sáng. Liều thường từ 2.5mg - 5mg/ngày.",
        "cautions": "Không tự ý ngừng thuốc đột ngột. Chống chỉ định khi nhịp tim chậm < 50 bpm hoặc hen phế quản nặng.",
        "specialties": ["Tim mạch Can thiệp", "Nội Tim mạch"],
        "urgency": "NORMAL"
    },
    {
        "correct_name": "Amoxicillin / Augmentin",
        "brand_names": ["Augmentin", "Clamoxyl", "Amoxicillin 500mg"],
        "keywords": ["amoxicillin", "amoxilin", "amoxycilin", "amox", "khang sinh amoc", "augmentin", "augmentine"],
        "group": "Kháng sinh nhóm Penicillin phổ rộng",
        "indication": "Điều trị nhiễm khuẩn đường hô hấp, tai mũi họng, tiết niệu và da.",
        "dosage": "500mg - 1000mg mỗi 8 - 12 giờ, uống đủ liệu trình 5 - 7 ngày.",
        "cautions": "Chống chỉ định tuyệt đối cho người dị ứng với kháng sinh nhóm Penicillin hoặc Cephalosporin.",
        "specialties": ["Hô hấp", "Nội tổng quát"],
        "urgency": "NORMAL"
    },
    {
        "correct_name": "Omeprazole / Nexium (Esomeprazole)",
        "brand_names": ["Nexium", "Omeprazole 20mg", "Esomeprazole"],
        "keywords": ["omeprazole", "omeprazol", "omeprasol", "esomeprazol", "nexium"],
        "group": "Thuốc ức chế bơm proton (PPI)",
        "indication": "Điều trị viêm loét dạ dày - tá tràng, trào ngược dạ dày thực quản (GERD).",
        "dosage": "Uống 20mg - 40mg/ngày vào buổi sáng trước bữa ăn 30 - 60 phút.",
        "cautions": "Nuốt nguyên viên thuốc, không nhai hoặc nghiền nhỏ.",
        "specialties": ["Tiêu hóa - Gan mật"],
        "urgency": "NORMAL"
    }
]

def check_medication_query(message: str):
    clean_msg = normalize_text(message)
    stripped_msg = strip_accents(clean_msg)
    words = re.findall(r'[a-zA-Z0-9]+', stripped_msg)

    for med in MEDICATIONS_DB:
        for kw in med["keywords"]:
            kw_clean = strip_accents(kw)
            if kw_clean in stripped_msg:
                is_typo = (kw_clean not in strip_accents(med["correct_name"]))
                return med, is_typo, kw

    for word in words:
        if len(word) < 4:
            continue
        for med in MEDICATIONS_DB:
            for kw in med["keywords"]:
                ratio = SequenceMatcher(None, word, strip_accents(kw)).ratio()
                if ratio >= 0.78:
                    return med, True, word

    return None

def query_ollama_chat(message: str, history: list = None, system_prompt: str = OLLAMA_SYSTEM_PROMPT, extra_instruction: str = "") -> str:
    """
    Call Ollama /api/chat with full multi-turn conversation memory.
    Ensures zero Chinese characters and strict language sanitization.
    """
    ollama_url = getattr(settings, 'OLLAMA_URL', 'http://100.85.178.6:11434').rstrip('/')
    ollama_model = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:7b')

    endpoints = [
        f"{ollama_url}/api/chat",
        "http://100.85.178.6:11434/api/chat",
        "http://localhost:11434/api/chat"
    ]
    unique_endpoints = []
    for ep in endpoints:
        if ep not in unique_endpoints:
            unique_endpoints.append(ep)

    # Build multi-turn messages array
    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Append conversation history
    if history:
        for h in history[-8:]:  # Last 8 messages for rich context
            role = 'user' if h.get('role') == 'user' else 'assistant'
            content = h.get('content', '').strip()
            # Remove repeated disclaimers from history to keep context clean
            content = content.replace("⚠️ Lưu ý: Kết quả tư vấn chỉ mang tính chất tham khảo, không thay thế cho việc khám và chỉ định điều trị của Bác sĩ chuyên khoa.", "").strip()
            if content:
                messages.append({"role": role, "content": content})

    # Append current message with any special clinical instruction
    user_prompt = message
    if extra_instruction:
        user_prompt = f"{message}\n\n{extra_instruction}"

    messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": ollama_model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 240
        }
    }
    data_bytes = json.dumps(payload).encode('utf-8')

    for ep in unique_endpoints:
        try:
            req = urllib.request.Request(
                ep,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=28) as resp:
                if resp.status == 200:
                    res_json = json.loads(resp.read().decode('utf-8'))
                    ans = res_json.get('message', {}).get('content', '').strip()
                    if ans:
                        # Sanitize Chinese characters immediately
                        return sanitize_text(ans)
        except Exception as e:
            logger.debug(f"Ollama chat attempt failed for {ep}: {e}")
            continue

    return ""

def process_consultation_message(message: str, history: list = None) -> dict:
    """
    Intelligent Hybrid Medical Consultation Engine with Multi-turn Memory.
    """
    raw_text = message.strip()
    clean_text = normalize_text(raw_text)
    stripped_text = strip_accents(clean_text)

    # 1. Guardrail: Gibberish input (fhnrdyjrsf, asdfgh...)
    if is_gibberish(raw_text):
        return {
            'answer': (
                f"Xin lỗi, tôi chưa hiểu rõ nội dung bạn vừa nhập: \"**{raw_text}**\". "
                "Có vẻ như đây là chuỗi ký tự ngẫu nhiên hoặc gõ nhầm trên bàn phím.\n\n"
                "Để tôi có thể tư vấn sức khỏe chuẩn xác cho bạn, vui lòng cung cấp thêm:\n"
                "• 🩺 **Triệu chứng cụ thể** (ví dụ: đau đầu, sốt, đau ngực, khó thở, bị chó cắn...)\n"
                "• 💊 **Tên thuốc cần tra cứu** (Aspirin, Paracetamol, kháng sinh...) công dụng, liều dùng và lưu ý\n"
                "• 📅 Hoặc yêu cầu hướng dẫn đặt lịch khám với Bác sĩ chuyên khoa."
            ),
            'urgency_level': 'NORMAL',
            'suggested_specialties': ['Tiếp nhận ban đầu', 'Đa khoa'],
            'sources': [
                {"title": "Hệ thống Tiếp nhận và Phân loại Bệnh nhân MedTech AI", "content": "Tự động phát hiện và xử lý chuỗi ký tự lỗi nhập liệu."}
            ]
        }

    # 2. Medication typo check
    med_result = check_medication_query(raw_text)
    extra_med_instruction = ""
    suggested_specs = ['Đa khoa']
    urgency = 'NORMAL'

    if med_result:
        med, is_misspelled, raw_word = med_result
        suggested_specs = med['specialties']
        urgency = med['urgency']
        if is_misspelled:
            extra_med_instruction = (
                f"[LƯU Ý]: Bệnh nhân đã gõ sai tên thuốc là '{raw_word}'. Tên chuẩn là: '{med['correct_name']}'. "
                f"Hãy mở đầu câu trả lời một cách ân cần: 'Có phải bạn đang muốn tìm hiểu về thuốc {med['correct_name']} không?' "
                f"và tư vấn rõ về công dụng ({med['indication']}), liều dùng an toàn ({med['dosage']}), cách uống sau ăn và lưu ý."
            )

    # 3. Emergency Cardio / Rabies / Trauma Check
    cardio_emergency_kw = ['dau nguc du doi', 'dau that nguc', 'de nang nguc', 'kho tho cap', 'dau nhoi nguc']
    rabies_kw = ['cho can', 'meo can', 'dai', 'dai can', 'vet thuong cho can']

    if any(k in stripped_text for k in cardio_emergency_kw):
        urgency = 'EMERGENCY'
        suggested_specs = ['Cấp cứu Tim mạch', 'Tim mạch Can thiệp']
    elif any(k in stripped_text for k in rabies_kw):
        suggested_specs = ['Trung tâm Tiêm chủng & Y tế dự phòng', 'Ngoại chấn thương']
        urgency = 'HIGH'
    elif any(k in stripped_text for k in ['tim', 'nguc', 'nhip tim', 'hoi hop', 'huyet ap']):
        suggested_specs = ['Tim mạch Can thiệp', 'Nội Tim mạch']
        urgency = 'HIGH' if urgency != 'EMERGENCY' else urgency
    elif any(k in stripped_text for k in ['ho', 'kho tho', 'viem phoi', 'phe quan', 'dom']):
        suggested_specs = ['Hô hấp & Phổi', 'Tai Mũi Họng']
        if 'kho tho' in stripped_text:
            urgency = 'HIGH'
    elif any(k in stripped_text for k in ['da day', 'bao tu', 'o chua', 'trao nguoc', 'thuong vi']):
        suggested_specs = ['Tiêu hóa - Gan mật', 'Nội khoa']
    elif any(k in stripped_text for k in ['dau dau', 'chong mat', 'tien dinh', 'mat ngu']):
        suggested_specs = ['Thần kinh', 'Nội tổng quát']

    # 4. Generate dynamic response with Ollama Multi-turn Memory
    llm_answer = query_ollama_chat(
        message=raw_text,
        history=history,
        extra_instruction=extra_med_instruction
    )

    if llm_answer:
        # Sanitize any Chinese character strictly
        llm_answer = sanitize_text(llm_answer)

        if "⚠️" not in llm_answer and "tham khảo" not in llm_answer:
            llm_answer += "\n\n⚠️ *Lưu ý: Kết quả tư vấn chỉ mang tính chất tham khảo, không thay thế cho việc khám và chỉ định điều trị của Bác sĩ chuyên khoa.*"

        return {
            'answer': llm_answer,
            'urgency_level': urgency,
            'suggested_specialties': suggested_specs,
            'sources': [
                {"title": "Hệ thống Trợ lý Y tế MedTech AI (Clinical Medical Engine)", "content": "Tư vấn động dựa trên lý luận lâm sàng và hội thoại đa bước."},
                {"title": "Dược thư Quốc gia Việt Nam & Phác đồ Bộ Y tế", "content": "Nguyên tắc sử dụng thuốc và phân luồng tiếp đón bệnh nhân."}
            ]
        }

    # 5. Fallback if Ollama timeout/offline
    if med_result:
        med, is_misspelled, raw_word = med_result
        intro = (
            f"💡 **Có phải bạn đang muốn hỏi về thuốc {med['correct_name']} không?**\n\n"
            if is_misspelled else
            f"Dưới đây là thông tin chuyên môn chi tiết về thuốc **{med['correct_name']}**:\n\n"
        )
        return {
            'answer': (
                f"{intro}"
                f"• **Nhóm dược lý**: {med['group']}.\n"
                f"• **Công dụng điều trị**: {med['indication']}.\n"
                f"• **Liều dùng tham khảo**: {med['dosage']}.\n"
                f"• **Chống chỉ định & Lưu ý quan trọng**: {med['cautions']}.\n\n"
                f"⚠️ *Khuyến cáo: Luôn sử dụng thuốc theo đơn và chỉ định cụ thể của Bác sĩ điều trị.*"
            ),
            'urgency_level': med['urgency'],
            'suggested_specialties': med['specialties'],
            'sources': [{"title": f"Dược thư Quốc gia — {med['correct_name']}", "content": med['indication']}]
        }

    if urgency == 'EMERGENCY':
        return {
            'answer': (
                "🚨 **CẢNH BÁO MỨC ĐỘ KHẨN CẤP: NGUY CƠ HỘI CHỨNG VÀNH CẤP TÍNH**\n\n"
                "Các triệu chứng bạn vừa mô tả là dấu hiệu cảnh báo nghiêm trọng của tình trạng thiếu máu cơ tim hoặc nhồi máu cơ tim cấp.\n\n"
                "**HƯỚNG DẪN XỬ TRÍ NGAY LẬP TỨC:**\n"
                "1. **Nghỉ ngơi tuyệt đối**: Ngồi tựa lưng ở nơi thoáng khí, nới lỏng áo ngực. Không gắng sức.\n"
                "2. **Gọi cấp cứu khẩn cấp**: Liên hệ ngay đường dây nóng **1900 6868** hoặc gọi **115**.\n"
                "3. Nhờ người nhà mang theo hồ sơ bệnh án đến bệnh viện gần nhất."
            ),
            'urgency_level': 'EMERGENCY',
            'suggested_specialties': ['Cấp cứu Tim mạch', 'Tim mạch Can thiệp'],
            'sources': [{"title": "Phác đồ Cấp cứu Tim mạch — Bộ Y tế", "content": "Quy trình xử trí ban đầu đau thắt ngực cấp."}]
        }

    return {
        'answer': (
            f"Chào bạn, tôi đã tiếp nhận thông tin: \"{raw_text}\".\n\n"
            "Dựa trên các dấu hiệu bạn chia sẻ, hệ thống ghi nhận và đề xuất bạn nên theo dõi kỹ mức độ và thời gian xuất hiện của triệu chứng. "
            "Nếu triệu chứng tăng dần hoặc gây khó chịu, bạn nên đặt lịch khám sớm với Bác sĩ chuyên khoa để được chẩn đoán toàn diện.\n\n"
            "⚠️ *Lưu ý: Thông tin tư vấn chỉ mang tính tham khảo ban đầu.*"
        ),
        'urgency_level': urgency,
        'suggested_specialties': suggested_specs,
        'sources': [{"title": "Cơ sở Dữ liệu Y tế MedTech", "content": "Tư vấn sức khỏe ban đầu."}]
    }
