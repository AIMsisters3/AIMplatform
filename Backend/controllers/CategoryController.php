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

    /** GET /api/categories?type=content|product&parent_id= */
    public function index(): void
    {
        $type = $_GET['type'] ?? null;
        $where = [];
        $params = [];

        if ($type) {
            $where[] = 'type = :type';
            $params['type'] = $type;
        }
        // parent_id=0 (or "root"/"null") means "top-level only"; omit the
        // filter entirely to get the full flat list (with each row's own
        // parent_id) for callers that want to group client-side.
        if (isset($_GET['parent_id'])) {
            if (in_array($_GET['parent_id'], ['0', 'root', 'null'], true)) {
                $where[] = 'parent_id IS NULL';
            } else {
                $where[] = 'parent_id = :parent_id';
                $params['parent_id'] = (int) $_GET['parent_id'];
            }
        }

        $sql = 'SELECT * FROM categories' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY name';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        json_ok(['items' => $stmt->fetchAll()]);
    }

    /** POST /api/categories (admin only) body: {name, type?, description?, parent_id?} */
    public function store(): void
    {
        require_permission('categories.manage');
        $body = get_json_body();

        if (empty($body['name'])) {
            json_error('Name is required.', 422);
        }

        $parentId = !empty($body['parent_id']) ? (int) $body['parent_id'] : null;
        if ($parentId !== null) {
            $parent = $this->db->prepare('SELECT id, type FROM categories WHERE id = :id');
            $parent->execute(['id' => $parentId]);
            $parentRow = $parent->fetch();
            if (!$parentRow) {
                json_error('Parent category not found.', 422);
            }
            // Keep the tree one level deep and internally consistent — a
            // subcategory always shares its parent's type rather than
            // letting a content category end up nested under a product one.
            $body['type'] = $parentRow['type'];
        }

        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $body['name']), '-'));

        $stmt = $this->db->prepare(
            'INSERT INTO categories (name, slug, type, description, parent_id) VALUES (:name, :slug, :type, :description, :parent_id)'
        );
        $stmt->execute([
            'name'        => $body['name'],
            'slug'        => $slug,
            'type'        => $body['type'] ?? 'content',
            'description' => $body['description'] ?? null,
            'parent_id'   => $parentId,
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
