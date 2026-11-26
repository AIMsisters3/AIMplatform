<?php
/**
 * AIMsisters - delivery fee quoting.
 *
 * Two mechanisms, tried in order:
 *   1. Admin-configured delivery area (center + radius_km, "special-area
 *      pricing" - spec Part G §19) - a flat fee for a named zone an
 *      admin has deliberately priced. Computed server-side here (not
 *      trusted from the client - see compute_delivery_quote()'s own
 *      docblock) even though Frontend/src/utils/geo.js's
 *      matchDeliveryArea() already does the same match client-side for
 *      instant UI feedback; this is the one that actually prices the order.
 *   2. Mapbox Directions API - real route distance from the shop's
 *      configured dispatch point, fee = base + per_km * distance,
 *      clamped to [min, max]. Falls back to "unavailable" (never a
 *      guessed distance) when MAPBOX_ACCESS_TOKEN isn't set or the API
 *      call fails.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Setting.php';

/** Same formula as Frontend/src/utils/geo.js's haversineDistanceKm() - kept in sync deliberately, not shared code (different languages). */
function haversine_distance_km(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earthRadiusKm = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadiusKm * $c;
}

/** The nearest configured delivery area whose radius actually contains this point, or null. Mirrors Frontend/src/utils/geo.js's matchDeliveryArea() exactly. */
function match_delivery_area(float $lat, float $lng): ?array
{
    $stmt = Database::getConnection()->prepare(
        "SELECT * FROM delivery_areas
         WHERE is_active = 1 AND is_pickup = 0
           AND center_latitude IS NOT NULL AND center_longitude IS NOT NULL AND radius_km IS NOT NULL"
    );
    $stmt->execute();
    $best = null;
    $bestDistance = INF;
    foreach ($stmt->fetchAll() as $area) {
        $distance = haversine_distance_km($lat, $lng, (float) $area['center_latitude'], (float) $area['center_longitude']);
        if ($distance <= (float) $area['radius_km'] && $distance < $bestDistance) {
            $best = $area;
            $bestDistance = $distance;
        }
    }
    return $best;
}

/**
 * Calls Mapbox's Directions API for the real driving distance from the
 * shop's dispatch point (SHOP_DISPATCH_LATITUDE/LONGITUDE) to the given
 * destination. Returns kilometres, or null if unconfigured/unreachable/
 * no route found - callers must never substitute a guessed distance for
 * null (explicit spec requirement).
 */
function mapbox_route_distance_km(float $destLat, float $destLng): ?float
{
    if (MAPBOX_ACCESS_TOKEN === '' || !function_exists('curl_init')) {
        return null;
    }

    $url = sprintf(
        'https://api.mapbox.com/directions/v5/mapbox/driving/%F,%F;%F,%F?access_token=%s&overview=false',
        SHOP_DISPATCH_LONGITUDE, SHOP_DISPATCH_LATITUDE, $destLng, $destLat, MAPBOX_ACCESS_TOKEN
    );

    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("Mapbox Directions API returned HTTP {$httpCode}: " . substr((string) $response, 0, 300));
        return null;
    }

    $data = json_decode((string) $response, true);
    $meters = $data['routes'][0]['distance'] ?? null;
    return $meters !== null ? round($meters / 1000, 2) : null;
}

/**
 * The one entry point checkout calls. $lat/$lng are the customer's own
 * pinned delivery location - always computed server-side from them, the
 * client never sends (and this never trusts) a fee amount directly, same
 * security contract DeliveryAreaController's own docblock already states
 * for the area-lookup path.
 *
 * @return array{available: bool, source?: string, fee?: float, distance_km?: float, area_id?: int, area_name?: string, message?: string}
 */
function compute_delivery_quote(float $lat, float $lng): array
{
    $area = match_delivery_area($lat, $lng);
    if ($area) {
        return [
            'available' => true, 'source' => 'area',
            'area_id' => (int) $area['id'], 'area_name' => $area['name'],
            'fee' => (float) $area['fee'],
        ];
    }

    $distanceKm = mapbox_route_distance_km($lat, $lng);
    if ($distanceKm === null) {
        return [
            'available' => false,
            'message' => 'We could not calculate a delivery quote for this location right now. Our team will confirm your delivery fee directly before your order is finalised.',
        ];
    }

    $settings = (new Setting())->getMany([
        'shop.delivery_base_fee', 'shop.delivery_fee_per_km', 'shop.delivery_min_fee', 'shop.delivery_max_fee',
    ]);
    $base = (float) ($settings['shop.delivery_base_fee'] ?: 0);
    $perKm = (float) ($settings['shop.delivery_fee_per_km'] ?: 0);
    $min = $settings['shop.delivery_min_fee'] !== '' && $settings['shop.delivery_min_fee'] !== null ? (float) $settings['shop.delivery_min_fee'] : null;
    $max = !empty($settings['shop.delivery_max_fee']) ? (float) $settings['shop.delivery_max_fee'] : null;

    $fee = $base + $perKm * $distanceKm;
    if ($min !== null) $fee = max($fee, $min);
    if ($max !== null) $fee = min($fee, $max);

    return ['available' => true, 'source' => 'mapbox', 'distance_km' => $distanceKm, 'fee' => round($fee, 2)];
}
