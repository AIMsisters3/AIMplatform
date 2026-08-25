<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class CategoryController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /** GET /api/categories?type=content|product */
    public function index(): void
    {
        $type = $_GET['type'] ?? null;

        if ($type) {
            $stmt = $this->db->prepare('SELECT * FROM categories WHERE type = :type ORDER BY name');
            $stmt->execute(['type' => $type]);
        } else {
            $stmt = $this->db->query('SELECT * FROM categories ORDER BY name');
        }

        json_ok(['items' => $stmt->fetchAll()]);
    }

    /** POST /api/categories (admin only) */
    public function store(): void
    {
        require_permission('categories.manage');
        $body = get_json_body();

        if (empty($body['name'])) {
            json_error('Name is required.', 422);
        }

        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['name']), '-'));

        $stmt = $this->db->prepare(
            'INSERT INTO categories (name, slug, type, description) VALUES (:name, :slug, :type, :description)'
        );
        $stmt->execute([
            'name'        => $body['name'],
            'slug'        => $slug,
            'type'        => $body['type'] ?? 'content',
            'description' => $body['description'] ?? null,
        ]);

        json_created(['id' => (int) $this->db->lastInsertId()], 'Category created successfully.');
    }

    /** DELETE /api/categories/{id} (admin only) */
    public function destroy(int $id): void
    {
        require_permission('categories.manage');
        $stmt = $this->db->prepare('DELETE FROM categories WHERE id = :id');
        $stmt->execute(['id' => $id]);
        json_ok(null, 'Category deleted successfully.');
    }
}
