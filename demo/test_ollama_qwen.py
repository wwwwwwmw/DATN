import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

payload = {
    'model': 'qwen2.5:7b',
    'prompt': 'Bạn là Bác sĩ Trợ lý Y tế MedTech AI. Người bệnh hỏi: "Tôi bị đau đầu và chóng mặt nhẹ 2 ngày nay, nên làm gì?". Hãy trả lời ngắn gọn, ân cần, chuyên nghiệp bằng tiếng Việt chuẩn y khoa.',
    'stream': False,
    'options': {
        'temperature': 0.3,
        'num_predict': 500
    }
}
req = urllib.request.Request(
    'http://100.85.178.6:11434/api/generate',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req, timeout=30)
data = json.loads(resp.read().decode('utf-8'))
print('=== RESPONSE FROM QWEN2.5:7B VIA OLLAMA ===')
print(data.get('response'))

