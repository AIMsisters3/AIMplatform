<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Generic key/value site configuration (schema.sql's `settings` table —
 * existed with zero backend code until now). Used for Shop-wide config
 * that's genuinely just text an admin fills in (business contact
 * details for branded documents, bank/mobile-wallet payment
 * instructions, draft refund policy) — nothing here is ever invented by
 * the app itself; every key defaults to an empty string until an admin
 * sets it.
 */
class Setting
{
    private PDO $db;

    /** Every Shop setting key this app knows how to render, with a human label for the admin form — the single source of truth for both. */
    public const SHOP_KEYS = [
        'shop.business_name'                   => 'Business Name',
        'shop.business_email'                  => 'Business Email',
        'shop.business_phone'                  => 'Business Phone',
        'shop.business_address'                => 'Business Address',
        'shop.payment_instructions_bank'       => 'Bank Transfer Instructions',
        'shop.payment_instructions_mobile_wallet' => 'Mobile Wallet Instructions',
        'shop.refund_policy'                   => 'Returns & Refunds Policy',
        'shop.low_stock_threshold'             => 'Low Stock Alert Threshold',
    ];

    /** Fallback used only until an admin sets shop.low_stock_threshold for the first time — never silently treated as "the" threshold once a real value exists. */
    public const DEFAULT_LOW_STOCK_THRESHOLD = 5;

    /** The effective, admin-configurable low-stock threshold (spec: "admin-configurable threshold" — never hardcoded past this one read). */
    public function lowStockThreshold(): int
    {
        $value = $this->getMany(['shop.low_stock_threshold'])['shop.low_stock_threshold'] ?? '';
        $n = (int) $value;
        return $n > 0 ? $n : self::DEFAULT_LOW_STOCK_THRESHOLD;
    }

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** @return array<string,string> key => value, only for the given keys (missing ones simply aren't in the result — caller should default to ''). */
    public function getMany(array $keys): array
    {
        if (empty($keys)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ($placeholders)");
        $stmt->execute($keys);
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $result[$row['setting_key']] = $row['setting_value'];
        }
        return $result;
    }

    public function set(string $key, ?string $value): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO settings (setting_key, setting_value) VALUES (:key, :value)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        $stmt->execute(['key' => $key, 'value' => $value]);
    }

    public function setMany(array $keyValues): void
    {
        foreach ($keyValues as $key => $value) {
            $this->set($key, $value);
        }
    }
}
