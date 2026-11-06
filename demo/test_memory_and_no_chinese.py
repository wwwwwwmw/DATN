import os, sys, django, re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'D:\Documents\DATN\backend-api')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.chat.engine import process_consultation_message, sanitize_text

# Turn 1
msg1 = "Tôi vừa bị chó cắn vào bắp chân, vết thương đang rớm máu"
print('=== TURN 1: User says ===\n', msg1)
r1 = process_consultation_message(msg1, history=[])
print('\nBot replies (Turn 1):\n', r1['answer'])

# Turn 2
history = [
    {'role': 'user', 'content': msg1},
    {'role': 'assistant', 'content': r1['answer']}
]
msg2 = "Tôi đã rửa sạch xà phòng 15 phút rồi, bây giờ tôi nên làm gì tiếp theo?"
print('\n=== TURN 2: User says (relying on memory) ===\n', msg2)
r2 = process_consultation_message(msg2, history=history)
print('\nBot replies (Turn 2):\n', r2['answer'])

# Check for Chinese characters and fullwidth CJK symbols
cjk_pattern = re.compile(r'[\u2e80-\u2fd5\u3000-\u303f\u31c0-\u31ef\u3200-\u32ff\u3300-\u33ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]')
has_chinese_1 = bool(cjk_pattern.search(r1['answer']))
has_chinese_2 = bool(cjk_pattern.search(r2['answer']))

print('\n=== VERIFICATION CHECKS ===')
print('Turn 1 has any Chinese/CJK characters or symbols:', has_chinese_1)
print('Turn 2 has any Chinese/CJK characters or symbols:', has_chinese_2)
mentions_next_steps = any(k in r2['answer'].lower() for k in ['tiêm', 'dại', 'băng', 'gạc', 'uốn ván', 'vết thương'])
remembers_soap_done = 'rửa' not in r2['answer'].lower() or 'tiếp tục' in r2['answer'].lower() or 'sau khi' in r2['answer'].lower()
print('Turn 2 advances to next clinical steps:', mentions_next_steps)
print('Turn 2 contextual continuity verified:', remembers_soap_done)
