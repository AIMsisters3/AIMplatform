<?php

require_once __DIR__ . '/../models/Setting.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class SettingController
{
    private Setting $model;

    public function __construct()
    {
        $this->model = new Setting();
    }

    /**
     * GET /api/settings/shop — public. Only the Shop's own known keys are
     * ever exposed here (never an arbitrary settings_key an admin might
     * store for something else) and every key defaults to '' rather than
     * being omitted, so the frontend never has to guess whether a blank
     * value means "not set yet" vs "field doesn't exist".
     */
    public function shop(): void
    {
        $keys = array_keys(Setting::SHOP_KEYS);
        $values = $this->model->getMany($keys);
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $values[$key] ?? '';
        }
        json_ok(['items' => $result]);
    }

    /** PUT /api/settings/shop (requires shop.settings_manage) body: {"shop.business_name": "...", ...} */
    public function updateShop(): void
    {
        require_permission('shop.settings_manage');
        $body = get_json_body();

        $allowedKeys = array_keys(Setting::SHOP_KEYS);
        $toSet = [];
        foreach ($body as $key => $value) {
            if (in_array($key, $allowedKeys, true)) {
                $toSet[$key] = is_string($value) ? $value : (string) $value;
            }
        }

        $this->model->setMany($toSet);
        json_ok(null, 'Shop settings updated.');
    }
}
