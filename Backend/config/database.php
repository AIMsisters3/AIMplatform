<?php
/**
 * AIMsisters - Database connection (PDO singleton)
 */

require_once __DIR__ . '/config.php';

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                // Match config.php's date_default_timezone_set('Africa/Windhoek')
                // so MySQL's NOW()/CURRENT_TIMESTAMP and PHP's date()/time()
                // agree — otherwise a Pay Later due date computed in PHP and
                // a "is it overdue yet" check done in SQL could disagree by
                // whatever the server's raw OS/MySQL timezone happens to be.
                // A fixed offset (not a named zone) is used because MySQL's
                // named-timezone tables aren't loaded on every shared host by
                // default; Namibia has been a stable UTC+2, no-DST, single
                // timezone since 2018.
                self::$instance->exec("SET time_zone = '+02:00'");
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed.',
                    'error'   => APP_ENV === 'local' ? $e->getMessage() : null,
                ]);
                exit;
            }
        }

        return self::$instance;
    }
}
