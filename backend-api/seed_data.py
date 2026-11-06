"""
Seed script - populate database with sample data for demo.
Run: python seed_data.py
"""
import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from datetime import date, time, timedelta
from decimal import Decimal
from django.contrib.gis.geos import Point
from apps.accounts.models import CustomUser, DoctorProfile, PatientProfile
from apps.clinics.models import Clinic
from apps.appointments.models import TimeSlot, Appointment
from apps.medical_records.models import MedicalRecord

print("=== Seeding MedTech AI Database ===\n")

# 1. CLINICS
clinics_data = [
    {
        'name': 'Benh vien Da khoa Quoc te MedTech',
        'address': 'So 10 Trang Thi, Hoan Kiem, Ha Noi',
        'location': Point(105.8488, 21.0285, srid=4326),
        'phone': '024 3825 0001',
        'email': 'contact@medtech-hospital.vn',
        'specializations': ['Tim mach', 'Ho hap', 'Noi tong quat', 'Cap cuu', 'Chan doan hinh anh'],
        'rating': Decimal('4.90'),
        'opening_hours': {'weekday': '06:00-22:00', 'weekend': '07:00-20:00', 'emergency': '24/7'},
    },
    {
        'name': 'Vien Tim mach va Da khoa KT cao St. Jude',
        'address': 'So 45 Quang Trung, Hai Ba Trung, Ha Noi',
        'location': Point(105.8580, 21.0050, srid=4326),
        'phone': '024 3972 0002',
        'email': 'info@stjude-heart.vn',
        'specializations': ['Tim mach can thiep', 'Phau thuat tim', 'Noi tim mach'],
        'rating': Decimal('4.80'),
        'opening_hours': {'weekday': '07:00-21:00', 'weekend': '08:00-17:00'},
    },
    {
        'name': 'Trung tam Y te Cong dong Quan Hoan Kiem',
        'address': 'So 8 Ly Thuong Kiet, Hoan Kiem, Ha Noi',
        'location': Point(105.8520, 21.0240, srid=4326),
        'phone': '024 3933 0003',
        'email': 'ttyt-hoankiem@hanoi.gov.vn',
        'specializations': ['Noi tong quat', 'Nhi khoa', 'San khoa', 'Y te du phong'],
        'rating': Decimal('4.60'),
        'opening_hours': {'weekday': '07:30-17:00', 'weekend': '07:30-11:30'},
    },
    {
        'name': 'Phong kham Chuyen gia MedTech',
        'address': 'So 22 Nguyen Du, Hai Ba Trung, Ha Noi',
        'location': Point(105.8540, 21.0180, srid=4326),
        'phone': '024 3826 0004',
        'email': 'phongkham@medtech-expert.vn',
        'specializations': ['Tim mach', 'Ho hap', 'Noi tiet'],
        'rating': Decimal('4.70'),
        'opening_hours': {'weekday': '08:00-20:00', 'weekend': '08:00-12:00'},
    },
]

clinics = []
for c_data in clinics_data:
    clinic, created = Clinic.objects.get_or_create(
        name=c_data['name'],
        defaults=c_data
    )
    clinics.append(clinic)
    status = 'Created' if created else 'Exists'
    print(f"  [{status}] {clinic.name}")

# 2. DOCTORS
doctors_data = [
    {
        'user': {'email': 'sarah.jenkins@medtech.ai', 'username': 'dr.sarah', 'first_name': 'Sarah', 'last_name': 'Jenkins'},
        'profile': {'specialization': 'Khoa Tim mach Can thiep', 'license_number': 'BS-CKI-2018-001', 'experience_years': 16, 'consultation_fee': 450000, 'bio': 'BS CKI Tim mach Can thiep'},
        'clinic_idx': 0,
    },
    {
        'user': {'email': 'marcus.vance@medtech.ai', 'username': 'dr.marcus', 'first_name': 'Marcus', 'last_name': 'Vance'},
        'profile': {'specialization': 'Khoa Cap cuu va Can thiep Mach vanh', 'license_number': 'BS-CKI-2016-002', 'experience_years': 18, 'consultation_fee': 500000, 'bio': 'BS CKI Noi Tim mach'},
        'clinic_idx': 1,
    },
    {
        'user': {'email': 'tran.quoc.toan@medtech.ai', 'username': 'dr.toan', 'first_name': 'Quoc Toan', 'last_name': 'Tran'},
        'profile': {'specialization': 'Khoa Noi Ho hap', 'license_number': 'ThS-BS-2019-003', 'experience_years': 10, 'consultation_fee': 350000, 'bio': 'ThS BS Noi Ho hap'},
        'clinic_idx': 3,
    },
    {
        'user': {'email': 'marc.lindqvist@medtech.ai', 'username': 'dr.marc', 'first_name': 'Marc', 'last_name': 'Lindqvist'},
        'profile': {'specialization': 'Khoa Ho hap', 'license_number': 'BS-2020-004', 'experience_years': 8, 'consultation_fee': 300000, 'bio': 'BS Ho hap'},
        'clinic_idx': 0,
    },
]

doctor_profiles = []
for d in doctors_data:
    user_data = d['user']
    user, u_created = CustomUser.objects.get_or_create(
        email=user_data['email'],
        defaults={**user_data, 'role': 'DOCTOR'}
    )
    if u_created:
        user.set_password('MedTech2026!')
        user.is_verified = True
        user.save()

    profile_data = d['profile']
    profile_data['clinic'] = clinics[d['clinic_idx']]
    profile, p_created = DoctorProfile.objects.get_or_create(
        user=user,
        defaults=profile_data
    )
    doctor_profiles.append(profile)
    status = 'Created' if u_created else 'Exists'
    print(f"  [{status}] BS. {user.get_full_name()} - {profile.specialization}")

# 3. SAMPLE PATIENTS
patients_data = [
    {
        'user': {'email': 'nguyenvanan@medtech.ai', 'username': 'nguyenvanan', 'first_name': 'Van An', 'last_name': 'Nguyen'},
        'profile': {'date_of_birth': date(1984, 5, 15), 'gender': 'Nam', 'blood_type': 'O+', 'address': 'Quan 1, TP Ho Chi Minh', 'emergency_contact': '0912000001', 'medical_history': 'Tang huyet ap 3 nam'},
    },
    {
        'user': {'email': 'lethimai@medtech.ai', 'username': 'lethimai', 'first_name': 'Thi Mai', 'last_name': 'Le'},
        'profile': {'date_of_birth': date(1990, 8, 22), 'gender': 'Nu', 'blood_type': 'A+', 'address': 'Quan Cau Giay, Ha Noi', 'emergency_contact': '0912000002', 'medical_history': 'Hen phe quan'},
    },
]

patients = []
for p in patients_data:
    user_data = p['user']
    user, u_created = CustomUser.objects.get_or_create(
        email=user_data['email'],
        defaults={**user_data, 'role': 'PATIENT'}
    )
    if u_created:
        user.set_password('MedTech2026!')
        user.is_verified = True
        user.save()

    profile_data = p['profile']
    profile, _ = PatientProfile.objects.get_or_create(
        user=user,
        defaults=profile_data
    )
    patients.append(user)
    status = 'Created' if u_created else 'Exists'
    print(f"  [{status}] BN. {user.get_full_name()}")

# 4. TIME SLOTS (next 7 days)
today = date.today()
slot_times_morning = [(time(8, 30), time(9, 0)), (time(9, 30), time(10, 0)), (time(10, 30), time(11, 0))]
slot_times_afternoon = [(time(14, 15), time(14, 45)), (time(15, 0), time(15, 30)), (time(16, 0), time(16, 30))]

slots_created = 0
for dp in doctor_profiles:
    for day_offset in range(7):
        slot_date = today + timedelta(days=day_offset)
        if slot_date.weekday() >= 6:
            continue
        all_slots = slot_times_morning + slot_times_afternoon
        for start, end in all_slots:
            _, created = TimeSlot.objects.get_or_create(
                doctor=dp,
                date=slot_date,
                start_time=start,
                defaults={'end_time': end, 'clinic': dp.clinic, 'is_available': True, 'max_patients': 1}
            )
            if created:
                slots_created += 1
print(f"  [Created] {slots_created} time slots")

# 5. SAMPLE APPOINTMENTS
if patients and doctor_profiles:
    patient = patients[0]
    doctor = doctor_profiles[0]
    tomorrow = today + timedelta(days=1)
    slot = TimeSlot.objects.filter(doctor=doctor, date=tomorrow, is_available=True).first()
    if slot:
        appt, created = Appointment.objects.get_or_create(
            patient=patient,
            time_slot=slot,
            defaults={
                'doctor': doctor,
                'clinic': doctor.clinic,
                'status': 'CONFIRMED',
                'reason': 'Dau that nguc, kho tho khi gang suc',
                'sa_score': 0.042,
            }
        )
        if created:
            slot.is_available = False
            slot.current_patients = 1
            slot.save()
            print(f"  [Created] Appointment: {patient.get_full_name()} -> BS. {doctor.user.get_full_name()}")

# 6. SAMPLE MEDICAL RECORDS
if patients and doctor_profiles:
    records_data = [
        {
            'patient': patients[0],
            'doctor': doctor_profiles[0],
            'diagnosis': 'I20.0 - Con dau that nguc khong on dinh',
            'symptoms': 'Dau that nguc khi nghi ngoi, kem cam giac de nang sau xuong uc',
            'prescription': 'Aspirin 81mg x 30 ngay\nClopidogrel 75mg x 30 ngay',
            'notes': 'Theo doi huyet ap hang ngay. Tai kham sau 2 tuan.',
        },
        {
            'patient': patients[0],
            'doctor': doctor_profiles[2],
            'diagnosis': 'J18.9 - Viem phoi khong dac hieu',
            'symptoms': 'Ho co dom, sot nhe, kho tho khi nam',
            'prescription': 'Amoxicillin-Clavulanate 875/125mg x 7 ngay',
            'notes': 'Chup X-quang phoi kiem tra lai sau 1 tuan.',
        },
    ]
    for rec in records_data:
        mr, created = MedicalRecord.objects.get_or_create(
            patient=rec['patient'],
            doctor=rec['doctor'],
            diagnosis=rec['diagnosis'],
            defaults=rec
        )
        status = 'Created' if created else 'Exists'
        print(f"  [{status}] Record - {rec['diagnosis'][:40]}")

# 7. ADMIN USER
admin, created = CustomUser.objects.get_or_create(
    email='admin@medtech.ai',
    defaults={'username': 'admin', 'first_name': 'Admin', 'last_name': 'System', 'role': 'ADMIN', 'is_staff': True, 'is_superuser': True}
)
if created:
    admin.set_password('MedTech2026!')
    admin.is_verified = True
    admin.save()
    print(f"  [Created] admin: admin@medtech.ai")

print("\n=== Seed Complete ===")
print(f"  Clinics: {Clinic.objects.count()}")
print(f"  Doctors: {DoctorProfile.objects.count()}")
print(f"  Patients: {PatientProfile.objects.count()}")
print(f"  Time Slots: {TimeSlot.objects.count()}")
print(f"  Appointments: {Appointment.objects.count()}")
print(f"  Medical Records: {MedicalRecord.objects.count()}")
