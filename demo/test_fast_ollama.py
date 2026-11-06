import sys
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request
import json
import time
import re

system_prompt = """Bạn là Bác sĩ Trợ lý Y tế Lâm sàng MedTech AI.
QUY TẮC BẮT BUỘC:
1. NGÔN NGỮ: BẮT BUỘC 100% TIẾNG VIỆT HOẶC TIẾNG ANH (CHO TÊN THUỐC NHƯ Aspirin, Paracetamol, Panadol...). TUYỆT ĐỐI KHÔNG DÙNG BẤT KỲ TỪ, CHỮ HÁN HOẶC DẤU CÂU TIẾNG TRUNG NÀO.
2. DẤU CÂU: CHỈ DÙNG DẤU CÂU CHUẨN LATIN (., ? !). KHÔNG DÙNG DẤU CÂU HOA NGỮ.
3. VẾT THƯƠNG & BĂNG BÓ: Dùng từ tiếng Việt: "băng gạc vô khuẩn", "gạc y tế tiệt trùng", "băng cuộn". Tuyệt đối không dùng chữ Hán.
4. GHI NHỚ LỊCH SỬ HỘI THOẠI: Đọc kỹ nội dung trước đó của bệnh nhân để trả lời nối tiếp logic, không hỏi lại hay lặp lại những gì bệnh nhân đã thực hiện.
5. Ngắn gọn, chuyên nghiệp, 3-4 ý rõ ràng."""

messages = [
    {'role': 'system', 'content': system_prompt},
    {'role': 'user', 'content': 'Tôi vừa bị chó cắn vào bắp chân, vết thương đang rớm máu'}
]

payload = {
    'model': 'qwen2.5:7b',
    'messages': messages,
    'stream': False,
    'options': {
        'temperature': 0.1,
        'num_predict': 350
    }
}

req = urllib.request.Request(
    'http://100.85.178.6:11434/api/chat',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

t0 = time.time()
with urllib.request.urlopen(req, timeout=50) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    ans1 = data['message']['content']

print(f"Turn 1 elapsed: {time.time()-t0:.2f}s")
print("=== RAW ANSWER 1 ===")
print(ans1)

# Turn 2
messages.append({'role': 'assistant', 'content': ans1})
messages.append({'role': 'user', 'content': 'Tôi đã rửa sạch xà phòng 15 phút rồi, bây giờ tôi nên làm gì tiếp theo?'})

payload['messages'] = messages
req2 = urllib.request.Request(
    'http://100.85.178.6:11434/api/chat',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

t1 = time.time()
with urllib.request.urlopen(req2, timeout=50) as resp:
    data2 = json.loads(resp.read().decode('utf-8'))
    ans2 = data2['message']['content']

print(f"\nTurn 2 elapsed: {time.time()-t1:.2f}s")
print("=== RAW ANSWER 2 ===")
print(ans2)

cjk_pattern = re.compile(r'[\u2e80-\u2fd5\u3000-\u303f\u31c0-\u31ef\u3200-\u32ff\u3300-\u33ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]')
print("\n=== VERIFICATION ===")
print("Has CJK in Ans 1:", bool(cjk_pattern.search(ans1)))
print("Has CJK in Ans 2:", bool(cjk_pattern.search(ans2)))
