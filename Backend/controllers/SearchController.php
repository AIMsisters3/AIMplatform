<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Global search (spec §32): title, description, category, tags, author/
 * speaker, language. Plain LIKE search — simple and correct for the
 * current content volume; the query is isolated behind one method so it
 * can be swapped for full-text/AI-assisted search later (spec §49)
 * without touching the controller or the frontend contract.
 */
class SearchController
{
    /** GET /api/search?q=&limit= */
    public function index(): void
    {
        $q = trim($_GET['q'] ?? '');
        $limit = min(30, (int) ($_GET['limit'] ?? 10));

        if (mb_strlen($q) < 2) {
            json_ok(['content' => [], 'products' => [], 'query' => $q]);
            return;
        }

        $db = Database::getConnection();
        $like = '%' . $q . '%';

        $contentStmt = $db->prepare(
            "SELECT c.id, c.title, c.slug, c.description, c.thumbnail, c.content_type, c.speaker,
                    cat.name AS category_name
             FROM content c
             LEFT JOIN categories cat ON cat.id = c.category_id
             WHERE c.deleted_at IS NULL AND c.status = 'published'
               AND (c.title LIKE :q1 OR c.description LIKE :q2 OR c.tags LIKE :q3
                    OR c.speaker LIKE :q4 OR c.bible_references LIKE :q5)
             ORDER BY c.views DESC
             LIMIT :limit"
        );
        $contentStmt->bindValue('q1', $like);
        $contentStmt->bindValue('q2', $like);
        $contentStmt->bindValue('q3', $like);
        $contentStmt->bindValue('q4', $like);
        $contentStmt->bindValue('q5', $like);
        $contentStmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $contentStmt->execute();

        $productStmt = $db->prepare(
            "SELECT id, name, slug, description, thumbnail, price, sale_price
             FROM products
             WHERE deleted_at IS NULL AND status = 'active' AND (name LIKE :q1 OR description LIKE :q2)
             ORDER BY created_at DESC
             LIMIT :limit"
        );
        $productStmt->bindValue('q1', $like);
        $productStmt->bindValue('q2', $like);
        $productStmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $productStmt->execute();

        json_ok([
            'query'    => $q,
            'content'  => $contentStmt->fetchAll(),
            'products' => $productStmt->fetchAll(),
        ]);
    }
}
