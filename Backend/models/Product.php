<?php

require_once __DIR__ . '/../config/database.php';

class Product
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function all(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where  = ['p.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['category_id'])) {
            $where[] = 'p.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
        }
        if (!empty($filters['search'])) {
            $where[] = 'p.name LIKE :search';
            $params['search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['status'])) {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        } else {
            $where[] = "p.status = 'active'";
        }
        if (!empty($filters['min_price'])) {
            $where[] = 'p.price >= :min_price';
            $params['min_price'] = $filters['min_price'];
        }
        if (!empty($filters['max_price'])) {
            $where[] = 'p.price <= :max_price';
            $params['max_price'] = $filters['max_price'];
        }

        $sql = 'SELECT p.*, cat.name AS category_name
                FROM products p
                LEFT JOIN categories cat ON cat.id = p.category_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM products WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Like find(), but also returns a soft-deleted/inactive row — for internal use only (e.g. rendering an old order's line items), never expose directly to a public endpoint. */
    public function findAny(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function related(int $id, int $categoryId, int $limit = 4): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM products WHERE category_id = :cat AND id != :id AND status = 'active' AND deleted_at IS NULL LIMIT :limit"
        );
        $stmt->bindValue('cat', $categoryId, PDO::PARAM_INT);
        $stmt->bindValue('id', $id, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO products
                (name, slug, description, category_id, price, sale_price, sku, stock_quantity,
                 product_type, thumbnail, gallery_images, is_featured, status)
                VALUES
                (:name, :slug, :description, :category_id, :price, :sale_price, :sku, :stock_quantity,
                 :product_type, :thumbnail, :gallery_images, :is_featured, :status)';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name'           => $data['name'],
            'slug'           => $data['slug'],
            'description'    => $data['description'] ?? null,
            'category_id'    => $data['category_id'] ?? null,
            'price'          => $data['price'] ?? 0,
            'sale_price'     => $data['sale_price'] ?? null,
            'sku'            => $data['sku'] ?? null,
            'stock_quantity' => $data['stock_quantity'] ?? 0,
            'product_type'   => $data['product_type'] ?? 'physical',
            'thumbnail'      => $data['thumbnail'] ?? null,
            'gallery_images' => $data['gallery_images'] ?? null,
            'is_featured'    => !empty($data['is_featured']) ? 1 : 0,
            'status'         => $data['status'] ?? 'draft',
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];

        $allowed = [
            'name', 'slug', 'description', 'category_id', 'price', 'sale_price', 'sku',
            'stock_quantity', 'product_type', 'thumbnail', 'gallery_images', 'is_featured', 'status',
        ];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) return false;

        $sql = 'UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /** Soft delete — sets deleted_at rather than removing the row, so past orders still resolve their line items. */
    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE products SET deleted_at = NOW() WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    public function restore(int $id): bool
    {
        $stmt = $this->db->prepare('UPDATE products SET deleted_at = NULL WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    public function decrementStock(int $id, int $quantity): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - :qty) WHERE id = :id'
        );
        return $stmt->execute(['qty' => $quantity, 'id' => $id]);
    }

    public function count(): int
    {
        return (int) $this->db->query('SELECT COUNT(*) FROM products WHERE deleted_at IS NULL')->fetchColumn();
    }
}
