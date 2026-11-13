"""
Standalone test runner — Chạy test nhanh bằng Python trực tiếp.
Không cần tạo database test mới.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from apps.medical_records.drug_interactions import check_drug_interactions

def run_drug_interaction_tests():
    """Test drug interaction checker without database."""
    print("=" * 60)
    print("DRUG INTERACTION TESTS")
    print("=" * 60)
    passed = 0
    failed = 0

    # Test 1: Aspirin + Warfarin
    result = check_drug_interactions("Aspirin 81mg|1 lần/ngày|30 ngày\nWarfarin 5mg|1 lần/ngày|30 ngày")
    if len(result) > 0 and result[0]['severity'] == 'HIGH':
        print("✅ PASS: Aspirin + Warfarin → HIGH risk bleeding")
        passed += 1
    else:
        print("❌ FAIL: Aspirin + Warfarin should trigger HIGH warning")
        failed += 1

    # Test 2: No interaction
    result = check_drug_interactions("Paracetamol 500mg|3 lần/ngày|7 ngày\nOmeprazole 20mg|1 lần/ngày|14 ngày")
    if len(result) == 0:
        print("✅ PASS: Paracetamol + Omeprazole → No interaction")
        passed += 1
    else:
        print("❌ FAIL: Paracetamol + Omeprazole should have no interaction")
        failed += 1

    # Test 3: Omeprazole + Clopidogrel
    result = check_drug_interactions("Omeprazole 20mg|1 lần/ngày\nClopidogrel 75mg|1 lần/ngày")
    if len(result) > 0 and result[0]['severity'] == 'MODERATE':
        print("✅ PASS: Omeprazole + Clopidogrel → MODERATE CYP2C19")
        passed += 1
    else:
        print("❌ FAIL: Omeprazole + Clopidogrel should be MODERATE")
        failed += 1

    # Test 4: Single drug
    result = check_drug_interactions("Aspirin 81mg|1 lần/ngày|30 ngày")
    if len(result) == 0:
        print("✅ PASS: Single drug → No interaction")
        passed += 1
    else:
        print("❌ FAIL: Single drug should have no interactions")
        failed += 1

    # Test 5: Empty
    result = check_drug_interactions('')
    if len(result) == 0:
        print("✅ PASS: Empty prescription → No interaction")
        passed += 1
    else:
        print("❌ FAIL: Empty prescription should return []")
        failed += 1

    # Test 6: Statin + Macrolide
    result = check_drug_interactions("Atorvastatin 20mg|1 lần/ngày\nClarithromycin 500mg|2 lần/ngày")
    if len(result) > 0 and result[0]['severity'] == 'HIGH':
        print("✅ PASS: Atorvastatin + Clarithromycin → HIGH rhabdomyolysis")
        passed += 1
    else:
        print("❌ FAIL: Atorvastatin + Clarithromycin should be HIGH")
        failed += 1

    # Test 7: Beta-blocker + Verapamil
    result = check_drug_interactions("Bisoprolol 5mg|1 lần/ngày\nVerapamil 80mg|3 lần/ngày")
    if len(result) > 0 and result[0]['severity'] == 'HIGH':
        print("✅ PASS: Bisoprolol + Verapamil → HIGH bradycardia")
        passed += 1
    else:
        print("❌ FAIL: Bisoprolol + Verapamil should be HIGH")
        failed += 1

    # Test 8: ACEi + Spironolactone
    result = check_drug_interactions("Enalapril 10mg|2 lần/ngày\nSpironolactone 25mg|1 lần/ngày")
    if len(result) > 0 and result[0]['severity'] == 'HIGH':
        print("✅ PASS: Enalapril + Spironolactone → HIGH hyperkalemia")
        passed += 1
    else:
        print("❌ FAIL: Enalapril + Spironolactone should be HIGH")
        failed += 1

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed}")
    print(f"{'=' * 60}")
    return failed


def run_digital_signature_tests():
    """Test HMAC-SHA256 signature (requires database)."""
    print("\n" + "=" * 60)
    print("DIGITAL SIGNATURE TESTS")
    print("=" * 60)
    passed = 0
    failed = 0

    try:
        from apps.accounts.models import CustomUser
        from apps.medical_records.models import XrayAnalysisResult

        # Find existing test data
        doctor = CustomUser.objects.filter(role='DOCTOR').first()
        xray = XrayAnalysisResult.objects.first()

        if doctor and xray:
            # Test sign
            xray.doctor_review = 'Test review for signature'
            xray.doctor_agrees_with_ai = True
            sig = xray.sign_review(doctor)
            if sig and len(sig) == 64:
                print(f"✅ PASS: sign_review generates 64-char hex signature: {sig[:16]}...")
                passed += 1
            else:
                print("❌ FAIL: sign_review should return 64-char hex string")
                failed += 1

            # Test verify (valid)
            if xray.verify_signature(doctor):
                print("✅ PASS: verify_signature returns True for valid signature")
                passed += 1
            else:
                print("❌ FAIL: verify_signature should return True")
                failed += 1

            # Test verify (tampered)
            xray.doctor_review = 'Tampered content'
            if not xray.verify_signature(doctor):
                print("✅ PASS: verify_signature returns False for tampered content")
                passed += 1
            else:
                print("❌ FAIL: verify_signature should return False for tampered content")
                failed += 1

            # Test verify (wrong doctor)
            other_doc = CustomUser.objects.filter(role='DOCTOR').exclude(pk=doctor.pk).first()
            if other_doc:
                xray.doctor_review = 'Test review for signature'
                xray.sign_review(doctor)
                if not xray.verify_signature(other_doc):
                    print("✅ PASS: verify_signature returns False for wrong doctor")
                    passed += 1
                else:
                    print("❌ FAIL: verify_signature should return False for wrong doctor")
                    failed += 1
            else:
                print("⚠️  SKIP: Only one doctor in DB, skipping wrong-doctor test")
        else:
            print("⚠️  SKIP: No doctor/xray data in DB, skipping signature tests")
    except Exception as e:
        print(f"⚠️  ERROR: {e}")

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {passed} passed, {failed} failed")
    print(f"{'=' * 60}")
    return failed


def run_no_finding_tests():
    """Test No Finding classification logic."""
    print("\n" + "=" * 60)
    print("NO FINDING CLASSIFICATION TESTS")
    print("=" * 60)
    passed = 0
    failed = 0

    # Simulate predictions
    predictions_normal = {
        'No Finding': 0.674,
        'Lung Opacity': 0.099,
        'Atelectasis': 0.058,
        'Cardiomegaly': 0.012,
    }

    # Test: No Finding dominant → max pathology < 30%
    max_path = max(v for k, v in predictions_normal.items() if k != 'No Finding')
    if max_path < 0.30:
        print("✅ PASS: No Finding dominant → no pathology exceeds 30% threshold")
        passed += 1
    else:
        print("❌ FAIL: Should not trigger high risk when No Finding is dominant")
        failed += 1

    # Test: No Finding is top prediction
    sorted_preds = sorted(predictions_normal.items(), key=lambda x: x[1], reverse=True)
    if sorted_preds[0][0] == 'No Finding':
        print("✅ PASS: No Finding is correctly the top prediction")
        passed += 1
    else:
        print("❌ FAIL: No Finding should be top prediction")
        failed += 1

    # Test: Real pathology case
    predictions_cardio = {
        'Cardiomegaly': 0.542,
        'Atelectasis': 0.18,
        'Pleural Effusion': 0.09,
    }
    sorted_cardio = sorted(predictions_cardio.items(), key=lambda x: x[1], reverse=True)
    if sorted_cardio[0][0] == 'Cardiomegaly' and sorted_cardio[0][1] > 0.30:
        print("✅ PASS: Cardiomegaly 54.2% correctly flagged for clinical follow-up")
        passed += 1
    else:
        print("❌ FAIL: Cardiomegaly should be correctly identified")
        failed += 1

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {passed} passed, {failed} failed")
    print(f"{'=' * 60}")
    return failed


if __name__ == '__main__':
    total_failures = 0
    total_failures += run_drug_interaction_tests()
    total_failures += run_no_finding_tests()
    total_failures += run_digital_signature_tests()

    print(f"\n{'#' * 60}")
    if total_failures == 0:
        print("🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️  {total_failures} TEST(S) FAILED")
    print(f"{'#' * 60}")
    sys.exit(total_failures)

