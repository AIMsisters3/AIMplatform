<?php
/**
 * AIMsisters - Minimal HS256 JWT helper (no external dependency).
 * For heavier production use, swap in firebase/php-jwt via composer.
 */

class JWT
{
    public static function encode(array $payload, string $secret = JWT_SECRET): string
    {
        $header = ['typ' => 'JWT', 'alg' => JWT_ALGO];

        $payload['iat'] = $payload['iat'] ?? time();
        $payload['exp'] = $payload['exp'] ?? (time() + JWT_EXPIRY_SECONDS);

        $segments = [
            self::base64UrlEncode(json_encode($header)),
            self::base64UrlEncode(json_encode($payload)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * @return array|null decoded payload, or null if invalid/expired
     */
    public static function decode(string $token, string $secret = JWT_SECRET): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerB64, $payloadB64, $sigB64] = $parts;

        $expectedSig = hash_hmac('sha256', $headerB64 . '.' . $payloadB64, $secret, true);
        $actualSig   = self::base64UrlDecode($sigB64);

        if (!hash_equals($expectedSig, $actualSig)) {
            return null; // tampered or wrong secret
        }

        $payload = json_decode(self::base64UrlDecode($payloadB64), true);
        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && time() > $payload['exp']) {
            return null; // expired
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $padded = str_pad($data, strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + (4 - strlen($data) % 4), '=');
        return base64_decode(strtr($padded, '-_', '+/'));
    }
}
