<?php

require_once __DIR__ . '/../config/database.php';

/** Backs contact_messages (migration 024) - the Contact page's submissions. */
class ContactMessage
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(string $name, string $email, string $message): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO contact_messages (name, email, message) VALUES (:name, :email, :message)'
        );
        $stmt->execute(['name' => $name, 'email' => $email, 'message' => $message]);
        return (int) $this->db->lastInsertId();
    }
}
