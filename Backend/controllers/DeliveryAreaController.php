<?php

require_once __DIR__ . '/../models/DeliveryArea.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';
require_once __DIR__ . '/../helpers/delivery_quote.php';

/**
 * Delivery areas/fees + pickup locations — admin-configured (spec: "Do
 * not let the client submit arbitrary delivery prices"). Checkout only
 * ever reads a fee by delivery_area_id server-side; the client never
 * sends a fee amount for the server to trust.
 */
class DeliveryAreaController
{
    private DeliveryArea $model;

    public function __construct()
    {
        $this->model = new DeliveryArea();
    }

    /** GET /api/delivery-areas — public; admins add ?all=1 to also see inactive ones. */
    public function index(): void
    {
        $activeOnly = true;
        if (!empty($_GET['all'])) {
            $payload = optional_auth();
            if ($payload && user_has_permission($payload, 'shop.settings_manage')) {
                $activeOnly = false;
            }
        }
        json_ok(['items' => $this->model->all($activeOnly)]);
    }

    /** POST /api/delivery-areas (requires shop.settings_manage) */
    public function store(): void
    {
        require_permission('shop.settings_manage');
        $body = get_json_body();

        if (empty($body['name'])) {
            json_error('A name is required.', 422);
        }
        if (empty($body['is_pickup']) && !isset($body['fee'])) {
            json_error('A delivery fee is required (0 is fine for free delivery).', 422);
        }

        $id = $this->model->create($body);
        json_created(['id' => $id], 'Delivery area created.');
    }

    /** PUT /api/delivery-areas/{id} (requires shop.settings_manage) */
    public function update(int $id): void
    {
        require_permission('shop.settings_manage');
        if (!$this->model->find($id)) {
            json_error('Delivery area not found.', 404);
        }
        $this->model->update($id, get_json_body());
        json_ok(null, 'Delivery area updated.');
    }

    /** DELETE /api/delivery-areas/{id} (requires shop.settings_manage) */
    public function destroy(int $id): void
    {
        require_permission('shop.settings_manage');
        if (!$this->model->find($id)) {
            json_error('Delivery area not found.', 404);
        }
        $this->model->delete($id);
        json_ok(null, 'Delivery area deleted.');
    }

    /**
     * POST /api/delivery-areas/quote (public) body: {latitude, longitude}
     * — the real delivery-fee quote for this exact point, computed
     * server-side (never trusts a client-submitted fee - see this
     * class's own docblock). Checked once more at order placement too,
     * so a quote that goes stale between viewing and confirming can
     * never be used to undercharge.
     */
    public function quote(): void
    {
        $body = get_json_body();
        $lat = isset($body['latitude']) ? (float) $body['latitude'] : null;
        $lng = isset($body['longitude']) ? (float) $body['longitude'] : null;
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            json_error('A valid latitude and longitude are required.', 422);
        }
        json_ok(compute_delivery_quote($lat, $lng));
    }
}
