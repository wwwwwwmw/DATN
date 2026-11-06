-- =============================================
-- 007_notifications.sql
-- Bảng thông báo cho người dùng
-- =============================================

/*
CREATE TABLE IF NOT EXISTS notifications_notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INFO'
        CHECK (type IN ('INFO', 'APPOINTMENT', 'XRAY_RESULT', 'CHAT', 'SYSTEM', 'REMINDER')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_object_type VARCHAR(50) DEFAULT '',   -- 'appointment', 'xray_result', 'chat_session'
    related_object_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_user ON notifications_notification(user_id);
CREATE INDEX idx_notification_unread ON notifications_notification(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notification_created ON notifications_notification(created_at DESC);
*/

SELECT 'notifications schema reference loaded' AS status;
