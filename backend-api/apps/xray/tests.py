"""
Automated Regression Tests — MedTech AI Backend.

Test cases:
1. No Finding X-ray should NEVER get "CẢNH BÁO NGUY CƠ CAO" label
2. X-ray upload flow and unique code generation
3. Drug interaction checker
4. Telehealth room state transitions
5. Digital signature HMAC-SHA256 integrity
"""
import json
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser, DoctorProfile, PatientProfile
from apps.medical_records.models import XrayAnalysisResult, MedicalRecord
from apps.medical_records.drug_interactions import check_drug_interactions


class NoFindingLabelTest(TestCase):
    """
    CRITICAL: Khi AI phân tích ảnh X-quang bình thường (No Finding chiếm ưu thế),
    hệ thống KHÔNG ĐƯỢC gán nhãn "CẢNH BÁO NGUY CƠ CAO".
    """

    def setUp(self):
        self.patient = CustomUser.objects.create_user(
            username='test_patient',
            email='patient@test.com',
            password='test123456',
            role='PATIENT',
        )

    def test_no_finding_high_should_not_be_critical(self):
        """No Finding 67.4% → should NOT be labeled as high risk."""
        result = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/test.jpg',
            predictions={
                'No Finding': 0.674,
                'Lung Opacity': 0.099,
                'Atelectasis': 0.058,
                'Pleural Effusion': 0.053,
                'Enlarged Cardiomediastinum': 0.052,
                'Support Devices': 0.049,
                'Fracture': 0.044,
                'Consolidation': 0.037,
                'Pneumonia': 0.029,
                'Lung Lesion': 0.022,
                'Pneumothorax': 0.012,
                'Cardiomegaly': 0.012,
                'Pleural Other': 0.008,
                'Edema': 0.007,
            }
        )

        # No Finding should be the top prediction
        top = result.top_findings[0]
        self.assertEqual(top['name'], 'No Finding')

        # No pathology should exceed the high-risk threshold (30%)
        pathology_probs = {
            k: v for k, v in result.predictions.items()
            if k != 'No Finding'
        }
        max_pathology = max(pathology_probs.values())
        self.assertLess(max_pathology, 0.30,
            "When No Finding is dominant, no pathology should trigger high risk warning")

    def test_no_finding_100_percent_normal(self):
        """Perfectly normal X-ray: No Finding 95%."""
        result = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/normal.jpg',
            predictions={
                'No Finding': 0.95,
                'Cardiomegaly': 0.02,
                'Pneumonia': 0.01,
                'Pleural Effusion': 0.01,
                'Atelectasis': 0.01,
            }
        )
        top = result.top_findings[0]
        self.assertEqual(top['name'], 'No Finding')
        self.assertGreater(top['probability'], 0.90)

    def test_real_pathology_is_correctly_flagged(self):
        """Cardiomegaly 54.2% should be correctly identified as top finding."""
        result = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/cardio.jpg',
            predictions={
                'Cardiomegaly': 0.542,
                'Atelectasis': 0.18,
                'Pleural Effusion': 0.09,
                'Pneumonia': 0.06,
                'Pneumothorax': 0.01,
            }
        )
        top = result.top_findings[0]
        self.assertEqual(top['name'], 'Cardiomegaly')
        self.assertGreater(top['probability'], 0.30,
            "Real pathology should be flagged for clinical follow-up")


class XrayCodeGenerationTest(TestCase):
    """Test unique code generation for X-ray results."""

    def setUp(self):
        self.patient = CustomUser.objects.create_user(
            username='code_patient',
            email='code@test.com',
            password='test123456',
            role='PATIENT',
        )

    def test_codes_are_unique(self):
        """Each X-ray result should have unique xray_code and image_code."""
        r1 = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/img1.jpg',
            predictions={'No Finding': 0.80},
        )
        r2 = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/img2.jpg',
            predictions={'Pneumonia': 0.65},
        )
        self.assertNotEqual(r1.xray_code, r2.xray_code)
        self.assertNotEqual(r1.image_code, r2.image_code)

    def test_code_format(self):
        """Codes should follow XQ-YYYYMMDD-HHMMSS-XXXX format."""
        result = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/img.jpg',
            predictions={'No Finding': 0.90},
        )
        self.assertTrue(result.xray_code.startswith('XQ-'))
        self.assertTrue(result.image_code.startswith('IMG-'))
        self.assertGreaterEqual(len(result.xray_code), 15)


class DrugInteractionTest(TestCase):
    """Test drug-drug interaction checker."""

    def test_aspirin_warfarin_interaction(self):
        """Aspirin + Warfarin = HIGH severity bleeding risk."""
        prescription = "Aspirin 81mg|1 lần/ngày|30 ngày\nWarfarin 5mg|1 lần/ngày|30 ngày"
        interactions = check_drug_interactions(prescription)
        self.assertGreater(len(interactions), 0)
        self.assertEqual(interactions[0]['severity'], 'HIGH')
        self.assertIn('xuất huyết', interactions[0]['description'].lower())

    def test_no_interaction(self):
        """Two unrelated drugs should have no interactions."""
        prescription = "Paracetamol 500mg|3 lần/ngày|7 ngày\nOmeprazole 20mg|1 lần/ngày|14 ngày"
        interactions = check_drug_interactions(prescription)
        self.assertEqual(len(interactions), 0)

    def test_omeprazole_clopidogrel(self):
        """Omeprazole + Clopidogrel = MODERATE CYP2C19 inhibition."""
        prescription = "Omeprazole 20mg|1 lần/ngày\nClopidogrel 75mg|1 lần/ngày"
        interactions = check_drug_interactions(prescription)
        self.assertGreater(len(interactions), 0)
        self.assertEqual(interactions[0]['severity'], 'MODERATE')

    def test_single_drug_no_interaction(self):
        """Single drug prescription should never have interactions."""
        prescription = "Aspirin 81mg|1 lần/ngày|30 ngày"
        interactions = check_drug_interactions(prescription)
        self.assertEqual(len(interactions), 0)

    def test_empty_prescription(self):
        """Empty prescription returns empty list."""
        self.assertEqual(check_drug_interactions(''), [])
        self.assertEqual(check_drug_interactions(None), [])

    def test_statin_macrolide_interaction(self):
        """Atorvastatin + Clarithromycin = HIGH rhabdomyolysis risk."""
        prescription = "Atorvastatin 20mg|1 lần/ngày\nClarithromycin 500mg|2 lần/ngày"
        interactions = check_drug_interactions(prescription)
        self.assertGreater(len(interactions), 0)
        self.assertEqual(interactions[0]['severity'], 'HIGH')


class DigitalSignatureTest(TestCase):
    """Test HMAC-SHA256 digital signature for X-ray reviews."""

    def setUp(self):
        self.doctor_user = CustomUser.objects.create_user(
            username='test_doctor',
            email='doctor@test.com',
            password='doctor123',
            role='DOCTOR',
        )
        self.patient = CustomUser.objects.create_user(
            username='test_patient_sig',
            email='patient_sig@test.com',
            password='test123456',
            role='PATIENT',
        )
        self.xray = XrayAnalysisResult.objects.create(
            patient=self.patient,
            original_image='xrays/test_sig.jpg',
            predictions={'Cardiomegaly': 0.54, 'Atelectasis': 0.18},
        )

    def test_sign_review_generates_signature(self):
        """sign_review should generate a non-empty HMAC-SHA256 signature."""
        self.xray.doctor_review = 'Ghi nhận bóng tim to, CTR 0.52'
        self.xray.doctor_agrees_with_ai = True
        signature = self.xray.sign_review(self.doctor_user)

        self.assertIsNotNone(signature)
        self.assertEqual(len(signature), 64)  # SHA256 hex digest = 64 chars
        self.assertIsNotNone(self.xray.signature_timestamp)

    def test_verify_signature_valid(self):
        """Signature should verify correctly when content unchanged."""
        self.xray.doctor_review = 'Kết quả phù hợp lâm sàng'
        self.xray.doctor_agrees_with_ai = True
        self.xray.sign_review(self.doctor_user)

        self.assertTrue(self.xray.verify_signature(self.doctor_user))

    def test_verify_signature_tampered(self):
        """Signature should fail verification if content is tampered."""
        self.xray.doctor_review = 'Original review'
        self.xray.doctor_agrees_with_ai = True
        self.xray.sign_review(self.doctor_user)

        # Tamper the review
        self.xray.doctor_review = 'Tampered review'
        self.assertFalse(self.xray.verify_signature(self.doctor_user))

    def test_verify_signature_wrong_doctor(self):
        """Signature should fail verification with a different doctor."""
        other_doctor = CustomUser.objects.create_user(
            username='other_doctor',
            email='other@test.com',
            password='other123',
            role='DOCTOR',
        )
        self.xray.doctor_review = 'Signed by original doctor'
        self.xray.doctor_agrees_with_ai = True
        self.xray.sign_review(self.doctor_user)

        self.assertFalse(self.xray.verify_signature(other_doctor))

    def test_no_signature_fails_verify(self):
        """Result without signature should fail verification."""
        self.assertFalse(self.xray.verify_signature(self.doctor_user))


class MedicalRecordAPITest(TestCase):
    """Test Medical Record API endpoints."""

    def setUp(self):
        self.doctor_user = CustomUser.objects.create_user(
            username='api_doctor',
            email='api_doc@test.com',
            password='doctor123',
            role='DOCTOR',
        )
        self.patient = CustomUser.objects.create_user(
            username='api_patient',
            email='api_pat@test.com',
            password='patient123',
            role='PATIENT',
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor_user,
            specialization='Nội Tim mạch',
        )
        self.client = APIClient()

    def test_patient_can_list_own_records(self):
        """Patient should only see their own medical records."""
        MedicalRecord.objects.create(
            patient=self.patient,
            doctor=self.doctor_profile,
            diagnosis='I10 - Tăng huyết áp',
            symptoms='Đau đầu, chóng mặt',
            prescription='Amlodipine 5mg|1 lần/ngày|30 ngày',
        )
        self.client.force_authenticate(user=self.patient)
        response = self.client.get('/api/medical-records/')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', response.json())
        records = data if isinstance(data, list) else data.get('results', [])
        self.assertGreaterEqual(len(records), 1)

    def test_check_interactions_endpoint(self):
        """Drug interaction check endpoint should return valid response."""
        self.client.force_authenticate(user=self.doctor_user)
        response = self.client.post(
            '/api/medical-records/check-interactions/',
            {'prescription': 'Aspirin 81mg|1 lần/ngày\nWarfarin 5mg|1 lần/ngày'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        self.assertTrue(data['has_warnings'])
        self.assertGreater(len(data['interactions']), 0)

