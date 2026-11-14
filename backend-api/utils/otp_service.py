"""
OTP & Email Service for MedTech AI.
Handles OTP generation, sending via Gmail SMTP, verification, and Password Reset.
"""
import random
import logging
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


def generate_otp_code(length=6) -> str:
    """Generate a random numeric OTP code."""
    return ''.join([str(random.randint(0, 9)) for _ in range(length)])


def send_profile_update_otp(user) -> dict:
    """
    Generate and send a 6-digit OTP to user's email for profile updating.
    OTP valid for 10 minutes (600 seconds).
    """
    if not user.email:
        return {'success': False, 'message': 'Tài khoản chưa có địa chỉ email hợp lệ.'}

    code = generate_otp_code(6)
    cache_key = f"otp_profile_{user.id}"
    cache.set(cache_key, code, timeout=600)

    subject = "[MedTech AI] Mã OTP xác thực cập nhật hồ sơ cá nhân"
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0068ff 0%, #0052cc 100%); color: white; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: bold;">Hệ Thống Y Tế MedTech AI</h2>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Xác thực bảo mật tài khoản y tế</p>
        </div>
        <div style="padding: 28px; background: #ffffff;">
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Xin chào <strong>{user.get_full_name() or user.username}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Bạn đang thực hiện thao tác cập nhật thông tin hồ sơ trên hệ thống MedTech AI. Để đảm bảo an toàn dữ liệu y tế, vui lòng sử dụng mã xác thực OTP dưới đây:
            </p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; background: #eff6ff; border: 2px dashed #0068ff; color: #0068ff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 28px; border-radius: 8px;">
                    {code}
                </span>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                ⏱️ Mã OTP này có hiệu lực trong vòng <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
            </p>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ ngay với Ban Quản trị hệ thống qua email: 1150080125@sv.hcmunre.edu.vn.
            </p>
        </div>
        <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 Nền tảng Lâm sàng MedTech AI. Mọi quyền được bảo lưu.
        </div>
    </div>
    """
    plain_message = f"Mã xác thực OTP cập nhật hồ sơ MedTech AI của bạn là: {code}. Mã có hiệu lực trong 10 phút."

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return {'success': True, 'message': f'Mã OTP đã được gửi đến email {user.email}. Vui lòng kiểm tra hộp thư.'}
    except Exception as e:
        logger.error(f"Failed to send OTP email to {user.email}: {e}")
        return {'success': False, 'message': f'Không thể gửi email OTP: {str(e)}'}


def verify_profile_update_otp(user, code: str) -> bool:
    """Verify OTP for user profile update."""
    if not code:
        return False
    cache_key = f"otp_profile_{user.id}"
    saved_code = cache.get(cache_key)
    if saved_code and str(saved_code).strip() == str(code).strip():
        # Clean OTP and set verified flag for 15 minutes
        cache.delete(cache_key)
        cache.set(f"otp_verified_user_{user.id}", True, timeout=900)
        return True
    return False


def is_user_otp_verified(user) -> bool:
    """Check if user has successfully verified OTP in the last 15 minutes."""
    return bool(cache.get(f"otp_verified_user_{user.id}"))


def clear_user_otp_verification(user):
    """Clear OTP verification flag after profile is saved."""
    cache.delete(f"otp_verified_user_{user.id}")


def send_forgot_password_email(email: str) -> dict:
    """
    Reset user password and email a new temporary password to the user.
    """
    email_clean = (email or '').strip().lower()
    user = User.objects.filter(email__iexact=email_clean).first()
    if not user:
        # Return generic success message for security
        return {
            'success': True,
            'message': 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mật khẩu mới về hộp thư của bạn. Vui lòng kiểm tra email và đổi mật khẩu sau khi đăng nhập lại.'
        }

    # Generate strong memorable password
    random_num = random.randint(1000, 9999)
    new_password = f"MedTech@{random_num}"
    user.set_password(new_password)
    user.save(update_fields=['password'])

    subject = "[MedTech AI] Cấp lại mật khẩu mới cho tài khoản của bạn"
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0068ff 0%, #0052cc 100%); color: white; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: bold;">Hệ Thống Y Tế MedTech AI</h2>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Yêu cầu cấp lại mật khẩu đăng nhập</p>
        </div>
        <div style="padding: 28px; background: #ffffff;">
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Xin chào <strong>{user.get_full_name() or user.username}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Hệ thống MedTech AI đã tiếp nhận yêu cầu khôi phục mật khẩu cho tài khoản <strong>{user.email}</strong>. Mật khẩu mới được tạo tự động của bạn là:
            </p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; background: #f0fdf4; border: 2px solid #22c55e; color: #15803d; font-size: 26px; font-weight: bold; letter-spacing: 2px; padding: 12px 28px; border-radius: 8px;">
                    {new_password}
                </span>
            </div>
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.5;">
                    ⚠️ <strong>Lưu ý bảo mật quan trọng:</strong> Vì lý do an toàn, bạn nên đăng nhập ngay và đổi lại mật khẩu cá nhân tại mục <em>Cài đặt & Bảo mật</em>.
                </p>
            </div>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                Nếu bạn không yêu cầu đặt lại mật khẩu này, vui lòng liên hệ ngay với Quản trị viên qua email: 1150080125@sv.hcmunre.edu.vn.
            </p>
        </div>
        <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 Nền tảng Lâm sàng MedTech AI. Mọi quyền được bảo lưu.
        </div>
    </div>
    """
    plain_message = f"Mật khẩu mới cho tài khoản MedTech AI ({user.email}) của bạn là: {new_password}. Bạn nên đổi mật khẩu sau khi đăng nhập lại."

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send reset password email to {user.email}: {e}")

    return {
        'success': True,
        'message': 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mật khẩu mới về hộp thư của bạn. Vui lòng kiểm tra email và đổi mật khẩu sau khi đăng nhập lại.'
    }
