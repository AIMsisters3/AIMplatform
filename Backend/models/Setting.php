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
        'shop.mobile_wallet_number'            => 'Mobile Wallet Number',
        'shop.payment_instructions_bank'       => 'Bank Transfer Instructions',
        'shop.payment_instructions_mobile_wallet' => 'Mobile Wallet Instructions',
        'shop.refund_policy'                   => 'Returns & Refunds Policy',
        'shop.low_stock_threshold'             => 'Low Stock Alert Threshold',
        // "AIM-YYYYMMDD-001 Pay Later complete admin/customer experience" spec:
        // a strict 7-day Pay Later period, terminated at this clock time
        // each day (Africa/Windhoek - config.php's single fixed app timezone).
        'shop.pay_later_termination_time'      => 'Pay Later Daily Termination Time (HH:MM)',
        // Distance-based delivery pricing (helpers/delivery_quote.php) -
        // base_fee + per_km_fee * distance, clamped to [min_fee, max_fee].
        'shop.delivery_base_fee'               => 'Delivery Base Fee (N$)',
        'shop.delivery_fee_per_km'             => 'Delivery Fee per Kilometre (N$)',
        'shop.delivery_min_fee'                => 'Minimum Delivery Fee (N$)',
        'shop.delivery_max_fee'                => 'Maximum Delivery Fee (N$, optional)',
    ];

    /** Fallback used only until an admin sets shop.low_stock_threshold for the first time — never silently treated as "the" threshold once a real value exists. */
    public const DEFAULT_LOW_STOCK_THRESHOLD = 5;

    /**
     * Site-wide config shared across the whole app (not Shop-specific) -
     * currently just the official WhatsApp contact number, previously
     * hardcoded independently in FloatingWhatsAppButton.jsx AND
     * Contact.jsx. Both now read it from here instead, so there is
     * exactly one place an admin sets the real number.
     */
    public const SITE_KEYS = [
        'site.whatsapp_number' => 'WhatsApp Number',
    ];

    /** Bible Studies-specific settings (redesign spec §8) - the WhatsApp number itself is deliberately NOT duplicated here, see SITE_KEYS above. */
    public const BIBLE_STUDY_KEYS = [
        'bible_study.page_visible'        => 'Bible Studies Page Visible to Public',
        'bible_study.featured_limit'      => 'Featured Studies Display Limit',
        'bible_study.featured_min_views'  => 'Featured Minimum Views',
        'bible_study.featured_min_likes'  => 'Featured Minimum Likes',
        'bible_study.default_sort'        => 'Default Study Sorting',
    ];

    public const DEFAULT_FEATURED_LIMIT = 8;
    public const DEFAULT_FEATURED_MIN_VIEWS = 10;
    public const DEFAULT_FEATURED_MIN_LIKES = 5;

    /** The effective Featured Studies settings - every value defaults until an admin overrides it, same pattern as lowStockThreshold(). */
    public function bibleStudyFeaturedSettings(): array
    {
        $v = $this->getMany(['bible_study.featured_limit', 'bible_study.featured_min_views', 'bible_study.featured_min_likes']);
        return [
            'limit'     => ((int) ($v['bible_study.featured_limit'] ?? 0)) ?: self::DEFAULT_FEATURED_LIMIT,
            'min_views' => isset($v['bible_study.featured_min_views']) && $v['bible_study.featured_min_views'] !== ''
                ? (int) $v['bible_study.featured_min_views'] : self::DEFAULT_FEATURED_MIN_VIEWS,
            'min_likes' => isset($v['bible_study.featured_min_likes']) && $v['bible_study.featured_min_likes'] !== ''
                ? (int) $v['bible_study.featured_min_likes'] : self::DEFAULT_FEATURED_MIN_LIKES,
        ];
    }

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
