import os, sys, django

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'D:\Documents\DATN\backend-api')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.chat.engine import process_consultation_message

print('--- TEST 1: User types gibberish "fhnrdyjrsf" ---')
r1 = process_consultation_message('fhnrdyjrsf')
print('Answer:', r1['answer'])
print('Urgency:', r1['urgency_level'])

print('\n--- TEST 2: User mispronounces drug "uong thuoc asprin vao luc nao va co luu y gi khong" ---')
r2 = process_consultation_message('uong thuoc asprin vao luc nao va co luu y gi khong')
print('Answer:', r2['answer'])
print('Urgency:', r2['urgency_level'])
print('Specialties:', r2['suggested_specialties'])

print('\n--- TEST 3: User describes realistic nuanced symptoms "May hom nay toi hay bi hoi hop, tim dap nhanh luc leo cau thang, dem ve kho ngu, khong biet co phai bi tim khong" ---')
r3 = process_consultation_message('May hom nay toi hay bi hoi hop, tim dap nhanh luc leo cau thang, dem ve kho ngu, khong biet co phai bi tim khong')
print('Answer:', r3['answer'])
print('Urgency:', r3['urgency_level'])
print('Specialties:', r3['suggested_specialties'])

