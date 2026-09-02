<?php

require_once __DIR__ . '/../models/Content.php';
require_once __DIR__ . '/../models/BibleStudy.php';
require_once __DIR__ . '/../models/Language.php';
require_once __DIR__ . '/../helpers/publish_notify.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/permissions.php';

class ContentController
{
    /**
     * Section = where an item appears on the site. Media Type = what kind
     * of media it is. The two are independent (spec: "do not treat
     * Section, Category, Media Type, and Language as the same thing"),
     * but the *set* of valid media types depends on which section is
     * selected, so it's validated here rather than as a single shared
     * DB enum.
     */
    private const SECTION_MEDIA_TYPES = [
        'media_library' => [
            'video', 'movie', 'short_film', 'cartoon', 'animation', 'sermon', 'panel',
            'interview', 'documentary', 'audio', 'music', 'podcast', 'pdf', 'image', 'article',
        ],
        'news'        => ['news_article'],
        'gallery'     => ['photo_gallery'],
        'devotions'   => ['devotional'],
        // Bible Study's media_type doubles as the bible_studies.format enum
        // value (migration 004) - keep these in sync with that column.
        'bible_study' => [
            'short_film', 'video', 'sermon', 'panel', 'audio', 'animated', 'documentary', 'pdf_notes',
        ],
    ];

    /**
     * Media types whose primary content IS substantial written text
     * (news articles, devotions, written articles) - only these show the
     * Body field by default. Everything else is media-first (video,
     * audio, gallery, ...) and gets an optional Transcript/Notes field
     * instead.
     */
    private const BODY_REQUIRED_MEDIA_TYPES = ['article', 'news_article', 'devotional'];

    /**
     * content_type keeps its original 6-value ENUM and is still what
     * every public route/alias, Content::all()'s `type` filter, and the
     * bible_studies extension sync key off (routes/api.php, Content.php).
     * Rather than migrate every consumer at once, it's derived here from
     * (section, media_type) so the admin only ever picks Section + Media
     * Type - never content_type directly - and nothing downstream breaks.
     */
    private static function deriveContentType(string $section, string $mediaType): string
    {
        return match ($section) {
            'news'        => 'news',
            'gallery'     => 'gallery',
            'devotions'   => 'devotion',
            'bible_study' => 'bible_study',
            default       => $mediaType === 'article' ? 'article' : 'video',
        };
    }

    private Content $model;

    public function __construct()
    {
        $this->model = new Content();
    }

    /**
     * Validates section/media_type/language, fills in content_type, and
     * strips the Body field back to null for media-first content so a
     * stray value from an older client (or a section switch) doesn't
     * leave written-content text sitting behind a hidden field.
     * Returns the (possibly adjusted) body, or calls json_error() itself.
     */
    private function normalizeClassification(array $body): array
    {
        $section = $body['section'] ?? null;
        if (!$section || !array_key_exists($section, self::SECTION_MEDIA_TYPES)) {
            json_error('A valid section is required.', 422);
        }

        $mediaType = $body['media_type'] ?? null;
        if (!$mediaType || !in_array($mediaType, self::SECTION_MEDIA_TYPES[$section], true)) {
            json_error("'$mediaType' is not a valid media type for the '$section' section.", 422);
        }

        if (array_key_exists('language', $body) && $body['language'] !== null && $body['language'] !== '') {
            if (!(new Language())->isValidCode($body['language'])) {
                json_error('Unknown language.', 422);
            }
        }

        $body['section'] = $section;
        $body['media_type'] = $mediaType;
        $body['content_type'] = self::deriveContentType($section, $mediaType);

        if (!in_array($mediaType, self::BODY_REQUIRED_MEDIA_TYPES, true)) {
            $body['body'] = null;
        }

        return $body;
    }

    /** GET /api/content?type=&category_id=&search=&featured=&page=&status= */
    public function index(): void
    {
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, (int) ($_GET['limit'] ?? 12));

        $filters = [
            'content_type' => $_GET['type'] ?? null,
            'section'      => $_GET['section'] ?? null,
            'media_type'   => $_GET['media_type'] ?? null,
            'category_id'  => $_GET['category_id'] ?? null,
            'search'       => $_GET['search'] ?? null,
            'is_featured'  => $_GET['featured'] ?? null,
        ];

        // "status" (including the special "all" value used by the admin's Manage
        // Content screen) is only honored for signed-in accounts that can
        // create/edit/publish content. Anyone else always gets the model's
        // default published-only filter, regardless of what they pass.
        if (!empty($_GET['status'])) {
            $payload = optional_auth();
            if ($payload && (
                user_has_permission($payload, 'content.create')
                || user_has_permission($payload, 'content.edit')
                || user_has_permission($payload, 'content.publish')
            )) {
                $filters['status'] = $_GET['status'];
            }
        }

        $items = $this->model->all($filters, $limit, ($page - 1) * $limit);
        json_ok(['items' => $items, 'page' => $page, 'limit' => $limit]);
    }

    /** GET /api/content/{slug} */
    public function show(string $slugOrId): void
    {
        $item = ctype_digit($slugOrId)
            ? $this->model->find((int) $slugOrId)
            : $this->model->findBySlug($slugOrId);

        if (!$item) {
            json_error('Content not found.', 404);
        }

        $this->model->incrementViews((int) $item['id']);
        json_ok(['item' => $item]);
    }

    /** POST /api/content (requires content.create) */
    public function store(): void
    {
        $payload = require_permission('content.create');
        $body = get_json_body();

        // Only someone who can also publish content is allowed to create it
        // already published/scheduled — an Editor without content.publish
        // is limited to draft/review, matching the workflow in spec §56.
        if (!empty($body['status']) && $body['status'] !== 'draft' && !user_has_permission($payload, 'content.publish')) {
            json_error('You can save this as a draft, but you do not have permission to publish content.', 403);
        }

        if (empty($body['title'])) {
            json_error('Title is required.', 422);
        }

        $body = $this->normalizeClassification($body);

        $body['slug'] = $body['slug'] ?? $this->slugify($body['title']);
        $body['author_id'] = $payload['sub'];

        $id = $this->model->create($body);

        // Bible Study is a "content + extension table" type (spec §7): the
        // base row lives in content like everything else, and the
        // format/study-guide fields live in bible_studies keyed to it.
        // media_type IS the study format for this section (see
        // SECTION_MEDIA_TYPES above), kept in sync with bible_studies.format.
        if ($body['section'] === 'bible_study') {
            (new BibleStudy())->createExtension(
                (int) $id,
                $body['media_type'],
                $body['study_guide_url'] ?? null
            );
        }

        // Never let a bug in the notification path break content
        // creation itself — a devotion/study/news item that fails to
        // notify subscribers is a much smaller problem than one that
        // fails to save at all.
        try {
            maybe_notify_subscribers_of_new_content($this->model, (int) $id);
        } catch (Throwable $e) {
            error_log('Newsletter notify failed for content ' . $id . ': ' . $e->getMessage());
        }

        json_created(['id' => $id], 'Content created successfully.');
    }

    /** PUT /api/content/{id} (requires content.edit; publishing/status changes also require content.publish) */
    public function update(int $id): void
    {
        $payload = require_permission('content.edit');
        $body = get_json_body();

        $existing = $this->model->find($id);
        if (!$existing) {
            json_error('Content not found.', 404);
        }

        if (
            array_key_exists('status', $body)
            && $body['status'] !== $existing['status']
            && !user_has_permission($payload, 'content.publish')
        ) {
            json_error('You do not have permission to change content status.', 403);
        }
        if (
            array_key_exists('is_featured', $body)
            && !user_has_permission($payload, 'content.feature')
        ) {
            json_error('You do not have permission to feature content.', 403);
        }

        // A partial update might only send one of section/media_type (or
        // neither) - re-validate the pair using whichever value wasn't
        // sent from the existing row, so a lone {media_type: ...} can't
        // drift out of sync with its section's allowed vocabulary.
        if (array_key_exists('section', $body) || array_key_exists('media_type', $body) || array_key_exists('language', $body)) {
            $body = $this->normalizeClassification([
                ...$body,
                'section'    => $body['section'] ?? $existing['section'],
                'media_type' => $body['media_type'] ?? $existing['media_type'],
            ]);
        }

        $this->model->update($id, $body);

        // Keep the bible_studies extension row in sync whenever this item
        // is (or is becoming) a Bible Study and either extension field was
        // sent; createExtension() upserts so this is always safe to call.
        // media_type/study_guide_url live on the bible_studies extension
        // row, NOT on $existing (a plain content row), so a partial update
        // (e.g. just {study_guide_url: ...}) has to fall back to the
        // current extension row rather than $existing, or it would
        // silently null out the field that wasn't sent.
        $section = $body['section'] ?? $existing['section'];
        if ($section === 'bible_study' && (array_key_exists('media_type', $body) || array_key_exists('study_guide_url', $body))) {
            $currentExtension = (new BibleStudy())->findByContentId($id);
            (new BibleStudy())->createExtension(
                $id,
                $body['media_type'] ?? ($currentExtension['format'] ?? 'video'),
                array_key_exists('study_guide_url', $body) ? $body['study_guide_url'] : ($currentExtension['study_guide_url'] ?? null)
            );
        }

        try {
            maybe_notify_subscribers_of_new_content($this->model, $id);
        } catch (Throwable $e) {
            error_log('Newsletter notify failed for content ' . $id . ': ' . $e->getMessage());
        }

        json_ok(null, 'Content updated successfully.');
    }

    /** DELETE /api/content/{id} (requires content.delete) */
    public function destroy(int $id): void
    {
        require_permission('content.delete');

        if (!$this->model->find($id)) {
            json_error('Content not found.', 404);
        }

        $this->model->delete($id);
        json_ok(null, 'Content deleted successfully.');
    }

    /** POST /api/content/{id}/duplicate (requires content.create) */
    public function duplicate(int $id): void
    {
        require_permission('content.create');
        $newId = $this->model->duplicate($id);

        if (!$newId) {
            json_error('Content not found.', 404);
        }

        json_created(['id' => $newId], 'Content duplicated successfully.');
    }

    /** POST /api/content/bulk body: {action: delete|publish|archive, ids:[]} */
    public function bulk(): void
    {
        $body = get_json_body();
        $ids = array_map('intval', $body['ids'] ?? []);
        $action = $body['action'] ?? '';

        if (empty($ids) || empty($action)) {
            json_error('action and ids[] are required.', 422);
        }

        // Deleting and publishing/archiving are different capabilities —
        // an Editor can bulk-publish without being able to bulk-delete.
        $requiredPermission = $action === 'delete' ? 'content.delete' : 'content.publish';
        require_permission($requiredPermission);

        match ($action) {
            'delete'  => $this->model->bulkDelete($ids),
            'publish' => $this->model->bulkUpdateStatus($ids, 'published'),
            'archive' => $this->model->bulkUpdateStatus($ids, 'archived'),
            default   => json_error('Unknown bulk action.', 422),
        };

        json_ok(null, 'Bulk action completed.');
    }

    private function slugify(string $text): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $text), '-'));
        return $slug . '-' . substr(uniqid(), -5);
    }
}
