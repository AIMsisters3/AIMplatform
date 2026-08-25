<?php
/**
 * AIMsisters - Standard JSON response helpers
 */

function json_response(bool $success, $data = null, string $message = '', int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');

    $payload = ['success' => $success];
    if ($message !== '') {
        $payload['message'] = $message;
    }
    if ($data !== null) {
        $payload['data'] = $data;
    }

    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function json_ok($data = null, string $message = ''): void
{
    json_response(true, $data, $message, 200);
}

function json_created($data = null, string $message = 'Created successfully'): void
{
    json_response(true, $data, $message, 201);
}

function json_error(string $message, int $statusCode = 400, $data = null): void
{
    json_response(false, $data, $message, $statusCode);
}

function get_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
