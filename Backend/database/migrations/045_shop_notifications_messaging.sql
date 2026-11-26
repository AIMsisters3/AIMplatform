-- =========================================================
-- Migration 045: SMS/WhatsApp message log + delivery pricing settings
--
-- HOW TO RUN: after migration 044. Safe to run once.
--
-- WHAT THIS DOES
--
-- notification_messages - one row per SMS/WhatsApp send attempt (spec:
-- "record sending status... record delivery status where supported...
-- keep a notification history visible to administrators"). status
-- starts 'skipped' (no provider configured) or 'failed'/'sent' from the
-- immediate API response; delivered_at/status get updated later by
-- Twilio's status-callback webhook when it fires. Never set to
-- 'delivered' speculatively - only a real callback does that.
-- =========================================================

CREATE TABLE IF NOT EXISTS notification_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED DEFAULT NULL,
  order_id INT UNSIGNED DEFAULT NULL,
  phone VARCHAR(30) NOT NULL,
  channel ENUM('sms','whatsapp') NOT NULL,
  event_type VARCHAR(60) DEFAULT NULL,
  message TEXT NOT NULL,
  status ENUM('sent','delivered','failed','skipped') NOT NULL DEFAULT 'skipped',
  provider_message_sid VARCHAR(80) DEFAULT NULL,
  error TEXT,
  delivered_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notification_messages_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_notification_messages_status (status),
  INDEX idx_notification_messages_sid (provider_message_sid)
) ENGINE=InnoDB;
