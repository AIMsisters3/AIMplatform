<?php

require_once __DIR__ . '/../config/database.php';

/** Admin-configured town/area -> delivery fee, plus pickup locations (migration 015). */
class DeliveryArea
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** @param bool $activeOnly public storefront/checkout should only ever see active areas. */
    public function all(bool $activeOnly = true): array
    {
        $sql = 'SELECT * FROM delivery_areas' . ($activeOnly ? ' WHERE is_active = 1' : '') . ' ORDER BY is_pickup ASC, sort_order ASC, name ASC';
        return $this->db->query($sql)->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM delivery_areas WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO delivery_areas (name, fee, is_pickup, instructions, is_active, sort_order)
             VALUES (:name, :fee, :is_pickup, :instructions, :is_active, :sort_order)'
        );
        $stmt->execute([
            'name'         => $data['name'],
            'fee'          => $data['is_pickup'] ?? false ? 0 : ($data['fee'] ?? 0),
            'is_pickup'    => !empty($data['is_pickup']) ? 1 : 0,
            'instructions' => $data['instructions'] ?? null,
            'is_active'    => array_key_exists('is_active', $data) ? (int) (bool) $data['is_active'] : 1,
            'sort_order'   => $data['sort_order'] ?? 0,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $allowed = ['name', 'fee', 'is_pickup', 'instructions', 'is_active', 'sort_order'];
        $fields = [];
        $params = ['id' => $id];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = in_array($field, ['is_pickup', 'is_active'], true) ? (int) (bool) $data[$field] : $data[$field];
            }
        }
        if (empty($fields)) return false;
        return $this->db->prepare('UPDATE delivery_areas SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
    }

    public function delete(int $id): bool
    {
        return $this->db->prepare('DELETE FROM delivery_areas WHERE id = :id')->execute(['id' => $id]);
    }
}
