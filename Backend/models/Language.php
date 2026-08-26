<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Backs the `languages` lookup table (migration 007). Content.language
 * stores a code (e.g. 'en', 'ng') that must exist here - this is what
 * makes Language a controlled dropdown instead of free text, and lets a
 * new language be added later with a single INSERT instead of a schema
 * change.
 */
class Language
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function allActive(): array
    {
        $stmt = $this->db->query('SELECT code, name FROM languages WHERE is_active = 1 ORDER BY sort_order, name');
        return $stmt->fetchAll();
    }

    public function isValidCode(string $code): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM languages WHERE code = :code AND is_active = 1 LIMIT 1');
        $stmt->execute(['code' => $code]);
        return (bool) $stmt->fetchColumn();
    }
}
